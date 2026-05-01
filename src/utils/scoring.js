// ============================================================
// FlowCRM Scoring Utilities
// ============================================================

// ── Lead Score (0–100) ────────────────────────────────────────
// Four equally-weighted factors, 25 pts each.

/** Profile completeness: 5 pts each for email, phone, company, job_title, location */
export function profileCompletenessScore(lead) {
  let pts = 0;
  if (lead.email     && String(lead.email).trim())     pts += 5;
  if (lead.phone     && String(lead.phone).trim())     pts += 5;
  if (lead.company   && String(lead.company).trim())   pts += 5;
  if (lead.job_title && String(lead.job_title).trim()) pts += 5;
  if (lead.location  && String(lead.location).trim())  pts += 5;
  return Math.min(pts, 25);
}

/** Interaction depth: 5 pts per interaction, max 25 */
export function interactionCountScore(count) {
  return Math.min(Math.max(0, Math.floor(count || 0)) * 5, 25);
}

/** Recency of last contact */
export function recencyScore(lastContactedAt) {
  if (!lastContactedAt) return 0;
  const hours = (Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24)  return 25;
  if (hours < 48)  return 18;
  if (hours < 168) return 10; // 7 days
  if (hours < 720) return 5;  // 30 days
  return 0;
}

/** Qualification completeness: budget, requirement, timeline, decision_maker */
export function qualificationCompletenessScore(lead) {
  let filled = 0;
  if (lead.budget        != null && lead.budget !== '')                          filled++;
  if (lead.requirement   && String(lead.requirement).trim())                     filled++;
  if (lead.timeline      && String(lead.timeline).trim())                        filled++;
  if (lead.decision_maker === true || lead.decision_maker === 'true')            filled++;
  return Math.min(Math.round((filled / 4) * 25), 25);
}

/**
 * Compute the overall lead score (0–100).
 * @param {object} lead - lead record
 * @param {number} [interactionCount] - number of interactions (if not embedded in lead)
 */
export function computeLeadScore(lead, interactionCount) {
  const count = interactionCount != null
    ? interactionCount
    : (lead.interactions?.length ?? 0);

  const total =
    profileCompletenessScore(lead) +
    interactionCountScore(count) +
    recencyScore(lead.last_contacted_at) +
    qualificationCompletenessScore(lead);

  return Math.min(Math.max(0, Math.round(total)), 100);
}

/** Returns colour category for a score */
export function getScoreColour(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

/** Returns label + badge variant for a score */
export function getScoreLabel(score) {
  if (score >= 75) return { label: 'Hot',      variant: 'success' };
  if (score >= 50) return { label: 'Warm',     variant: 'warning' };
  if (score >= 25) return { label: 'Cold',     variant: 'danger'  };
  return                  { label: 'Inactive', variant: 'muted'   };
}

// ── Deal Health Score (0–100) ─────────────────────────────────
// Kept for L2/L3 deal health tracking.

export function calculateHealthScore({ lastContactedAt, interactionCount, stageEnteredAt }) {
  const now = Date.now();

  const hoursSinceContact = lastContactedAt
    ? (now - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60)
    : 999;
  let recency = 0;
  if      (hoursSinceContact < 24)  recency = 30;
  else if (hoursSinceContact < 48)  recency = 22;
  else if (hoursSinceContact < 72)  recency = 14;
  else if (hoursSinceContact < 168) recency = 6;

  const engagement = Math.min((interactionCount || 0) * 5, 40);

  const daysSinceStage = stageEnteredAt
    ? (now - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  let stageAge = 30;
  if      (daysSinceStage > 30) stageAge = 0;
  else if (daysSinceStage > 14) stageAge = 10;
  else if (daysSinceStage > 7)  stageAge = 20;

  return Math.min(Math.round(recency + engagement + stageAge), 100);
}

export function getHealthLabel(score) {
  if (score >= 75) return { label: 'Healthy',   variant: 'success' };
  if (score >= 50) return { label: 'At Risk',   variant: 'warning' };
  if (score >= 25) return { label: 'Declining', variant: 'danger'  };
  return                  { label: 'Critical',  variant: 'danger'  };
}

export function getDealProbability({ stage, healthScore, interactionCount }) {
  const weights = {
    contacted: 0.1, demo: 0.25, proposal: 0.45,
    negotiation: 0.65, ready_to_close: 0.85,
    closed_won: 1.0, closed_lost: 0.0,
  };
  const stagePct    = (weights[stage] || 0.1) * 60;
  const healthPct   = ((healthScore || 0) / 100) * 30;
  const engagePct   = Math.min((interactionCount || 0) * 2, 10);
  return Math.round(stagePct + healthPct + engagePct);
}

export function getRiskLevel(healthScore) {
  if (healthScore >= 70) return 'low';
  if (healthScore >= 45) return 'medium';
  if (healthScore >= 20) return 'high';
  return 'critical';
}
