import React from 'react';

/**
 * Tabel met alle bezoekers.
 * Klikken op een rij opent de detailweergave.
 */
export function VisitorTable({ visitors, onSelect }) {
  if (!visitors || visitors.length === 0) {
    return (
      <div style={styles.empty}>
        Geen bezoekers gevonden.
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Bedrijf</th>
            <th style={styles.th}>Locatie</th>
            <th style={styles.th}>Land</th>
            <th style={styles.th}>Pagina's</th>
            <th style={styles.th}>Bezoeken</th>
            <th style={styles.th}>Laatste bezoek</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((v) => (
            <tr
              key={v.id}
              style={{
                ...styles.row,
                background: v.is_interesting ? '#fffbf0' : '#fff',
              }}
              onClick={() => onSelect(v)}
            >
              <td style={styles.td}>
                <div style={styles.company}>
                  {v.is_interesting && <span style={styles.star}>★</span>}
                  <div>
                    <div style={styles.companyName}>
                      {v.company_name || 'Onbekend bedrijf'}
                    </div>
                    <div style={styles.ip}>{v.ip_address}</div>
                  </div>
                </div>
              </td>
              <td style={styles.td}>{v.city || '—'}</td>
              <td style={styles.td}>{v.country_name || v.country || '—'}</td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                {v.total_page_views || 0}
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                {v.visit_count || 1}
              </td>
              <td style={styles.td}>{formatDate(v.last_seen)}</td>
              <td style={styles.td}>
                {v.is_interesting ? (
                  <span style={styles.badgeInteresting}>Interessant</span>
                ) : (
                  <span style={styles.badgeNormal}>Bezoeker</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const styles = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: 10,
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    fontSize: 14,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
    background: '#f8f9fa',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  row: {
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    verticalAlign: 'middle',
  },
  company: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  companyName: {
    fontWeight: 600,
    color: '#1a3a5c',
  },
  ip: {
    fontSize: 11,
    color: '#aaa',
    fontFamily: 'monospace',
  },
  star: {
    color: '#f59e0b',
    fontSize: 16,
  },
  badgeInteresting: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeNormal: {
    background: '#f0f4ff',
    color: '#4361ee',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#aaa',
    background: '#fff',
    borderRadius: 10,
  },
};
