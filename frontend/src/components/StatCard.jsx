import React from 'react';

export function StatCard({ title, value, subtitle, delta, accent = false }) {
  return (
    <div style={{
      background: '#111115',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: '20px 24px',
      flex: '1 1 160px',
      minWidth: 150,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
        }} />
      )}
      <div style={{ fontSize: 12, color: '#71717a', fontWeight: 500, marginBottom: 10, letterSpacing: '0.01em' }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: '#fafafa', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value ?? '—'}
      </div>
      {(subtitle || delta !== undefined) && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {delta !== undefined && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: delta >= 0 ? '#22c55e' : '#ef4444',
            }}>
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          )}
          {subtitle && <span style={{ fontSize: 12, color: '#52525b' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
