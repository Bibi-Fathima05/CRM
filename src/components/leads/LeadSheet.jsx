import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Mail, Phone, Building, MapPin, Briefcase, Globe, Linkedin,
  CheckCircle, XCircle, Clock, Plus, ArrowRight, AlertCircle,
  Calendar, MessageSquare, FileText, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, Edit2, Save,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  useLead, useInlineUpdateField, useAddInteraction,
  useAddFollowUp, useCompleteFollowUp, useTransitionLead, useRejectLead,
} from '@/hooks/useLeads';
import { useLeadRealtime } from '@/hooks/useLeadRealtime';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge, LevelBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Spinner';
import {
  formatCurrency, formatDate, formatDateTime, timeAgo, formatPhone,
} from '@/utils/formatters';
import {
  getScoreColour, getScoreLabel, getHealthLabel,
} from '@/utils/scoring';
import {
  LEAD_STATUS, LIFECYCLE_STAGES, LEAD_SOURCES,
  INTERACTION_TYPE, TERMINAL_STATUSES, L1_GATE,
} from '@/lib/constants';
import { toast } from 'sonner';

// ── Audit log timeline query ──────────────────────────────────
function useLeadTimeline(leadId) {
  return useQuery({
    queryKey: ['timeline', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, actor:users!audit_logs_actor_id_fkey(name, avatar_url)')
        .eq('entity_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!leadId,
  });
}

// ── Helpers ───────────────────────────────────────────────────

const INTERACTION_ICONS = {
  call: '📞', email: '✉️', meeting: '📅',
  note: '📝', whatsapp: '💬', system: '⚙️',
};

const SECTION_STYLE = {
  padding: 'var(--space-5)',
  borderBottom: '1px solid var(--border)',
};

const LABEL_STYLE = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 'var(--space-3)',
  fontWeight: 'var(--weight-semibold)',
};

function SectionTitle({ children }) {
  return <div style={LABEL_STYLE}>{children}</div>;
}

// Score circle
function ScoreCircle({ score }) {
  const colour = getScoreColour(score ?? 0);
  const colourMap = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' };
  const c = colourMap[colour] || 'var(--text-muted)';
  const { label } = getScoreLabel(score ?? 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: `3px solid ${c}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${c}18`,
      }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: c }}>{score ?? 0}</span>
      </div>
      <span style={{ fontSize: 10, color: c, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// Stage progress bar
function StageProgress({ status }) {
  const stages = LIFECYCLE_STAGES;
  const currentIdx = stages.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      {stages.map((s, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              height: 4, width: '100%', borderRadius: 2,
              background: done ? 'var(--primary)' : 'var(--bg-surface-3)',
              transition: 'background 0.3s',
            }} />
            {active && (
              <span style={{ fontSize: 9, color: 'var(--primary-light)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {s.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Inline editable field
function InlineField({ label, value, field, leadId, actorId, type = 'text', options, icon: Icon }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const updateField = useInlineUpdateField();

  const save = async () => {
    if (draft === (value ?? '')) { setEditing(false); return; }
    await updateField.mutateAsync({ leadId, field, oldValue: value, newValue: draft || null, actorId });
    setEditing(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') save();
    if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', minWidth: 0 }}>
      {Icon && (
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius)',
          background: 'var(--bg-surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={13} style={{ color: 'var(--primary-light)' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        {editing ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {type === 'textarea' ? (
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={onKey}
                rows={2}
                style={{ fontSize: 'var(--text-sm)', padding: '4px 8px', flex: 1, resize: 'vertical' }}
              />
            ) : type === 'select' ? (
              <select
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={save}
                style={{ fontSize: 'var(--text-sm)', padding: '4px 8px', flex: 1 }}
              >
                <option value="">—</option>
                {options?.map(o => (
                  <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                ))}
              </select>
            ) : (
              <input
                autoFocus
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={onKey}
                style={{ fontSize: 'var(--text-sm)', padding: '4px 8px', flex: 1 }}
              />
            )}
            <button onClick={save} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', display: 'flex' }}>
              <Save size={13} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => { setDraft(value ?? ''); setEditing(true); }}
            style={{
              fontSize: 'var(--text-sm)',
              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', gap: 4,
              minHeight: 22,
            }}
            title="Click to edit"
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value || '—'}
            </span>
            <Edit2 size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main LeadSheet component ──────────────────────────────────
export function LeadSheet({ leadId, onClose }) {
  const { user } = useAuth();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: timeline = [] } = useLeadTimeline(leadId);
  useLeadRealtime(leadId);

  const addInteraction = useAddInteraction();
  const addFollowUp    = useAddFollowUp();
  const completeFollowUp = useCompleteFollowUp();
  const transitionLead = useTransitionLead();
  const rejectLead     = useRejectLead();

  // Interaction form state
  const [intType, setIntType]       = useState('call');
  const [intContent, setIntContent] = useState('');
  const [showIntForm, setShowIntForm] = useState(false);

  // Follow-up form state
  const [fuTitle, setFuTitle]   = useState('');
  const [fuDate, setFuDate]     = useState('');
  const [showFuForm, setShowFuForm] = useState(false);

  // Reject form state
  const [showReject, setShowReject]       = useState(false);
  const [rejectStatus, setRejectStatus]   = useState(LEAD_STATUS.REJECTED);
  const [rejectReason, setRejectReason]   = useState('');

  // Gate errors
  const [gateErrors, setGateErrors] = useState([]);

  // Escape key
  useEffect(() => {
    if (!leadId) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [leadId, onClose]);

  if (!leadId) return null;

  const portal = document.getElementById('lead-sheet-root');
  if (!portal) return null;

  // ── Gate check (client-side) ──────────────────────────────
  const qualifyingInteractions = lead?.interactions?.filter(i =>
    ['call','email','meeting'].includes(i.type)
  ) ?? [];

  const gateChecks = lead ? [
    { label: 'Budget filled',       met: !!lead.budget },
    { label: 'Requirement filled',  met: !!lead.requirement },
    { label: 'Timeline filled',     met: !!lead.timeline },
    { label: '≥1 call/email/meeting', met: qualifyingInteractions.length > 0 },
    { label: `Score ≥ ${L1_GATE.minScore}`, met: (lead.score ?? 0) >= L1_GATE.minScore },
  ] : [];

  const gateAllMet = gateChecks.every(c => c.met);
  const isTerminal = TERMINAL_STATUSES.includes(lead?.status);
  const canQualify = lead && !isTerminal && (lead.current_level === 'l1' || lead.current_level === 'l2');

  // ── Handlers ─────────────────────────────────────────────
  const handleQualify = async () => {
    if (lead.current_level === 'l1' && !gateAllMet) {
      setGateErrors(gateChecks.filter(c => !c.met).map(c => c.label));
      return;
    }
    setGateErrors([]);
    try {
      await transitionLead.mutateAsync({ lead, actorId: user?.id });
    } catch (e) {
      if (e.gateErrors) setGateErrors(e.gateErrors);
      else toast.error(e.message);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    await rejectLead.mutateAsync({
      id: lead.id, status: rejectStatus,
      reason: rejectReason, actorId: user?.id,
      existingData: lead.enriched_data,
    });
    setShowReject(false);
    onClose();
  };

  const handleAddInteraction = async () => {
    if (!intContent.trim()) return;
    await addInteraction.mutateAsync({
      leadId: lead.id, type: intType,
      content: intContent, createdBy: user?.id,
    });
    setIntContent(''); setShowIntForm(false);
  };

  const handleAddFollowUp = async () => {
    if (!fuTitle.trim() || !fuDate) { toast.error('Fill in title and date'); return; }
    await addFollowUp.mutateAsync({
      leadId: lead.id, title: fuTitle,
      dueAt: new Date(fuDate).toISOString(), createdBy: user?.id,
    });
    setFuTitle(''); setFuDate(''); setShowFuForm(false);
  };

  const sourceName = LEAD_SOURCES.find(s => s.value === lead?.source)?.label || lead?.source || '—';
  const pendingFU  = lead?.follow_ups?.filter(f => !f.completed) ?? [];
  const doneFU     = lead?.follow_ups?.filter(f => f.completed)  ?? [];
  const deal       = lead?.deals?.[0];

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 'var(--z-modal)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(680px, 100vw)',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 'calc(var(--z-modal) + 1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        animation: 'slideInRight 0.25s ease',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: 'var(--space-5)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          {isLoading ? (
            <PageLoader />
          ) : lead ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <Avatar name={lead.name} size="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 4 }}>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: 0 }}>{lead.name}</h2>
                    <StatusBadge status={lead.status} />
                    <LevelBadge level={lead.current_level} />
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
                    {lead.company || lead.email} · Added {timeAgo(lead.created_at)}
                  </p>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <StageProgress status={lead.status} />
                  </div>
                </div>
                <ScoreCircle score={lead.score} />
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, flexShrink: 0 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Action buttons */}
              {!isTerminal && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {canQualify && (
                    <Button
                      size="sm" variant="primary" icon={ArrowRight}
                      loading={transitionLead.isPending}
                      onClick={handleQualify}
                    >
                      {lead.current_level === 'l1' ? 'Qualify → L2' : 'Escalate → L3'}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setShowReject(v => !v)}>
                    Reject
                  </Button>
                </div>
              )}

              {/* Gate errors */}
              {gateErrors.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger-light)', marginBottom: 4 }}>
                    Gate conditions not met:
                  </div>
                  {gateErrors.map(e => (
                    <div key={e} style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={11} /> {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Reject form */}
              {showReject && (
                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <select value={rejectStatus} onChange={e => setRejectStatus(e.target.value)} style={{ fontSize: 'var(--text-sm)' }}>
                      <option value={LEAD_STATUS.REJECTED}>Invalid Lead</option>
                      <option value={LEAD_STATUS.NOT_INTERESTED}>Not Interested</option>
                      <option value={LEAD_STATUS.DUPLICATE}>Duplicate</option>
                    </select>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)…" rows={2} style={{ fontSize: 'var(--text-sm)' }} />
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
                      <Button size="sm" variant="danger" icon={XCircle} loading={rejectLead.isPending} onClick={handleReject}>Confirm Reject</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {!lead && !isLoading && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Lead not found</div>
        )}

        {lead && (
          <>
            {/* ── Section 1: Identity & Contact ── */}
            <div style={SECTION_STYLE}>
              <SectionTitle>Identity & Contact</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <InlineField label="Full Name"   field="name"         value={lead.name}         leadId={lead.id} actorId={user?.id} icon={null} />
                <InlineField label="Email"       field="email"        value={lead.email}        leadId={lead.id} actorId={user?.id} icon={Mail} type="email" />
                <InlineField label="Phone"       field="phone"        value={formatPhone(lead.phone)} leadId={lead.id} actorId={user?.id} icon={Phone} />
                <InlineField label="Company"     field="company"      value={lead.company}      leadId={lead.id} actorId={user?.id} icon={Building} />
                <InlineField label="Job Title"   field="job_title"    value={lead.job_title}    leadId={lead.id} actorId={user?.id} icon={Briefcase} />
                <InlineField label="Location"    field="location"     value={lead.location}     leadId={lead.id} actorId={user?.id} icon={MapPin} />
                <InlineField label="Website"     field="website"      value={lead.website}      leadId={lead.id} actorId={user?.id} icon={Globe} />
                <InlineField label="LinkedIn"    field="linkedin_url" value={lead.linkedin_url} leadId={lead.id} actorId={user?.id} icon={Linkedin} />
              </div>
            </div>

            {/* ── Section 2: Source & Capture ── */}
            <div style={SECTION_STYLE}>
              <SectionTitle>Source & Capture</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Source',          value: sourceName },
                  { label: 'Source Detail',   value: lead.source_detail },
                  { label: 'Capture Method',  value: lead.capture_method },
                  { label: 'Captured At',     value: formatDateTime(lead.captured_at || lead.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 3: Qualification ── */}
            <div style={SECTION_STYLE}>
              <SectionTitle>Qualification Details</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <InlineField label="Budget (₹)"   field="budget"      value={lead.budget}      leadId={lead.id} actorId={user?.id} type="number" icon={DollarSign} />
                <InlineField label="Timeline"     field="timeline"    value={lead.timeline}    leadId={lead.id} actorId={user?.id} icon={Clock} />
                <InlineField label="Industry"     field="industry"    value={lead.industry}    leadId={lead.id} actorId={user?.id} icon={TrendingUp} />
                <InlineField label="Company Size" field="company_size" value={lead.company_size} leadId={lead.id} actorId={user?.id} type="select"
                  options={['1-10','11-50','51-200','201-1000','1000+'].map(v => ({ value: v, label: v }))} icon={Building} />
              </div>
              <InlineField label="Requirement" field="requirement" value={lead.requirement} leadId={lead.id} actorId={user?.id} type="textarea" icon={FileText} />

              {/* L1→L2 gate checklist */}
              {lead.current_level === 'l1' && !isTerminal && (
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius)', background: 'var(--bg-surface-2)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    L1 → L2 Gate Checklist
                  </div>
                  {gateChecks.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                      {c.met
                        ? <CheckCircle size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        : <XCircle    size={13} style={{ color: 'var(--danger-light)', flexShrink: 0 }} />}
                      <span style={{ color: c.met ? 'var(--success-light)' : 'var(--text-muted)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 4: Lifecycle Timeline ── */}
            <div style={SECTION_STYLE}>
              <SectionTitle>Lifecycle Timeline</SectionTitle>
              {timeline.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No events yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {timeline.map(event => (
                    <div key={event.id} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                        {event.action === 'lead.created' ? '🌱'
                          : event.action === 'lead.field_updated' ? '✏️'
                          : event.action === 'lead.level_transition' ? '⬆️'
                          : event.action === 'lead.rejected' ? '❌'
                          : '📋'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          {event.action === 'lead.field_updated' && event.metadata
                            ? `${event.metadata.field}: "${event.metadata.old_value ?? '—'}" → "${event.metadata.new_value ?? '—'}"`
                            : event.action === 'lead.level_transition' && event.metadata
                            ? `Moved ${event.metadata.from_level?.toUpperCase()} → ${event.metadata.to_level?.toUpperCase()}`
                            : event.action.replace(/\./g, ' ').replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {event.actor?.name || 'System'} · {timeAgo(event.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 5: Interactions ── */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={LABEL_STYLE}>Interactions ({lead.interactions?.length ?? 0})</div>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowIntForm(v => !v)}>Add</Button>
              </div>

              {showIntForm && (
                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)' }}>
                  <div className="tabs" style={{ marginBottom: 'var(--space-3)' }}>
                    {['call','email','meeting','note'].map(t => (
                      <button key={t} className={`tab${intType === t ? ' active' : ''}`} onClick={() => setIntType(t)}>
                        {INTERACTION_ICONS[t]} {t}
                      </button>
                    ))}
                  </div>
                  <textarea value={intContent} onChange={e => setIntContent(e.target.value)} placeholder="Notes, outcome, next steps…" rows={3} style={{ marginBottom: 'var(--space-2)' }} />
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button size="sm" variant="ghost" onClick={() => setShowIntForm(false)}>Cancel</Button>
                    <Button size="sm" variant="primary" loading={addInteraction.isPending} onClick={handleAddInteraction} disabled={!intContent.trim()}>Save</Button>
                  </div>
                </div>
              )}

              {(lead.interactions?.length ?? 0) === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No interactions yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {lead.interactions.map(i => (
                    <div key={i.id} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{INTERACTION_ICONS[i.type] || '📝'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{i.content}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {i.actor?.name || 'You'} · {timeAgo(i.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 6: Follow-ups ── */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={LABEL_STYLE}>Follow-ups ({pendingFU.length} pending)</div>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowFuForm(v => !v)}>Add</Button>
              </div>

              {showFuForm && (
                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <input value={fuTitle} onChange={e => setFuTitle(e.target.value)} placeholder="Follow-up title…" />
                    <input type="datetime-local" value={fuDate} onChange={e => setFuDate(e.target.value)} min={new Date().toISOString().slice(0,16)} />
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button size="sm" variant="ghost" onClick={() => setShowFuForm(false)}>Cancel</Button>
                      <Button size="sm" variant="primary" icon={Calendar} loading={addFollowUp.isPending} onClick={handleAddFollowUp} disabled={!fuTitle.trim() || !fuDate}>Schedule</Button>
                    </div>
                  </div>
                </div>
              )}

              {pendingFU.length === 0 && doneFU.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No follow-ups scheduled</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {pendingFU.map(f => {
                    const overdue = new Date(f.due_at) < new Date();
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius)', background: overdue ? 'var(--danger-glow)' : 'var(--bg-surface-2)', border: `1px solid ${overdue ? 'rgba(239,68,68,0.2)' : 'transparent'}` }}>
                        <Clock size={13} style={{ color: overdue ? 'var(--danger-light)' : 'var(--primary-light)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{f.title}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: overdue ? 'var(--danger-light)' : 'var(--text-muted)' }}>
                            {overdue ? 'Overdue · ' : ''}{formatDate(f.due_at)}
                          </div>
                        </div>
                        <button onClick={() => completeFollowUp.mutate(f.id)} title="Mark complete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                          <CheckCircle size={15} />
                        </button>
                      </div>
                    );
                  })}
                  {doneFU.slice(0,3).map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', opacity: 0.5, padding: '2px 0' }}>
                      <CheckCircle size={12} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{f.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 7: Deal Information (L2/L3 only) ── */}
            {(lead.current_level === 'l2' || lead.current_level === 'l3') && (
              <div style={SECTION_STYLE}>
                <SectionTitle>Deal Information</SectionTitle>
                {!deal ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No deal linked yet</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    {[
                      { label: 'Deal Value',     value: formatCurrency(deal.value) },
                      { label: 'Stage',          value: deal.stage?.replace(/_/g, ' ') },
                      { label: 'Health Score',   value: `${deal.health_score ?? 0}/100` },
                      { label: 'Expected Close', value: formatDate(deal.expected_close) },
                      { label: 'Risk Level',     value: deal.risk_level },
                      { label: 'Proposals',      value: deal.proposals?.length ? `${deal.proposals.length} (${deal.proposals[0]?.status})` : 'None' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return ReactDOM.createPortal(content, portal);
}
