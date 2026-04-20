import React from 'react';

export function AlertsList({ alerts }) {
  if (!alerts?.length) return (
    <div style={{ textAlign:'center', padding:'64px 24px' }}>
      <div style={{ fontSize:13, color:'#52525b' }}>Geen meldingen — voeg bedrijven toe aan <code style={{ background:'rgba(255,255,255,0.06)', padding:'2px 6px', borderRadius:4, fontSize:12 }}>INTERESTING_COMPANIES</code></div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      {alerts.map(a => {
        const v = a.visitors;
        const ago = timeAgo(a.triggered_at);
        return (
          <div key={a.id} style={{
            display:'flex', alignItems:'center', gap:14,
            padding:'14px 20px',
            background:'#111115',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:10,
          }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏢</div>
              <div style={{ position:'absolute', top:-3, right:-3, width:8, height:8, borderRadius:'50%', background:'#fbbf24', border:'2px solid #08080a' }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, color:'#fafafa', fontSize:14 }}>{a.company_name || v?.company_name}</div>
              <div style={{ fontSize:12, color:'#52525b', marginTop:2 }}>
                {[v?.city, v?.country_name].filter(Boolean).join(', ')}
                {v?.visit_count > 1 && <span style={{ color:'#3b82f6', marginLeft:8, fontWeight:500 }}>{v.visit_count}x bezocht</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:12, color:'#3f3f46', marginBottom:4 }}>{ago}</div>
              {a.notified
                ? <span style={{ fontSize:11, color:'#22c55e', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', padding:'2px 8px', borderRadius:4 }}>Verzonden</span>
                : <span style={{ fontSize:11, color:'#52525b', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', padding:'2px 8px', borderRadius:4 }}>Wacht</span>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)    return 'zojuist';
  if (d < 3600)  return `${Math.floor(d/60)}m geleden`;
  if (d < 86400) return `${Math.floor(d/3600)}u geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day:'2-digit', month:'short' });
}
