import React, { useState } from 'react';
import { Users, Search, Shield, Crown, ChevronDown, CheckCircle, UserX, UserCheck, Edit2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS, ROLES } from '@/lib/constants';
import { formatDateTime } from '@/utils/formatters';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_VARIANT = { l1: 'info', l2: 'primary', l3: 'success', admin: 'warning' };
const ALL_ROLES = [ROLES.L1, ROLES.L2, ROLES.L3, ROLES.ADMIN];

export function UserManagement() {
  const { data: users = [], isLoading } = useUsers();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (user) => {
    setEditUser(user);
    setNewRole(user.role);
  };

  const handleSave = async () => {
    if (!editUser || newRole === editUser.role) { setEditUser(null); return; }
    setSaving(true);
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', editUser.id);
    setSaving(false);
    if (!error) {
      await queryClient.invalidateQueries(['users']);
      setSaved(editUser.id);
      setTimeout(() => setSaved(null), 3000);
    }
    setEditUser(null);
  };

  const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} team members · Manage roles and access</p>
        </div>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <CheckCircle size={16} style={{ color: 'var(--success-light)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-light)', fontWeight: 'var(--weight-medium)' }}>Role updated successfully</span>
        </div>
      )}

      {/* Role Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {ALL_ROLES.map(role => (
          <Card key={role} style={{ padding: 'var(--space-4)', cursor: 'pointer', border: roleFilter === role ? '1px solid var(--primary)' : '1px solid var(--border)' }} onClick={() => setRoleFilter(prev => prev === role ? 'all' : role)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {role === 'admin' ? <Crown size={15} style={{ color: 'var(--warning-light)' }} /> : <Shield size={15} style={{ color: 'var(--primary-light)' }} />}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>{roleCounts[role] || 0}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{role.toUpperCase()}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="input" style={{ width: '100%', paddingLeft: 36 }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input" style={{ width: 'auto' }}>
          <option value="all">All Roles</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        {(search || roleFilter !== 'all') && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setRoleFilter('all'); }}>Clear</Button>
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader title="Team Members" subtitle={`${filtered.length} of ${users.length} shown`} />
        {isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>Loading users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>No users match your search</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>User</span><span>Email</span><span>Role</span><span>Joined</span><span></span>
            </div>
            {filtered.map((user, i) => (
              <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={user.name || user.email} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Unnamed'}</div>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                <div><Badge variant={ROLE_VARIANT[user.role] || 'muted'}>{user.role?.toUpperCase()}</Badge></div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatDateTime(user.created_at)}</div>
                <div>
                  <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(user)}>Edit Role</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Role Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change User Role" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>Save Changes</Button>
          </div>
        }>
        {editUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)' }}>
              <Avatar name={editUser.name || editUser.email} size="sm" />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{editUser.name || 'Unnamed'}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{editUser.email}</div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 10 }}>Assign Role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {ALL_ROLES.map(role => (
                  <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: newRole === role ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)', border: `1px solid ${newRole === role ? 'rgba(99,102,241,0.35)' : 'transparent'}`, transition: 'all var(--transition-fast)' }}>
                    <input type="radio" name="role" value={role} checked={newRole === role} onChange={() => setNewRole(role)} style={{ accentColor: 'var(--primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{ROLE_LABELS[role]}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{role === 'admin' ? 'Full system access' : role === 'l3' ? 'Deal closing & approvals' : role === 'l2' ? 'Pipeline & proposals' : 'Lead qualification'}</div>
                    </div>
                    <Badge variant={ROLE_VARIANT[role]}>{role.toUpperCase()}</Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
