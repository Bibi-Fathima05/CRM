import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency, timeAgo } from '@/utils/formatters';
import { CheckCircle, XCircle, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';

function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(name, avatar_url)')
        .in('action', ['discount_request', 'pricing_change_request'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Normalise timestamp alias
      return (data ?? []).map(r => ({ ...r, timestamp: r.created_at }));
    },
  });
}

export default function L3Approvals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: approvals = [], isLoading } = useApprovals();
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const pending = approvals.filter(a => !a.metadata?.resolved);
  const resolved = approvals.filter(a => a.metadata?.resolved);

  const resolve = async (id, approved) => {
    // Log the resolution action
    const { error: logErr } = await supabase.from('audit_logs').insert({
      entity_type: 'approval',
      entity_id: id,
      action: approved ? 'approved' : 'rejected',
      actor_id: user?.id,
      created_by: user?.id,
      metadata: { notes: note, resolved: true },
    });
    if (logErr) { toast.error(logErr.message); return; }

    // Mark original request as resolved
    const { error: updateErr } = await supabase
      .from('audit_logs')
      .update({
        metadata: {
          ...selected.metadata,
          resolved: true,
          approved,
          resolved_by: user?.id,
          notes: note,
        },
      })
      .eq('id', id);
    if (updateErr) { toast.error(updateErr.message); return; }

    qc.invalidateQueries({ queryKey: ['approvals'] });
    toast.success(approved ? 'Approved ✓' : 'Rejected');
    setSelected(null);
    setNote('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">{pending.length} pending requests</p>
        </div>
        {pending.length > 0 && <Badge variant="warning">{pending.length} pending</Badge>}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          <CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--success)' }} />
          <p style={{ fontSize: 'var(--text-sm)' }}>No pending approvals — all clear!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {pending.map(req => (
            <div key={req.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4)', borderRadius: 'var(--radius)',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius)',
                background: 'var(--warning-glow)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {req.action === 'discount_request'
                  ? <DollarSign size={18} style={{ color: 'var(--warning)' }} />
                  : <FileText size={18} style={{ color: 'var(--warning)' }} />}
              </div>
              <Avatar name={req.actor?.name} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                  {req.action === 'discount_request' ? 'Discount Request' : 'Pricing Change Request'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {req.actor?.name} · {timeAgo(req.timestamp)}
                  {req.metadata?.amount && ` · ${formatCurrency(req.metadata.amount)}`}
                </div>
                {req.metadata?.reason && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {req.metadata.reason}
                  </div>
                )}
              </div>
              <Button size="sm" icon={CheckCircle} variant="success" onClick={() => setSelected(req)}>
                Review
              </Button>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{
            fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 'var(--space-4)',
          }}>
            Recently Resolved
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {resolved.slice(0, 5).map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)', borderRadius: 'var(--radius)',
                background: 'var(--bg-surface-2)', opacity: 0.75,
              }}>
                {req.metadata?.approved
                  ? <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  : <XCircle size={16} style={{ color: 'var(--danger-light)', flexShrink: 0 }} />}
                <Avatar name={req.actor?.name} size="sm" />
                <div style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{req.actor?.name} </span>
                  <span style={{ color: 'var(--text-muted)' }}>— {req.action.replace(/_/g, ' ')} </span>
                  <Badge variant={req.metadata?.approved ? 'success' : 'danger'}>
                    {req.metadata?.approved ? 'Approved' : 'Rejected'}
                  </Badge>
                </div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {timeAgo(req.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setNote(''); }}
        title="Review Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSelected(null); setNote(''); }}>Cancel</Button>
            <Button variant="danger" icon={XCircle} onClick={() => resolve(selected.id, false)}>Reject</Button>
            <Button variant="success" icon={CheckCircle} onClick={() => resolve(selected.id, true)}>Approve</Button>
          </>
        }
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {[
                { label: 'Type', value: selected.action.replace(/_/g, ' ') },
                { label: 'Requested by', value: selected.actor?.name },
                { label: 'Amount', value: selected.metadata?.amount ? formatCurrency(selected.metadata.amount) : '—' },
                { label: 'Discount %', value: selected.metadata?.discount ? `${selected.metadata.discount}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {selected.metadata?.reason && (
              <div style={{
                padding: 'var(--space-3)', borderRadius: 'var(--radius)',
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 'var(--text-sm)', color: 'var(--info-light)',
              }}>
                {selected.metadata.reason}
              </div>
            )}
            <div className="form-group">
              <label>Approval Notes</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add context for your decision…"
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
