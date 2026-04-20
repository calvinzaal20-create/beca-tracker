import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../api/client';

export function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refresh } = useApi(() => api.getAnalytics(days), [days]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorBox msg={error} />;
  if (!data)   return null;

  const { sessionStats: s, pagePerformance, topPaths,
          topEntryPages, topExitPages, peakHours,
          engagementLeaderboard, insights } = data;

  const peakMax = Math.max(...peakHours.map(h => h.count), 1);

  return (
    <div>
      {/* Periode + refresh */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:28 }}>
        {[7, 30, 90].map(d => (
          <button key={d}
            onClick={() => setDays(d)}
            style={{
              padding:'5px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
              border: days === d ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
              background: days === d ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: days === d ? '#3b82f6' : '#52525b',
            }}>
            {d} dagen
          </button>
        ))}
        <button
          onClick={refresh}
          style={{
            marginLeft:'auto', padding:'5px 14px', borderRadius:8, fontSize:12,
            border:'1px solid rgba(255,255,255,0.07)', background:'transparent',
            color:'#3f3f46', cursor:'pointer',
          }}>
          ↻ Vernieuwen
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <KpiCard label="Sessies"         value={s.totalSessions} />
        <KpiCard label="Pagina's/sessie" value={s.avgPagesPerSession} />
        <KpiCard label="Gem. sessieduur" value={fmtDur(s.avgSessionDuration)} />
        <KpiCard label="Bounce rate"     value={`${s.bounceRate}%`}
          color={s.bounceRate > 60 ? '#ef4444' : s.bounceRate < 30 ? '#22c55e' : '#fbbf24'} />
        <KpiCard label="Terugkeerquote"  value={`${s.returnRate}%`}
          color={s.returnRate > 25 ? '#22c55e' : '#71717a'} />
        <KpiCard label="Terugk. bedrijven" value={s.returningVisitors} />
      </div>

      {/* Aanbevelingen */}
      {insights.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <SectionLabel>Automatische aanbevelingen</SectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {insights.map((ins, i) => {
              const colors = {
                positive: { border:'rgba(34,197,94,0.2)',  bg:'rgba(34,197,94,0.05)',  dot:'#22c55e' },
                warning:  { border:'rgba(239,68,68,0.2)',  bg:'rgba(239,68,68,0.05)',  dot:'#ef4444' },
                tip:      { border:'rgba(59,130,246,0.2)', bg:'rgba(59,130,246,0.05)', dot:'#3b82f6' },
              };
              const c = colors[ins.type] || colors.tip;
              return (
                <div key={i} style={{
                  display:'flex', gap:14, padding:'14px 18px', borderRadius:10,
                  background:c.bg, border:`1px solid ${c.border}`, alignItems:'flex-start',
                }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0, marginTop:5 }} />
                  <div>
                    <div style={{ fontWeight:600, color:'#fafafa', fontSize:13, marginBottom:3 }}>{ins.title}</div>
                    <div style={{ fontSize:12, color:'#71717a', lineHeight:1.5 }}>{ins.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Twee kolommen: pagina performance + engagement */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Pagina performance */}
        <Card>
          <SectionLabel>Pagina performance</SectionLabel>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>
                  {['Pagina','Views','Tijd','Bounce','Score'].map(h => (
                    <th key={h} style={{
                      padding:'7px 10px', textAlign:'left',
                      fontSize:10, fontWeight:500, color:'#3f3f46',
                      textTransform:'uppercase', letterSpacing:'0.05em',
                      borderBottom:'1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagePerformance.slice(0, 10).map(p => (
                  <tr key={p.url} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'9px 10px', maxWidth:140 }}>
                      <div style={{ fontFamily:'monospace', fontSize:11, color:'#60a5fa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={p.url}>
                        {p.url}
                      </div>
                    </td>
                    <td style={{ padding:'9px 10px', textAlign:'center', color:'#a1a1aa' }}>{p.views}</td>
                    <td style={{ padding:'9px 10px', textAlign:'center' }}>
                      <span style={{ color: p.avgDuration > 60 ? '#22c55e' : p.avgDuration > 20 ? '#fbbf24' : '#ef4444', fontSize:11 }}>
                        {p.avgDuration > 0 ? fmtDur(p.avgDuration) : '—'}
                      </span>
                    </td>
                    <td style={{ padding:'9px 10px', textAlign:'center' }}>
                      <span style={{ color: p.bounceRate > 60 ? '#ef4444' : p.bounceRate < 30 ? '#22c55e' : '#fbbf24', fontSize:11 }}>
                        {p.bounceRate}%
                      </span>
                    </td>
                    <td style={{ padding:'9px 10px', textAlign:'center' }}>
                      <ScoreBar score={p.engagementScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Engagement leaderboard */}
        <Card>
          <SectionLabel>Engagement leaderboard</SectionLabel>
          {engagementLeaderboard.length === 0
            ? <Empty />
            : engagementLeaderboard.map((e, i) => (
              <div key={e.visitorId} style={{
                display:'flex', alignItems:'center', gap:12, padding:'9px 0',
                borderBottom:'1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ fontSize:11, color:'#3f3f46', fontWeight:600, width:20, textAlign:'center' }}>
                  {i + 1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color: e.isInteresting ? '#fbbf24' : '#fafafa',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {e.companyName}
                  </div>
                  <div style={{ fontSize:11, color:'#52525b', marginTop:2 }}>
                    {e.pageViews} views · {e.sessions} sessies · {fmtDur(e.totalDuration)}
                  </div>
                </div>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:600, lineHeight:1, color: scoreColor(e.score) }}>{e.score}</div>
                  <div style={{ fontSize:9, color:'#3f3f46', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:2 }}>score</div>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* Twee kolommen: navigatiepaden + entry/exit */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Navigatiepaden */}
        <Card>
          <SectionLabel>Meest gevolgde routes</SectionLabel>
          {topPaths.length === 0
            ? <Empty text="Minimaal 2 pagina's per sessie nodig" />
            : topPaths.map((p, i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', gap:8,
              }}>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#71717a',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                  {p.path}
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:'#3b82f6', flexShrink:0 }}>{p.count}×</span>
              </div>
            ))
          }
        </Card>

        {/* Entry & Exit */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <SectionLabel>Instappagina's</SectionLabel>
            {topEntryPages.map((p, i) => (
              <MiniBar key={i} label={p.url} value={p.count} max={topEntryPages[0]?.count || 1} color="#3b82f6" />
            ))}
          </Card>
          <Card>
            <SectionLabel>Exitpagina's</SectionLabel>
            {topExitPages.map((p, i) => (
              <MiniBar key={i} label={p.url} value={p.count} max={topExitPages[0]?.count || 1} color="#8b5cf6" />
            ))}
          </Card>
        </div>
      </div>

      {/* Piekuren */}
      <Card>
        <SectionLabel>Activiteit per uur van de dag</SectionLabel>
        <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:100, marginBottom:8 }}>
          {peakHours.map(({ hour, count }) => {
            const isPeak = count === Math.max(...peakHours.map(h => h.count));
            return (
              <div key={hour} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ height:80, display:'flex', alignItems:'flex-end' }}>
                  <div style={{
                    width:'100%', minWidth:6,
                    height:`${Math.max(2, (count / peakMax) * 80)}px`,
                    background: isPeak ? '#3b82f6' : 'rgba(59,130,246,0.25)',
                    borderRadius:'3px 3px 0 0',
                    transition:'height 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize:9, color:'#3f3f46' }}>{String(hour).padStart(2,'0')}</div>
              </div>
            );
          })}
        </div>
        {(() => {
          const peak = peakHours.reduce((a, b) => b.count > a.count ? b : a, peakHours[0]);
          return peak?.count > 0 ? (
            <div style={{ fontSize:12, color:'#52525b', textAlign:'center' }}>
              Piekuur: <span style={{ color:'#fafafa' }}>{String(peak.hour).padStart(2,'0')}:00–{String(peak.hour+1).padStart(2,'0')}:00</span>
              {' '}({peak.count} pageviews)
            </div>
          ) : (
            <div style={{ fontSize:12, color:'#3f3f46', textAlign:'center' }}>Nog geen piekuurdata</div>
          );
        })()}
      </Card>
    </div>
  );
}

/* ── Sub-componenten ── */

function Card({ children }) {
  return (
    <div style={{
      background:'#111115', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:12, padding:'18px 20px',
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:10, fontWeight:600, textTransform:'uppercase',
      letterSpacing:'0.07em', color:'#3f3f46', marginBottom:14,
    }}>
      {children}
    </div>
  );
}

function KpiCard({ label, value, color = '#fafafa' }) {
  return (
    <div style={{
      flex:'1 1 130px', background:'#111115',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:12, padding:'16px 20px', textAlign:'center',
    }}>
      <div style={{ fontSize:26, fontWeight:600, lineHeight:1, marginBottom:6, color }}>{value}</div>
      <div style={{ fontSize:10, color:'#3f3f46', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        {label}
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#fbbf24' : '#ef4444';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center' }}>
      <div style={{ width:40, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background:color, borderRadius:2 }} />
      </div>
      <span style={{ fontSize:10, color, fontWeight:600, width:22 }}>{score}</span>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
      <div style={{ width:110, fontSize:11, color:'#71717a', fontFamily:'monospace',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}
        title={label}>{label}</div>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${(value/max)*100}%`, background:color, borderRadius:2, transition:'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:'#52525b', width:18, textAlign:'right' }}>{value}</div>
    </div>
  );
}

function Empty({ text = 'Geen data beschikbaar' }) {
  return <div style={{ color:'#3f3f46', fontSize:12, padding:'10px 0', textAlign:'center' }}>{text}</div>;
}

function LoadingSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {[80, 200, 160].map((h, i) => (
        <div key={i} style={{
          height:h, borderRadius:12,
          background:'#111115',
          border:'1px solid rgba(255,255,255,0.07)',
          animation:'pulse 1.5s infinite',
        }} />
      ))}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
      borderRadius:12, padding:'16px 20px', color:'#ef4444', fontSize:13,
    }}>
      Fout: {msg}
    </div>
  );
}

function fmtDur(sec) {
  if (!sec || sec === 0) return '0s';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}

function scoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#fbbf24';
  return '#71717a';
}
