import { useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone, Mail, Building, MapPin, Mic, MicOff,
  Plus, ArrowLeft, Calendar, XCircle, CheckCircle, Clock,
} from 'lucide-react';
import {
  useLead, useUpdateLead, useRejectLead,
  useAddInteraction, useAddFollowUp, useCompleteFollowUp,
} from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
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

const INTERACTION_ICONS = {
  call: '📞', email: '✉️', meeting: '📅',
  note: '📝', whatsapp: '💬', system: '⚙️',
};

export default function L1LeadDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: lead, isLoading } = useLead(id);
  const rejectLead = useRejectLead();
  const addInteraction = useAddInteraction();
  const addFollowUp = useAddFollowUp();
  const completeFollowUp = useCompleteFollowUp();

  const [showQualify, setShowQualify] = useState(searchParams.get('qualify') === '1');
  const [showReject, setShowReject] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectStatus, setRejectStatus] = useState(LEAD_STATUS.REJECTED);
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState(INTERACTION_TYPE.NOTE);
  const [isRecording, setIsRecording] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const recognitionRef = useRef(null);

  // ── Voice recording ──────────────────────────────────────────
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setNote(t);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
  };

  // ── Save note / interaction ──────────────────────────────────
  const saveNote = async () => {
    if (!note.trim()) return;
    await addInteraction.mutateAsync({
      leadId: id,
      type: noteType,
      content: note,
      createdBy: user?.id,
    });
    setNote('');
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); }
    toast.success('Note saved');
  };

  // ── Reject ───────────────────────────────────────────────────
  const handleReject = async () => {
    await rejectLead.mutateAsync({
      id,
      status: rejectStatus,
      reason: rejectReason,
      existingData: lead?.enriched_data,
    });
    setShowReject(false);
    navigate('/l1/leads');
  };

  // ── Add follow-up ────────────────────────────────────────────
  const handleAddFollowUp = async () => {
    if (!followUpTitle.trim() || !followUpDate) {
      toast.error('Please fill in title and date');
      return;
    }
    await addFollowUp.mutateAsync({
      leadId: id,
      title: followUpTitle,
      dueAt: new Date(followUpDate).getTime(),
      createdBy: user?.id,
    });
    setFollowUpTitle('');
    setFollowUpDate('');
    setShowFollowUp(false);
  };

  if (isLoading) return <PageLoader />;
  if (!lead) return (
    <div style={{ padding: 'var(--space-8)', color: 'var(--text-muted)', textAlign: 'center' }}>
      Lead not found
    </div>
  );

  const pendingFollowUps = lead.follow_ups?.filter(f => !f.completed) ?? [];
  const completedFollowUps = lead.follow_ups?.filter(f => f.completed) ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <IconButton icon={ArrowLeft} onClick={() => navigate('/l1/leads')} />
        <Avatar name={lead.name} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)' }}>{lead.name}</h1>
            <StatusBadge status={lead.status} />
            <LevelBadge level={lead.current_level} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {lead.company || lead.email} · Added {timeAgo(lead.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button icon={XCircle} variant="secondary" onClick={() => setShowReject(true)}>Reject</Button>
          <Button icon={Phone} variant="primary" onClick={() => setShowQualify(true)}>Qualify Lead</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)' }}>
        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Contact Info */}
          <Card>
            <CardHeader title="Contact Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {[
                { icon: Mail,     label: 'Email',    value: lead.email },
                { icon: Phone,    label: 'Phone',    value: formatPhone(lead.phone) },
                { icon: Building, label: 'Company',  value: lead.company },
                { icon: MapPin,   label: 'Location', value: lead.enriched_data?.location },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: 'var(--primary-light)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {value || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Qualification data */}
            {lead.enriched_data && Object.keys(lead.enriched_data).some(k => ['budget','requirement','timeline','interest','urgency'].includes(k) && lead.enriched_data[k]) && (
              <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                  Qualification Data
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  {['budget', 'requirement', 'timeline', 'interest', 'urgency'].map(field =>
                    lead.enriched_data[field] ? (
                      <div key={field} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'capitalize' }}>{field}</div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{lead.enriched_data[field]}</div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader
              title="Add Note"
              subtitle="Type or use voice input"
              actions={
                <Button
                  size="sm"
                  variant={isRecording ? 'danger' : 'secondary'}
                  icon={isRecording ? MicOff : Mic}
                  onClick={toggleVoice}
                >
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
              }
            />

            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', color: 'var(--danger-light)', fontSize: 'var(--text-xs)' }}>
                <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                Recording… speak now
              </div>
            )}

            {/* Interaction type selector */}
            <div className="tabs" style={{ marginBottom: 'var(--space-3)' }}>
              {[
                { value: INTERACTION_TYPE.NOTE,  label: '📝 Note' },
                { value: INTERACTION_TYPE.CALL,  label: '📞 Call' },
                { value: INTERACTION_TYPE.EMAIL, label: '✉️ Email' },
              ].map(t => (
                <button
                  key={t.value}
                  className={`tab${noteType === t.value ? ' active' : ''}`}
                  onClick={() => setNoteType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`Add ${noteType} details, observations, next steps…`}
              rows={4}
              style={{ resize: 'vertical', marginBottom: 'var(--space-3)' }}
            />
            <Button
              icon={Plus}
              variant="primary"
              size="sm"
              onClick={saveNote}
              loading={addInteraction.isPending}
              disabled={!note.trim()}
            >
              Save {noteType.charAt(0).toUpperCase() + noteType.slice(1)}
            </Button>
          </Card>

          {/* Interaction Timeline */}
          <Card>
            <CardHeader
              title="Interaction History"
              subtitle={`${lead.interactions?.length || 0} interactions`}
            />
            {(lead.interactions?.length ?? 0) === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-6)' }}>
                No interactions yet — add a note above
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {lead.interactions.map(i => (
                  <div key={i.id} style={{ display: 'flex', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {INTERACTION_ICONS[i.type] || '📝'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>
                        {i.content}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {i.actor?.name || 'You'} · {formatDateTime(i.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Lead Score */}
          <Card>
            <CardHeader title="Lead Score" />
            <HealthScore score={lead.score} size="lg" />
          </Card>

          {/* Follow-Ups */}
          <Card>
            <CardHeader
              title="Follow-Ups"
              subtitle={pendingFollowUps.length > 0 ? `${pendingFollowUps.length} pending` : 'None pending'}
              actions={
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setShowFollowUp(true)}>
                  Add
                </Button>
              }
            />

            {pendingFollowUps.length === 0 && completedFollowUps.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>
                No follow-ups scheduled
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {pendingFollowUps.map(f => {
                  const overdue = new Date(f.due_at) < new Date();
                  return (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      padding: 'var(--space-3)', borderRadius: 'var(--radius)',
                      background: overdue ? 'var(--danger-glow)' : 'var(--bg-surface-2)',
                      border: `1px solid ${overdue ? 'rgba(239,68,68,0.2)' : 'transparent'}`,
                    }}>
                      <Clock size={13} style={{ color: overdue ? 'var(--danger-light)' : 'var(--primary-light)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: overdue ? 'var(--danger-light)' : 'var(--text-muted)' }}>
                          {overdue ? 'Overdue · ' : ''}{formatDate(f.due_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => completeFollowUp.mutate(f.id)}
                        title="Mark complete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                      >
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  );
                })}

                {completedFollowUps.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)' }}>
                    {completedFollowUps.slice(0, 2).map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 0', opacity: 0.5 }}>
                        <CheckCircle size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{f.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader title="Quick Actions" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Button
                variant="primary"
                icon={Phone}
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => setShowQualify(true)}
              >
                Qualify Lead → L2
              </Button>
              <Button
                variant="secondary"
                icon={Calendar}
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => setShowFollowUp(true)}
              >
                Schedule Follow-Up
              </Button>
              <Button
                variant="ghost"
                icon={XCircle}
                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger-light)' }}
                onClick={() => setShowReject(true)}
              >
                Reject Lead
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Qualify Modal ── */}
      <L1Qualify open={showQualify} onClose={() => setShowQualify(false)} lead={lead} />

      {/* ── Add Follow-Up Modal ── */}
      <Modal
        open={showFollowUp}
        onClose={() => setShowFollowUp(false)}
        title="Schedule Follow-Up"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFollowUp(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon={Calendar}
              loading={addFollowUp.isPending}
              onClick={handleAddFollowUp}
              disabled={!followUpTitle.trim() || !followUpDate}
            >
              Schedule
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label>Title *</label>
            <input
              value={followUpTitle}
              onChange={e => setFollowUpTitle(e.target.value)}
              placeholder="e.g. Send pricing deck, Follow-up call"
            />
          </div>
          <div className="form-group">
            <label>Due Date *</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        open={showReject}
        onClose={() => setShowReject(false)}
        title="Reject Lead"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button
              variant="danger"
              icon={XCircle}
              onClick={handleReject}
              loading={rejectLead.isPending}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
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
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Add context for the rejection…"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
