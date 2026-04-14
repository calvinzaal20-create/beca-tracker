import React, { useState, useCallback } from 'react';
import { useApi } from './hooks/useApi';
import { api } from './api/client';
import { StatCard } from './components/StatCard';
import { VisitorTable } from './components/VisitorTable';
import { VisitorDetail } from './components/VisitorDetail';
import { AlertsList } from './components/AlertsList';

const TABS = ['Overzicht', 'Bezoekers', 'Meldingen'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Overzicht');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [search, setSearch] = useState('');
  const [onlyInteresting, setOnlyInteresting] = useState(false);
  const [page, setPage] = useState(1);
  const [statDays, setStatDays] = useState(30);

  // Statistieken
  const {
    data: stats,
    loading: statsLoading,
    refresh: refreshStats,
  } = useApi(() => api.getStats(statDays), [statDays]);

  // Bezoekers
  const {
    data: visitorsData,
    loading: visitorsLoading,
    error: visitorsError,
    refresh: refreshVisitors,
  } = useApi(
    () => api.getVisitors({ page, limit: 25, search, interesting: onlyInteresting }),
    [page, search, onlyInteresting]
  );

  // Meldingen
  const {
    data: alertsData,
    loading: alertsLoading,
  } = useApi(() => api.getAlerts(30), []);

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleRefresh = () => {
    refreshStats();
    refreshVisitors();
  };

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🚢</div>
          <div>
            <div style={styles.logoTitle}>BECA One</div>
            <div style={styles.logoSub}>Bezoeker Tracker</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.navBtn,
                ...(activeTab === tab ? styles.navBtnActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_ICONS[tab]} {tab}
              {tab === 'Meldingen' && alertsData?.alerts?.length > 0 && (
                <span style={styles.badge}>{alertsData.alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.refreshBtn} onClick={handleRefresh}>
            ↻ Vernieuwen
          </button>
        </div>
      </aside>

      {/* Hoofdinhoud */}
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>{activeTab}</h1>
          <div style={styles.headerRight}>
            <span style={styles.lastUpdate}>
              {new Date().toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* === TAB: OVERZICHT === */}
        {activeTab === 'Overzicht' && (
          <div>
            {/* Periode selector */}
            <div style={styles.periodSelector}>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  style={{
                    ...styles.periodBtn,
                    ...(statDays === d ? styles.periodBtnActive : {}),
                  }}
                  onClick={() => setStatDays(d)}
                >
                  {d} dagen
                </button>
              ))}
            </div>

            {/* Stat kaarten */}
            {statsLoading ? (
              <div style={styles.loading}>Statistieken laden...</div>
            ) : stats ? (
              <>
                <div style={styles.statGrid}>
                  <StatCard
                    title="Unieke bezoekers"
                    value={stats.totalVisitors}
                    subtitle="Alle tijden"
                    icon="👥"
                  />
                  <StatCard
                    title="Interessante bedrijven"
                    value={stats.interestingVisitors}
                    subtitle="Op watchlist"
                    color="#f59e0b"
                    icon="★"
                  />
                  <StatCard
                    title="Paginaweergaven"
                    value={stats.totalPageViews}
                    subtitle={`Laatste ${stats.periodDays} dagen`}
                    color="#4361ee"
                    icon="📄"
                  />
                  <StatCard
                    title="Actieve bezoekers"
                    value={stats.recentVisitors}
                    subtitle={`Laatste ${stats.periodDays} dagen`}
                    color="#22c55e"
                    icon="🟢"
                  />
                </div>

                {/* Top pagina's + landen */}
                <div style={styles.twoCol}>
                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Top pagina's</div>
                    {stats.topPages.length === 0 && (
                      <div style={styles.empty}>Nog geen data.</div>
                    )}
                    {stats.topPages.map(({ url, views }) => (
                      <div key={url} style={styles.topRow}>
                        <span style={styles.topUrl} title={url}>
                          {url.length > 45 ? url.slice(0, 45) + '…' : url}
                        </span>
                        <span style={styles.topCount}>{views}</span>
                      </div>
                    ))}
                  </div>

                  <div style={styles.card}>
                    <div style={styles.cardTitle}>Top landen</div>
                    {stats.topCountries.length === 0 && (
                      <div style={styles.empty}>Nog geen data.</div>
                    )}
                    {stats.topCountries.map(({ country, visitors: cnt }) => (
                      <div key={country} style={styles.topRow}>
                        <span>{country}</span>
                        <span style={styles.topCount}>{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* === TAB: BEZOEKERS === */}
        {activeTab === 'Bezoekers' && (
          <div>
            {/* Filters */}
            <div style={styles.filters}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Zoek op bedrijf, stad of IP..."
                value={search}
                onChange={handleSearch}
              />
              <label style={styles.filterLabel}>
                <input
                  type="checkbox"
                  checked={onlyInteresting}
                  onChange={(e) => {
                    setOnlyInteresting(e.target.checked);
                    setPage(1);
                  }}
                  style={{ marginRight: 6 }}
                />
                Alleen interessante bedrijven
              </label>
            </div>

            {visitorsLoading && <div style={styles.loading}>Bezoekers laden...</div>}
            {visitorsError && <div style={styles.error}>Fout: {visitorsError}</div>}

            {visitorsData && (
              <>
                <div style={styles.tableInfo}>
                  {visitorsData.total} bezoeker{visitorsData.total !== 1 ? 's' : ''} gevonden
                </div>
                <VisitorTable
                  visitors={visitorsData.visitors}
                  onSelect={setSelectedVisitor}
                />
                {/* Paginering */}
                {visitorsData.totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button
                      style={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ← Vorige
                    </button>
                    <span style={styles.pageInfo}>
                      Pagina {page} van {visitorsData.totalPages}
                    </span>
                    <button
                      style={styles.pageBtn}
                      disabled={page >= visitorsData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Volgende →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === TAB: MELDINGEN === */}
        {activeTab === 'Meldingen' && (
          <div>
            <div style={styles.alertsInfo}>
              Meldingen worden verstuurd als een bedrijf van de watchlist de site bezoekt.
              Stel <code>INTERESTING_COMPANIES</code> in de backend .env in.
            </div>
            {alertsLoading ? (
              <div style={styles.loading}>Meldingen laden...</div>
            ) : (
              <AlertsList alerts={alertsData?.alerts} />
            )}
          </div>
        )}
      </main>

      {/* Bezoeker detail paneel */}
      {selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
        />
      )}
    </div>
  );
}

const TAB_ICONS = {
  Overzicht: '📊',
  Bezoekers: '👥',
  Meldingen: '🔔',
};

const styles = {
  app: {
    display: 'flex', minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#f4f6fb',
    color: '#1a1a2e',
  },
  sidebar: {
    width: 220, flexShrink: 0,
    background: '#1a3a5c',
    color: '#fff',
    display: 'flex', flexDirection: 'column',
    padding: '0 0 24px',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontWeight: 700, fontSize: 16 },
  logoSub: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  nav: { flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderRadius: 8,
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500,
    textAlign: 'left', width: '100%',
    transition: 'all 0.15s',
  },
  navBtnActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  badge: {
    marginLeft: 'auto',
    background: '#f59e0b', color: '#fff',
    borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700,
  },
  sidebarFooter: { padding: '0 12px', marginTop: 16 },
  refreshBtn: {
    width: '100%', padding: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', fontSize: 13,
  },
  main: { flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: 1100 },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1a3a5c' },
  headerRight: { fontSize: 13, color: '#aaa' },
  lastUpdate: {},
  periodSelector: { display: 'flex', gap: 8, marginBottom: 20 },
  periodBtn: {
    padding: '6px 16px', borderRadius: 20,
    border: '1px solid #ddd', background: '#fff',
    cursor: 'pointer', fontSize: 13, color: '#555',
  },
  periodBtnActive: {
    background: '#1a3a5c', color: '#fff', borderColor: '#1a3a5c',
  },
  statGrid: {
    display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24,
  },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  card: {
    background: '#fff', borderRadius: 10,
    padding: '20px 24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#888', marginBottom: 12,
  },
  topRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13,
  },
  topUrl: {
    fontFamily: 'monospace', fontSize: 12, color: '#333',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
  },
  topCount: { fontWeight: 700, color: '#4361ee', flexShrink: 0, marginLeft: 8 },
  filters: {
    display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap',
  },
  searchInput: {
    padding: '8px 14px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, minWidth: 260,
    outline: 'none',
  },
  filterLabel: { fontSize: 14, color: '#555', cursor: 'pointer', userSelect: 'none' },
  tableInfo: { fontSize: 13, color: '#aaa', marginBottom: 10 },
  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 16, marginTop: 20,
  },
  pageBtn: {
    padding: '8px 16px', borderRadius: 8,
    border: '1px solid #ddd', background: '#fff',
    cursor: 'pointer', fontSize: 13,
  },
  pageInfo: { fontSize: 13, color: '#888' },
  alertsInfo: {
    background: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: 8, padding: '12px 16px',
    fontSize: 13, color: '#1e40af', marginBottom: 16,
  },
  loading: { color: '#aaa', padding: '24px 0', fontSize: 14 },
  error: { color: '#ef4444', padding: '12px 0', fontSize: 14 },
  empty: { color: '#ccc', fontSize: 13, padding: '8px 0' },
};
