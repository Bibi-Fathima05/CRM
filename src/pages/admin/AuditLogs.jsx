import { useState } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ACTION_LABELS = {
  'lead.created':          'Lead Created',
  'lead.level_transition': 'Level Transition',
  'lead.rejected':         'Lead Rejected',
  'lead.field_updated':    'Field Updated',
  'lead.stage_transition': 'Stage Updated',
  'deal.escalated':        'Deal Escalated',
  'deal.closed_won':       'Deal Won',
  'deal.closed_lost':      'Deal Lost',
};

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

function asciiTable(headers, rows) {
  if (rows.length === 0) return '  (no data)';
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
  );
  const sep = '|' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '|';
  const fmt = row => '| ' + row.map((cell, i) => String(cell ?? '').padEnd(colWidths[i])).join(' | ') + ' |';
  return [sep, fmt(headers), sep, ...rows.map(fmt), sep].join('\n');
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

  const dateStr = new Date().toISOString().slice(0, 10);
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Action breakdown
  const actionMap = {};
  for (const log of items) {
    if (!actionMap[log.action]) actionMap[log.action] = { count: 0, entity: log.entity_type };
    actionMap[log.action].count++;
  }
  const actionRows = Object.entries(actionMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([action, { count, entity }]) => [ACTION_LABELS[action] || action, count, entity]);

  // Entity breakdown
  const entityMap = {};
  for (const log of items) entityMap[log.entity_type] = (entityMap[log.entity_type] || 0) + 1;
  const entityRows = Object.entries(entityMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => [type, count, Math.round((count / items.length) * 100) + '%']);

  // Recent 20 events
  const recentRows = items.slice(0, 20).map(log => [
    new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    ACTION_LABELS[log.action] || log.action,
    log.entity_type,
    String(log.entity_id).slice(0, 14) + '…',
  ]);

  // Highlights
  const hl = [];
  if (actionMap['lead.created'])          hl.push(`${actionMap['lead.created'].count} new lead${actionMap['lead.created'].count > 1 ? 's' : ''} created`);
  if (actionMap['deal.closed_won'])        hl.push(`${actionMap['deal.closed_won'].count} deal${actionMap['deal.closed_won'].count > 1 ? 's' : ''} closed won`);
  if (actionMap['deal.closed_lost'])       hl.push(`${actionMap['deal.closed_lost'].count} deal${actionMap['deal.closed_lost'].count > 1 ? 's' : ''} closed lost`);
  if (actionMap['lead.level_transition'])  hl.push(`${actionMap['lead.level_transition'].count} lead level transition${actionMap['lead.level_transition'].count > 1 ? 's' : ''}`);
  if (actionMap['deal.escalated'])         hl.push(`${actionMap['deal.escalated'].count} deal${actionMap['deal.escalated'].count > 1 ? 's' : ''} escalated`);
  if (actionMap['lead.field_updated'])     hl.push(`${actionMap['lead.field_updated'].count} field update${actionMap['lead.field_updated'].count > 1 ? 's' : ''} on leads`);
  if (actionMap['lead.stage_transition'])  hl.push(`${actionMap['lead.stage_transition'].count} stage transition${actionMap['lead.stage_transition'].count > 1 ? 's' : ''}`);

  const pre = {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontSize: 13,
    lineHeight: 1.65,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
    overflowX: 'auto',
    whiteSpace: 'pre',
    margin: 0,
    color: 'var(--text-secondary)',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div style={{ fontFamily: "'JetBrains Mono','Consolas',monospace" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary-light)' }}>
            ● Activity Report — {dateStr}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {dateLabel} · {items.length} event{items.length !== 1 ? 's' : ''} today
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            style={{
              fontFamily: "'JetBrains Mono','Consolas',monospace",
              fontSize: 12,
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            <option value="all">all types</option>
            <option value="lead">leads</option>
            <option value="deal">deals</option>
            <option value="approval">approvals</option>
          </select>
          <Button icon={Download} variant="primary" disabled={items.length === 0} onClick={() => downloadCSV(items)}>
            Download CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <pre style={pre}>Loading…</pre>
      ) : items.length === 0 ? (
        <pre style={pre}>No activity logged today.</pre>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Activity Timeline */}
          <Block title={`Activity Timeline (${dateStr})`}>
            <pre style={pre}>{asciiTable(['Action', 'Count', 'Entity'], actionRows)}</pre>
          </Block>

          {/* Distribution */}
          <Block title="Distribution">
            <pre style={pre}>{asciiTable(['Entity Type', 'Count', '% of Total'], entityRows)}</pre>
          </Block>

          {/* Highlights */}
          {hl.length > 0 && (
            <Block title="Highlights">
              <pre style={{ ...pre, color: 'var(--text-secondary)' }}>
                {hl.map(h => `- ${h}`).join('\n')}
              </pre>
            </Block>
          )}

          {/* Recent Events */}
          <Block title={`Recent Events (last ${Math.min(20, items.length)})`}>
            <pre style={pre}>{asciiTable(['Time', 'Action', 'Entity', 'ID'], recentRows)}</pre>
          </Block>

        </div>
      )}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono','Consolas',monospace",
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--text-primary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
