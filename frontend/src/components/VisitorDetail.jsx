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

  // Groepeer page views per sessie
  const sessions = groupBySessions(data?.pageViews || []);

  return (
    <>
      <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={styles.panel}>

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <div style={styles.avatar}>{getInitials(visitor.company_name)}</div>
              <div>
                <div style={styles.companyName}>
                  {visitor.is_interesting && <span style={styles.star}>★ </span>}
                  {visitor.company_name || 'Onbekend bedrijf'}
                </div>
                <div style={styles.orgLine}>{data?.visitor?.org || visitor.ip_address}</div>
              </div>
            </div>
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* Stat strip */}
          <div style={styles.statStrip}>
            <StripStat label="Bezoeken" value={visitor.visit_count || 1} />
            <StripStat label="Pagina's" value={data?.pageViews?.length || 0} />
            <StripStat label="Sessies" value={Object.keys(sessions).length} />
            <StripStat label="Land" value={visitor.country_name || visitor.country || '—'} />
          </div>

          <div style={styles.body}>
            {/* Locatie & info */}
            <Section title="Bedrijfsinformatie">
              <InfoGrid items={[
                { label: 'Stad', value: visitor.city },
                { label: 'Regio', value: visitor.region },
                { label: 'Land', value: visitor.country_name },
                { label: 'Postcode', value: data?.visitor?.postal },
                { label: 'Tijdzone', value: data?.visitor?.timezone },
                { label: 'Hostname', value: data?.visitor?.hostname },
                { label: 'Eerste bezoek', value: formatDate(visitor.first_seen) },
                { label: 'Laatste bezoek', value: formatDate(visitor.last_seen) },
              ]} />
            </Section>

            {/* Sessies met replay knop */}
            <Section title={`Sessies (${Object.keys(sessions).length})`}>
              {loading && <div style={styles.loading}>Laden...</div>}
              {error && <div style={styles.error}>{error}</div>}
              {Object.entries(sessions).map(([sid, pages]) => (
                <div key={sid} style={styles.sessionCard}>
                  <div style={styles.sessionHeader}>
                    <div>
                      <div style={styles.sessionId}>Sessie</div>
                      <div style={styles.sessionDate}>{formatDate(pages[0]?.created_at)}</div>
                    </div>
                    <div style={styles.sessionRight}>
                      <span style={styles.pageCount}>{pages.length} pagina{pages.length !== 1 ? "'s" : ''}</span>
                      <button
                        style={styles.replayBtn}
                        onClick={() => setActiveSession(sid)}
                        title="Bekijk sessie replay"
                      >
                        ▶ Replay
                      </button>
                    </div>
                  </div>
                  <div style={styles.pageList}>
                    {pages.map(pv => (
                      <div key={pv.id} style={styles.pageRow}>
                        <div style={styles.pageUrlDot} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.pageUrl}>{formatUrl(pv.page_url)}</div>
                          {pv.page_title && <div style={styles.pageTitle}>{pv.page_title}</div>}
                        </div>
                        <div style={styles.pageDuration}>
                          {pv.duration_sec > 0 ? formatDuration(pv.duration_sec) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && Object.keys(sessions).length === 0 && (
                <div style={styles.empty}>Nog geen paginabezoeken geregistreerd.</div>
              )}
            </Section>
          </div>
        </div>
      </div>

      {/* Session replay modal */}
      {activeSession && (
        <SessionPlayer sessionId={activeSession} onClose={() => setActiveSession(null)} />
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StripStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {items.filter(i => i.value).map(({ label, value }) => (
        <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#475569', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{value}</div>
        </div>
      ))}
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
  return new Date(iso).toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function formatUrl(url) {
  try { return new URL(url).pathname || '/'; } catch { return url; }
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    background: '#0a0f1e', borderLeft: '1px solid #1e2d3d',
    width: '100%', maxWidth: 520, height: '100vh', display: 'flex', flexDirection: 'column',
    boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #1e2d3d',
    background: 'linear-gradient(135deg, #0d1a2e 0%, #0a1628 100%)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.2)',
    border: '1px solid rgba(59,130,246,0.3)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 700, color: '#60a5fa',
  },
  companyName: { fontSize: 18, fontWeight: 700, color: '#e2e8f0' },
  star: { color: '#fbbf24' },
  orgLine: { fontSize: 12, color: '#475569', marginTop: 3, fontFamily: 'monospace' },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid #1e2d3d',
    color: '#64748b', width: 32, height: 32, borderRadius: 8,
    cursor: 'pointer', fontSize: 16, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statStrip: {
    display: 'flex', padding: '16px 24px', gap: 8,
    borderBottom: '1px solid #1e2d3d',
    background: 'rgba(255,255,255,0.02)',
  },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  sessionCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2d3d',
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
  },
  sessionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid #111e30',
  },
  sessionId: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  sessionDate: { fontSize: 11, color: '#475569', marginTop: 2 },
  sessionRight: { display: 'flex', alignItems: 'center', gap: 10 },
  pageCount: { fontSize: 11, color: '#475569' },
  replayBtn: {
    background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', padding: '5px 12px', borderRadius: 8,
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  pageList: { padding: '8px 16px' },
  pageRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: '1px solid #0d1526' },
  pageUrlDot: { width: 6, height: 6, borderRadius: '50%', background: '#1e3a5f', marginTop: 5, flexShrink: 0 },
  pageUrl: { fontSize: 12, fontFamily: 'monospace', color: '#60a5fa', wordBreak: 'break-all' },
  pageTitle: { fontSize: 11, color: '#475569', marginTop: 2 },
  pageDuration: { fontSize: 11, color: '#34d399', fontWeight: 600, flexShrink: 0 },
  loading: { color: '#475569', fontSize: 13, padding: '12px 0' },
  error: { color: '#f87171', fontSize: 13 },
  empty: { color: '#475569', fontSize: 13, textAlign: 'center', padding: '24px 0' },
};
