import { normalisePhone, normaliseEmail } from './duplicates';

const VALID_SOURCES = [
  'website','referral','linkedin','cold_call',
  'typeform','google_forms','widget','csv',
  'api','webhook','other',
];

const VALID_CAPTURE_METHODS = [
  'manual','csv','paste','webhook','api','integration',
];

/**
 * Normalise a raw lead payload (from form, CSV row, webhook, or API)
 * into a clean object ready for Supabase insert.
 *
 * @param {Record<string, unknown>} raw
 * @param {{ captureMethod?: string }} [options]
 * @returns {Record<string, unknown>}
 */
export function normaliseLeadFields(raw, options = {}) {
  const trim = (v) => (typeof v === 'string' ? v.trim() : v ?? null);

  // Source coercion
  const rawSource = trim(raw.source);
  const source = VALID_SOURCES.includes(rawSource) ? rawSource : 'other';

  // Capture method
  const rawMethod = options.captureMethod || trim(raw.capture_method) || 'manual';
  const captureMethod = VALID_CAPTURE_METHODS.includes(rawMethod) ? rawMethod : 'manual';

  // Budget: coerce to number or null
  let budget = null;
  if (raw.budget != null && raw.budget !== '') {
    const n = parseFloat(String(raw.budget).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) budget = n;
  }

  // decision_maker: coerce to boolean
  let decisionMaker = false;
  if (raw.decision_maker === true || raw.decision_maker === 'true' || raw.decision_maker === 'yes' || raw.decision_maker === '1') {
    decisionMaker = true;
  }

  return {
    // Identity
    name:         trim(raw.name)         || null,
    email:        normaliseEmail(raw.email || '') || null,
    phone:        normalisePhone(raw.phone || '') || null,
    company:      trim(raw.company)      || null,
    job_title:    trim(raw.job_title)    || null,
    website:      trim(raw.website)      || null,
    linkedin_url: trim(raw.linkedin_url) || null,
    location:     trim(raw.location)     || null,
    // Source
    source,
    source_detail:  trim(raw.source_detail)  || null,
    capture_method: captureMethod,
    captured_at:    raw.captured_at || new Date().toISOString(),
    // Qualification
    budget,
    requirement:    trim(raw.requirement)    || null,
    timeline:       trim(raw.timeline)       || null,
    decision_maker: decisionMaker,
    company_size:   trim(raw.company_size)   || null,
    industry:       trim(raw.industry)       || null,
    // Enriched data passthrough
    enriched_data: raw.enriched_data || {},
  };
}
