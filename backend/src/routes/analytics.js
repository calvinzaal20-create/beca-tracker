/**
 * Analytics Route — GET /api/dashboard/analytics
 *
 * Berekent gedragsanalyses op basis van de opgeslagen page_views en visitors:
 * - Pagina performance (views, gem. verblijfsduur, bounce rate)
 * - Navigatiepaden (meest gevolgde routes per sessie)
 * - Engagement scores per bedrijf
 * - Piekuren (bezoekersactiviteit per uur van de dag)
 * - Automatische aanbevelingen
 */

const express = require('express');
const router  = express.Router();
const supabase = require('../config/supabase');

// GET /api/dashboard/analytics?days=30
router.get('/', async (req, res) => {
  try {
    const days  = parseInt(req.query.days || '30', 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Haal alle page views op binnen de periode
    const { data: pageViews, error: pvErr } = await supabase
      .from('page_views')
      .select('id, visitor_id, session_id, page_url, page_title, referrer, duration_sec, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (pvErr) throw pvErr;

    // Haal alle bezoekers op
    const { data: visitors, error: visErr } = await supabase
      .from('visitors')
      .select('id, company_name, city, country_name, is_interesting, visit_count, first_seen, last_seen');

    if (visErr) throw visErr;

    const visitorMap = {};
    (visitors || []).forEach(v => { visitorMap[v.id] = v; });

    const views = pageViews || [];

    // ── 1. PAGINA PERFORMANCE ──────────────────────────────────
    const pageStats = {};
    views.forEach(pv => {
      const url = cleanUrl(pv.page_url);
      if (!pageStats[url]) {
        pageStats[url] = {
          url,
          title:      pv.page_title || url,
          views:      0,
          totalDuration: 0,
          durCount:   0,  // views met gemeten duur > 0
          sessions:   new Set(),
          visitors:   new Set(),
        };
      }
      const p = pageStats[url];
      p.views++;
      p.sessions.add(pv.session_id);
      p.visitors.add(pv.visitor_id);
      if (pv.duration_sec > 0) {
        p.totalDuration += pv.duration_sec;
        p.durCount++;
      }
    });

    // Bounces: sessies met precies 1 pagina
    const sessionPageCounts = {};
    views.forEach(pv => {
      sessionPageCounts[pv.session_id] = (sessionPageCounts[pv.session_id] || 0) + 1;
    });
    const bounceSessions = new Set(
      Object.entries(sessionPageCounts)
        .filter(([, c]) => c === 1)
        .map(([sid]) => sid)
    );

    const pagePerformance = Object.values(pageStats).map(p => {
      const sessionArr = [...p.sessions];
      const bounceCount = sessionArr.filter(s => bounceSessions.has(s)).length;
      return {
        url:            p.url,
        title:          p.title,
        views:          p.views,
        uniqueVisitors: p.visitors.size,
        avgDuration:    p.durCount > 0 ? Math.round(p.totalDuration / p.durCount) : 0,
        bounceRate:     p.sessions.size > 0 ? Math.round((bounceCount / p.sessions.size) * 100) : 0,
        engagementScore: calcPageEngagement(p.views, p.durCount > 0 ? p.totalDuration / p.durCount : 0, bounceCount, p.sessions.size),
      };
    }).sort((a, b) => b.views - a.views);

    // ── 2. NAVIGATIEPADEN ─────────────────────────────────────
    const sessionPaths = {};
    views.forEach(pv => {
      if (!sessionPaths[pv.session_id]) sessionPaths[pv.session_id] = [];
      sessionPaths[pv.session_id].push(cleanUrl(pv.page_url));
    });

    const pathCounts = {};
    Object.values(sessionPaths).forEach(path => {
      if (path.length < 2) return;
      // Maak paren van opeenvolgende pagina's: A→B
      for (let i = 0; i < path.length - 1; i++) {
        const key = `${path[i]} → ${path[i + 1]}`;
        pathCounts[key] = (pathCounts[key] || 0) + 1;
      }
    });

    const topPaths = Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count }));

    // Entry pagina's (eerste pagina per sessie)
    const entryCounts = {};
    Object.values(sessionPaths).forEach(path => {
      if (path.length > 0) {
        entryCounts[path[0]] = (entryCounts[path[0]] || 0) + 1;
      }
    });
    const topEntryPages = Object.entries(entryCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([url, count]) => ({ url, count }));

    // Exit pagina's (laatste pagina per sessie)
    const exitCounts = {};
    Object.values(sessionPaths).forEach(path => {
      if (path.length > 0) {
        const last = path[path.length - 1];
        exitCounts[last] = (exitCounts[last] || 0) + 1;
      }
    });
    const topExitPages = Object.entries(exitCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([url, count]) => ({ url, count }));

    // ── 3. ENGAGEMENT SCORES PER BEDRIJF ─────────────────────
    const visitorEngagement = {};
    views.forEach(pv => {
      if (!pv.visitor_id) return;
      if (!visitorEngagement[pv.visitor_id]) {
        visitorEngagement[pv.visitor_id] = {
          pageViews: 0, totalDuration: 0, sessions: new Set(), pages: new Set(),
        };
      }
      const e = visitorEngagement[pv.visitor_id];
      e.pageViews++;
      e.totalDuration += pv.duration_sec || 0;
      e.sessions.add(pv.session_id);
      e.pages.add(cleanUrl(pv.page_url));
    });

    const engagementLeaderboard = Object.entries(visitorEngagement)
      .map(([visitorId, e]) => {
        const v = visitorMap[visitorId];
        const score = Math.min(100, Math.round(
          (e.pageViews * 10) +
          (e.sessions.size * 15) +
          (e.pages.size * 8) +
          (Math.min(e.totalDuration, 300) / 3) +
          ((v?.visit_count || 1) * 5)
        ));
        return {
          visitorId,
          companyName:   v?.company_name || 'Onbekend',
          city:          v?.city || '',
          countryName:   v?.country_name || '',
          isInteresting: v?.is_interesting || false,
          pageViews:     e.pageViews,
          sessions:      e.sessions.size,
          uniquePages:   e.pages.size,
          totalDuration: e.totalDuration,
          visitCount:    v?.visit_count || 1,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // ── 4. PIEKUREN ───────────────────────────────────────────
    const hourCounts = new Array(24).fill(0);
    views.forEach(pv => {
      const hour = new Date(pv.created_at).getHours();
      hourCounts[hour]++;
    });
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

    // ── 5. SESSIE STATISTIEKEN ────────────────────────────────
    const sessionCount   = Object.keys(sessionPaths).length;
    const avgPagesPerSession = sessionCount > 0
      ? Math.round((views.length / sessionCount) * 10) / 10 : 0;

    const sessionDurations = Object.keys(sessionPaths).map(sid => {
      const sessionViews = views.filter(pv => pv.session_id === sid);
      return sessionViews.reduce((sum, pv) => sum + (pv.duration_sec || 0), 0);
    });
    const avgSessionDuration = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length) : 0;

    const bounceRate = sessionCount > 0
      ? Math.round((bounceSessions.size / sessionCount) * 100) : 0;

    // Terugkerende bezoekers (visit_count > 1)
    const returningCount = (visitors || []).filter(v => v.visit_count > 1).length;
    const returnRate = visitors?.length > 0
      ? Math.round((returningCount / visitors.length) * 100) : 0;

    // ── 6. AUTOMATISCHE AANBEVELINGEN ────────────────────────
    const insights = generateInsights({
      pagePerformance, bounceRate, avgSessionDuration,
      avgPagesPerSession, returnRate, topExitPages, topEntryPages,
    });

    res.json({
      period: { days, since },
      sessionStats: {
        totalSessions:    sessionCount,
        avgPagesPerSession,
        avgSessionDuration,
        bounceRate,
        returnRate,
        returningVisitors: returningCount,
      },
      pagePerformance,
      topPaths,
      topEntryPages,
      topExitPages,
      peakHours,
      engagementLeaderboard,
      insights,
    });
  } catch (err) {
    console.error('[Analytics] Fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

// ── Hulpfuncties ─────────────────────────────────────────────

function cleanUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url || '/';
  }
}

function calcPageEngagement(views, avgDur, bounces, sessions) {
  if (views === 0) return 0;
  const durScore    = Math.min(avgDur / 120, 1) * 40; // max 40 punten (2 min = top)
  const bounceScore = sessions > 0 ? (1 - bounces / sessions) * 40 : 0; // max 40 punten
  const popScore    = Math.min(views / 20, 1) * 20;   // max 20 punten (20 views = top)
  return Math.round(durScore + bounceScore + popScore);
}

function generateInsights({ pagePerformance, bounceRate, avgSessionDuration,
  avgPagesPerSession, returnRate, topExitPages, topEntryPages }) {
  const insights = [];

  // Bounce rate
  if (bounceRate > 60) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Hoge bounce rate',
      text: `${bounceRate}% van de bezoekers vertrekt na één pagina. Controleer of de landingspagina aansluit bij de verwachting van de bezoeker en voeg duidelijke call-to-actions toe.`,
    });
  } else if (bounceRate < 30) {
    insights.push({
      type: 'positive',
      icon: '✅',
      title: 'Lage bounce rate',
      text: `Slechts ${bounceRate}% stuit terug. Bezoekers verkennen de site goed — een sterk teken van relevante content.`,
    });
  }

  // Sessieduur
  if (avgSessionDuration < 30) {
    insights.push({
      type: 'warning',
      icon: '⏱️',
      title: 'Korte sessieduur',
      text: `Gemiddeld ${avgSessionDuration}s per sessie. Overweeg meer inhoudelijke pagina's of video's om bezoekers langer vast te houden.`,
    });
  } else if (avgSessionDuration > 120) {
    insights.push({
      type: 'positive',
      icon: '🎯',
      title: 'Sterke betrokkenheid',
      text: `Gemiddeld ${Math.round(avgSessionDuration / 60)}m ${avgSessionDuration % 60}s per sessie — bezoekers lezen de content grondig.`,
    });
  }

  // Pagina's per sessie
  if (avgPagesPerSession < 1.5) {
    insights.push({
      type: 'warning',
      icon: '📄',
      title: 'Weinig pagina\'s per bezoek',
      text: `Gemiddeld ${avgPagesPerSession} pagina per sessie. Voeg interne links en "gerelateerde diensten" secties toe om bezoekers verder te leiden.`,
    });
  }

  // Terugkerende bezoekers
  if (returnRate > 30) {
    insights.push({
      type: 'positive',
      icon: '🔄',
      title: 'Sterke terugkeerquote',
      text: `${returnRate}% van de bedrijven keert terug. Dit wijst op interesse — een goed moment om contact op te nemen met de meest actieve bezoekers.`,
    });
  }

  // Pagina's met hoge views maar lage verblijfsduur
  const underperformers = pagePerformance
    .filter(p => p.views >= 3 && p.avgDuration > 0 && p.avgDuration < 20);
  if (underperformers.length > 0) {
    insights.push({
      type: 'tip',
      icon: '💡',
      title: 'Pagina\'s met lage leestijd',
      text: `${underperformers.map(p => `"${p.url}"`).join(', ')} ${underperformers.length === 1 ? 'heeft' : 'hebben'} veel bezoekers maar weinig leestijd (<20s). Maak de content concreter of voeg visueel materiaal toe.`,
    });
  }

  // Meest verlaten pagina
  if (topExitPages.length > 0) {
    const topExit = topExitPages[0];
    insights.push({
      type: 'tip',
      icon: '🚪',
      title: 'Meest verlaten pagina',
      text: `Bezoekers verlaten de site het vaakst op "${topExit.url}" (${topExit.count}x). Overweeg hier een duidelijke vervolgstap toe te voegen (contact, offerte, demo).`,
    });
  }

  // Top entry pagina niet de homepage
  if (topEntryPages.length > 0 && topEntryPages[0].url !== '/' && !topEntryPages[0].url.includes('home')) {
    insights.push({
      type: 'tip',
      icon: '🚀',
      title: 'Populaire instappagina',
      text: `Bezoekers landen het vaakst op "${topEntryPages[0].url}", niet de homepage. Zorg dat deze pagina zelfstandig werkt als introductie tot BECA One.`,
    });
  }

  return insights;
}

module.exports = router;
