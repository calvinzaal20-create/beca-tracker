/**
 * Track Route — POST /api/track
 *
 * Ontvangt page view events van het tracking script op de klantsite.
 * 1. Haalt het IP-adres op (uit header of verbinding)
 * 2. Zoekt bedrijfsinformatie op via ipinfo.io
 * 3. Slaat/update de visitor op in Supabase
 * 4. Slaat de page view op
 * 5. Triggert notificatie als het een interessant bedrijf is
 */

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { lookupIp } = require('../services/ipLookup');
const { isInteresting, handleInterestingVisitor } = require('../services/notificationService');

/**
 * Haalt het echte IP-adres op uit de request.
 * Werkt achter reverse proxies (Nginx, Cloudflare).
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket.remoteAddress || '0.0.0.0';
}

// POST /api/track
router.post('/', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const { session_id, page_url, page_title, referrer, duration_sec, event } = req.body;

    if (!session_id || !page_url) {
      return res.status(400).json({ error: 'session_id en page_url zijn verplicht.' });
    }

    // --- "heartbeat" event: update alleen de verblijfsduur ---
    if (event === 'heartbeat' && duration_sec) {
      const { error } = await supabase
        .from('page_views')
        .update({
          duration_sec: Math.round(duration_sec),
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', session_id)
        .eq('page_url', page_url);

      if (error) console.error('[Track] Heartbeat update fout:', error.message);
      return res.json({ ok: true });
    }

    // --- Normaal page view event ---

    // 1. IP-lookup
    const ipData = await lookupIp(ip);
    const interesting = isInteresting(ipData.company_name);

    // 2. Upsert visitor (maak aan of update last_seen + visit_count)
    const { data: existingVisitors } = await supabase
      .from('visitors')
      .select('id, visit_count, last_session_id')
      .eq('ip_address', ip)
      .limit(1);

    let visitor;
    if (existingVisitors && existingVisitors.length > 0) {
      // Bestaande bezoeker: update — alleen visit_count verhogen als het een NIEUWE sessie is
      const existing = existingVisitors[0];
      const isNewSession = existing.last_session_id !== session_id;
      const { data, error } = await supabase
        .from('visitors')
        .update({
          company_name: ipData.company_name,
          org: ipData.org,
          city: ipData.city,
          region: ipData.region,
          country: ipData.country,
          country_name: ipData.country_name,
          postal: ipData.postal,
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          timezone: ipData.timezone,
          hostname: ipData.hostname,
          is_interesting: interesting,
          last_seen: new Date().toISOString(),
          last_session_id: session_id,
          visit_count: isNewSession ? (existing.visit_count || 0) + 1 : existing.visit_count,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      visitor = data;
    } else {
      // Nieuwe bezoeker: insert
      const { data, error } = await supabase
        .from('visitors')
        .insert({
          ip_address: ip,
          company_name: ipData.company_name,
          org: ipData.org,
          city: ipData.city,
          region: ipData.region,
          country: ipData.country,
          country_name: ipData.country_name,
          postal: ipData.postal,
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          timezone: ipData.timezone,
          hostname: ipData.hostname,
          is_interesting: interesting,
        })
        .select()
        .single();

      if (error) throw error;
      visitor = data;
    }

    // 3. Sla page view op
    const { error: pvError } = await supabase.from('page_views').insert({
      visitor_id: visitor.id,
      session_id,
      page_url,
      page_title: page_title || null,
      referrer: referrer || null,
      duration_sec: 0,
    });

    if (pvError) console.error('[Track] Page view insert fout:', pvError.message);

    // 4. Verstuur notificatie (asynchroon, blokkeert response niet)
    handleInterestingVisitor(visitor).catch((err) =>
      console.error('[Track] Notificatie fout:', err.message)
    );

    res.json({ ok: true, visitor_id: visitor.id });
  } catch (err) {
    console.error('[Track] Onverwachte fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

module.exports = router;
