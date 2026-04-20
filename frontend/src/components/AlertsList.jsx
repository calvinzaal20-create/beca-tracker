import React from 'react';

export function AlertsList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Geen meldingen</div>
        <div style={{ fontSize: 13, color: '#475569' }}>
          Voeg maritieme bedrijven toe aan <code style={{ background: '#1e2d3d', padding: '1px 6px', borderRadius: 4, color: '#60a5fa' }}>INTERESTING_COMPANIES</code> in Railway
        </div>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {alerts.map((alert) => {
        const v = alert.visitors;
        return (
          <div key={alert.id} style={styles.alert}>
            <div style={styles.alertLeft}>
              <div style={styles.alertDot} />
              <div style={styles.alertIcon}>🚢</div>
            </div>
            <div style={styles.alertBody}>
              <div style={styles.alertCompany}>{alert.company_name || v?.company_name || 'Onbekend'}</div>
              <div style={styles.alertMeta}>
                {v?.city && <span>{v.city}</span>}
                {v?.country_name && <span style={{ color: '#475569' }}> · {v.country_name}</span>}
                {v?.visit_count > 1 && <span style={styles.visits}> · {v.visit_count}x bezocht</span>}
              </div>
            </div>
            <div style={styles.alertRight}>
              <div style={styles.alertTime}>{formatDate(alert.triggered_at)}</div>
              {alert.notified
                ? <span style={styles.badgeSent}>✓ E-mail verstuurd</span>
                : <span style={styles.badgePending}>In wachtrij</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m geleden`;
  if (m < 1440) return `${Math.floor(m/60)}u geleden`;
  return d.toLocaleString('nl-NL', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: 1 },
  alert: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '16px 20px',
    background: '#0d1526', borderBottom: '1px solid #111e30',
    transition: 'background 0.15s',
  },
  alertLeft: { position: 'relative', flexShrink: 0 },
  alertDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: '50%',
    background: '#fbbf24',
    boxShadow: '0 0 6px #fbbf24',
  },
  alertIcon: { fontSize: 24 },
  alertBody: { flex: 1 },
  alertCompany: { fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 3 },
  alertMeta: { fontSize: 13, color: '#94a3b8' },
  visits: { color: '#60a5fa', fontWeight: 600 },
  alertRight: { textAlign: 'right', flexShrink: 0 },
  alertTime: { fontSize: 12, color: '#475569', marginBottom: 4 },
  badgeSent: {
    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
    color: '#34d399', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  badgePending: {
    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    color: '#fbbf24', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  empty: {
    textAlign: 'center', padding: '60px 24px',
    background: '#0d1526', border: '1px solid #1e2d3d', borderRadius: 16,
  },
};
