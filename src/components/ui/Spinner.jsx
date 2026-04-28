export function Spinner({ size = 'md', className = '' }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  return <div className={`spinner ${sizeClass} ${className}`} />;
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Spinner size="lg" />
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Loading…</p>
    </div>
  );
}
