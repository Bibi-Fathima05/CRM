import { STATUS_VARIANT, RISK_VARIANT, STATUS_LABELS } from '@/lib/constants';
import { capitalize } from '@/utils/formatters';

export function Badge({ children, variant = 'muted', dot = false, className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'currentColor', flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const variant = STATUS_VARIANT[status] || 'muted';
  const label = STATUS_LABELS[status] || capitalize(status);
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function RiskBadge({ risk }) {
  const variant = RISK_VARIANT[risk] || 'muted';
  return <Badge variant={variant}>{capitalize(risk)} Risk</Badge>;
}

export function LevelBadge({ level }) {
  const variants = { l1: 'info', l2: 'primary', l3: 'success', admin: 'warning' };
  return <Badge variant={variants[level] || 'muted'}>{level?.toUpperCase()}</Badge>;
}
