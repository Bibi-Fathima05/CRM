import { TRANSITION_RULES, LEAD_LEVEL } from '@/lib/constants';

// Validate all required fields before a lead can be transitioned to next level
export function canTransition(lead) {
  const rules = TRANSITION_RULES[lead.current_level];
  if (!rules) return { valid: false, errors: ['Unknown lead level'] };

  const errors = [];
  const data = lead.enriched_data || {};

  rules.requiredFields.forEach(field => {
    if (!data[field] && !lead[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function getNextLevel(currentLevel) {
  const map = {
    [LEAD_LEVEL.L1]: LEAD_LEVEL.L2,
    [LEAD_LEVEL.L2]: LEAD_LEVEL.L3,
  };
  return map[currentLevel] || null;
}

export function canAccessLevel(userRole, targetLevel) {
  const access = {
    admin: ['l1', 'l2', 'l3'],
    l3: ['l2', 'l3'],
    l2: ['l2'],
    l1: ['l1'],
  };
  return (access[userRole] || []).includes(targetLevel);
}
