-- Migration: Add New Rules for HKR Tết Event
-- File: 004_add_new_rules.sql

-- =====================================================
-- NEW RULES IMPLEMENTATION
-- =====================================================

-- 1. Rule: Minimum Distance (2km)
INSERT INTO rules (name, description, rule_type, config, created_at, updated_at)
VALUES (
  'Quãng đường tối thiểu',
  'Mỗi lần chạy phải đạt tối thiểu 2km mới được ghi nhận',
  'min_distance',
  '{"min_km": 2.0, "description": "Tracklog < 2km sẽ không được tính điểm"}',
  NOW(),
  NOW()
);

-- 2. Rule: Valid Pace Range (4:00 - 12:00 min/km) - Update default
INSERT INTO rules (name, description, rule_type, config, created_at, updated_at)
VALUES (
  'Pace hợp lệ',
  'Chỉ tính các hoạt động có Pace từ 4:00 đến 12:00 phút/km',
  'pace_range',
  '{"min_pace": 4.0, "max_pace": 12.0, "description": "Pace quá nhanh hoặc quá chậm sẽ không hợp lệ"}',
  NOW(),
  NOW()
)
ON CONFLICT (rule_type) 
DO UPDATE SET
  config = EXCLUDED.config,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Rule: Tết Bonus (Lì xì Khai Xuân - x3 points)
INSERT INTO rules (name, description, rule_type, config, created_at, updated_at)
VALUES (
  'Lì xì Khai Xuân',
  'Hoàn thành ít nhất 2km vào sáng Mùng 1 Tết (x3 điểm)',
  'tet_bonus',
  '{
    "tet_date": "2026-01-29",
    "min_km": 2.0,
    "multiplier": 3,
    "time_range": {"start": "05:00", "end": "12:00"},
    "description": "Chạy sáng Mùng 1 Tết được x3 điểm"
  }',
  NOW(),
  NOW()
);

-- 4. Rule: Lucky Distance (Số đẹp cầu may - x2 points)
INSERT INTO rules (name, description, rule_type, config, created_at, updated_at)
VALUES (
  'Số đẹp cầu may',
  'Chạy đúng số đẹp: 6.8km (Lộc Phát), 8.8km (Phát Phát), 20.26km (Năm 2026) được x2 điểm',
  'lucky_distance',
  '{
    "lucky_distances": [
      {"distance": 6.8, "name": "Lộc Phát", "multiplier": 2},
      {"distance": 8.8, "name": "Phát Phát", "multiplier": 2},
      {"distance": 20.26, "name": "Năm 2026", "multiplier": 2}
    ],
    "tolerance": 0.1,
    "description": "±0.1km so với số đẹp"
  }',
  NOW(),
  NOW()
);

-- 5. Rule: Penalty for Missed Days (-50k VND per day)
INSERT INTO rules (name, description, rule_type, config, created_at, updated_at)
VALUES (
  'Phạt tiền ngày nghỉ',
  'Ngày nào không chạy đóng góp quỹ "Lẩu tất niên" 50,000 VND',
  'penalty_missed_day',
  '{
    "penalty_per_day": 50000,
    "currency": "VND",
    "fund_name": "Lẩu tất niên/tân niên",
    "exclude_days": [],
    "description": "Mỗi ngày nghỉ phạt 50k"
  }',
  NOW(),
  NOW()
);

-- =====================================================
-- PENALTY TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS event_penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_days INTEGER NOT NULL,
  active_days INTEGER NOT NULL,
  missed_days INTEGER NOT NULL,
  penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'VND',
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_penalties_event ON event_penalties(event_id);
CREATE INDEX IF NOT EXISTS idx_event_penalties_user ON event_penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_event_penalties_paid ON event_penalties(is_paid);

COMMENT ON TABLE event_penalties IS 'Track penalties for missed days in events';
COMMENT ON COLUMN event_penalties.penalty_amount IS 'Total penalty in VND (missed_days × penalty_per_day)';

-- =====================================================
-- STREAK TRACKING TABLE (for Siêng Năng leaderboard)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  streak_start_date DATE,
  streak_end_date DATE,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_event ON user_streaks(event_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_longest ON user_streaks(longest_streak DESC);

COMMENT ON TABLE user_streaks IS 'Track consecutive running days for consistency leaderboard';
COMMENT ON COLUMN user_streaks.longest_streak IS 'Longest streak during the event (for Siêng Năng ranking)';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Calculate penalty for user
CREATE OR REPLACE FUNCTION calculate_event_penalty(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_total_days INTEGER;
  v_active_days INTEGER;
  v_missed_days INTEGER;
  v_penalty_per_day DECIMAL;
  v_penalty_amount DECIMAL;
  v_rule_config JSONB;
BEGIN
  -- Get event details
  SELECT e.*, er.rules->>'config' as rule_config
  INTO v_event
  FROM events e
  LEFT JOIN event_rules er ON er.event_id = e.id
  LEFT JOIN rules r ON r.id = er.rule_id
  WHERE e.id = p_event_id
    AND r.rule_type = 'penalty_missed_day'
  LIMIT 1;

  -- If no penalty rule, return zero
  IF v_event.rule_config IS NULL THEN
    RETURN jsonb_build_object(
      'has_penalty_rule', false,
      'penalty_amount', 0
    );
  END IF;

  -- Parse config
  v_rule_config := v_event.rule_config::jsonb;
  v_penalty_per_day := (v_rule_config->>'penalty_per_day')::decimal;

  -- Calculate total days
  v_total_days := EXTRACT(DAY FROM (v_event.end_date - v_event.start_date)) + 1;

  -- Count unique active days
  SELECT COUNT(DISTINCT DATE(start_date))
  INTO v_active_days
  FROM activities
  WHERE event_id = p_event_id
    AND user_id = p_user_id;

  -- Calculate missed days and penalty
  v_missed_days := v_total_days - v_active_days;
  v_penalty_amount := v_missed_days * v_penalty_per_day;

  -- Upsert penalty record
  INSERT INTO event_penalties (
    event_id, user_id, total_days, active_days, 
    missed_days, penalty_amount, currency
  )
  VALUES (
    p_event_id, p_user_id, v_total_days, v_active_days,
    v_missed_days, v_penalty_amount, 'VND'
  )
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    total_days = EXCLUDED.total_days,
    active_days = EXCLUDED.active_days,
    missed_days = EXCLUDED.missed_days,
    penalty_amount = EXCLUDED.penalty_amount,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'has_penalty_rule', true,
    'total_days', v_total_days,
    'active_days', v_active_days,
    'missed_days', v_missed_days,
    'penalty_per_day', v_penalty_per_day,
    'penalty_amount', v_penalty_amount,
    'currency', 'VND'
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate streak
CREATE OR REPLACE FUNCTION calculate_streak(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_dates DATE[];
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_temp_streak INTEGER := 0;
  v_prev_date DATE;
  v_current_date DATE;
  v_streak_start DATE;
  v_streak_end DATE;
BEGIN
  -- Get all activity dates sorted
  SELECT ARRAY_AGG(DISTINCT DATE(start_date) ORDER BY DATE(start_date))
  INTO v_dates
  FROM activities
  WHERE event_id = p_event_id
    AND user_id = p_user_id;

  -- If no activities, return zero
  IF v_dates IS NULL OR ARRAY_LENGTH(v_dates, 1) = 0 THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0
    );
  END IF;

  -- Calculate streaks
  v_temp_streak := 1;
  v_longest_streak := 1;
  v_streak_start := v_dates[1];

  FOR i IN 2..ARRAY_LENGTH(v_dates, 1) LOOP
    v_prev_date := v_dates[i-1];
    v_current_date := v_dates[i];

    -- Check if consecutive (difference = 1 day)
    IF v_current_date - v_prev_date = 1 THEN
      v_temp_streak := v_temp_streak + 1;
      
      -- Update longest if needed
      IF v_temp_streak > v_longest_streak THEN
        v_longest_streak := v_temp_streak;
        v_streak_end := v_current_date;
      END IF;
    ELSE
      -- Streak broken, reset
      v_temp_streak := 1;
      v_streak_start := v_current_date;
    END IF;
  END LOOP;

  -- Current streak is the temp streak if it reaches the latest date
  v_current_streak := v_temp_streak;

  -- Upsert streak record
  INSERT INTO user_streaks (
    event_id, user_id, current_streak, longest_streak,
    streak_start_date, streak_end_date, last_activity_date
  )
  VALUES (
    p_event_id, p_user_id, v_current_streak, v_longest_streak,
    v_streak_start, v_streak_end, v_dates[ARRAY_LENGTH(v_dates, 1)]
  )
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    streak_start_date = EXCLUDED.streak_start_date,
    streak_end_date = EXCLUDED.streak_end_date,
    last_activity_date = EXCLUDED.last_activity_date,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'total_active_days', ARRAY_LENGTH(v_dates, 1)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE event_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own penalties
CREATE POLICY "Users can view their own penalties"
  ON event_penalties FOR SELECT
  USING (auth.uid() = user_id);

-- Public can view all penalties (for leaderboard)
CREATE POLICY "Everyone can view all penalties"
  ON event_penalties FOR SELECT
  USING (true);

-- Users can view their own streaks
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Public can view all streaks (for leaderboard)
CREATE POLICY "Everyone can view all streaks"
  ON user_streaks FOR SELECT
  USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION calculate_event_penalty IS 'Calculate penalty amount for missed days';
COMMENT ON FUNCTION calculate_streak IS 'Calculate current and longest streak for consistency ranking';