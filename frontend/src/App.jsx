import React, { useState, useCallback, useEffect } from 'react';
import { useApi } from './hooks/useApi';
import { api } from './api/client';
import { StatCard } from './components/StatCard';
import { VisitorTable } from './components/VisitorTable';
import { VisitorDetail } from './components/VisitorDetail';
import { AlertsList } from './components/AlertsList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

const TABS = [
  { id: 'overview',   label: 'Overzicht',  icon: '◈' },
  { id: 'visitors',   label: 'Bezoekers',  icon: '◉' },
  { id: 'analytics',  label: 'Analyses',   icon: '◐' },
  { id: 'alerts',     label: 'Meldingen',  icon: '◎' },
];

export default function App() {
  const [activeTab, setActiveTab]           = useState('overview');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [search, setSearch]                 = useState('');
  const [onlyInteresting, setOnlyInteresting] = useState(false);
  const [page, setPage]                     = useState(1);
  const [statDays, setStatDays]             = useState(30);
  const [liveCount, setLiveCount]           = useState(0);
  const [tick, setTick]                     = useState(0);

  // Auto-refresh elke 30 seconden
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: stats,        refresh: refreshStats }    = useApi(() => api.getStats(statDays), [statDays, tick]);
  const { data: visitorsData, loading: visitorsLoading,
          error: visitorsError, refresh: refreshVisitors } = useApi(
    () => api.getVisitors({ page, limit: 25, search, interesting: onlyInteresting }),
    [page, search, onlyInteresting, tick]
  );
  const { data: alertsData } = useApi(() => api.getAlerts(30), [tick]);

  // Live teller: bezoekers van de afgelopen 5 minuten
  useEffect(() => {
    if (visitorsData?.visitors) {
      const fiveMin = Date.now() - 5 * 60 * 1000;
      setLiveCount(visitorsData.visitors.filter(v => new Date(v.last_seen) > fiveMin).length);
    }
  }, [visitorsData]);

  const handleSearch = useCallback(e => { setSearch(e.target.value); setPage(1); }, []);

  const alertCount = alertsData?.alerts?.length || 0;
  const interestingCount = stats?.interestingVisitors || 0;

  return (
    <div style={styles.app}>
      {/* Globale CSS animaties */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fadeIn { animation: fadeIn 0.3s ease forwards; }
        tr:hover td { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoMark}>⚓</div>
          <div>
            <div style={styles.logoName}>BECA One</div>
            <div style={styles.logoTag}>Visitor Intelligence</div>
          </div>
        </div>

        {/* Live indicator */}
        {liveCount > 0 && (
          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            {liveCount} live op site
          </div>
        )}

        {/* Nav */}
        <nav style={styles.nav}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const badge = tab.id === 'alerts' && alertCount
              ? alertCount
              : tab.id === 'visitors' && interestingCount
              ? interestingCount
              : 0;
            return (
              <button
                key={tab.id}
                style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={styles.navIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
                {badge > 0 && <span style={styles.navBadge}>{badge}</span>}
              </button>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.footerDivider} />
          <button style={styles.refreshBtn} onClick={() => { refreshStats(); refreshVisitors(); }}>
            <span>↻</span> Vernieuwen
          </button>
          <div style={styles.footerHint}>Auto-refresh: 30s</div>
        </div>
      </aside>

      {/* ── Hoofdinhoud ── */}
      <main style={styles.main}>

        {/* ── OVERZICHT ── */}
        {activeTab === 'overview' && (
          <div className="fadeIn">
            <PageHeader title="Overzicht" subtitle="Realtime bezoekersanalyse voor becaone.com">
              <PeriodPicker value={statDays} onChange={setStatDays} />
            </PageHeader>

            {stats ? (
              <>
                <div style={styles.statGrid}>
                  <StatCard title="Unieke bedrijven"       value={stats.totalVisitors}      color="blue"   icon="🏢" subtitle="Alle tijden" />
                  <StatCard title="Hot leads"              value={stats.interestingVisitors} color="gold"   icon="🔥" subtitle="Op watchlist" />
                  <StatCard title="Paginaweergaven"        value={stats.totalPageViews}      color="purple" icon="📄" subtitle={`Laatste ${statDays} dagen`} />
                  <StatCard title="Actieve bezoekers"      value={stats.recentVisitors}      color="green"  icon="🟢" subtitle={`Laatste ${statDays} dagen`} />
                </div>

                <div style={styles.twoCol}>
                  <ChartCard title="Top pagina's" items={stats.topPages.map(p => ({ label: formatUrl(p.url), value: p.views }))} color="#3b82f6" />
                  <ChartCard title="Top landen"   items={stats.topCountries.map(c => ({ label: c.country, value: c.visitors }))} color="#8b5cf6" />
                </div>
              </>
            ) : (
              <LoadingGrid />
            )}
          </div>
        )}

        {/* ── BEZOEKERS ── */}
        {activeTab === 'visitors' && (
          <div className="fadeIn">
            <PageHeader title="Bezoekers" subtitle={visitorsData ? `${visitorsData.total} bedrijven gevonden` : 'Laden...'}>
              <div style={styles.filterRow}>
                <div style={styles.searchWrap}>
                  <span style={styles.searchIcon}>🔍</span>
                  <input
                    style={styles.searchInput}
                    placeholder="Zoek op bedrijf, stad, IP..."
                    value={search}
                    onChange={handleSearch}
                  />
                </div>
                <label style={styles.filterToggle}>
                  <div
                    style={{ ...styles.toggle, ...(onlyInteresting ? styles.toggleOn : {}) }}
                    onClick={() => { setOnlyInteresting(v => !v); setPage(1); }}
                  >
                    <div style={{ ...styles.toggleKnob, ...(onlyInteresting ? styles.toggleKnobOn : {}) }} />
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>Alleen hot leads</span>
                </label>
              </div>
            </PageHeader>

            {visitorsLoading && <LoadingTable />}
            {visitorsError  && <ErrorBox msg={visitorsError} />}

            {visitorsData && !visitorsLoading && (
              <>
                <VisitorTable visitors={visitorsData.visitors} onSelect={setSelectedVisitor} />
                {visitorsData.totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Vorige</button>
                    <span style={styles.pageInfo}>Pagina {page} / {visitorsData.totalPages}</span>
                    <button style={styles.pageBtn} disabled={page >= visitorsData.totalPages} onClick={() => setPage(p => p + 1)}>Volgende →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ANALYSES ── */}
        {activeTab === 'analytics' && (
          <div className="fadeIn">
            <PageHeader title="Analyses" subtitle="Gedragsdata van bezoekers op becaone.com" />
            <AnalyticsDashboard />
          </div>
        )}

        {/* ── MELDINGEN ── */}
        {activeTab === 'alerts' && (
          <div className="fadeIn">
            <PageHeader title="Meldingen" subtitle="Hot leads van bedrijven op je watchlist">
              <div style={styles.infoChip}>
                Stel <code style={{ color: '#60a5fa' }}>INTERESTING_COMPANIES</code> in Railway in om meldingen te ontvangen
              </div>
            </PageHeader>
            <AlertsList alerts={alertsData?.alerts} />
          </div>
        )}
      </main>

      {/* ── Detail paneel ── */}
      {selectedVisitor && (
        <VisitorDetail visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
      )}
    </div>
  );
}

/* ── Herbruikbare subcomponenten ── */

function PageHeader({ title, subtitle, children }) {
  return (
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.pageTitle}>{title}</h1>
        {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {children && <div style={styles.pageHeaderRight}>{children}</div>}
    </div>
  );
}

function PeriodPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[7, 30, 90].map(d => (
        <button
          key={d}
          style={{ ...styles.periodBtn, ...(value === d ? styles.periodBtnActive : {}) }}
          onClick={() => onChange(d)}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

function ChartCard({ title, items, color }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {items.length === 0 && <div style={{ color: '#475569', fontSize: 13, padding: '8px 0' }}>Geen data</div>}
      {items.slice(0, 7).map(item => (
        <div key={item.label} style={styles.chartRow}>
          <div style={styles.chartLabel} title={item.label}>{item.label}</div>
          <div style={styles.chartBarWrap}>
            <div style={{ ...styles.chartBar, width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
          <div style={styles.chartValue}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div style={styles.statGrid}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ ...styles.skeleton, height: 110, borderRadius: 16 }} />
      ))}
    </div>
  );
}

function LoadingTable() {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #1e2d3d' }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ ...styles.skeleton, height: 56, borderRadius: 0, marginBottom: 1 }} />
      ))}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '16px 20px', color: '#f87171', fontSize: 14 }}>
      ⚠ {msg}
    </div>
  );
}

function formatUrl(url) {
  try { const u = new URL(url); return u.pathname || '/'; } catch { return url; }
}

/* ── Styles ── */
const styles = {
  app: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    background: '#080d1a', color: '#e2e8f0',
  },

  /* Sidebar */
  sidebar: {
    width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0a1020 0%, #080d1a 100%)',
    borderRight: '1px solid #111e30',
    padding: '0 0 20px',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '24px 20px 20px', borderBottom: '1px solid #111e30', marginBottom: 20,
  },
  logoMark: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
  },
  logoName: { fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' },
  logoTag:  { fontSize: 10, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 },

  liveBadge: {
    display: 'flex', alignItems: 'center', gap: 7,
    margin: '0 12px 16px', padding: '7px 12px',
    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#34d399',
  },
  liveDot: {
    width: 7, height: 7, borderRadius: '50%', background: '#10b981',
    boxShadow: '0 0 6px #10b981', animation: 'pulse 2s infinite',
  },

  nav: { flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer',
    color: '#475569', fontSize: 13, fontWeight: 500, textAlign: 'left', width: '100%',
  },
  navBtnActive: {
    background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.2)',
  },
  navIcon: { fontSize: 14, opacity: 0.8 },
  navBadge: {
    marginLeft: 'auto', background: '#1d4ed8', color: '#bfdbfe',
    fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 6px', minWidth: 18, textAlign: 'center',
  },

  sidebarFooter: { padding: '0 10px' },
  footerDivider: { height: 1, background: '#111e30', margin: '12px 0' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '9px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d3d',
    color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  footerHint: { fontSize: 10, color: '#334155', textAlign: 'center', marginTop: 6 },

  /* Main */
  main: { flex: 1, overflow: 'auto', padding: '32px 36px' },

  pageHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 28, flexWrap: 'wrap', gap: 12,
  },
  pageTitle:    { fontSize: 24, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' },
  pageSubtitle: { fontSize: 13, color: '#475569', marginTop: 3 },
  pageHeaderRight: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },

  filterRow: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.04)', border: '1px solid #1e2d3d',
    borderRadius: 10, padding: '7px 14px',
  },
  searchIcon: { fontSize: 13, opacity: 0.5 },
  searchInput: {
    background: 'none', border: 'none', outline: 'none',
    color: '#e2e8f0', fontSize: 13, width: 220,
  },
  filterToggle: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  toggle: {
    width: 36, height: 20, borderRadius: 10, background: '#1e2d3d',
    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
  },
  toggleOn: { background: '#1d4ed8' },
  toggleKnob: {
    position: 'absolute', top: 3, left: 3, width: 14, height: 14,
    borderRadius: '50%', background: '#475569', transition: 'left 0.2s, background 0.2s',
  },
  toggleKnobOn: { left: 19, background: '#fff' },

  infoChip: {
    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#64748b',
  },

  periodBtn: {
    padding: '6px 14px', borderRadius: 8, border: '1px solid #1e2d3d',
    background: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  periodBtnActive: { background: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' },

  statGrid: { display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 24 },

  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  chartCard: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2d3d',
    borderRadius: 16, padding: '20px 24px',
  },
  chartTitle: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#475569', marginBottom: 16,
  },
  chartRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  chartLabel: {
    width: 130, fontSize: 12, color: '#94a3b8', overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
    fontFamily: 'monospace',
  },
  chartBarWrap: { flex: 1, height: 6, background: '#1e2d3d', borderRadius: 3, overflow: 'hidden' },
  chartBar: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  chartValue: { width: 28, fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right' },

  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 12, marginTop: 20,
  },
  pageBtn: {
    padding: '8px 16px', borderRadius: 8, border: '1px solid #1e2d3d',
    background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
  },
  pageInfo: { fontSize: 13, color: '#475569' },

  skeleton: {
    background: 'linear-gradient(90deg, #111e30 25%, #1a2d40 50%, #111e30 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginBottom: 2,
  },
};
