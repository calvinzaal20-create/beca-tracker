/**
 * BECA One - Visitor Tracker Script
 * Versie: 1.0.0
 *
 * Plaatsing: voeg onderstaande <script> tag toe aan elke pagina van de BECA One website,
 * vlak voor de sluitende </body> tag:
 *
 *   <script src="/beca-tracker.js" data-endpoint="https://jouw-backend.nl/api/track"></script>
 *
 * Of met inline configuratie:
 *
 *   <script>
 *     window.BECA_TRACKER_ENDPOINT = 'https://jouw-backend.nl/api/track';
 *   </script>
 *   <script src="/beca-tracker.js"></script>
 *
 * Het script is ~2KB geminimificeerd en heeft geen externe afhankelijkheden.
 */

(function () {
  'use strict';

  // --- Configuratie ---
  const ENDPOINT =
    window.BECA_TRACKER_ENDPOINT ||
    document.currentScript?.getAttribute('data-endpoint') ||
    'http://localhost:3001/api/track';

  const HEARTBEAT_INTERVAL_MS = 15000; // Stuur elke 15 sec een heartbeat
  const SESSION_KEY = 'beca_session_id';

  // --- Hulpfuncties ---

  /** Genereert een willekeurige sessie-ID (per browsertab, resetbaar) */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  /** Haalt bestaande sessie-ID op of maakt een nieuwe aan */
  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = generateId();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      return generateId();
    }
  }

  /** Stuur data naar de backend (fire-and-forget, crasht nooit de pagina) */
  function sendEvent(payload) {
    try {
      // Gebruik sendBeacon als beschikbaar (werkt ook bij pagina-verlating)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        });
        navigator.sendBeacon(ENDPOINT, blob);
      } else {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Nooit fouten gooien naar de bezoekers-pagina
    }
  }

  // --- Tracking logica ---

  const sessionId = getSessionId();
  let startTime = Date.now();
  let currentUrl = location.href;
  let heartbeatTimer = null;

  /** Stuurt een page view event voor de huidige pagina */
  function trackPageView() {
    startTime = Date.now();
    currentUrl = location.href;

    sendEvent({
      event: 'pageview',
      session_id: sessionId,
      page_url: currentUrl,
      page_title: document.title || '',
      referrer: document.referrer || '',
      duration_sec: 0,
    });

    // Start heartbeat
    clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  /** Stuurt verblijfsduur update */
  function sendHeartbeat() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    sendEvent({
      event: 'heartbeat',
      session_id: sessionId,
      page_url: currentUrl,
      duration_sec: duration,
    });
  }

  /** Stopt heartbeat en stuurt laatste duratie bij pagina-verlating */
  function handlePageLeave() {
    clearInterval(heartbeatTimer);
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (duration > 1) {
      sendEvent({
        event: 'heartbeat',
        session_id: sessionId,
        page_url: currentUrl,
        duration_sec: duration,
      });
    }
  }

  // --- SPA-ondersteuning (React, Vue, etc.) ---
  // Luistert naar URL-wijzigingen zonder volledige pagina-herlaad

  let lastTrackedUrl = '';

  function checkUrlChange() {
    if (location.href !== lastTrackedUrl) {
      handlePageLeave();
      lastTrackedUrl = location.href;
      trackPageView();
    }
  }

  // Overschrijf History API om navigatie te detecteren
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(checkUrlChange, 0);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(checkUrlChange, 0);
  };

  window.addEventListener('popstate', () => setTimeout(checkUrlChange, 0));

  // --- Pagina verlaten ---
  window.addEventListener('beforeunload', handlePageLeave);
  window.addEventListener('pagehide', handlePageLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') handlePageLeave();
    if (document.visibilityState === 'visible') {
      startTime = Date.now(); // Reset timer na terugkeer
    }
  });

  // --- Start ---
  lastTrackedUrl = location.href;

  // Wacht tot DOM geladen is voor de paginatitel
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // Maak de sessie-ID beschikbaar voor debugging
  window.__beca_session = sessionId;
})();
