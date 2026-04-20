import React from 'react';

const COUNTRY_FLAGS = {
  NL:'🇳🇱',DE:'🇩🇪',BE:'🇧🇪',GB:'🇬🇧',US:'🇺🇸',FR:'🇫🇷',
  NO:'🇳🇴',DK:'🇩🇰',SE:'🇸🇪',FI:'🇫🇮',PL:'🇵🇱',ES:'🇪🇸',
  IT:'🇮🇹',SG:'🇸🇬',CN:'🇨🇳',JP:'🇯🇵',AU:'🇦🇺',CA:'🇨🇦',AE:'🇦🇪',
};

function Avatar({ name }) {
  const c = name ? name.trim()[0].toUpperCase() : '?';
  const hue = name ? [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360 : 220;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: `hsl(${hue},40%,16%)`,
      border: `1px solid hsl(${hue},40%,22%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, color: `hsl(${hue},60%,70%)`,
      letterSpacing: '0.03em',
    }}>{c}</div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)   return 'zojuist';
  if (d < 3600) return `${Math.floor(d/60)}m`;
  if (d < 86400)return `${Math.floor(d/3600)}u`;
  return `${Math.floor(d/86400)}d`;
}

export function VisitorTable({ visitors, onSelect }) {
  if (!visitors?.length) return (
    <div style={{ textAlign:'center', padding:'64px 24px', color:'#3f3f46' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
      <div style={{ fontSize: 14, color: '#52525b' }}>Geen bezoekers gevonden</div>
    </div>
  );

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Bedrijf', 'Locatie', 'Pagina\'s', 'Bezoeken', 'Gezien'].map(h => (
              <th key={h} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 11, fontWeight: 500, color: '#52525b',
                background: '#0d0d11', whiteSpace: 'nowrap',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visitors.map(v => (
            <tr key={v.id}
              onClick={() => onSelect(v)}
              style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Avatar name={v.company_name} />
                  <div>
                    <div style={{ fontWeight: 500, color: '#fafafa', fontSize: 13, display:'flex', alignItems:'center', gap:6 }}>
                      {v.company_name || 'Onbekend'}
                      {v.is_interesting && (
                        <span style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', color:'#fbbf24', fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4 }}>
                          HOT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'#3f3f46', fontFamily:'monospace', marginTop:2 }}>{v.ip_address}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding:'12px 16px', fontSize:13, color:'#71717a' }}>
                {v.country && <span style={{ marginRight:6 }}>{COUNTRY_FLAGS[v.country] || '🌐'}</span>}
                {v.city || v.country_name || '—'}
              </td>
              <td style={{ padding:'12px 16px', textAlign:'center', fontSize:13, color:'#a1a1aa' }}>
                {v.total_page_views || 0}
              </td>
              <td style={{ padding:'12px 16px', textAlign:'center', fontSize:13, color:'#a1a1aa' }}>
                {v.visit_count || 1}
              </td>
              <td style={{ padding:'12px 16px', fontSize:12, color:'#52525b' }}>
                {timeAgo(v.last_seen)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
