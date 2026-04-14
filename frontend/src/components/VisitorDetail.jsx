import React from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

/**
 * Detailpaneel voor een geselecteerde bezoeker.
 * Toont bedrijfsinformatie, locatie en alle bezochte pagina's.
 */
export function VisitorDetail({ visitor, onClose }) {
  const { data, loading, error } = useApi(
    () => api.getVisitor(visitor.id),
    [visitor.id]
  );

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.companyName}>
              {visitor.is_interesting && <span style={styles.star}>★ </span>}
              {visitor.company_name || 'Onbekend bedrijf'}
            </div>
            <div style={styles.ip}>{visitor.ip_address}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Bedrijfsinformatie */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Bedrijfsinformatie</div>
          <div style={styles.grid}>
            <InfoRow label="Organisatie" value={data?.visitor?.org} />
            <InfoRow label="Stad" value={visitor.city} />
            <InfoRow label="Regio" value={visitor.region} />
            <InfoRow label="Land" value={visitor.country_name || visitor.country} />
            <InfoRow label="Postcode" value={data?.visitor?.postal} />
            <InfoRow label="Tijdzone" value={data?.visitor?.timezone} />
            <InfoRow label="Hostname" value={data?.visitor?.hostname} />
            <InfoRow label="Eerste bezoek" value={formatDate(visitor.first_seen)} />
            <InfoRow label="Laatste bezoek" value={formatDate(visitor.last_seen)} />
            <InfoRow label="Totaal bezoeken" value={`${visitor.visit_count}x`} />
          </div>
        </div>

        {/* Pagina's */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Bezochte pagina's
            {data?.pageViews && (
              <span style={styles.count}> ({data.pageViews.length})</span>
            )}
          </div>

          {loading && <div style={styles.loading}>Laden...</div>}
          {error && <div style={styles.error}>Fout: {error}</div>}

          {data?.pageViews && data.pageViews.length === 0 && (
            <div style={styles.empty}>Geen pagina's gevonden.</div>
          )}

          {data?.pageViews && data.pageViews.map((pv) => (
            <div key={pv.id} style={styles.pageView}>
              <div style={styles.pageUrl} title={pv.page_url}>
                {formatUrl(pv.page_url)}
              </div>
              {pv.page_title && (
                <div style={styles.pageTitle}>{pv.page_title}</div>
              )}
              <div style={styles.pageMeta}>
                <span>{formatDate(pv.created_at)}</span>
                {pv.duration_sec > 0 && (
                  <span style={styles.duration}> · {formatDuration(pv.duration_sec)}</span>
                )}
                {pv.referrer && (
                  <span style={styles.referrer}> · via {formatUrl(pv.referrer)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
        {label}:{' '}
      </span>
      <span style={{ color: '#333', fontSize: 14 }}>{value}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    background: '#fff',
    width: '100%', maxWidth: 520,
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #eee',
    background: '#1a3a5c',
    color: '#fff',
  },
  companyName: { fontSize: 20, fontWeight: 700, color: '#fff' },
  ip: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginTop: 4 },
  star: { color: '#fbbf24' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 20, color: 'rgba(255,255,255,0.7)', padding: 4,
    lineHeight: 1,
  },
  section: { padding: '20px 24px', borderBottom: '1px solid #f0f0f0' },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#888', marginBottom: 12,
  },
  count: { color: '#aaa', fontWeight: 400 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 },
  pageView: {
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 6,
  },
  pageUrl: {
    fontSize: 14, fontWeight: 600, color: '#1a3a5c',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pageTitle: { fontSize: 12, color: '#555', marginTop: 2 },
  pageMeta: { fontSize: 11, color: '#aaa', marginTop: 4 },
  duration: { color: '#22c55e', fontWeight: 600 },
  referrer: { color: '#94a3b8' },
  loading: { color: '#aaa', fontSize: 14, padding: '12px 0' },
  error: { color: '#ef4444', fontSize: 14 },
  empty: { color: '#aaa', fontSize: 14 },
};
