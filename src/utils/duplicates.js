import { supabase } from '@/lib/supabase';

/**
 * Normalise a phone number to E.164-ish format.
 * Strips spaces, dashes, parentheses, dots.
 * Prepends +91 for 10-digit Indian numbers if no country code present.
 * Idempotent: normalising an already-normalised number returns the same result.
 */
export function normalisePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  // Remove all non-digit characters except leading +
  let digits = phone.replace(/[^\d+]/g, '');
  // If starts with +, keep it; otherwise strip leading zeros
  if (!digits.startsWith('+')) {
    digits = digits.replace(/^0+/, '');
    // 10-digit Indian number → prepend +91
    if (digits.length === 10) digits = '+91' + digits;
    // 12-digit with country code (no +) → prepend +
    else if (digits.length >= 11) digits = '+' + digits;
  }
  return digits;
}

/**
 * Normalise an email address: lowercase + trim.
 * Idempotent.
 */
export function normaliseEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Check if a lead with the given email or phone already exists.
 * Returns the first matching lead record or null.
 * @param {string|null} email
 * @param {string|null} phone
 * @returns {Promise<object|null>}
 */
export async function findDuplicate(email, phone) {
  const normEmail = normaliseEmail(email || '');
  const normPhone = normalisePhone(phone || '');

  if (!normEmail && !normPhone) return null;

  const conditions = [];
  if (normEmail) conditions.push(`email.ilike.${normEmail}`);
  if (normPhone) conditions.push(`phone.eq.${normPhone}`);

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, phone, status, current_level, assigned_to, created_at')
    .or(conditions.join(','))
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}
