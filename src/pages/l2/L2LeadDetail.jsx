import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, DollarSign, FileText, ArrowRight, Send } from 'lucide-react';
import { useDeal, useUpdateDealStage } from '@/hooks/useDeals';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { HealthScore } from '@/components/ui/HealthScore';
import { Badge, RiskBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import { formatCurrency, formatDateTime, timeAgo } from '@/utils/formatters';
import { INTERACTION_TYPE, STAGE_LABELS, STAGE_ORDER } from '@/lib/constants';
import { toast } from 'sonner';

const MSG_TEMPLATES = {
  follow_up: (name) => `Hi ${name}, just following up on our previous conversation. Do you have any questions about the proposal? Happy to jump on a quick call.`,
  proposal_sent: (name) => `Hi ${name}, I've sent over the proposal as discussed. Please review and let me know if you'd like to adjust anything. Looking forward to your feedback!`,
  meeting_request: (name) => `Hi ${name}, I'd love to schedule a 30-minute call to walk you through the next steps. Are you available this week?`,
  negotiation: (name) => `Hi ${name}, I understand your concern about pricing. Let me see what we can do to make this work within your budget while delivering full value.`,
};

export default function L2LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const updateStage = useUpdateDealStage();

  const [meetingNote, setMeetingNote] = useState('');
  const [msgTemplate, setMsgTemplate] = useState('follow_up');
  const [customMsg, setCustomMsg] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const generatedMsg = MSG_TEMPLATES[msgTemplate]?.(deal?.lead?.name || 'there') || '';

  const saveMeetingNote = async () => {
    if (!meetingNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from('interactions').insert({
      lead_id: deal.lead_id, type: INTERACTION_TYPE.MEETING, notes: meetingNote, created_by: user?.id,
    });
    setSavingNote(false);
    if (error) toast.error(error.message);
    else { setMeetingNote(''); toast.success('Meeting note saved'); }
  };

  const moveStage = async (stage) => {
    await updateStage.mutateAsync({ id: deal.id, stage, actorId: user?.id });
    toast.success(`Stage updated to ${STAGE_LABELS[stage]}`);
  };

  if (isLoading) return <PageLoader />;
  if (!deal) return <div style={{ padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Deal not found</div>;

  const currentIdx = STAGE_ORDER.indexOf(deal.stage);
  const nextStage = STAGE_ORDER[currentIdx + 1];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <IconButton icon={ArrowLeft} onClick={() => navigate('/l2/pipeline')} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>{deal.lead?.name}</h1>
            <RiskBadge risk={deal.risk_level} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {deal.lead?.company} · {STAGE_LABELS[deal.stage]} · {formatCurrency(deal.value)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {nextStage && (
            <Button icon={ArrowRight} variant="primary" onClick={() => moveStage(nextStage)} loading={updateStage.isPending}>
              Move to {STAGE_LABELS[nextStage]}
            </Button>
          )}
          <Button variant="success" onClick={() => navigate(`/l2/escalate/${deal.id}`)}>Escalate to L3</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Meeting Notes */}
          <Card>
            <CardHeader title="Meeting Notes" subtitle="Auto-summarized after save" />
            <textarea value={meetingNote} onChange={e => setMeetingNote(e.target.value)}
              placeholder="Add meeting notes, objections raised, next steps discussed…" rows={5}
              style={{ marginBottom: 'var(--space-3)', resize: 'vertical' }} />
            <Button icon={FileText} variant="primary" size="sm" onClick={saveMeetingNote} loading={savingNote} disabled={!meetingNote.trim()}>
              Save Meeting Note
            </Button>
          </Card>

          {/* AI Message Generator */}
          <Card>
            <CardHeader title="AI Message Drafts" subtitle="Hyper-personalized outreach" />
            <div className="tabs" style={{ marginBottom: 'var(--space-4)' }}>
              {Object.keys(MSG_TEMPLATES).map(k => (
                <button key={k} className={`tab${msgTemplate === k ? ' active' : ''}`} onClick={() => setMsgTemplate(k)}>
                  {k.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', borderLeft: '3px solid var(--primary)', marginBottom: 'var(--space-3)' }}>
              {generatedMsg}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(generatedMsg); toast.success('Copied'); }}>Copy</Button>
              <Button size="sm" icon={Send} variant="primary">Send via WhatsApp</Button>
            </div>
          </Card>

          {/* Negotiation Panel */}
          <Card>
            <CardHeader title="Negotiation Support" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
              {[
                { label: 'Listed Price', value: formatCurrency(deal.value), color: 'var(--text-primary)' },
                { label: 'Min Acceptable', value: formatCurrency(deal.value * 0.85), color: 'var(--warning)' },
                { label: 'Walk-Away Price', value: formatCurrency(deal.value * 0.75), color: 'var(--danger-light)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--info-glow)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--info-light)', border: '1px solid rgba(59,130,246,0.2)' }}>
              💡 Max recommended discount: 15% — below 25% risks margin. Offer phased payments as alternative.
            </div>
          </Card>

          {/* Interaction History */}
          <Card>
            <CardHeader title="Interaction History" subtitle={`${deal.interactions?.length || 0} interactions`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(deal.interactions || []).map(i => (
                <div key={i.id} style={{ display: 'flex', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
                  <Avatar name={i.actor?.name} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{i.notes}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{i.actor?.name} · {timeAgo(i.timestamp)}</div>
                  </div>
                </div>
              ))}
              {(!deal.interactions || deal.interactions.length === 0) && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No interactions yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader title="Deal Health" />
            <HealthScore score={deal.health_score} size="lg" />
          </Card>
          <Card>
            <CardHeader title="Pipeline Stage" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {STAGE_ORDER.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= currentIdx ? 'var(--primary)' : 'var(--bg-surface-3)', border: `2px solid ${i <= currentIdx ? 'var(--primary)' : 'var(--border)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {i < currentIdx && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', color: i === currentIdx ? 'var(--primary-light)' : i < currentIdx ? 'var(--text-muted)' : 'var(--text-muted)', fontWeight: i === currentIdx ? 'var(--weight-semibold)' : 'var(--weight-regular)' }}>
                    {STAGE_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Proposals" />
            {(deal.proposals || []).length === 0
              ? <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No proposals yet</p>
              : deal.proposals.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                  <span>Proposal</span>
                  <Badge variant={p.status === 'sent' ? 'success' : 'muted'}>{p.status}</Badge>
                </div>
              ))}
            <Button size="sm" variant="secondary" style={{ marginTop: 'var(--space-3)', width: '100%' }} onClick={() => navigate('/l2/proposal')}>
              Create Proposal
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
