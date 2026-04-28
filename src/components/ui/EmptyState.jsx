import { Button } from './Button';

export function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="empty-state animate-fade-in">
      {Icon && <div className="empty-state-icon"><Icon size={48} /></div>}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && actionLabel && (
        <Button variant="primary" onClick={action} style={{ marginTop: 'var(--space-2)' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
