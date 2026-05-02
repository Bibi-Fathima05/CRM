import { useState } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Activity, User, Target, FileText, ArrowRight,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Filter, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDateTime, timeAgo } from '@/utils/formatters';

const ACTION_META = {
  'lead.created':          { label: 'Lead Created',        color: 'var(--success)',      icon: CheckCircle },
  'lead.level_transition': { label: 'Level Transition',    color: 'var(--primary-light)', icon: ArrowRight },
  'lead.rejected':         { label: 'Lead Rejected',       color: 'var(--danger-light)', icon: XCircle },
  'lead.field_updated':    { label: 'Field Updated',       color: 'var(--info-light)',   icon: RefreshCw },
  'lead.stage_transition': { label: 'Stage Updated',       color: 'var(--warning)',      icon: RefreshCw },
  'deal.escalated':        { label: 'Deal Escalated',      color: 'var(--warning)',      icon: AlertTriangle },
  'deal.closed_won':       { label: 'Deal Won',            color: 'var(--success)',      icon: CheckCircle },
  'deal.closed_lost':      { label: 'Deal Lost',           color: 'var(--danger-light)', icon: XCircle },
};

const ENTITY_ICONS = {
  lead: User,
  deal: Target,
  approval: FileText,
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action];
  if (!meta) return (
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
      {action}
    </span>
  );
  const Icon = meta.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600, color: meta.color }}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function MetaPreview({ metadata }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      {entries.slice(0, 4).map(([k, v]) => (
        <span key={k} style={{
          fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          background: 'var(--bg-surface-3)', borderRadius: 'var(--radius-sm)',
          padding: '2px 8px',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
          {': '}
          <span style={{ color: 'var(--text-primary)' }}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </span>
      ))}
    </div>
  );
}

function downloadCSV(items) {
  const date = new Date().toISOString().slice(0, 10);
  const headers = ['Time', 'Entity Type', 'Entity ID', 'Action', 'Metadata'];
  const rows = items.map(log => [
    new Date(log.created_at).toLocaleString('en-IN'),
    log.entity_type,
    log.entity_id,
    log.action,
    log.metadata ? JSON.stringify(log.metadata) : '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogs() {
  const [entityFilter, setEntityFilter] = useState('all');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const logs = useConvexQuery(api.auditLogs.getAuditLogs, {
    entityType: entityFilter !== 'all' ? entityFilter : undefined,
    sinceTs: todayStart.getTime(),
    limit: 200,
  });

  const isLoading = logs === undefined;
  const items = logs ?? [];

  // Summary counts
  const counts = items.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const topActions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const entityCounts = items.reduce((acc, log) => {
    acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{items.length} event{items.length !== 1 ? 's' : ''} today
          </p>
        </div>
        <Button
          icon={Download}
          variant="primary"
          disabled={items.length === 0}
          onClick={() => downloadCSV(items)}
        >
          Download CSV
        </Button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Events', value: items.length, color: 'var(--primary-light)' },
          { label: 'Leads',  value: entityCounts.lead  || 0, color: 'var(--info-light)' },
          { label: 'Deals',  value: entityCounts.deal  || 0, color: 'var(--success)' },
          { label: 'Other',  value: items.length - (entityCounts.lead || 0) - (entityCounts.deal || 0), color: 'var(--text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)' }}>
        {/* Main feed */}
        <Card>
          <CardHeader
            title="Event Feed"
            subtitle="All activity logged today"
            actions={
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Filter size={13} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={entityFilter}
                  onChange={e => setEntityFilter(e.target.value)}
                  style={{ fontSize: 'var(--text-xs)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer' }}
                >
                  <option value="all">All types</option>
                  <option value="lead">Leads</option>
                  <option value="deal">Deals</option>
                  <option value="approval">Approvals</option>
                </select>
              </div>
            }
          />

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-muted)' }}>
              <Activity size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
              <p>No activity logged today</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map((log, idx) => {
                const EntityIcon = ENTITY_ICONS[log.entity_type] || Activity;
                return (
                  <div
                    key={log._id}
                    style={{
                      display: 'flex', gap: 'var(--space-3)',
                      padding: 'var(--space-3) 0',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <EntityIcon size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <ActionBadge action={log.action} />
                        <Badge variant="muted" style={{ fontSize: 10 }}>{log.entity_type}</Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {timeAgo(new Date(log.created_at))}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                        ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{String(log.entity_id).slice(0, 16)}…</span>
                        {' · '}{formatDateTime(new Date(log.created_at))}
                      </div>
                      <MetaPreview metadata={log.metadata} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader title="Top Actions" subtitle="By frequency today" />
            {topActions.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {topActions.map(([action, count]) => {
                  const pct = Math.round((count / items.length) * 100);
                  return (
                    <div key={action}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <ActionBadge action={action} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-surface-3)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="By Entity Type" />
            {Object.keys(entityCounts).length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No data yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {Object.entries(entityCounts).map(([type, count]) => {
                  const Icon = ENTITY_ICONS[type] || Activity;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        <Icon size={13} /> {type}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
