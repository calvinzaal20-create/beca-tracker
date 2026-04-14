-- ============================================================
-- BECA One - B2B Visitor Tracker: Database Schema
-- ============================================================
-- Voer dit script uit in de Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Plak & Run)
-- ============================================================


-- -----------------------------------------------------------
-- 1. VISITORS
--    Één rij per uniek bedrijf/IP dat de site bezocht.
--    Wordt bijgewerkt bij elk herbezoek (last_seen, visit_count).
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address    TEXT NOT NULL,
  company_name  TEXT,              -- Van ipinfo.io: org veld (bv. "AS1234 Shell Nederland")
  org           TEXT,              -- Ruwe org string van ipinfo
  city          TEXT,
  region        TEXT,
  country       TEXT,
  country_name  TEXT,
  postal        TEXT,
  latitude      NUMERIC(9,6),
  longitude     NUMERIC(9,6),
  timezone      TEXT,
  hostname      TEXT,
  is_interesting BOOLEAN DEFAULT FALSE,  -- TRUE als bedrijf op de watchlist staat
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count   INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snel opzoeken op IP-adres (meest gebruikte query)
CREATE INDEX IF NOT EXISTS idx_visitors_ip        ON visitors (ip_address);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_interesting ON visitors (is_interesting) WHERE is_interesting = TRUE;


-- -----------------------------------------------------------
-- 2. PAGE_VIEWS
--    Elke pagina die een bezoeker bekijkt krijgt een eigen rij.
--    Verblijfsduur wordt bijgewerkt via een heartbeat of
--    een "page leave" event vanuit het tracking script.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  session_id    TEXT NOT NULL,         -- Willekeurige string per browse-sessie
  page_url      TEXT NOT NULL,
  page_title    TEXT,
  referrer      TEXT,
  duration_sec  INTEGER DEFAULT 0,     -- Verblijfsduur in seconden
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor   ON page_views (visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session   ON page_views (session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created   ON page_views (created_at DESC);


-- -----------------------------------------------------------
-- 3. INTERESTING_ALERTS
--    Gelogde meldingen voor bedrijven op de watchlist.
--    Voorkomt dubbele e-mails binnen een korte periode.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS interesting_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  company_name  TEXT,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified      BOOLEAN DEFAULT FALSE,    -- TRUE als e-mail/melding verstuurd
  notified_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_visitor    ON interesting_alerts (visitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered  ON interesting_alerts (triggered_at DESC);


-- -----------------------------------------------------------
-- 4. HELPER VIEWS
-- -----------------------------------------------------------

-- Samenvatting: bedrijven met hun meest recente bezoek + paginacount
CREATE OR REPLACE VIEW visitor_summary AS
SELECT
  v.id,
  v.ip_address,
  v.company_name,
  v.org,
  v.city,
  v.region,
  v.country,
  v.country_name,
  v.is_interesting,
  v.first_seen,
  v.last_seen,
  v.visit_count,
  COUNT(pv.id) AS total_page_views,
  MAX(pv.created_at) AS last_page_view_at
FROM visitors v
LEFT JOIN page_views pv ON pv.visitor_id = v.id
GROUP BY v.id
ORDER BY v.last_seen DESC;


-- -----------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Alleen de service-role (backend) mag schrijven.
--    Anonieme gebruikers hebben geen toegang.
-- -----------------------------------------------------------
ALTER TABLE visitors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interesting_alerts ENABLE ROW LEVEL SECURITY;

-- Service-role omzeilt RLS altijd; geen extra policies nodig.
-- Voeg hieronder een policy toe als je het dashboard direct
-- via de Supabase JS client wil laten lezen (met JWT auth).

-- Voorbeeld: alleen ingelogde dashboard-gebruikers mogen lezen
-- CREATE POLICY "dashboard read" ON visitors
--   FOR SELECT USING (auth.role() = 'authenticated');
