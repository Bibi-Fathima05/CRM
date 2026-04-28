export function Card({ children, className = '', glass = false, hover = false, style, ...props }) {
  const base = glass ? 'card-glass' : 'card';
  const hoverClass = hover ? 'card-hover' : '';
  return (
    <div className={`${base} ${hoverClass} ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`} style={{ marginBottom: 'var(--space-5)' }}>
      <div>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', marginBottom: 2 }}>{title}</h3>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
