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

  -- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', -- 'admin' or 'super_admin'
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_sessions table for session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Add RLS policies
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can read their own data
CREATE POLICY "Admins can read own data" ON admins
  FOR SELECT USING (true);

-- Only super admins can create/update/delete admins (implement in application logic)

-- Insert default admin account (password: admin123 - change this immediately!)
-- Password hash for "admin123" using bcrypt
INSERT INTO admins (email, username, password_hash, full_name, role)
VALUES (
  'admin@runningclub.local',
  'admin',
  '$2a$10$rX5M8P3LqKqKxXqY.nYqXeZqjPvQ8EZ7Jz3p5QXhX1Y2Z3A4B5C6D7', -- This is example hash, will be replaced by API
  'System Administrator',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for admins table
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


  -- Migration: Create best_efforts table
-- Run this in Supabase SQL Editor

-- Create best_efforts table to store Strava best efforts
CREATE TABLE IF NOT EXISTS best_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  effort_name TEXT NOT NULL, -- "5k", "10k", "Half-Marathon", etc.
  elapsed_time INTEGER NOT NULL, -- seconds
  moving_time INTEGER NOT NULL, -- seconds
  distance DECIMAL NOT NULL, -- meters
  start_date TIMESTAMPTZ NOT NULL,
  start_date_local TIMESTAMPTZ NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one best effort per user, activity, and effort name
  UNIQUE(user_id, strava_activity_id, effort_name)
);

-- Create indexes for faster queries
CREATE INDEX idx_best_efforts_user_id ON best_efforts(user_id);
CREATE INDEX idx_best_efforts_effort_name ON best_efforts(effort_name);
CREATE INDEX idx_best_efforts_moving_time ON best_efforts(moving_time);
CREATE INDEX idx_best_efforts_start_date ON best_efforts(start_date_local);

-- Enable RLS
ALTER TABLE best_efforts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own best efforts
CREATE POLICY "Users can read own best efforts"
  ON best_efforts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own best efforts
CREATE POLICY "Users can insert own best efforts"
  ON best_efforts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own best efforts
CREATE POLICY "Users can update own best efforts"
  ON best_efforts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for webhook)
CREATE POLICY "Service role full access"
  ON best_efforts
  FOR ALL
  USING (true);

-- Add best_efforts column to activities table (optional - for caching)
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS best_efforts JSONB;

-- Update events table to support time ranges
ALTER TABLE events
ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ;

-- Add max_teams column to events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS max_teams INTEGER;

-- Create function to get user PRs (Personal Records)
CREATE OR REPLACE FUNCTION get_user_prs(p_user_id UUID)
RETURNS TABLE (
  effort_name TEXT,
  best_time INTEGER,
  activity_date TIMESTAMPTZ,
  strava_activity_id BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (be.effort_name)
    be.effort_name,
    be.moving_time as best_time,
    be.start_date_local as activity_date,
    be.strava_activity_id
  FROM best_efforts be
  WHERE be.user_id = p_user_id
  ORDER BY be.effort_name, be.moving_time ASC, be.start_date_local DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get leaderboard for specific effort
CREATE OR REPLACE FUNCTION get_effort_leaderboard(
  p_effort_name TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  best_time INTEGER,
  activity_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (be.user_id)
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    be.moving_time as best_time,
    be.start_date_local as activity_date
  FROM best_efforts be
  JOIN users u ON u.id = be.user_id
  WHERE be.effort_name = p_effort_name
  ORDER BY be.user_id, be.moving_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE best_efforts IS 'Stores Strava best effort segments from activities';
COMMENT ON COLUMN best_efforts.effort_name IS 'Distance name: 5k, 10k, Half-Marathon, Marathon, etc.';
COMMENT ON COLUMN best_efforts.moving_time IS 'Time in seconds (excluding stops)';
COMMENT ON COLUMN best_efforts.elapsed_time IS 'Total time in seconds (including stops)';