// ============================================================
// FlowCRM Constants & Enums
// ============================================================

export const ROLES = {
  L1: 'l1',
  L2: 'l2',
  L3: 'l3',
  ADMIN: 'admin',
};

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  FOLLOW_UP: 'follow_up',
  QUALIFIED: 'qualified',
  REJECTED: 'rejected',
  DUPLICATE: 'duplicate',
  NOT_INTERESTED: 'not_interested',
};

export const LEAD_LEVEL = {
  L1: 'l1',
  L2: 'l2',
  L3: 'l3',
};

export const DEAL_STAGE = {
  CONTACTED: 'contacted',
  DEMO: 'demo',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  READY_TO_CLOSE: 'ready_to_close',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
};

export const DEAL_RISK = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const INTERACTION_TYPE = {
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
  NOTE: 'note',
  WHATSAPP: 'whatsapp',
  SYSTEM: 'system',
};

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.qualified',
  'lead.rejected',
  'deal.stage_changed',
  'deal.escalated',
  'deal.closed_won',
  'deal.closed_lost',
  'deal.risk_alert',
  'follow_up.overdue',
  'proposal.sent',
];

export const INTEGRATION_TYPES = {
  GMAIL: 'gmail',
  WHATSAPP: 'whatsapp',
  CALENDLY: 'calendly',
  TYPEFORM: 'typeform',
  GOOGLE_FORMS: 'google_forms',
  SLACK: 'slack',
  ZAPIER: 'zapier',
  N8N: 'n8n',
};

// Role → allowed routes
export const ROLE_ROUTES = {
  [ROLES.L1]: '/l1',
  [ROLES.L2]: '/l2',
  [ROLES.L3]: '/l3',
  [ROLES.ADMIN]: '/admin',
};

// Role → display label
export const ROLE_LABELS = {
  [ROLES.L1]: 'Qualification Agent',
  [ROLES.L2]: 'Conversion Agent',
  [ROLES.L3]: 'Closure Agent',
  [ROLES.ADMIN]: 'System Admin',
};

// Lead stage → transition rules
export const TRANSITION_RULES = {
  [LEAD_LEVEL.L1]: {
    requiredFields: ['budget', 'requirement', 'timeline'],
    nextLevel: LEAD_LEVEL.L2,
    nextStatus: LEAD_STATUS.QUALIFIED,
  },
  [LEAD_LEVEL.L2]: {
    requiredFields: ['deal_value', 'stage'],
    nextLevel: LEAD_LEVEL.L3,
    nextStatus: LEAD_STATUS.QUALIFIED,
  },
};

// Deal stage order for Kanban
export const STAGE_ORDER = [
  DEAL_STAGE.CONTACTED,
  DEAL_STAGE.DEMO,
  DEAL_STAGE.PROPOSAL,
  DEAL_STAGE.NEGOTIATION,
  DEAL_STAGE.READY_TO_CLOSE,
];

export const STAGE_LABELS = {
  [DEAL_STAGE.CONTACTED]: 'Contacted',
  [DEAL_STAGE.DEMO]: 'Demo',
  [DEAL_STAGE.PROPOSAL]: 'Proposal',
  [DEAL_STAGE.NEGOTIATION]: 'Negotiation',
  [DEAL_STAGE.READY_TO_CLOSE]: 'Ready to Close',
  [DEAL_STAGE.CLOSED_WON]: 'Closed Won',
  [DEAL_STAGE.CLOSED_LOST]: 'Closed Lost',
};

export const STATUS_LABELS = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.FOLLOW_UP]: 'Follow Up',
  [LEAD_STATUS.QUALIFIED]: 'Qualified',
  [LEAD_STATUS.REJECTED]: 'Rejected',
  [LEAD_STATUS.DUPLICATE]: 'Duplicate',
  [LEAD_STATUS.NOT_INTERESTED]: 'Not Interested',
};

export const STATUS_VARIANT = {
  [LEAD_STATUS.NEW]: 'primary',
  [LEAD_STATUS.CONTACTED]: 'info',
  [LEAD_STATUS.FOLLOW_UP]: 'warning',
  [LEAD_STATUS.QUALIFIED]: 'success',
  [LEAD_STATUS.REJECTED]: 'danger',
  [LEAD_STATUS.DUPLICATE]: 'muted',
  [LEAD_STATUS.NOT_INTERESTED]: 'muted',
};

export const RISK_VARIANT = {
  [DEAL_RISK.LOW]: 'success',
  [DEAL_RISK.MEDIUM]: 'warning',
  [DEAL_RISK.HIGH]: 'danger',
  [DEAL_RISK.CRITICAL]: 'danger',
};

// AI Copilot scripts per stage
export const COPILOT_SCRIPTS = {
  initial_contact: [
    "Hi [Name], I'm calling from [Company]. We help businesses like yours [value prop]. Is this a good time?",
    "I noticed [trigger event] and wanted to reach out specifically because [reason].",
  ],
  objections: {
    price: "I understand budget is a concern. Let me walk you through the ROI our clients typically see within 90 days.",
    timing: "I completely respect that. Can we schedule a 15-minute call next week to revisit when timing works better?",
    competitor: "That's great you're evaluating options. What's most important to you in making this decision?",
    not_interested: "Totally understand. May I ask what would need to be different for this to be worth a conversation?",
  },
  qualification_questions: [
    "What's your current process for [pain point]?",
    "What does success look like for you in 6 months?",
    "What's your budget range for solving this problem?",
    "Who else is involved in this decision?",
    "What's your timeline for making a decision?",
  ],
};
