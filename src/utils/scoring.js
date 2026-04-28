// ============================================================
// Deal Health Score Algorithm
// ============================================================
// Score range: 0–100
// Factors: response time (30%), engagement (40%), stage age (30%)

export function calculateHealthScore({ lastContactedAt, interactionCount, stageEnteredAt, stage }) {
  const now = Date.now();

  // Factor 1: Response recency (30 pts)
  const hoursSinceContact = lastContactedAt
    ? (now - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60)
    : 999;
  let recencyScore = 0;
  if (hoursSinceContact < 24) recencyScore = 30;
  else if (hoursSinceContact < 48) recencyScore = 22;
  else if (hoursSinceContact < 72) recencyScore = 14;
  else if (hoursSinceContact < 168) recencyScore = 6;
  else recencyScore = 0;

  // Factor 2: Engagement depth (40 pts)
  const count = interactionCount || 0;
  let engagementScore = Math.min(count * 5, 40);

  // Factor 3: Stage duration (30 pts)
  const daysSinceStage = stageEnteredAt
    ? (now - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  let stageScore = 30;
  if (daysSinceStage > 30) stageScore = 0;
  else if (daysSinceStage > 14) stageScore = 10;
  else if (daysSinceStage > 7) stageScore = 20;
  else stageScore = 30;

  return Math.min(Math.round(recencyScore + engagementScore + stageScore), 100);
}

export function getHealthLabel(score) {
  if (score >= 75) return { label: 'Healthy', variant: 'success' };
  if (score >= 50) return { label: 'At Risk', variant: 'warning' };
  if (score >= 25) return { label: 'Declining', variant: 'danger' };
  return { label: 'Critical', variant: 'danger' };
}

export function getDealProbability({ stage, healthScore, interactionCount }) {
  const stageWeights = {
    contacted: 0.1,
    demo: 0.25,
    proposal: 0.45,
    negotiation: 0.65,
    ready_to_close: 0.85,
    closed_won: 1.0,
    closed_lost: 0.0,
  };
  const stagePct = (stageWeights[stage] || 0.1) * 60;
  const healthPct = (healthScore / 100) * 30;
  const engagePct = Math.min((interactionCount || 0) * 2, 10);
  return Math.round(stagePct + healthPct + engagePct);
}

export function getRiskLevel(healthScore) {
  if (healthScore >= 70) return 'low';
  if (healthScore >= 45) return 'medium';
  if (healthScore >= 20) return 'high';
  return 'critical';
}
