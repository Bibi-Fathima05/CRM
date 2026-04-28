import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function StatCard({ label, value, sub, trend, icon: Icon, color = 'primary', loading = false }) {
  const colors = {
    primary: { bg: 'var(--primary-glow)', text: 'var(--primary-light)' },
    success: { bg: 'var(--success-glow)', text: 'var(--success-light)' },
    warning: { bg: 'var(--warning-glow)', text: 'var(--warning-light)' },
    danger:  { bg: 'var(--danger-glow)',  text: 'var(--danger-light)' },
    info:    { bg: 'var(--info-glow)',    text: 'var(--info-light)' },
  };
  const c = colors[color] || colors.primary;

  const trendColor = trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  if (loading) return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="skeleton" style={{ height: 16, width: '60%' }} />
      <div className="skeleton" style={{ height: 32, width: '40%' }} />
      <div className="skeleton" style={{ height: 12, width: '80%' }} />
    </div>
  );

  return (
    <div className="card animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>
          {label}
        </span>
        {Icon && (
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius)', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} style={{ color: c.text }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
        {trend !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: trendColor }}>
            <TrendIcon size={12} />
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: c.bg, opacity: 0.5, pointerEvents: 'none',
      }} />
    </div>
  );
}
