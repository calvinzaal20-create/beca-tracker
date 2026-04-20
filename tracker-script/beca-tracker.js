/**
 * BECA One Visitor Tracker + Session Recorder
 * Versie: 2.0.0
 *
 * Plaatsing op becaone.com — vlak voor </body>:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
 *   <script>
 *     (function() { ... dit script ... })();
 *   </script>
 *
 * Of inline (alles in één blok) — zie onderstaand inline voorbeeld.
 */

(function () {
  'use strict';

  var TRACK_ENDPOINT   = 'https://beca-tracker-production.up.railway.app/api/track';
  var SESSION_ENDPOINT = 'https://beca-tracker-production.up.railway.app/api/sessions';
  var HEARTBEAT_MS     = 15000;   // Heartbeat interval
  var RECORD_FLUSH_MS  = 10000;   // Stuur recording events elke 10 seconden
  var SESSION_KEY      = 'beca_sid';

  /* ── Hulpfuncties ── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getSessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (!id) { id = uid(); sessionStorage.setItem(SESSION_KEY, id); }
      return id;
    } catch (e) { return uid(); }
  }

  function send(endpoint, payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* ── Page view tracking ── */
  var sessionId   = getSessionId();
  var startTime   = Date.now();
  var currentUrl  = location.href;
  var visitorId   = null; // Opgeslagen na eerste track response
  var hbTimer     = null;
  var lastUrl     = location.href;

  function trackPage() {
    startTime  = Date.now();
    currentUrl = location.href;

    // Gebruik fetch zodat we visitorId kunnen opslaan
    try {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:       'pageview',
          session_id:  sessionId,
          page_url:    currentUrl,
          page_title:  document.title || '',
          referrer:    document.referrer || '',
          duration_sec: 0,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.visitor_id) visitorId = d.visitor_id; })
        .catch(function () {});
    } catch (e) {}

    clearInterval(hbTimer);
    hbTimer = setInterval(function () {
      send(TRACK_ENDPOINT, {
        event:       'heartbeat',
        session_id:  sessionId,
        page_url:    currentUrl,
        duration_sec: Math.round((Date.now() - startTime) / 1000),
      });
    }, HEARTBEAT_MS);
  }

  function onLeave() {
    clearInterval(hbTimer);
    var dur = Math.round((Date.now() - startTime) / 1000);
    if (dur > 1) {
      send(TRACK_ENDPOINT, {
        event:       'heartbeat',
        session_id:  sessionId,
        page_url:    currentUrl,
        duration_sec: dur,
      });
    }
  }

  /* ── SPA navigatie detectie ── */
  function checkNav() {
    if (location.href !== lastUrl) {
      onLeave(); lastUrl = location.href; trackPage();
    }
  }

  var _push    = history.pushState;
  var _replace = history.replaceState;
  history.pushState    = function () { _push.apply(this, arguments);    setTimeout(checkNav, 0); };
  history.replaceState = function () { _replace.apply(this, arguments); setTimeout(checkNav, 0); };
  window.addEventListener('popstate',     function () { setTimeout(checkNav, 0); });
  window.addEventListener('beforeunload', onLeave);
  window.addEventListener('pagehide',     onLeave);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden')  onLeave();
    if (document.visibilityState === 'visible') startTime = Date.now();
  });

  /* ── Session recording via rrweb ── */
  var recordEvents  = [];
  var chunkIndex    = 0;
  var stopRecording = null;
  var flushTimer    = null;

  function flushRecording(force) {
    if (recordEvents.length === 0) return;
    var chunk = recordEvents.splice(0); // leegmaken en kopie nemen
    send(SESSION_ENDPOINT, {
      session_id:  sessionId,
      visitor_id:  visitorId,
      events:      chunk,
      chunk_index: chunkIndex++,
    });
  }

  function startRecording() {
    if (typeof window.rrweb === 'undefined') return; // rrweb niet geladen

    stopRecording = window.rrweb.record({
      emit: function (event) {
        recordEvents.push(event);
      },
      // Privacy: mask wachtwoorden en verborgen inputs
      maskInputOptions: { password: true },
      // Sla geen tekst op in invoervelden (privacy)
      maskAllInputs: false,
      // Blokkeer bepaalde elementen (bv. creditcard velden)
      blockClass: 'beca-no-record',
      maskTextClass: 'beca-mask',
    });

    // Flush elke 10 seconden
    flushTimer = setInterval(flushRecording, RECORD_FLUSH_MS);

    // Flush bij pagina verlaten
    window.addEventListener('beforeunload', function () {
      flushRecording(true);
      if (stopRecording) stopRecording();
    });
  }

  /* ── Start ── */
  lastUrl = location.href;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackPage();
      startRecording();
    });
  } else {
    trackPage();
    startRecording();
  }

  // Publieke debug interface
  window.__beca = { sessionId: sessionId, getVisitorId: function () { return visitorId; } };
})();
