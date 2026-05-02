import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, timeAgo, formatDateTime } from '@/utils/formatters';
import { CheckCircle, XCircle, DollarSign, FileText, Clock, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_META = {
  discount_request:       { label: 'Discount Request',  icon: DollarSign,    color: 'var(--warning)' },
  pricing_change_request: { label: 'Pricing Change',    icon: FileText,      color: 'var(--info)' },
  contract_approval:      { label: 'Contract Approval', icon: Shield,        color: 'var(--primary-light)' },
  exception_request:      { label: 'Exception Request', icon: AlertTriangle, color: 'var(--danger-light)' },
};

export default function L3Approvals() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('pending');

  const rawLogs = useQuery(api.deals.getAuditLogs, { limit: 100 }) ?? [];
  const addLog  = useMutation(api.leads.addAuditLog);

  const approvals = rawLogs.filter(l => Object.keys(ACTION_META).includes(l.action));
  const pending   = approvals.filter(a => !a.metadata?.resolved);
  const resolved  = approvals.filter(a => a.metadata?.resolved);
  const shown     = tab === 'pending' ? pending : resolved;

  const resolve = async (id, approved) => {
    setSaving(true);
    try {
      await addLog({
        entity_type: 'approval',
        entity_id: id,
        action: approved ? 'approved' : 'rejected',
        metadata: { notes: note, resolved: true, original_id: id },
        actor_id: user?._id || undefined,
        created_by: user?._id || undefined,
      });
      toast.success(approved ? '✓ Approved' : 'Rejected');
      setSelected(null); setNote('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getMeta = (action) => ACTION_META[action] || { label: action.replace(/_/g, ' '), icon: FileText, color: 'var(--text-muted)' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">Discount requests, pricing changes, contract approvals</p>
        </div>
        {pending.length > 0 && <Badge variant="warning">{pending.length} pending</Badge>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard label="Pending"  value={pending.length}                                    icon={Clock}        color="warning" />
        <StatCard label="Approved" value={resolved.filter(r => r.metadata?.approved !== false).length} icon={CheckCircle} color="success" />
        <StatCard label="Rejected" value={resolved.filter(r => r.metadata?.approved === false).length} icon={XCircle}    color="danger" />
        <StatCard label="Total"    value={approvals.length}                                  icon={FileText}     color="primary" />
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button className={`tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button className={`tab${tab === 'resolved' ? ' active' : ''}`} onClick={() => setTab('resolved')}>
          Resolved {resolved.length > 0 && `(${resolved.length})`}
        </button>
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--success)' }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>{tab === 'pending' ? 'No pending approvals — all clear!' : 'No resolved approvals yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {shown.map(req => {
            const meta = getMeta(req.action);
            const Icon = meta.icon;
            const isResolved = !!req.metadata?.resolved;
            return (
              <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--bg-surface)', border: '1px solid var(--border)', opacity: isResolved ? 0.8 : 1 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>
                <Avatar name={req.actor?.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{meta.label}</span>
                    {isResolved && <Badge variant={req.metadata?.approved !== false ? 'success' : 'danger'}>{req.metadata?.approved !== false ? 'Approved' : 'Rejected'}</Badge>}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {req.actor?.name || 'Unknown'} · {timeAgo(req.created_at)}
                    {req.metadata?.amount && ` · ${formatCurrency(req.metadata.amount)}`}
                    {req.metadata?.discount && ` · ${req.metadata.discount}% discount`}
                  </div>
                  {req.metadata?.reason && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.metadata.reason}
                    </div>
                  )}
                </div>
                {!isResolved && (
                  <Button size="sm" variant="primary" onClick={() => setSelected(req)}>Review</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setNote(''); }} title="Review Request"
        footer={<>
          <Button variant="secondary" onClick={() => { setSelected(null); setNote(''); }}>Cancel</Button>
          <Button variant="danger" icon={XCircle} loading={saving} onClick={() => resolve(selected._id, false)}>Reject</Button>
          <Button variant="success" icon={CheckCircle} loading={saving} onClick={() => resolve(selected._id, true)}>Approve</Button>
        </>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {[
                { label: 'Type',         value: getMeta(selected.action).label },
                { label: 'Requested by', value: selected.actor?.name || 'Unknown' },
                { label: 'Amount',       value: selected.metadata?.amount ? formatCurrency(selected.metadata.amount) : '—' },
                { label: 'Discount',     value: selected.metadata?.discount ? `${selected.metadata.discount}%` : '—' },
                { label: 'Submitted',    value: formatDateTime(selected.created_at) },
                { label: 'Entity',       value: `${selected.entity_type} #${String(selected.entity_id).slice(-8)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
            {selected.metadata?.reason && (
              <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 'var(--text-sm)', color: 'var(--info-light)' }}>
                <strong>Reason:</strong> {selected.metadata.reason}
              </div>
            )}
            <div className="form-group">
              <label>Decision Notes</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for your decision (optional)…" rows={3} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
