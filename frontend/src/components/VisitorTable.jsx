import React from 'react';

function CompanyAvatar({ name }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  const hue = name
    ? (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 13) % 360
    : 200;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: `hsl(${hue},60%,25%)`,
      border: `1px solid hsl(${hue},60%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: `hsl(${hue},80%,75%)`,
    }}>
      {initials}
    </div>
  );
}

function FlagEmoji({ country }) {
  if (!country) return null;
  const flags = { NL:'🇳🇱', DE:'🇩🇪', BE:'🇧🇪', GB:'🇬🇧', US:'🇺🇸', FR:'🇫🇷',
    NO:'🇳🇴', DK:'🇩🇰', SE:'🇸🇪', FI:'🇫🇮', PL:'🇵🇱', ES:'🇪🇸', IT:'🇮🇹',
    SG:'🇸🇬', CN:'🇨🇳', JP:'🇯🇵', AU:'🇦🇺', CA:'🇨🇦', AE:'🇦🇪' };
  return <span title={country}>{flags[country.toUpperCase()] || '🌐'}</span>;
}

export function VisitorTable({ visitors, onSelect }) {
  if (!visitors || visitors.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🔭</div>
        <div style={styles.emptyText}>Nog geen bezoekers geregistreerd</div>
        <div style={styles.emptySub}>Bezoekers van becaone.com verschijnen hier zodra het tracking script actief is</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['Bedrijf', 'Locatie', 'Pagina\'s', 'Bezoeken', 'Laatste bezoek', ''].map(h => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visitors.map((v, i) => (
            <tr
              key={v.id}
              style={{ ...styles.row, animationDelay: `${i * 40}ms` }}
              onClick={() => onSelect(v)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={styles.td}>
                <div style={styles.company}>
                  <CompanyAvatar name={v.company_name} />
                  <div>
                    <div style={styles.companyName}>
                      {v.is_interesting && <span style={styles.star}>★ </span>}
                      {v.company_name || 'Onbekend bedrijf'}
                    </div>
                    <div style={styles.ip}>{v.ip_address}</div>
                  </div>
                </div>
              </td>
              <td style={styles.td}>
                <div style={styles.location}>
                  <FlagEmoji country={v.country} />
                  <span style={styles.locationText}>{[v.city, v.country_name].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </td>
              <td style={{ ...styles.td, ...styles.center }}>
                <span style={styles.pill}>{v.total_page_views || 0}</span>
              </td>
              <td style={{ ...styles.td, ...styles.center }}>
                <span style={styles.pill}>{v.visit_count || 1}x</span>
              </td>
              <td style={styles.td}>
                <div style={styles.dateText}>{formatDate(v.last_seen)}</div>
                <div style={styles.dateAgo}>{timeAgo(v.last_seen)}</div>
              </td>
              <td style={{ ...styles.td, ...styles.center }}>
                {v.is_interesting
                  ? <span style={styles.badgeHot}>🔥 Hot lead</span>
                  : <span style={styles.badgeNormal}>Bezoeker</span>}
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
  return new Date(iso).toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'zojuist';
  if (m < 60) return `${m}m geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

const styles = {
  wrapper: { borderRadius: 16, overflow: 'hidden', border: '1px solid #1e2d3d' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#475569', background: '#0d1526', borderBottom: '1px solid #1e2d3d',
    whiteSpace: 'nowrap',
  },
  row: { cursor: 'pointer', background: 'transparent', borderBottom: '1px solid #111e30' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  center: { textAlign: 'center' },
  company: { display: 'flex', alignItems: 'center', gap: 10 },
  companyName: { fontWeight: 600, color: '#e2e8f0', fontSize: 14 },
  star: { color: '#fbbf24' },
  ip: { fontSize: 11, color: '#475569', fontFamily: 'monospace', marginTop: 2 },
  location: { display: 'flex', alignItems: 'center', gap: 6 },
  locationText: { color: '#94a3b8', fontSize: 13 },
  pill: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid #1e2d3d',
    borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: '#94a3b8',
  },
  dateText: { fontSize: 13, color: '#94a3b8' },
  dateAgo: { fontSize: 11, color: '#475569', marginTop: 2 },
  badgeHot: {
    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
    color: '#fbbf24', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  badgeNormal: {
    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
    color: '#60a5fa', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  empty: {
    textAlign: 'center', padding: '60px 24px',
    background: '#0d1526', border: '1px solid #1e2d3d', borderRadius: 16,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#475569', maxWidth: 360, margin: '0 auto' },
};
