-- LINK Decision Engine Migration
-- All additive — preserves existing data

-- 1. New columns on posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dms INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_quality TEXT DEFAULT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS icp_audience TEXT DEFAULT NULL;

-- 2. health_scores table
CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  consistency_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  variety_score INTEGER DEFAULT 0,
  pillar_balance_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  link_notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. post_recommendations table
CREATE TABLE IF NOT EXISTS post_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. link_sessions table
CREATE TABLE IF NOT EXISTS link_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL CHECK (session_type IN ('daily_review', 'weekly_review', 'chat', 'challenge')),
  link_notes JSONB DEFAULT '{}'::jsonb,
  user_commitments JSONB DEFAULT '[]'::jsonb,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. link_chat table
CREATE TABLE IF NOT EXISTS link_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('link', 'user')),
  message TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_health_scores_week ON health_scores(week_number);
CREATE INDEX IF NOT EXISTS idx_post_recommendations_week ON post_recommendations(week_number);
CREATE INDEX IF NOT EXISTS idx_link_sessions_week ON link_sessions(week_number);
CREATE INDEX IF NOT EXISTS idx_link_chat_week ON link_chat(week_number);
