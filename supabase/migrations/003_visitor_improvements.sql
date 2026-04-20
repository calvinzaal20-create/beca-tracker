-- ============================================================
-- Migratie 003: Visitor verbeteringen
-- Voer uit in Supabase SQL Editor
-- ============================================================

-- 1. Voeg last_session_id toe om bezoeken per sessie te tellen (niet per pageview)
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS last_session_id TEXT;

-- 2. Index voor snellere sessie-lookup
CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors (last_session_id);
