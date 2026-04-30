import React, { useState } from 'react';
import { Users, TrendingUp, Target, Activity, Shield, ChevronRight, Crown } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useUsers } from '@/hooks/useUsers';
import { useLeads } from '@/hooks/useLeads';
import { useDeals } from '@/hooks/useDeals';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';

const ROLE_VARIANT = { l1: 'info', l2: 'primary', l3: 'success', admin: 'warning' };

export function AdminDashboard() {
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: leads = [], isLoading: leadsLoading } = useLeads({});
  const { data: deals = [], isLoading: dealsLoading } = useDeals();

  const totalRevenue = deals.filter(d => d.status === 'open').reduce((s, d) => s + (d.value || 0), 0);
  const wonDeals = deals.filter(d => d.status === 'won').length;
  const activeLeads = leads.filter(l => !['rejected','duplicate','not_interested'].includes(l.status)).length;
  const adminUsers = users.filter(u => u.role === 'admin');

  const recentUsers = [...users].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const roleDist = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">System health and platform analytics</p>
        </div>
        <Button icon={Shield} variant="primary" onClick={() => navigate('/admin/users')}>
          Manage Users
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger">
        <StatCard label="Total Users" value={users.length} icon={Users} color="primary" loading={usersLoading} />
        <StatCard label="Active Leads" value={activeLeads} icon={Target} color="info" loading={leadsLoading} />
        <StatCard label="Pipeline Value" value={`₹${(totalRevenue/1000).toFixed(0)}K`} icon={TrendingUp} color="success" loading={dealsLoading} />
        <StatCard label="Deals Won" value={wonDeals} icon={Activity} color="warning" loading={dealsLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Team Breakdown */}
        <Card>
          <CardHeader
            title="Team Breakdown"
            subtitle={`${users.length} total members`}
            actions={<Button size="sm" variant="ghost" onClick={() => navigate('/admin/users')}>View All <ChevronRight size={13} /></Button>}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {Object.entries(roleDist).map(([role, count]) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: 'var(--bg-surface-2)',
                }}>
                  {role === 'admin' ? <Crown size={16} style={{ color: 'var(--warning-light)' }} /> : <Users size={16} style={{ color: 'var(--primary-light)' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{ROLE_LABELS[role] || role}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{count} member{count !== 1 ? 's' : ''}</div>
                </div>
                <Badge variant={ROLE_VARIANT[role] || 'muted'}>{role?.toUpperCase()}</Badge>
                <div style={{
                  height: 6, width: 80, borderRadius: 99, background: 'var(--bg-surface-3)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${Math.round((count / (users.length || 1)) * 100)}%`,
                    background: 'var(--primary)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
            {Object.keys(roleDist).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>
                No users found. Run seed.sql in Supabase.
              </p>
            )}
          </div>
        </Card>

        {/* Recently Joined */}
        <Card>
          <CardHeader title="Recently Joined" subtitle="Newest team members" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentUsers.map(user => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)',
                background: 'var(--bg-surface-2)',
              }}>
                <Avatar name={user.name || user.email} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
                <Badge variant={ROLE_VARIANT[user.role] || 'muted'}>{user.role?.toUpperCase()}</Badge>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No users yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
        {[
          { label: 'User Management', desc: 'Roles & access control', path: '/admin/users', color: 'var(--primary)' },
          { label: 'API Keys', desc: 'Manage API credentials', path: '/admin/api-keys', color: 'var(--success)' },
          { label: 'Webhooks', desc: 'Event notifications', path: '/admin/webhooks', color: 'var(--warning)' },
          { label: 'Integrations', desc: 'Third-party connections', path: '/admin/integrations', color: 'var(--info)' },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)',
            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all var(--transition-fast)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, marginBottom: 'var(--space-3)' }} />
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
