/**
 * Dashboard API Routes
 *
 * GET /api/dashboard/visitors       — Lijst van alle bezoekers (gepagineerd)
 * GET /api/dashboard/visitors/:id   — Bezoeker details + pagina's
 * GET /api/dashboard/stats          — Samengevatte statistieken
 * GET /api/dashboard/alerts         — Recente meldingen van interessante bezoekers
 */

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Optionele eenvoudige auth-check via header (stel in via DASHBOARD_SECRET in .env)
function authMiddleware(req, res, next) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) return next(); // Geen secret ingesteld → open toegang (alleen lokaal!)

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Niet geautoriseerd.' });
  }
  next();
}

// GET /api/dashboard/visitors
router.get('/visitors', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const onlyInteresting = req.query.interesting === 'true';
    const search = req.query.search || '';

    let query = supabase
      .from('visitor_summary')
      .select('*', { count: 'exact' })
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1);

    if (onlyInteresting) {
      query = query.eq('is_interesting', true);
    }

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,city.ilike.%${search}%,ip_address.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      visitors: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('[Dashboard] Visitors fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

// GET /api/dashboard/visitors/:id
router.get('/visitors/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [visitorResult, pageViewsResult] = await Promise.all([
      supabase.from('visitors').select('*').eq('id', id).single(),
      supabase
        .from('page_views')
        .select('*')
        .eq('visitor_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (visitorResult.error) throw visitorResult.error;
    if (!visitorResult.data) {
      return res.status(404).json({ error: 'Bezoeker niet gevonden.' });
    }

    res.json({
      visitor: visitorResult.data,
      pageViews: pageViewsResult.data || [],
    });
  } catch (err) {
    console.error('[Dashboard] Visitor detail fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalVisitors,
      interestingVisitors,
      totalPageViews,
      recentVisitors,
    ] = await Promise.all([
      supabase.from('visitors').select('id', { count: 'exact', head: true }),
      supabase
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .eq('is_interesting', true),
      supabase
        .from('page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      supabase
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .gte('last_seen', since),
    ]);

    // Top pagina's
    const { data: topPages } = await supabase
      .from('page_views')
      .select('page_url')
      .gte('created_at', since);

    const pageCount = {};
    (topPages || []).forEach(({ page_url }) => {
      pageCount[page_url] = (pageCount[page_url] || 0) + 1;
    });
    const topPagesArr = Object.entries(pageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url, views]) => ({ url, views }));

    // Top landen
    const { data: countries } = await supabase
      .from('visitors')
      .select('country_name')
      .not('country_name', 'is', null);

    const countryCount = {};
    (countries || []).forEach(({ country_name }) => {
      countryCount[country_name] = (countryCount[country_name] || 0) + 1;
    });
    const topCountries = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, visitors]) => ({ country, visitors }));

    res.json({
      totalVisitors: totalVisitors.count || 0,
      interestingVisitors: interestingVisitors.count || 0,
      totalPageViews: totalPageViews.count || 0,
      recentVisitors: recentVisitors.count || 0,
      topPages: topPagesArr,
      topCountries,
      periodDays: days,
    });
  } catch (err) {
    console.error('[Dashboard] Stats fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));

    const { data, error } = await supabase
      .from('interesting_alerts')
      .select(`
        *,
        visitors (
          company_name, city, country_name, ip_address, visit_count
        )
      `)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ alerts: data || [] });
  } catch (err) {
    console.error('[Dashboard] Alerts fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

module.exports = router;
