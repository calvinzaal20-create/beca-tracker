import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

/**
 * SessionPlayer — speelt een opgenomen browsersessie af via rrweb-player.
 * rrweb-player is geladen via CDN in index.html (window.rrwebPlayer).
 */
export function SessionPlayer({ sessionId, onClose }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const data = await api.getSession(sessionId);
        if (cancelled) return;

        if (!data.events || data.events.length === 0) {
          setError('Geen opname beschikbaar voor deze sessie.');
          setLoading(false);
          return;
        }

        setMeta({ pageCount: data.pageCount, duration: data.duration });
        setLoading(false);

        // Kleine vertraging zodat de container zichtbaar is voor rrweb
        setTimeout(() => {
          if (!containerRef.current || !window.rrwebPlayer) return;
          // Verwijder eventuele oude speler
          containerRef.current.innerHTML = '';
          playerRef.current = new window.rrwebPlayer({
            target: containerRef.current,
            props: {
              events: data.events,
              width: 860,
              height: 540,
              autoPlay: true,
              showController: true,
              speedOption: [1, 2, 4, 8],
            },
          });
        }, 100);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    loadSession();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>🎬 Sessie Replay</div>
            <div style={styles.subtitle}>
              {meta ? `${meta.pageCount} pagina's · ${formatDuration(meta.duration)}` : sessionId}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.playerWrap}>
          {loading && (
            <div style={styles.state}>
              <div style={styles.spinner} />
              <div>Sessie laden...</div>
            </div>
          )}
          {error && (
            <div style={styles.state}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ color: '#f87171', fontWeight: 600 }}>{error}</div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>
                Opnames worden opgeslagen vanaf het moment dat het nieuwe tracking script actief is.
              </div>
            </div>
          )}
          <div ref={containerRef} style={{ display: loading || error ? 'none' : 'block' }} />
        </div>
      </div>
    </div>
  );
}

function formatDuration(sec) {
  if (!sec) return 'onbekend';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  modal: {
    background: '#0d1526', border: '1px solid #1e2d3d',
    borderRadius: 20, overflow: 'hidden',
    width: '100%', maxWidth: 920,
    boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #1e2d3d',
    background: 'rgba(255,255,255,0.02)',
  },
  title: { fontSize: 17, fontWeight: 700, color: '#e2e8f0' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  closeBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid #1e2d3d',
    color: '#94a3b8', width: 32, height: 32, borderRadius: 8,
    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  playerWrap: {
    padding: 24, minHeight: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  state: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid #1e2d3d', borderTopColor: '#3b82f6',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
  },
};
