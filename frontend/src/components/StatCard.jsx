import React from 'react';

/**
 * Statistiek-kaart voor het dashboard overzicht.
 */
export function StatCard({ title, value, subtitle, color = '#1a3a5c', icon }) {
  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div>
          <div style={{ ...styles.value, color }}>{value ?? '—'}</div>
          <div style={styles.title}>{title}</div>
        </div>
        {icon && <div style={{ fontSize: 32, opacity: 0.25 }}>{icon}</div>}
      </div>
      {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: '20px 24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    minWidth: 160,
    flex: '1 1 160px',
  },
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    color: '#888',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  subtitle: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 8,
  },
};
