/**
 * Sessions Route
 *
 * POST /api/sessions   — Ontvang een chunk rrweb events van het tracker script
 * GET  /api/sessions/:sessionId — Geef alle events terug voor replay in dashboard
 */

const express = require('express');
const router  = express.Router();
const supabase = require('../config/supabase');

// POST /api/sessions — ontvang recording chunk
router.post('/', async (req, res) => {
  try {
    const { session_id, visitor_id, events, chunk_index } = req.body;

    if (!session_id || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'session_id en events zijn verplicht.' });
    }

    const { error } = await supabase.from('session_recordings').insert({
      session_id,
      visitor_id:  visitor_id || null,
      events,
      chunk_index: chunk_index || 0,
    });

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('[Sessions] Opslaan fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

// GET /api/sessions/:sessionId — ophalen voor replay
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data, error } = await supabase
      .from('session_recordings')
      .select('events, chunk_index, created_at')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true })
      .limit(200); // Max 200 chunks per sessie

    if (error) throw error;

    // Combineer alle chunks tot één events array
    const allEvents = (data || []).flatMap(row => row.events);

    // Bereken duur op basis van timestamps in de events
    let duration = 0;
    if (allEvents.length >= 2) {
      const first = allEvents[0]?.timestamp;
      const last  = allEvents[allEvents.length - 1]?.timestamp;
      if (first && last) duration = Math.round((last - first) / 1000);
    }

    // Unieke pagina-URL's uit meta events
    const pageUrls = new Set();
    allEvents.forEach(e => {
      if (e?.data?.href) pageUrls.add(e.data.href);
    });

    res.json({
      session_id: sessionId,
      events:     allEvents,
      pageCount:  pageUrls.size || 1,
      duration,
      chunkCount: data?.length || 0,
    });
  } catch (err) {
    console.error('[Sessions] Ophalen fout:', err.message);
    res.status(500).json({ error: 'Interne serverfout.' });
  }
});

module.exports = router;
