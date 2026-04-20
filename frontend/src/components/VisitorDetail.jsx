import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';
import { SessionPlayer } from './SessionPlayer';

export function VisitorDetail({ visitor, onClose }) {
  const [activeSession, setActiveSession] = useState(null);

  const { data, loading, error } = useApi(
    () => api.getVisitor(visitor.id),
    [visitor.id]
  );

  const sessions = groupBySessions(data?.pageViews || []);
  const initials  = getInitials(visitor.company_name);
  const hue = visitor.company_name
    ? [...visitor.company_name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360
    : 220;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'flex-end',
        }}
      >
        {/* Panel */}
        <div style={{
          background: '#0d0d11',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          width: '100%', maxWidth: 520, height: '100vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
          animation: 'slideIn 0.22s ease',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: `hsl(${hue},40%,14%)`,
                border: `1px solid hsl(${hue},40%,20%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 600, color: `hsl(${hue},60%,65%)`,
              }}>{initials}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#fafafa' }}>
                    {visitor.company_name || 'Onbekend bedrijf'}
                  </span>
                  {visitor.is_interesting && (
                    <span style={{
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                      color: '#fbbf24', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                    }}>HOT</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#3f3f46', marginTop: 2, fontFamily: 'monospace' }}>
                  {data?.visitor?.org || visitor.ip_address}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                color: '#52525b', width: 30, height: 30, borderRadius: 8,
                cursor: 'pointer', fontSize: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >✕</button>
          </div>

          {/* Stat strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {[
              { label: 'Bezoeken',  value: visitor.visit_count || 1 },
              { label: "Pagina's",  value: data?.pageViews?.length || 0 },
              { label: 'Sessies',   value: Object.keys(sessions).length },
              { label: 'Land',      value: visitor.country || '—' },
            ].map(({ label, value }, i) => (
              <div key={label} style={{
                padding: '14px 0', textAlign: 'center',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#fafafa', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: '#3f3f46', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* Bedrijfsinformatie */}
            <Section title="Bedrijfsinformatie">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                {[
                  { label: 'Stad',          value: visitor.city },
                  { label: 'Regio',         value: visitor.region },
                  { label: 'Land',          value: visitor.country_name },
                  { label: 'Postcode',      value: data?.visitor?.postal },
                  { label: 'Tijdzone',      value: data?.visitor?.timezone },
                  { label: 'Hostname',      value: data?.visitor?.hostname },
                  { label: 'Eerste bezoek', value: formatDate(visitor.first_seen) },
                  { label: 'Laatste bezoek',value: formatDate(visitor.last_seen) },
                ].filter(i => i.value).map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#3f3f46', marginBottom: 3, letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#a1a1aa' }}>{value}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Sessies */}
            <Section title={`Sessies (${Object.keys(sessions).length})`}>
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[0,1].map(i => (
                    <div key={i} style={{ height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              )}
              {error && (
                <div style={{ color: '#ef4444', fontSize: 13, padding: '8px 0' }}>{error}</div>
              )}
              {Object.entries(sessions).map(([sid, pages]) => (
                <div key={sid} style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, marginBottom: 8, overflow: 'hidden',
                }}>
                  {/* Session header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#fafafa' }}>Sessie</div>
                      <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 1 }}>{formatDate(pages[0]?.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#52525b' }}>
                        {pages.length} pagina{pages.length !== 1 ? "'s" : ''}
                      </span>
                      <button
                        onClick={() => setActiveSession(sid)}
                        style={{
                          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                          color: '#3b82f6', padding: '4px 10px', borderRadius: 6,
                          cursor: 'pointer', fontSize: 11, fontWeight: 500,
                        }}
                      >▶ Replay</button>
                    </div>
                  </div>
                  {/* Page list */}
                  <div style={{ padding: '4px 0' }}>
                    {pages.map(pv => (
                      <div key={pv.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(59,130,246,0.4)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatUrl(pv.page_url)}
                          </div>
                          {pv.page_title && (
                            <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 1 }}>{pv.page_title}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, flexShrink: 0 }}>
                          {pv.duration_sec > 0 ? formatDuration(pv.duration_sec) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && Object.keys(sessions).length === 0 && (
                <div style={{ color: '#3f3f46', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  Nog geen paginabezoeken geregistreerd.
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>

      {activeSession && (
        <SessionPlayer sessionId={activeSession} onClose={() => setActiveSession(null)} />
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#3f3f46', marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function groupBySessions(pageViews) {
  return pageViews.reduce((acc, pv) => {
    const key = pv.session_id || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(pv);
    return acc;
  }, {});
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatUrl(url) {
  try { return new URL(url).pathname || '/'; } catch { return url; }
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
