import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight,
  className = '',
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 13 : 15} />
      ) : null}
      {children}
      {iconRight && !loading && <iconRight size={14} />}
    </button>
  );
}

export function IconButton({ icon: Icon, tooltip, className = '', size = 16, ...props }) {
  return (
    <button className={`btn-icon ${className}`} title={tooltip} {...props}>
      <Icon size={size} />
    </button>
  );
}
