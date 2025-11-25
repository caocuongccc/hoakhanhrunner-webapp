-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  full_name VARCHAR(255),
  bio TEXT,
  -- Personal records
  pr_5k VARCHAR(20),
  pr_10k VARCHAR(20),
  pr_hm VARCHAR(20),
  pr_fm VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event types enum
CREATE TYPE event_type AS ENUM ('team', 'individual');

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  event_type event_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  password VARCHAR(100), -- Optional password to join
  max_team_members INTEGER, -- For team events
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rules table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL, -- 'daily_increase_individual', 'daily_increase_team', 'min_participants', 'pace_range', 'multiplier_day', 'time_range'
  config JSONB NOT NULL, -- Flexible JSON config for each rule type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event rules junction table
CREATE TABLE event_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id) ON DELETE CASCADE,
  rule_config JSONB, -- Override config for this specific event
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, rule_id)
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  captain_id UUID REFERENCES users(id),
  total_points DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Event participants table
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  total_km DECIMAL(10, 2) DEFAULT 0,
  total_points DECIMAL(10, 2) DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  distance_km DECIMAL(10, 2) NOT NULL,
  duration_seconds INTEGER,
  pace_min_per_km DECIMAL(5, 2),
  route_data JSONB, -- Store GPS coordinates for map
  image_url TEXT,
  description TEXT,
  points_earned DECIMAL(10, 2) DEFAULT 0,
  rules_passed JSONB, -- Track which rules were passed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table (for rule validation history)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES rules(id),
  passed BOOLEAN NOT NULL,
  log_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts/Feed table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  content TEXT,
  image_urls TEXT[], -- Array of image URLs
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_activities_user_date ON activities(user_id, activity_date);
CREATE INDEX idx_activities_event ON activities(event_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
-- Add Strava fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_athlete_data JSONB;

-- Create index for Strava ID lookup
CREATE INDEX IF NOT EXISTS idx_users_strava_id ON users(strava_id);

-- Strava activities table (raw data from Strava)
CREATE TABLE IF NOT EXISTS strava_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strava_activity_id BIGINT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id BIGINT NOT NULL,
  name VARCHAR(255),
  distance DECIMAL(10, 2), -- in meters
  moving_time INTEGER, -- in seconds
  elapsed_time INTEGER,
  total_elevation_gain DECIMAL(10, 2),
  sport_type VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE,
  start_date_local TIMESTAMP WITH TIME ZONE,
  timezone VARCHAR(100),
  achievement_count INTEGER,
  kudos_count INTEGER,
  comment_count INTEGER,
  athlete_count INTEGER,
  photo_count INTEGER,
  map_polyline TEXT,
  map_summary_polyline TEXT,
  average_speed DECIMAL(10, 4),
  max_speed DECIMAL(10, 4),
  average_heartrate DECIMAL(6, 2),
  max_heartrate DECIMAL(6, 2),
  has_heartrate BOOLEAN,
  raw_data JSONB, -- Store complete Strava response
  synced_to_activity_id UUID REFERENCES activities(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Strava activities
CREATE INDEX IF NOT EXISTS idx_strava_activities_user ON strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_athlete ON strava_activities(athlete_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_date ON strava_activities(start_date_local);
CREATE INDEX IF NOT EXISTS idx_strava_activities_strava_id ON strava_activities(strava_activity_id);

-- Webhook subscriptions table
CREATE TABLE IF NOT EXISTS strava_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id INTEGER UNIQUE,
  callback_url TEXT NOT NULL,
  verify_token VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS strava_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id INTEGER,
  aspect_type VARCHAR(50), -- 'create', 'update', 'delete'
  object_type VARCHAR(50), -- 'activity', 'athlete'
  object_id BIGINT,
  owner_id BIGINT,
  event_time TIMESTAMP WITH TIME ZONE,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON strava_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_owner ON strava_webhook_events(owner_id);

-- Add trigger for strava_activities updated_at
CREATE TRIGGER update_strava_activities_updated_at BEFORE UPDATE ON strava_activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement likes count
CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment comments count
CREATE OR REPLACE FUNCTION increment_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET comments_count = comments_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comments count
CREATE OR REPLACE FUNCTION decrement_comments(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Remove captain_id from teams table
ALTER TABLE teams DROP COLUMN IF EXISTS captain_id;

-- Enable RLS cho tất cả tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ... (enable cho tất cả tables)

-- Tạo policies cho read (public)
CREATE POLICY "Public can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public can read users" ON users FOR SELECT USING (true);

-- Policies cho write (authenticated users only)
CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own activities" ON activities 
  FOR INSERT WITH CHECK (auth.uid() = user_id);