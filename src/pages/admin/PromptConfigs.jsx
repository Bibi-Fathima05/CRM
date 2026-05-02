import { useState, useEffect } from 'react';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/utils/formatters';
import { toast } from 'sonner';
import { Brain, Save, RotateCcw, Info } from 'lucide-react';

const DEFAULT_PROMPTS = {
  call_analyst: {
    name: 'AI Call Analyst',
    description: 'Analyzes sales call transcripts to extract qualification signals, score leads, and suggest next actions.',
    template: `You are an AI Sales Call Analyst inside a CRM.

You will analyze a sales call transcript and extract structured insights for lead qualification, scoring, and next actions.

---

INPUT:
Call Transcript:
{{transcript}}

Existing Lead Data (if available):
Name: {{name}}
Company: {{company}}
Previous Score: {{previous_score}}

---

YOUR TASK:

1. Understand the conversation deeply
2. Extract key sales signals
3. Identify qualification criteria
4. Score the lead
5. Suggest next best action

---

EXTRACTION RULES (STRICT):

Extract the following:

- intent: What does the customer want?
- requirement: What exactly are they looking for?
- budget: Any mention of pricing, affordability, or budget
- timeline: When do they want to proceed?
- authority: Are they decision maker? (yes/no/unknown)
- urgency: low / medium / high
- objections: list all concerns (price, trust, features, etc.)
- sentiment: positive / neutral / negative
- buying_signals: list phrases showing interest

---

QUALIFICATION LOGIC:

A lead is QUALIFIED only if:
- Requirement is clear
- Timeline is defined
- At least 1 strong buying signal OR high intent
- Budget is mentioned OR inferred as feasible

---

SCORING LOGIC:

Start from 0:

+10 → clear requirement
+10 → budget mentioned
+5  → timeline defined
+5  → decision maker confirmed
+5  → high urgency
+5  → strong buying signals

-10 → strong objections
-5  → low interest

Score range: 0–50

Qualified if score ≥ 30

---

NEXT BEST ACTION RULES:

- If high intent + high score → "Schedule demo / close fast"
- If objections → "Address objections + follow-up"
- If unclear → "Ask clarification questions"
- If low intent → "Nurture lead"

---

OUTPUT FORMAT (JSON ONLY):

{
  "summary": "short 2-3 line summary of call",
  "intent": "",
  "requirement": "",
  "budget": "",
  "timeline": "",
  "authority": "yes/no/unknown",
  "urgency": "low/medium/high",
  "sentiment": "positive/neutral/negative",
  "objections": [],
  "buying_signals": [],
  "score": number,
  "qualified": true/false,
  "next_action": "",
  "follow_up_questions": []
}

---

IMPORTANT:

- Do NOT hallucinate information
- If something is not mentioned, return "not specified"
- Be strict in qualification
- Keep outputs concise and structured`,
  },
};

function PromptEditor({ promptKey }) {
  const { user } = useAuth();
  const saved = useConvexQuery(api.promptConfigs.getPromptConfig, { key: promptKey });
  const upsert = useConvexMutation(api.promptConfigs.upsertPromptConfig);
  const defaults = DEFAULT_PROMPTS[promptKey];

  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saved !== undefined) {
      setDraft(saved?.template ?? defaults.template);
      setDirty(false);
    }
  }, [saved]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert({
        key: promptKey,
        name: defaults.name,
        description: defaults.description,
        template: draft,
        updated_by: user?._id || user?.id || undefined,
      });
      toast.success('Prompt saved');
      setDirty(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(defaults.template);
    setDirty(true);
  };

  const variables = [...new Set((draft.match(/\{\{(\w+)\}\}/g) || []))];

  return (
    <Card>
      <CardHeader
        title={defaults.name}
        subtitle={defaults.description}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {saved?.updated_at && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Saved {formatDateTime(saved.updated_at)}
              </span>
            )}
            {!saved && (
              <Badge variant="muted">Using default</Badge>
            )}
            {dirty && <Badge variant="warning">Unsaved changes</Badge>}
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" variant="primary" icon={Save} loading={saving} onClick={handleSave} disabled={!dirty}>
              Save
            </Button>
          </div>
        }
      />

      {/* Variable chips */}
      {variables.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Variables:
          </span>
          {variables.map(v => (
            <code key={v} style={{
              fontSize: 'var(--text-xs)', fontFamily: 'monospace',
              background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)',
              border: '1px solid rgba(99,102,241,0.25)',
              padding: '2px 8px', borderRadius: 4,
            }}>{v}</code>
          ))}
        </div>
      )}

      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setDirty(true); }}
        rows={40}
        spellCheck={false}
        style={{
          width: '100%',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          lineHeight: 1.7,
          resize: 'vertical',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 'var(--space-4)',
          color: 'var(--text-primary)',
          outline: 'none',
          tabSize: 2,
        }}
      />
    </Card>
  );
}

export function PromptConfigs() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Prompt Config</h1>
          <p className="page-subtitle">Edit the prompt templates used by AI features across FlowCRM</p>
        </div>
      </div>

      <Card style={{ marginBottom: 'var(--space-6)', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
          <Info size={15} style={{ color: 'var(--primary-light)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Changes are saved to the database and take effect immediately. Use <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{"{{variable}}"}</code> placeholders — they are replaced at runtime with real lead data. Click <strong>Reset</strong> to restore the factory default.
          </p>
        </div>
      </Card>

      <PromptEditor promptKey="call_analyst" />
    </div>
  );
}
