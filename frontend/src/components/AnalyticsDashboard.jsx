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
      {/* Periode selector */}
      <div style={styles.periodRow}>
        {[7, 30, 90].map(d => (
          <button key={d}
            style={{ ...styles.periodBtn, ...(days === d ? styles.periodBtnActive : {}) }}
            onClick={() => setDays(d)}>
            {d} dagen
          </button>
        ))}
        <button style={styles.refreshBtn} onClick={refresh}>↻ Vernieuwen</button>
      </div>

      {/* ── Sessie KPIs ── */}
      <div style={styles.kpiGrid}>
        <KpiCard label="Sessies"            value={s.totalSessions}       icon="📊" />
        <KpiCard label="Pagina's/sessie"    value={s.avgPagesPerSession}  icon="📄" />
        <KpiCard label="Gem. sessieduur"    value={fmtDur(s.avgSessionDuration)} icon="⏱️" />
        <KpiCard label="Bounce rate"        value={`${s.bounceRate}%`}    icon="🚪"
          color={s.bounceRate > 60 ? '#f87171' : s.bounceRate < 30 ? '#34d399' : '#fbbf24'} />
        <KpiCard label="Terugkeerquote"     value={`${s.returnRate}%`}    icon="🔄"
          color={s.returnRate > 25 ? '#34d399' : '#94a3b8'} />
        <KpiCard label="Terugk. bedrijven"  value={s.returningVisitors}   icon="🏢" />
      </div>

      {/* ── Automatische aanbevelingen ── */}
      {insights.length > 0 && (
        <Section title="💡 Automatische aanbevelingen">
          <div style={styles.insightGrid}>
            {insights.map((ins, i) => (
              <div key={i} style={{ ...styles.insightCard, ...insightStyle(ins.type) }}>
                <div style={styles.insightIcon}>{ins.icon}</div>
                <div>
                  <div style={styles.insightTitle}>{ins.title}</div>
                  <div style={styles.insightText}>{ins.text}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div style={styles.twoCol}>

        {/* ── Pagina performance ── */}
        <Section title="Pagina performance">
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Pagina', 'Views', 'Gem. tijd', 'Bounce', 'Score'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagePerformance.slice(0, 10).map(p => (
                  <tr key={p.url} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.pageUrl} title={p.url}>{p.url}</div>
                      {p.title && p.title !== p.url && (
                        <div style={styles.pageTitle}>{p.title}</div>
                      )}
                    </td>
                    <td style={{ ...styles.td, ...styles.center }}>{p.views}</td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      <span style={{ color: p.avgDuration > 60 ? '#34d399' : p.avgDuration > 20 ? '#fbbf24' : '#f87171' }}>
                        {p.avgDuration > 0 ? fmtDur(p.avgDuration) : '—'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      <span style={{ color: p.bounceRate > 60 ? '#f87171' : p.bounceRate < 30 ? '#34d399' : '#fbbf24' }}>
                        {p.bounceRate}%
                      </span>
                    </td>
                    <td style={{ ...styles.td, ...styles.center }}>
                      <ScoreBar score={p.engagementScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Engagement leaderboard ── */}
        <Section title="🏆 Engagement leaderboard">
          {engagementLeaderboard.length === 0
            ? <Empty text="Nog geen engagement data" />
            : engagementLeaderboard.map((e, i) => (
              <div key={e.visitorId} style={styles.leaderRow}>
                <div style={styles.leaderRank}>#{i + 1}</div>
                <div style={styles.leaderInfo}>
                  <div style={styles.leaderName}>
                    {e.isInteresting && <span style={{ color: '#fbbf24' }}>★ </span>}
                    {e.companyName}
                  </div>
                  <div style={styles.leaderMeta}>
                    {e.pageViews} views · {e.sessions} sessies · {fmtDur(e.totalDuration)}
                    {e.city ? ` · ${e.city}` : ''}
                  </div>
                </div>
                <div style={styles.leaderScoreWrap}>
                  <div style={{ ...styles.leaderScore, color: scoreColor(e.score) }}>
                    {e.score}
                  </div>
                  <div style={styles.leaderScoreLabel}>score</div>
                </div>
              </div>
            ))
          }
        </Section>
      </div>

      <div style={styles.twoCol}>

        {/* ── Navigatiepaden ── */}
        <Section title="🗺️ Meest gevolgde routes">
          {topPaths.length === 0
            ? <Empty text="Nog geen navigatiedata (minimaal 2 pagina's per sessie)" />
            : topPaths.map((p, i) => (
              <div key={i} style={styles.pathRow}>
                <div style={styles.pathLine}>{p.path}</div>
                <span style={styles.pathCount}>{p.count}x</span>
              </div>
            ))
          }
        </Section>

        {/* ── Entry & Exit pagina's ── */}
        <div>
          <Section title="🚀 Instappagina's">
            {topEntryPages.map((p, i) => (
              <MiniBar key={i} label={p.url} value={p.count}
                max={topEntryPages[0]?.count || 1} color="#3b82f6" />
            ))}
          </Section>
          <Section title="🚪 Exitpagina's">
            {topExitPages.map((p, i) => (
              <MiniBar key={i} label={p.url} value={p.count}
                max={topExitPages[0]?.count || 1} color="#8b5cf6" />
            ))}
          </Section>
        </div>
      </div>

      {/* ── Piekuren ── */}
      <Section title="🕐 Activiteit per uur van de dag">
        <div style={styles.hourGrid}>
          {peakHours.map(({ hour, count }) => (
            <div key={hour} style={styles.hourCol}>
              <div style={styles.hourBarWrap}>
                <div style={{
                  ...styles.hourBar,
                  height: `${Math.max(4, (count / peakMax) * 80)}px`,
                  background: count === Math.max(...peakHours.map(h => h.count))
                    ? '#3b82f6' : 'rgba(59,130,246,0.3)',
                }} />
              </div>
              <div style={styles.hourLabel}>{String(hour).padStart(2,'0')}</div>
              {count > 0 && <div style={styles.hourCount}>{count}</div>}
            </div>
          ))}
        </div>
        <div style={styles.hourHint}>
          {(() => {
            const peak = peakHours.reduce((a, b) => b.count > a.count ? b : a, peakHours[0]);
            return peak?.count > 0
              ? `Piekuur: ${String(peak.hour).padStart(2,'0')}:00–${String(peak.hour+1).padStart(2,'0')}:00 (${peak.count} pageviews)`
              : 'Nog geen piekuurdata';
          })()}
        </div>
      </Section>
    </div>
  );
}

/* ── Sub-componenten ── */

function KpiCard({ label, value, icon, color = '#60a5fa' }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
      <div style={{ width: 48, height: 5, background: '#1e2d3d', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, width: 24 }}>{score}</span>
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
      <div style={{ width: 130, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
        title={label}>{label}</div>
      <div style={{ flex: 1, height: 5, background: '#1e2d3d', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value/max)*100}%`, background: color, borderRadius: 3,
          transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 20, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ color: '#334155', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>{text}</div>;
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[80, 200, 160].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 12, background: '#0d1526',
          border: '1px solid #1e2d3d', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
      borderRadius: 12, padding: 20, color: '#f87171' }}>⚠ {msg}</div>
  );
}

/* ── Helpers ── */
function fmtDur(sec) {
  if (!sec || sec === 0) return '0s';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}

function scoreColor(score) {
  if (score >= 70) return '#34d399';
  if (score >= 40) return '#fbbf24';
  return '#94a3b8';
}

function insightStyle(type) {
  const map = {
    positive: { borderColor: 'rgba(52,211,153,0.3)',  background: 'rgba(52,211,153,0.06)'  },
    warning:  { borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)' },
    tip:      { borderColor: 'rgba(59,130,246,0.3)',  background: 'rgba(59,130,246,0.06)'  },
  };
  return map[type] || map.tip;
}

/* ── Styles ── */
const styles = {
  periodRow: { display: 'flex', gap: 6, marginBottom: 24, alignItems: 'center' },
  periodBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid #1e2d3d',
    background: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  periodBtnActive: { background: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' },
  refreshBtn: { marginLeft: 'auto', padding: '6px 14px', borderRadius: 8,
    border: '1px solid #1e2d3d', background: 'rgba(255,255,255,0.03)',
    color: '#64748b', cursor: 'pointer', fontSize: 12 },

  kpiGrid: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  kpiCard: { flex: '1 1 130px', background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2d3d',
    borderRadius: 14, padding: '16px 20px', textAlign: 'center' },
  kpiIcon:  { fontSize: 20, marginBottom: 8 },
  kpiValue: { fontSize: 26, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  kpiLabel: { fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },

  insightGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  insightCard: { display: 'flex', gap: 14, padding: '14px 18px', borderRadius: 12,
    border: '1px solid', alignItems: 'flex-start' },
  insightIcon:  { fontSize: 20, flexShrink: 0, marginTop: 1 },
  insightTitle: { fontWeight: 700, color: '#e2e8f0', fontSize: 14, marginBottom: 3 },
  insightText:  { fontSize: 13, color: '#94a3b8', lineHeight: 1.5 },

  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 },
  section: { background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2d3d',
    borderRadius: 14, padding: '18px 20px', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 },

  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155',
    borderBottom: '1px solid #1e2d3d' },
  tr: { borderBottom: '1px solid #111e30' },
  td: { padding: '10px 10px', verticalAlign: 'middle' },
  center: { textAlign: 'center' },
  pageUrl: { fontFamily: 'monospace', fontSize: 12, color: '#60a5fa',
    maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pageTitle: { fontSize: 10, color: '#334155', marginTop: 2 },

  leaderRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
    borderBottom: '1px solid #111e30' },
  leaderRank: { fontSize: 12, color: '#334155', fontWeight: 700, width: 24, textAlign: 'center' },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  leaderMeta: { fontSize: 11, color: '#475569', marginTop: 2 },
  leaderScoreWrap: { textAlign: 'center', flexShrink: 0 },
  leaderScore: { fontSize: 20, fontWeight: 800, lineHeight: 1 },
  leaderScoreLabel: { fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' },

  pathRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #111e30', gap: 8 },
  pathLine: { fontSize: 11, fontFamily: 'monospace', color: '#94a3b8',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pathCount: { fontSize: 12, fontWeight: 700, color: '#60a5fa', flexShrink: 0 },

  hourGrid: { display: 'flex', gap: 3, alignItems: 'flex-end', height: 110 },
  hourCol:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  hourBarWrap: { height: 80, display: 'flex', alignItems: 'flex-end' },
  hourBar: { width: '100%', minWidth: 6, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' },
  hourLabel: { fontSize: 9, color: '#334155', lineHeight: 1 },
  hourCount: { fontSize: 9, color: '#475569' },
  hourHint: { fontSize: 12, color: '#475569', marginTop: 12, textAlign: 'center' },
};
