-- ============================================================
-- BECA One — Sessie Recordings (rrweb events)
-- ============================================================
-- Voer uit in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS session_recordings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL,
  visitor_id   UUID REFERENCES visitors(id) ON DELETE CASCADE,
  events       JSONB NOT NULL,          -- Array van rrweb events
  chunk_index  INTEGER NOT NULL DEFAULT 0, -- Volgorde per sessie
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_session   ON session_recordings (session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_visitor   ON session_recordings (visitor_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created   ON session_recordings (created_at DESC);

ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- Ruim automatisch op: bewaar max 200 chunks per sessie (FIFO)
-- (optioneel: stel een cron job in via pg_cron of Supabase Edge Functions)
