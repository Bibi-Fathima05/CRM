import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, ChevronRight, Mic, MicOff, Clock, MessageSquare, Phone, Save, FileText, AlertCircle, CheckCircle, Edit3, RotateCcw } from 'lucide-react';
import { useLeads, useAddInteraction } from '@/hooks/useLeads';
import { useAuth } from '@/context/AuthContext';
import { useLeadSheet } from '@/hooks/useLeadSheet';
import { COPILOT_SCRIPTS, INTERACTION_TYPE } from '@/lib/constants';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatPhone } from '@/utils/formatters';

// ─── Call status enum ────────────────────────────────────────
const CALL_STATUS = { IDLE: 'idle', ONGOING: 'ongoing', COMPLETED: 'completed' };

// ─── LocalStorage helpers ────────────────────────────────────
const LS_KEY = 'flowcrm_copilot_session';
const saveSession = (d) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} };
const loadSession = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; } };
const clearSession = () => localStorage.removeItem(LS_KEY);

// ─── Default script templates ────────────────────────────────
const SCRIPT_TEMPLATES = [
  "Hi {lead_name}, I'm calling from FlowCRM. We help businesses like {company} streamline their sales pipeline and boost conversion rates. Is this a good time?",
  "I noticed {company} has been growing rapidly and wanted to reach out because we've helped similar companies increase their close rate by 40%.",
  "Hi {lead_name}, a colleague mentioned that {company} might benefit from our AI-powered CRM. Do you have a quick moment?",
];

const OBJECTION_CONFIG = {
  price: { label: '💰 Price', color: 'var(--warning)', response: "I completely understand budget is a concern. Let me walk you through the ROI our clients typically see within 90 days — most recover the investment 3x over. Would it help if I shared a case study from a company similar to yours?" },
  timing: { label: '⏰ Timing', color: 'var(--info)', response: "I totally respect that. Timing is everything. Can we schedule a quick 15-minute call next week when things calm down? I'll send you a calendar invite so it's easy to find a slot." },
  competitor: { label: '🏢 Competitor', color: 'var(--primary)', response: "That's great you're evaluating options — it shows you're serious about finding the right fit. What's most important to you in making this decision? I'd love to see how we compare on those specific points." },
  not_interested: { label: '🚫 Not Interested', color: 'var(--danger)', response: "Totally understand, and I appreciate your honesty. May I ask — what would need to be different for this to be worth revisiting? Even if not now, I'd love to stay on your radar for when the time is right." },
};

const QUAL_QUESTIONS = COPILOT_SCRIPTS.qualification_questions;

export default function L1Copilot() {
  const { user } = useAuth();
  const { openLead } = useLeadSheet();
  const { data: leads = [], isLoading } = useLeads({ level: 'l1' });
  const addInteraction = useAddInteraction();

  // ─── State ─────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState(null);
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const [scriptIdx, setScriptIdx] = useState(0);
  const [editingScript, setEditingScript] = useState(false);
  const [customScript, setCustomScript] = useState('');

  const [activeObj, setActiveObj] = useState(null);
  const [usedObjections, setUsedObjections] = useState([]);

  const [checkedQ, setCheckedQ] = useState([]);
  const [answers, setAnswers] = useState({});

  const [callNotes, setCallNotes] = useState('');
  const [callSummaries, setCallSummaries] = useState([]);
  const [validationMsg, setValidationMsg] = useState('');
  const [searchLead, setSearchLead] = useState('');

  // ─── Restore session from localStorage ─────────────────────
  useEffect(() => {
    const s = loadSession();
    if (s && leads.length > 0) {
      const found = leads.find(l => (l._id || l.id) === s.leadId);
      if (found) {
        setSelectedLead(found);
        setCheckedQ(s.checkedQ || []);
        setAnswers(s.answers || {});
        setCallNotes(s.callNotes || '');
        setUsedObjections(s.usedObjections || []);
      }
    }
  }, [leads]);

  // ─── Persist session ───────────────────────────────────────
  useEffect(() => {
    if (selectedLead) {
      saveSession({ leadId: selectedLead._id || selectedLead.id, checkedQ, answers, callNotes, usedObjections });
    }
  }, [selectedLead, checkedQ, answers, callNotes, usedObjections]);

  // ─── Timer logic ───────────────────────────────────────────
  useEffect(() => {
    if (callStatus === CALL_STATUS.ONGOING) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Call actions ──────────────────────────────────────────
  const startCall = () => {
    if (!selectedLead) { setValidationMsg('Please select a lead first.'); setTimeout(() => setValidationMsg(''), 3000); return; }
    setCallStatus(CALL_STATUS.ONGOING);
    setTimer(0);
    setValidationMsg('');
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    setCallStatus(CALL_STATUS.COMPLETED);
  };

  const resetCall = () => {
    setCallStatus(CALL_STATUS.IDLE);
    setTimer(0);
    setCheckedQ([]);
    setAnswers({});
    setCallNotes('');
    setActiveObj(null);
    setUsedObjections([]);
    setCustomScript('');
    setEditingScript(false);
    clearSession();
  };

  const saveCallSummary = async () => {
    const summary = {
      leadId: selectedLead._id || selectedLead.id, leadName: selectedLead.name, duration: timer,
      questionsAsked: checkedQ.length, totalQuestions: QUAL_QUESTIONS.length,
      objections: usedObjections, notes: callNotes, timestamp: new Date().toISOString(),
    };
    setCallSummaries(prev => [summary, ...prev]);
    try {
      await addInteraction.mutateAsync({
        leadId: selectedLead._id || selectedLead.id,
        type: 'call',
        content: `Call (${fmtTime(timer)}) — ${checkedQ.length}/${QUAL_QUESTIONS.length} qualified. Notes: ${callNotes || 'N/A'}`,
        createdBy: user?._id || user?.id || undefined,
      });
    } catch {}
    resetCall();
  };

  // ─── Script rendering ─────────────────────────────────────
  const renderScript = (template) => {
    return template
      .replace(/{lead_name}/g, selectedLead?.name || '[Lead Name]')
      .replace(/{company}/g, selectedLead?.company || '[Company]')
      .replace(/{value_prop}/g, 'streamlining sales and boosting conversions');
  };

  const currentScript = customScript || SCRIPT_TEMPLATES[scriptIdx];

  const toggleQ = (i) => setCheckedQ(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  const isDisabled = callStatus === CALL_STATUS.COMPLETED;

  const filteredLeads = leads.filter(l =>
    !searchLead || l.name?.toLowerCase().includes(searchLead.toLowerCase()) || l.company?.toLowerCase().includes(searchLead.toLowerCase())
  ).slice(0, 12);

  const progress = QUAL_QUESTIONS.length > 0 ? Math.round((checkedQ.length / QUAL_QUESTIONS.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Call Copilot</h1>
          <p className="page-subtitle">Real-time guidance for your sales calls</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {callStatus === CALL_STATUS.ONGOING && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px' }}>
              <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
              <span style={{ color: 'var(--danger-light)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmtTime(timer)}</span>
              <Button size="sm" variant="danger" icon={MicOff} onClick={endCall}>End Call</Button>
            </div>
          )}
          {callStatus === CALL_STATUS.COMPLETED && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button size="sm" variant="success" icon={Save} onClick={saveCallSummary}>Save & Log</Button>
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetCall}>New Call</Button>
            </div>
          )}
        </div>
      </div>

      {/* Validation */}
      {validationMsg && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-4)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <AlertCircle size={16} style={{ color: 'var(--danger-light)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--danger-light)' }}>{validationMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-6)' }}>
        {/* ── LEFT: Lead Selector ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card style={{ height: 'fit-content' }}>
            <CardHeader title="Select Lead" subtitle={`${leads.length} available`} />
            <input value={searchLead} onChange={e => setSearchLead(e.target.value)} placeholder="Search leads..." className="input" style={{ width: '100%', marginBottom: 'var(--space-3)' }} disabled={isDisabled} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 340, overflowY: 'auto' }}>
              {isLoading && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>Loading leads...</p>}
              {filteredLeads.map(lead => (
                <button key={lead._id || lead.id} onClick={() => { if (!isDisabled) { setSelectedLead(lead); setValidationMsg(''); } }}
                  disabled={isDisabled}
                  style={{ background: (selectedLead?._id || selectedLead?.id) === (lead._id || lead.id) ? 'var(--primary-glow)' : 'var(--bg-surface-2)', border: `1px solid ${(selectedLead?._id || selectedLead?.id) === (lead._id || lead.id) ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 'var(--space-3)', cursor: isDisabled ? 'not-allowed' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', transition: 'all var(--transition-fast)', opacity: isDisabled && (selectedLead?._id || selectedLead?.id) !== (lead._id || lead.id) ? 0.4 : 1 }}>
                  <Avatar name={lead.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company || lead.email}</div>
                  </div>
                  {lead.score > 0 && <Badge variant={lead.score >= 80 ? 'success' : lead.score >= 50 ? 'warning' : 'muted'}>{lead.score}</Badge>}
                </button>
              ))}
              {!isLoading && filteredLeads.length === 0 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>No leads found</p>}
            </div>
            {callStatus === CALL_STATUS.IDLE && (
              <Button icon={Mic} variant="success" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={startCall}>Start Call</Button>
            )}
          </Card>

          {/* Selected Lead Detail */}
          {selectedLead && (
            <Card>
              <CardHeader title="Lead Details" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Avatar name={selectedLead.name} />
                  <div><div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{selectedLead.name}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{selectedLead.company || '—'}</div></div>
                </div>
                {[
                  { icon: Phone, label: 'Phone', value: formatPhone(selectedLead.phone) },
                  { icon: MessageSquare, label: 'Email', value: selectedLead.email || '—' },
                  { icon: Zap, label: 'Score', value: selectedLead.score ?? '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                    <r.icon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', width: 48 }}>{r.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Copilot Panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Call Script */}
          <Card>
            <CardHeader title="Call Script" subtitle="Dynamic opening lines"
              actions={
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {!editingScript && <Button size="sm" variant="ghost" icon={Edit3} onClick={() => { setEditingScript(true); setCustomScript(currentScript); }}>Edit</Button>}
                  {editingScript && <Button size="sm" variant="primary" onClick={() => setEditingScript(false)}>Done</Button>}
                  <Button size="sm" variant="ghost" disabled={editingScript} onClick={() => { setScriptIdx(i => (i + 1) % SCRIPT_TEMPLATES.length); setCustomScript(''); }}>Next ›</Button>
                </div>
              } />
            {editingScript ? (
              <textarea value={customScript} onChange={e => setCustomScript(e.target.value)} rows={4}
                className="input" style={{ width: '100%', fontFamily: 'inherit', lineHeight: 'var(--leading-relaxed)', resize: 'vertical' }} />
            ) : (
              <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', borderLeft: '3px solid var(--primary)', color: 'var(--text-primary)' }}>
                {renderScript(currentScript)}
              </div>
            )}
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
              {SCRIPT_TEMPLATES.map((_, i) => (
                <div key={i} onClick={() => { if (!editingScript) { setScriptIdx(i); setCustomScript(''); } }}
                  style={{ width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', background: scriptIdx === i && !customScript ? 'var(--primary)' : 'var(--bg-surface-3)', transition: 'background var(--transition-fast)' }} />
              ))}
              {customScript && <Badge variant="primary">Custom</Badge>}
            </div>
          </Card>

          {/* Objection Handlers */}
          <Card>
            <CardHeader title="Objection Handlers" subtitle="Click to reveal response scripts" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {Object.entries(OBJECTION_CONFIG).map(([key, cfg]) => (
                <div key={key}>
                  <button onClick={() => { setActiveObj(activeObj === key ? null : key); if (!usedObjections.includes(key)) setUsedObjections(p => [...p, key]); }}
                    style={{ width: '100%', background: activeObj === key ? 'var(--warning-glow)' : 'var(--bg-surface-2)', border: `1px solid ${activeObj === key ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 'var(--space-3)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all var(--transition-fast)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>{cfg.label}</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: activeObj === key ? 'rotate(90deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                  </button>
                  {activeObj === key && (
                    <div style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)', borderLeft: `2px solid ${cfg.color}` }}>
                      {cfg.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {usedObjections.length > 0 && (
              <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Objections encountered: {usedObjections.map(o => OBJECTION_CONFIG[o]?.label).join(', ')}
              </div>
            )}
          </Card>

          {/* Qualification Checklist */}
          <Card>
            <CardHeader title="Qualification Checklist" subtitle={`${checkedQ.length}/${QUAL_QUESTIONS.length} asked`}
              actions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 80, height: 6, borderRadius: 99, background: 'var(--bg-surface-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                  <Badge variant={progress === 100 ? 'success' : 'muted'}>{progress}%</Badge>
                </div>
              } />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {QUAL_QUESTIONS.map((q, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius)', background: checkedQ.includes(i) ? 'var(--success-glow)' : 'transparent', transition: 'background var(--transition-fast)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: isDisabled ? 'not-allowed' : 'pointer', padding: 'var(--space-2)' }}>
                    <input type="checkbox" checked={checkedQ.includes(i)} onChange={() => !isDisabled && toggleQ(i)} disabled={isDisabled}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 'var(--text-sm)', color: checkedQ.includes(i) ? 'var(--success-light)' : 'var(--text-secondary)', textDecoration: checkedQ.includes(i) ? 'line-through' : 'none', flex: 1 }}>{q}</span>
                  </label>
                  {checkedQ.includes(i) && (
                    <input value={answers[i] || ''} onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Note the lead's answer..." className="input" disabled={isDisabled}
                      style={{ width: 'calc(100% - 34px)', marginLeft: 34, marginBottom: 'var(--space-2)', fontSize: 'var(--text-xs)' }} />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Call Notes */}
          <Card>
            <CardHeader title="Call Notes" subtitle="Capture key takeaways" actions={<FileText size={16} style={{ color: 'var(--text-muted)' }} />} />
            <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={3}
              placeholder="Type your notes here..." className="input" disabled={isDisabled}
              style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }} />
          </Card>

          {/* Call Summary (after completed calls) */}
          {callSummaries.length > 0 && (
            <Card>
              <CardHeader title="Call History" subtitle={`${callSummaries.length} call(s) this session`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {callSummaries.map((s, i) => (
                  <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 'var(--weight-medium)' }}>{s.leadName}</span>
                      <Badge variant="success">{fmtTime(s.duration)}</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {s.questionsAsked}/{s.totalQuestions} qualified · {s.objections.length} objection(s)
                      {s.notes && ` · ${s.notes.slice(0, 60)}${s.notes.length > 60 ? '…' : ''}`}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
