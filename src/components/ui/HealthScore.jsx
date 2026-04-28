import { getHealthLabel } from '@/utils/scoring';

export function HealthScore({ score, size = 'md', showLabel = true }) {
  const { label, variant } = getHealthLabel(score ?? 0);
  const colors = {
    success: { stroke: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    warning: { stroke: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    danger:  { stroke: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };
  const c = colors[variant] || colors.danger;
  const sizes = { sm: 44, md: 60, lg: 80 };
  const dim = sizes[size] || 60;
  const radius = (dim / 2) - 5;
  const circ = 2 * Math.PI * radius;
  const offset = circ - ((score ?? 0) / 100) * circ;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <svg width={dim} height={dim} style={{ flexShrink: 0 }}>
        <circle cx={dim/2} cy={dim/2} r={radius} fill={c.bg} stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={dim/2} cy={dim/2} r={radius}
          fill="none" stroke={c.stroke} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 600ms ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
          style={{ fill: c.stroke, fontSize: size === 'sm' ? 11 : size === 'lg' ? 18 : 14, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          {score ?? 0}
        </text>
      </svg>
      {showLabel && (
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: c.stroke }}>{label}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Health Score</div>
        </div>
      )}
    </div>
  );
}
