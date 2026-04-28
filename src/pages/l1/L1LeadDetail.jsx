import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, Mail, Building, MapPin, Mic, MicOff, Plus, ArrowLeft, Calendar, XCircle } from 'lucide-react';
import { useLead, useUpdateLead, useRejectLead } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { StatusBadge, LevelBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { HealthScore } from '@/components/ui/HealthScore';
import { PageLoader } from '@/components/ui/Spinner';
import { formatDate, formatDateTime, formatPhone, timeAgo } from '@/utils/formatters';
import { INTERACTION_TYPE, LEAD_STATUS } from '@/lib/constants';
import L1Qualify from './L1Qualify';
import { toast } from 'sonner';

const INTERACTION_ICONS = { call: '📞', email: '✉️', meeting: '📅', note: '📝', whatsapp: '💬', system: '⚙️' };

export default function L1LeadDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: lead, isLoading } = useLead(id);
  const updateLead = useUpdateLead();
  const rejectLead = useRejectLead();

  const [showQualify, setShowQualify] = useState(searchParams.get('qualify') === '1');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectStatus, setRejectStatus] = useState(LEAD_STATUS.REJECTED);
  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Voice recording
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser'); return;
    }
    if (isRecording) {
      recognitionRef.current?.stop(); setIsRecording(false); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-IN';
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setNote(t);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start(); recognitionRef.current = rec; setIsRecording(true);
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    const { error } = await supabase.from('interactions').insert({
      lead_id: id, type: INTERACTION_TYPE.NOTE, notes: note, created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { setNote(''); toast.success('Note saved'); }
  };

  const handleReject = async () => {
    await rejectLead.mutateAsync({ id, status: rejectStatus, reason: rejectReason });
    setShowReject(false);
    navigate('/l1/leads');
  };

  if (isLoading) return <PageLoader />;
  if (!lead) return <div style={{ padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Lead not found</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <IconButton icon={ArrowLeft} onClick={() => navigate('/l1/leads')} />
        <Avatar name={lead.name} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>{lead.name}</h1>
            <StatusBadge status={lead.status} />
            <LevelBadge level={lead.current_level} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{lead.company} · Added {timeAgo(lead.created_at)}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button icon={XCircle} variant="secondary" onClick={() => setShowReject(true)}>Reject</Button>
          <Button icon={Phone} variant="primary" onClick={() => setShowQualify(true)}>Qualify Lead</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Contact Info */}
          <Card>
            <CardHeader title="Contact Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {[
                { icon: Mail, label: 'Email', value: lead.email },
                { icon: Phone, label: 'Phone', value: formatPhone(lead.phone) },
                { icon: Building, label: 'Company', value: lead.company },
                { icon: MapPin, label: 'Location', value: lead.enriched_data?.location },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: 'var(--primary-light)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Qualification fields */}
            {lead.enriched_data && (
              <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>Qualification Data</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  {['budget', 'requirement', 'timeline', 'interest', 'urgency'].map(field => lead.enriched_data[field] && (
                    <div key={field} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'capitalize' }}>{field}</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{lead.enriched_data[field]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Voice Note */}
          <Card>
            <CardHeader title="Add Note" subtitle="Type or use voice input"
              actions={
                <Button size="sm" variant={isRecording ? 'danger' : 'secondary'} icon={isRecording ? MicOff : Mic} onClick={toggleVoice}>
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
              } />
            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', color: 'var(--danger-light)', fontSize: 'var(--text-xs)' }}>
                <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                Recording… speak now
              </div>
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Call notes, observations, next steps…" rows={4} style={{ resize: 'vertical', marginBottom: 'var(--space-3)' }} />
            <Button icon={Plus} variant="primary" size="sm" onClick={saveNote} disabled={!note.trim()}>Save Note</Button>
          </Card>

          {/* Interaction Timeline */}
          <Card>
            <CardHeader title="Interaction History" subtitle={`${lead.interactions?.length || 0} interactions`} />
            {(lead.interactions?.length ?? 0) === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6)' }}>No interactions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {lead.interactions.map(i => (
                  <div key={i.id} style={{ display: 'flex', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {INTERACTION_ICONS[i.type] || '📝'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>{i.notes}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {i.actor?.name} · {formatDateTime(i.timestamp || i.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader title="Lead Score" />
            <HealthScore score={lead.score} size="lg" />
          </Card>
          <Card>
            <CardHeader title="Follow-Up" />
            {lead.follow_ups?.filter(f => !f.completed).map(f => (
              <div key={f.id} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                <Calendar size={14} style={{ color: 'var(--primary-light)' }} />
                <span>{formatDate(f.due_at)}</span>
              </div>
            ))}
            {(!lead.follow_ups || lead.follow_ups.filter(f => !f.completed).length === 0) && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No follow-up scheduled</p>
            )}
          </Card>
        </div>
      </div>

      {/* Qualify Modal */}
      <L1Qualify open={showQualify} onClose={() => setShowQualify(false)} lead={lead} />

      {/* Reject Modal */}
      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Lead"
        footer={<>
          <Button variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} loading={rejectLead.isPending}>Confirm Rejection</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label>Rejection Reason *</label>
            <select value={rejectStatus} onChange={e => setRejectStatus(e.target.value)}>
              <option value={LEAD_STATUS.REJECTED}>Invalid Lead</option>
              <option value={LEAD_STATUS.NOT_INTERESTED}>Not Interested</option>
              <option value={LEAD_STATUS.DUPLICATE}>Duplicate</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Add context for the rejection…" rows={3} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
