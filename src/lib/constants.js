// ============================================================
// FlowCRM Constants & Enums — v2
// ============================================================

export const ROLES = {
  L1: 'l1', L2: 'l2', L3: 'l3', ADMIN: 'admin',
};

export const LEAD_STATUS = {
  NEW:            'new',
  CONTACTED:      'contacted',
  FOLLOW_UP:      'follow_up',
  QUALIFIED:      'qualified',
  CONVERTED:      'converted',
  CLOSED_WON:     'closed_won',
  CLOSED_LOST:    'closed_lost',
  REJECTED:       'rejected',
  NOT_INTERESTED: 'not_interested',
  DUPLICATE:      'duplicate',
};

// Statuses that block all further transitions
export const TERMINAL_STATUSES = [
  LEAD_STATUS.CLOSED_WON,
  LEAD_STATUS.CLOSED_LOST,
  LEAD_STATUS.REJECTED,
  LEAD_STATUS.NOT_INTERESTED,
  LEAD_STATUS.DUPLICATE,
];

export const LEAD_LEVEL = {
  L1: 'l1', L2: 'l2', L3: 'l3',
};

export const CAPTURE_METHOD = {
  MANUAL:      'manual',
  CSV:         'csv',
  PASTE:       'paste',
  WEBHOOK:     'webhook',
  API:         'api',
  INTEGRATION: 'integration',
};

export const COMPANY_SIZE = {
  MICRO:  '1-10',
  SMALL:  '11-50',
  MEDIUM: '51-200',
  LARGE:  '201-1000',
  ENTERPRISE: '1000+',
};

export const LEAD_SOURCES = [
  { value: 'website',      label: 'Website' },
  { value: 'referral',     label: 'Referral' },
  { value: 'linkedin',     label: 'LinkedIn' },
  { value: 'cold_call',    label: 'Cold Call' },
  { value: 'typeform',     label: 'Typeform' },
  { value: 'google_forms', label: 'Google Forms' },
  { value: 'widget',       label: 'Website Widget' },
  { value: 'csv',          label: 'CSV Import' },
  { value: 'api',          label: 'API' },
  { value: 'webhook',      label: 'Webhook' },
  { value: 'other',        label: 'Other' },
];

export const DEAL_STAGE = {
  CONTACTED:      'contacted',
  DEMO:           'demo',
  PROPOSAL:       'proposal',
  NEGOTIATION:    'negotiation',
  READY_TO_CLOSE: 'ready_to_close',
  CLOSED_WON:     'closed_won',
  CLOSED_LOST:    'closed_lost',
};

export const DEAL_RISK = {
  LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical',
};

export const INTERACTION_TYPE = {
  CALL:     'call',
  EMAIL:    'email',
  MEETING:  'meeting',
  NOTE:     'note',
  WHATSAPP: 'whatsapp',
  SYSTEM:   'system',
};

export const WEBHOOK_EVENTS = [
  'lead.created', 'lead.qualified', 'lead.converted',
  'lead.rejected', 'lead.closed_won', 'lead.closed_lost',
  'deal.stage_changed', 'deal.escalated', 'deal.closed_won', 'deal.closed_lost',
  'deal.risk_alert', 'follow_up.overdue', 'proposal.sent',
];

export const INTEGRATION_TYPES = {
  GMAIL: 'gmail', WHATSAPP: 'whatsapp', CALENDLY: 'calendly',
  TYPEFORM: 'typeform', GOOGLE_FORMS: 'google_forms',
  SLACK: 'slack', ZAPIER: 'zapier', N8N: 'n8n',
};

// Role → default route
export const ROLE_ROUTES = {
  [ROLES.L1]: '/l1', [ROLES.L2]: '/l2',
  [ROLES.L3]: '/l3', [ROLES.ADMIN]: '/admin',
};

// Role → display label
export const ROLE_LABELS = {
  [ROLES.L1]: 'Qualification Agent',
  [ROLES.L2]: 'Conversion Agent',
  [ROLES.L3]: 'Closure Agent',
  [ROLES.ADMIN]: 'System Admin',
};

// Deal stage order for Kanban
export const STAGE_ORDER = [
  DEAL_STAGE.CONTACTED, DEAL_STAGE.DEMO, DEAL_STAGE.PROPOSAL,
  DEAL_STAGE.NEGOTIATION, DEAL_STAGE.READY_TO_CLOSE,
];

export const STAGE_LABELS = {
  [DEAL_STAGE.CONTACTED]:      'Contacted',
  [DEAL_STAGE.DEMO]:           'Demo',
  [DEAL_STAGE.PROPOSAL]:       'Proposal',
  [DEAL_STAGE.NEGOTIATION]:    'Negotiation',
  [DEAL_STAGE.READY_TO_CLOSE]: 'Ready to Close',
  [DEAL_STAGE.CLOSED_WON]:     'Closed Won',
  [DEAL_STAGE.CLOSED_LOST]:    'Closed Lost',
};

export const STATUS_LABELS = {
  [LEAD_STATUS.NEW]:            'New',
  [LEAD_STATUS.CONTACTED]:      'Contacted',
  [LEAD_STATUS.FOLLOW_UP]:      'Follow Up',
  [LEAD_STATUS.QUALIFIED]:      'Qualified',
  [LEAD_STATUS.CONVERTED]:      'Converted',
  [LEAD_STATUS.CLOSED_WON]:     'Closed Won',
  [LEAD_STATUS.CLOSED_LOST]:    'Closed Lost',
  [LEAD_STATUS.REJECTED]:       'Rejected',
  [LEAD_STATUS.NOT_INTERESTED]: 'Not Interested',
  [LEAD_STATUS.DUPLICATE]:      'Duplicate',
};

export const STATUS_VARIANT = {
  [LEAD_STATUS.NEW]:            'primary',
  [LEAD_STATUS.CONTACTED]:      'info',
  [LEAD_STATUS.FOLLOW_UP]:      'warning',
  [LEAD_STATUS.QUALIFIED]:      'success',
  [LEAD_STATUS.CONVERTED]:      'success',
  [LEAD_STATUS.CLOSED_WON]:     'success',
  [LEAD_STATUS.CLOSED_LOST]:    'danger',
  [LEAD_STATUS.REJECTED]:       'danger',
  [LEAD_STATUS.NOT_INTERESTED]: 'muted',
  [LEAD_STATUS.DUPLICATE]:      'muted',
};

export const RISK_VARIANT = {
  [DEAL_RISK.LOW]:      'success',
  [DEAL_RISK.MEDIUM]:   'warning',
  [DEAL_RISK.HIGH]:     'danger',
  [DEAL_RISK.CRITICAL]: 'danger',
};

// L1 → L2 gate conditions
export const L1_GATE = {
  requiredFields:       ['budget', 'requirement', 'timeline'],
  requireDecisionMaker: false, // warn but don't block
  minScore:             30,
  minInteractions:      1,     // at least 1 call/email/meeting
};

// L2 → L3 gate conditions
export const L2_GATE = {
  requireDeal:          true,
  requireProposal:      true,  // status = sent or accepted
  requireExpectedClose: true,
  minHealthScore:       25,
};

// Lifecycle stage order (for progress indicator)
export const LIFECYCLE_STAGES = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.FOLLOW_UP,
  LEAD_STATUS.QUALIFIED,
  LEAD_STATUS.CONVERTED,
  LEAD_STATUS.CLOSED_WON,
];

// AI Copilot scripts
export const COPILOT_SCRIPTS = {
  initial_contact: [
    "Hi [Name], I'm calling from [Company]. We help businesses like yours streamline their sales process. Is this a good time?",
    "I noticed [trigger event] and wanted to reach out specifically because [reason]. Do you have 5 minutes?",
  ],
  objections: {
    price:        "I understand budget is a concern. Let me walk you through the ROI our clients typically see within 90 days.",
    timing:       "I completely respect that. Can we schedule a 15-minute call next week to revisit when timing works better?",
    competitor:   "That's great you're evaluating options. What's most important to you in making this decision?",
    not_interested: "Totally understand. May I ask what would need to be different for this to be worth a conversation?",
  },
  qualification_questions: [
    "What's your current process for managing leads and sales?",
    "What does success look like for you in 6 months?",
    "What's your budget range for solving this problem?",
    "Who else is involved in this decision?",
    "What's your timeline for making a decision?",
  ],
};

// Transition rules (used by useTransitionLead)
export const TRANSITION_RULES = {
  [LEAD_LEVEL.L1]: {
    requiredFields: ['budget', 'requirement', 'timeline'],
    nextLevel:      LEAD_LEVEL.L2,
    nextStatus:     LEAD_STATUS.QUALIFIED,
  },
  [LEAD_LEVEL.L2]: {
    requiredFields: [],
    nextLevel:      LEAD_LEVEL.L3,
    nextStatus:     LEAD_STATUS.CONVERTED,
  },
};
