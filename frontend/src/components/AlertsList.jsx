import React from 'react';

/**
 * Lijst van recente meldingen voor interessante bedrijven.
 */
export function AlertsList({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={styles.empty}>
        Nog geen meldingen. Voeg bedrijven toe aan de watchlist om te starten.
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {alerts.map((alert) => {
        const v = alert.visitors;
        return (
          <div key={alert.id} style={styles.alert}>
            <div style={styles.alertIcon}>🚢</div>
            <div style={styles.alertBody}>
              <div style={styles.alertCompany}>
                {alert.company_name || v?.company_name || 'Onbekend'}
              </div>
              <div style={styles.alertMeta}>
                {v?.city && <span>{v.city}, </span>}
                {v?.country_name && <span>{v.country_name}</span>}
                {v?.visit_count && (
                  <span style={styles.visits}> · {v.visit_count}x bezocht</span>
                )}
              </div>
              <div style={styles.alertTime}>{formatDate(alert.triggered_at)}</div>
            </div>
            <div style={styles.alertStatus}>
              {alert.notified ? (
                <span style={styles.badgeSent}>✓ Verstuurd</span>
              ) : (
                <span style={styles.badgePending}>Wacht</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  alert: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    borderLeft: '4px solid #f59e0b',
  },
  alertIcon: { fontSize: 20 },
  alertBody: { flex: 1 },
  alertCompany: { fontWeight: 700, color: '#1a3a5c', fontSize: 15 },
  alertMeta: { fontSize: 13, color: '#666', marginTop: 2 },
  alertTime: { fontSize: 11, color: '#aaa', marginTop: 2 },
  visits: { color: '#4361ee', fontWeight: 600 },
  alertStatus: { flexShrink: 0 },
  badgeSent: {
    background: '#dcfce7', color: '#166534',
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  badgePending: {
    background: '#fef9c3', color: '#854d0e',
    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  empty: {
    color: '#aaa', fontSize: 14, padding: 24,
    background: '#fff', borderRadius: 8, textAlign: 'center',
  },
};
