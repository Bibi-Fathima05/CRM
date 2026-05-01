import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

const ACTION_LABELS = {
  discount_request:       { label: 'Discount Request',       icon: DollarSign, color: 'var(--warning)' },
  pricing_change_request: { label: 'Pricing Change',         icon: FileText,   color: 'var(--info)' },
  contract_approval:      { label: 'Contract Approval',      icon: Shield,     color: 'var(--primary-light)' },
  exception_request:      { label: 'Exception Request',      icon: AlertTriangle, color: 'var(--danger-light)' },
};

function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(name, avatar_url)')
        .in('action', Object.keys(ACTION_LABELS))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({ ...r, timestamp: r.created_at }));
    },
  });
}

export default function L3Approvals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: approvals = [], isLoading } = useApprovals();
  const [selected, setSelected] = useState(null);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('pending'); // 'pending' | 'resolved'

  const pending  = approvals.filter(a => !a.metadata?.resolved);
  const resolved = approvals.filter(a => a.metadata?.resolved);
  const shown    = tab === 'pending' ? pending : resolved;

  const resolve = async (id, approved) => {
    setSaving(true);
    const { error: logErr } = await supabase.from('audit_logs').insert({
      entity_type: 'approval', entity_id: id,
      action: approved ? 'approved' : 'rejected',
      actor_id: user?.id, created_by: user?.id,
      metadata: { notes: note, resolved: true },
    });
    if (logErr) { toast.error(logErr.message); setSaving(false); return; }

    const { error: updateErr } = await supabase.from('audit_logs').update({
      metadata: { ...selected.metadata, resolved: true, approved, resolved_by: user?.id, notes: note, resolved_at: new Date().toISOString() },
    }).eq('id', id);
    if (updateErr) { toast.error(updateErr.message); setSaving(false); return; }

    qc.invalidateQueries({ queryKey: ['approvals'] });
    toast.success(approved ? '✓ Approved' : 'Rejected');
    setSelected(null); setNote(''); setSaving(false);
  };

  const getActionMeta = (action) => ACTION_LABELS[action] || { label: action.replace(/_/g, ' '), icon: FileText, color: 'var(--text-muted)' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">Discount requests, pricing changes, contract approvals</p>
        </div>
        {pending.length > 0 && <Badge variant="warning">{pending.length} pending</Badge>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard label="Pending"  value={pending.length}  icon={Clock}        color="warning" loading={isLoading} />
        <StatCard label="Approved" value={resolved.filter(r => r.metadata?.approved).length} icon={CheckCircle} color="success" loading={isLoading} />
        <StatCard label="Rejected" value={resolved.filter(r => !r.metadata?.approved).length} icon={XCircle} color="danger" loading={isLoading} />
        <StatCard label="Total"    value={approvals.length} icon={FileText}     color="primary" loading={isLoading} />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button className={`tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button className={`tab${tab === 'resolved' ? ' active' : ''}`} onClick={() => setTab('resolved')}>
          Resolved {resolved.length > 0 && `(${resolved.length})`}
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)' }} />)}
        </div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--success)' }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>{tab === 'pending' ? 'No pending approvals — all clear!' : 'No resolved approvals yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {shown.map(req => {
            const meta = getActionMeta(req.action);
            const Icon = meta.icon;
            const isResolved = !!req.metadata?.resolved;
            return (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4)', borderRadius: 'var(--radius)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                opacity: isResolved ? 0.8 : 1,
                transition: 'all var(--transition-fast)',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>

                <Avatar name={req.actor?.name} size="sm" />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>{meta.label}</span>
                    {isResolved && (
                      <Badge variant={req.metadata?.approved ? 'success' : 'danger'}>
                        {req.metadata?.approved ? 'Approved' : 'Rejected'}
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {req.actor?.name} · {timeAgo(req.timestamp)}
                    {req.metadata?.amount && ` · ${formatCurrency(req.metadata.amount)}`}
                    {req.metadata?.discount && ` · ${req.metadata.discount}% discount`}
                  </div>
                  {req.metadata?.reason && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.metadata.reason}
                    </div>
                  )}
                  {isResolved && req.metadata?.notes && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                      Note: {req.metadata.notes}
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
          <Button variant="danger" icon={XCircle} loading={saving} onClick={() => resolve(selected.id, false)}>Reject</Button>
          <Button variant="success" icon={CheckCircle} loading={saving} onClick={() => resolve(selected.id, true)}>Approve</Button>
        </>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Request details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {[
                { label: 'Type',         value: getActionMeta(selected.action).label },
                { label: 'Requested by', value: selected.actor?.name },
                { label: 'Amount',       value: selected.metadata?.amount ? formatCurrency(selected.metadata.amount) : '—' },
                { label: 'Discount',     value: selected.metadata?.discount ? `${selected.metadata.discount}%` : '—' },
                { label: 'Submitted',    value: formatDateTime(selected.timestamp) },
                { label: 'Entity',       value: selected.entity_type + ' #' + selected.entity_id?.slice(0,8) },
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
