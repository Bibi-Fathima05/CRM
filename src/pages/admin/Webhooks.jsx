import React, { useState } from 'react';
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, CheckCircle, Globe, Zap } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WEBHOOK_EVENTS } from '@/lib/constants';
import { formatDateTime } from '@/utils/formatters';

const MOCK_WEBHOOKS = [
  { id: '1', name: 'Slack Lead Alerts', url: 'https://hooks.slack.com/services/T00/B00/XXXX', events: ['lead.created', 'lead.qualified'], active: true, created_at: new Date(Date.now() - 86400000 * 14).toISOString(), last_triggered: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', name: 'CRM Sync', url: 'https://api.mycrm.com/webhooks/flowcrm', events: ['deal.stage_changed', 'deal.closed_won', 'deal.closed_lost'], active: true, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), last_triggered: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: '3', name: 'Risk Monitor', url: 'https://monitor.internal.io/alerts', events: ['deal.risk_alert', 'follow_up.overdue'], active: false, created_at: new Date(Date.now() - 86400000 * 60).toISOString(), last_triggered: new Date(Date.now() - 86400000 * 10).toISOString() },
];

export function Webhooks() {
  const [hooks, setHooks] = useState(MOCK_WEBHOOKS);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] });
  const [saved, setSaved] = useState(null);

  const toggleActive = (id) => setHooks(prev => prev.map(h => h.id === id ? { ...h, active: !h.active } : h));
  const toggleEvent = (ev) => setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev] }));

  const handleCreate = () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    const hook = { id: Date.now().toString(), ...form, active: true, created_at: new Date().toISOString(), last_triggered: null };
    setHooks(prev => [hook, ...prev]);
    setSaved(hook.id);
    setTimeout(() => setSaved(null), 3000);
    setShowCreate(false);
    setForm({ name: '', url: '', events: [] });
  };

  const handleDelete = (id) => {
    setHooks(prev => prev.filter(h => h.id !== id));
    setDeleteTarget(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Send real-time event notifications to external services</p>
        </div>
        <Button icon={Plus} variant="primary" onClick={() => setShowCreate(true)}>Add Webhook</Button>
      </div>

      {saved && (
        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <CheckCircle size={18} style={{ color: 'var(--success-light)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-light)', fontWeight: 'var(--weight-medium)' }}>Webhook created successfully!</span>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total Webhooks', value: hooks.length, color: 'var(--primary-light)' },
          { label: 'Active', value: hooks.filter(h => h.active).length, color: 'var(--success-light)' },
          { label: 'Events Covered', value: [...new Set(hooks.flatMap(h => h.events))].length, color: 'var(--info-light)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Configured Webhooks" subtitle="Real-time event delivery to your endpoints" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {hooks.map((hook, i) => (
            <div key={hook.id} style={{ padding: 'var(--space-5)', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius)', flexShrink: 0, background: hook.active ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Webhook size={17} style={{ color: hook.active ? 'var(--primary-light)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{hook.name}</span>
                    <Badge variant={hook.active ? 'success' : 'muted'} dot>{hook.active ? 'Active' : 'Paused'}</Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Globe size={12} style={{ color: 'var(--text-muted)' }} />
                    <code style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{hook.url}</code>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 8 }}>
                    {hook.events.map(ev => (
                      <Badge key={ev} variant="primary">
                        <Zap size={9} style={{ marginRight: 3, opacity: 0.7 }} />{ev}
                      </Badge>
                    ))}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Added {formatDateTime(hook.created_at)}
                    {hook.last_triggered ? ` · Last fired ${formatDateTime(hook.last_triggered)}` : ' · Never triggered'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button onClick={() => toggleActive(hook.id)} title={hook.active ? 'Pause' : 'Enable'} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: hook.active ? 'var(--success-light)' : 'var(--text-muted)' }}>
                    {hook.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(hook)} />
                </div>
              </div>
            </div>
          ))}
          {hooks.length === 0 && (
            <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Webhook size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>No webhooks configured yet</p>
            </div>
          )}
        </div>
      </Card>

      {/* Events Reference */}
      <Card style={{ marginTop: 'var(--space-6)' }}>
        <CardHeader title="Available Events" subtitle="Subscribe to any of these FlowCRM events" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          {WEBHOOK_EVENTS.map(ev => (
            <div key={ev} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)' }}>
              <Zap size={13} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
              <code style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{ev}</code>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Webhook" size="lg"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0}>Save Webhook</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 6 }}>Webhook Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Slack Notifications" className="input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 6 }}>Endpoint URL</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhook" className="input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 10 }}>Events to Subscribe</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', background: form.events.includes(ev) ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface-2)', border: `1px solid ${form.events.includes(ev) ? 'rgba(99,102,241,0.3)' : 'transparent'}`, fontSize: 'var(--text-xs)', fontFamily: 'monospace', transition: 'all var(--transition-fast)' }}>
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} style={{ accentColor: 'var(--primary)' }} />{ev}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Webhook" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={() => handleDelete(deleteTarget?.id)}>Delete</Button>
          </div>
        }>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
          Delete <strong>"{deleteTarget?.name}"</strong>? This endpoint will stop receiving events immediately.
        </p>
      </Modal>
    </div>
  );
}
