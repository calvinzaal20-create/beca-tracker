import React, { useState, useCallback, useEffect } from 'react';
import { useApi } from './hooks/useApi';
import { api } from './api/client';
import { StatCard } from './components/StatCard';
import { VisitorTable } from './components/VisitorTable';
import { VisitorDetail } from './components/VisitorDetail';
import { AlertsList } from './components/AlertsList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

const TABS = [
  { id: 'overview',  label: 'Overzicht', icon: IconOverview },
  { id: 'visitors',  label: 'Bezoekers', icon: IconVisitors },
  { id: 'analytics', label: 'Analyses',  icon: IconAnalytics },
  { id: 'alerts',    label: 'Meldingen', icon: IconAlerts },
];

export default function App() {
  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [search, setSearch]               = useState('');
  const [onlyInteresting, setOnlyInteresting] = useState(false);
  const [page, setPage]                   = useState(1);
  const [statDays, setStatDays]           = useState(30);
  const [liveCount, setLiveCount]         = useState(0);
  const [tick, setTick]                   = useState(0);
  const [lastRefresh, setLastRefresh]     = useState(new Date());

  // Auto-refresh elke 30 seconden
  useEffect(() => {
    const t = setInterval(() => { setTick(n => n + 1); setLastRefresh(new Date()); }, 30000);
    return () => clearInterval(t);
  }, []);

  const { data: stats, refresh: refreshStats } = useApi(
    () => api.getStats(statDays), [statDays, tick]
  );
  const { data: visitorsData, loading: visitorsLoading, error: visitorsError, refresh: refreshVisitors } = useApi(
    () => api.getVisitors({ page, limit: 25, search, interesting: onlyInteresting }),
    [page, search, onlyInteresting, tick]
  );
  const { data: alertsData } = useApi(() => api.getAlerts(30), [tick]);

  // Live teller: bezoekers van afgelopen 5 minuten
  useEffect(() => {
    if (visitorsData?.visitors) {
      const cutoff = Date.now() - 5 * 60 * 1000;
      setLiveCount(visitorsData.visitors.filter(v => new Date(v.last_seen) > cutoff).length);
    }
  }, [visitorsData]);

  const handleSearch = useCallback(e => { setSearch(e.target.value); setPage(1); }, []);
  const handleRefresh = useCallback(() => {
    refreshStats();
    refreshVisitors();
    setLastRefresh(new Date());
  }, [refreshStats, refreshVisitors]);

  const alertCount       = alertsData?.alerts?.length || 0;
  const interestingCount = stats?.interestingVisitors || 0;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#08080a', color:'#fafafa' }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .fade-up { animation:fadeUp 0.22s ease forwards; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width:220, flexShrink:0,
        display:'flex', flexDirection:'column',
        background:'#0a0a0e',
        borderRight:'1px solid rgba(255,255,255,0.06)',
        padding:'0 0 16px',
      }}>

        {/* Logo */}
        <div style={{
          padding:'16px 16px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          marginBottom:12,
        }}>
          <img
            src="/logo.png"
            alt="BECA One"
            style={{ width:'100%', height:52, objectFit:'contain', objectPosition:'left center', display:'block' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display:'none', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:8,
              background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
            }}>⚓</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fafafa', letterSpacing:'-0.2px' }}>BECA ONE</div>
              <div style={{ fontSize:10, color:'#3b82f6', fontWeight:500, marginTop:1 }}>Visitor Intelligence</div>
            </div>
          </div>
        </div>

        {/* Live badge */}
        {liveCount > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:7,
            margin:'0 10px 10px',
            padding:'6px 10px',
            background:'rgba(34,197,94,0.06)',
            border:'1px solid rgba(34,197,94,0.15)',
            borderRadius:8, fontSize:12, fontWeight:500, color:'#22c55e',
          }}>
            <div style={{
              width:6, height:6, borderRadius:'50%', background:'#22c55e',
              boxShadow:'0 0 6px #22c55e',
              animation:'pulse 2s infinite',
            }} />
            {liveCount} live op site
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:'0 8px', display:'flex', flexDirection:'column', gap:2 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const badge = tab.id === 'alerts' && alertCount
              ? alertCount
              : tab.id === 'visitors' && interestingCount
              ? interestingCount : 0;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'8px 10px', borderRadius:8,
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: active ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                  color: active ? '#fafafa' : '#52525b',
                  cursor:'pointer', fontSize:13, fontWeight:500, textAlign:'left', width:'100%',
                  transition:'all 0.15s',
                }}
              >
                <Icon active={active} />
                <span style={{ flex:1 }}>{tab.label}</span>
                {badge > 0 && (
                  <span style={{
                    background:'rgba(59,130,246,0.15)', color:'#3b82f6',
                    fontSize:10, fontWeight:600, borderRadius:6,
                    padding:'1px 6px', minWidth:18, textAlign:'center',
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'0 8px' }}>
          <div style={{ height:1, background:'rgba(255,255,255,0.05)', margin:'10px 0' }} />
          <button
            onClick={handleRefresh}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'8px 10px', borderRadius:8,
              background:'transparent', border:'1px solid rgba(255,255,255,0.07)',
              color:'#3f3f46', cursor:'pointer', fontSize:12, fontWeight:500,
            }}
          >
            <span>↻</span> Vernieuwen
          </button>
          <div style={{ fontSize:10, color:'#27272a', textAlign:'center', marginTop:6 }}>
            Vernieuwd: {lastRefresh.toLocaleTimeString('nl-NL', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'auto', padding:'32px 36px' }}>

        {/* OVERZICHT */}
        {activeTab === 'overview' && (
          <div className="fade-up">
            <PageHeader
              title="Overzicht"
              subtitle="Realtime bezoekersanalyse voor becaone.com"
            >
              <PeriodPicker value={statDays} onChange={setStatDays} />
            </PageHeader>

            {stats ? (
              <>
                <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:24 }}>
                  <StatCard title="Unieke bedrijven"  value={stats.totalVisitors}       subtitle="Alle tijden"               accent />
                  <StatCard title="Hot leads"          value={stats.interestingVisitors}  subtitle="Op watchlist" />
                  <StatCard title="Paginaweergaven"    value={stats.totalPageViews}       subtitle={`Laatste ${statDays} dagen`} />
                  <StatCard title="Actieve bezoekers"  value={stats.recentVisitors}       subtitle={`Laatste ${statDays} dagen`} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <ChartCard title="Top pagina's" items={stats.topPages.map(p => ({ label:formatUrl(p.url), value:p.views }))}   color="#3b82f6" />
                  <ChartCard title="Top landen"   items={stats.topCountries.map(c => ({ label:c.country, value:c.visitors }))} color="#8b5cf6" />
                </div>
              </>
            ) : (
              <LoadingGrid />
            )}
          </div>
        )}

        {/* BEZOEKERS */}
        {activeTab === 'visitors' && (
          <div className="fade-up">
            <PageHeader
              title="Bezoekers"
              subtitle={visitorsData ? `${visitorsData.total} bedrijven gevonden` : 'Laden...'}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:8, padding:'6px 12px',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    style={{ background:'none', border:'none', outline:'none', color:'#fafafa', fontSize:13, width:200 }}
                    placeholder="Zoek op bedrijf, stad, IP..."
                    value={search}
                    onChange={handleSearch}
                  />
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <Toggle value={onlyInteresting} onChange={v => { setOnlyInteresting(v); setPage(1); }} />
                  <span style={{ color:'#71717a', fontSize:12 }}>Alleen hot leads</span>
                </label>
              </div>
            </PageHeader>

            {visitorsLoading && <TableSkeleton />}
            {visitorsError && <ErrorBox msg={visitorsError} />}

            {visitorsData && !visitorsLoading && (
              <>
                <VisitorTable visitors={visitorsData.visitors} onSelect={setSelectedVisitor} />
                {visitorsData.totalPages > 1 && (
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
                    <button
                      style={paginationBtnStyle}
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >← Vorige</button>
                    <span style={{ fontSize:13, color:'#52525b' }}>
                      {page} / {visitorsData.totalPages}
                    </span>
                    <button
                      style={paginationBtnStyle}
                      disabled={page >= visitorsData.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >Volgende →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ANALYSES */}
        {activeTab === 'analytics' && (
          <div className="fade-up">
            <PageHeader title="Analyses" subtitle="Gedragsdata van bezoekers op becaone.com" />
            <AnalyticsDashboard />
          </div>
        )}

        {/* MELDINGEN */}
        {activeTab === 'alerts' && (
          <div className="fade-up">
            <PageHeader title="Meldingen" subtitle="Bedrijven van je watchlist die de site bezochten">
              <div style={{
                background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.12)',
                borderRadius:8, padding:'7px 12px', fontSize:12, color:'#52525b',
              }}>
                Stel <code style={{ color:'#3b82f6', fontSize:11 }}>INTERESTING_COMPANIES</code> in Railway in
              </div>
            </PageHeader>
            <AlertsList alerts={alertsData?.alerts} />
          </div>
        )}
      </main>

      {/* Detail paneel */}
      {selectedVisitor && (
        <VisitorDetail visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
      )}
    </div>
  );
}

/* ── Herbruikbare componenten ── */

function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      marginBottom:28, flexWrap:'wrap', gap:12,
    }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:600, color:'#fafafa', letterSpacing:'-0.4px', margin:0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize:13, color:'#52525b', marginTop:4, marginBottom:0 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>{children}</div>}
    </div>
  );
}

function PeriodPicker({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {[7, 30, 90].map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          style={{
            padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer',
            border: value === d ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
            background: value === d ? 'rgba(59,130,246,0.1)' : 'transparent',
            color: value === d ? '#3b82f6' : '#52525b',
          }}
        >{d}d</button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width:32, height:18, borderRadius:9, cursor:'pointer', position:'relative',
        background: value ? '#3b82f6' : 'rgba(255,255,255,0.08)',
        transition:'background 0.2s',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        position:'absolute', top:2,
        left: value ? 16 : 2,
        width:12, height:12, borderRadius:'50%',
        background: value ? '#fff' : '#52525b',
        transition:'left 0.2s, background 0.2s',
      }} />
    </div>
  );
}

function ChartCard({ title, items, color }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{
      background:'#111115', border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:12, padding:'20px 22px',
    }}>
      <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em', color:'#3f3f46', marginBottom:16 }}>
        {title}
      </div>
      {items.length === 0 && <div style={{ color:'#3f3f46', fontSize:13 }}>Geen data</div>}
      {items.slice(0, 7).map(item => (
        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ width:120, fontSize:12, color:'#71717a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0, fontFamily:'monospace' }}>
            {item.label}
          </div>
          <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(item.value/max)*100}%`, background:color, borderRadius:2, transition:'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize:12, fontWeight:500, color:'#52525b', width:24, textAlign:'right' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:24 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          flex:'1 1 160px', height:100, borderRadius:12,
          background:'#111115', border:'1px solid rgba(255,255,255,0.07)',
          animation:'pulse 1.5s infinite',
        }} />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          height:52, background:'#111115',
          borderBottom:'1px solid rgba(255,255,255,0.04)',
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
      borderRadius:10, padding:'14px 18px', color:'#ef4444', fontSize:13,
    }}>
      Fout: {msg}
    </div>
  );
}

const paginationBtnStyle = {
  padding:'6px 14px', borderRadius:8,
  border:'1px solid rgba(255,255,255,0.07)',
  background:'rgba(255,255,255,0.03)',
  color:'#71717a', cursor:'pointer', fontSize:12,
};

function formatUrl(url) {
  try { const u = new URL(url); return u.pathname || '/'; } catch { return url; }
}

/* ── SVG iconen (simpel, consistent) ── */
function IconOverview({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#fafafa' : '#52525b'} strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function IconVisitors({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#fafafa' : '#52525b'} strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconAnalytics({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#fafafa' : '#52525b'} strokeWidth="1.8">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function IconAlerts({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#fafafa' : '#52525b'} strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
