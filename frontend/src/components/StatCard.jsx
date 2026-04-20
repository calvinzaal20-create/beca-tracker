import React from 'react';

const ACCENT_COLORS = {
  blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa', glow: '0 0 20px rgba(59,130,246,0.15)' },
  gold:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24', glow: '0 0 20px rgba(245,158,11,0.15)' },
  green:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399', glow: '0 0 20px rgba(16,185,129,0.15)' },
  purple: { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.3)',  text: '#a78bfa', glow: '0 0 20px rgba(139,92,246,0.15)' },
};

export function StatCard({ title, value, subtitle, color = 'blue', icon, trend }) {
  const c = ACCENT_COLORS[color] || ACCENT_COLORS.blue;
  return (
    <div style={{ ...styles.card, background: c.bg, border: `1px solid ${c.border}`, boxShadow: c.glow }}>
      <div style={styles.top}>
        <div style={{ ...styles.iconWrap, color: c.text }}>{icon}</div>
      </div>
      <div style={{ ...styles.value, color: c.text }}>{value ?? '—'}</div>
      <div style={styles.title}>{title}</div>
      {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      {trend !== undefined && (
        <div style={{ ...styles.trend, color: trend >= 0 ? '#34d399' : '#f87171' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs vorige periode
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    borderRadius: 16,
    padding: '20px 24px',
    flex: '1 1 180px',
    minWidth: 160,
    backdropFilter: 'blur(10px)',
  },
  top: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 },
  iconWrap: { fontSize: 22, opacity: 0.8 },
  value: { fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', marginBottom: 6 },
  title: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  subtitle: { fontSize: 11, color: '#475569', marginTop: 4 },
  trend: { fontSize: 11, fontWeight: 600, marginTop: 8 },
};
