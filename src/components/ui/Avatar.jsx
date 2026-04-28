import { initials } from '@/utils/formatters';

const AVATAR_COLORS = [
  ['#6366f1','rgba(99,102,241,0.2)'],
  ['#10b981','rgba(16,185,129,0.2)'],
  ['#f59e0b','rgba(245,158,11,0.2)'],
  ['#3b82f6','rgba(59,130,246,0.2)'],
  ['#ec4899','rgba(236,72,153,0.2)'],
  ['#8b5cf6','rgba(139,92,246,0.2)'],
];

function colorFor(name) {
  const idx = (name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export function Avatar({ name, src, size = 'md', className = '' }) {
  const [color, bg] = colorFor(name);
  return (
    <div className={`avatar avatar-${size} ${className}`}
      style={{ background: bg, color, border: `1.5px solid ${color}33` }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           : initials(name)}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 3, size = 'sm' }) {
  const shown = users.slice(0, max);
  const extra = users.length - max;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <Avatar key={u.id} name={u.name} src={u.avatar_url} size={size}
          style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--bg-surface)' }} />
      ))}
      {extra > 0 && (
        <div className={`avatar avatar-${size}`}
          style={{ marginLeft: -8, background: 'var(--bg-surface-3)', color: 'var(--text-muted)', border: '2px solid var(--bg-surface)', fontSize: 'var(--text-xs)' }}>
          +{extra}
        </div>
      )}
    </div>
  );
}
