// ============================================================
// FlowCRM CSV / TSV Parser
// Supports: comma-delimited, tab-delimited, quoted fields
// Auto-detects column mappings via fuzzy alias matching
// ============================================================

// ── Column alias tables ───────────────────────────────────────
const ALIASES = {
  name:         ['name','full name','fullname','lead name','contact name','contact','customer name'],
  email:        ['email','email address','e-mail','mail','email id'],
  phone:        ['phone','mobile','phone number','mobile number','contact number','tel','telephone','cell'],
  company:      ['company','company name','organisation','organization','org','business','employer'],
  job_title:    ['job title','title','position','role','designation','job role','function'],
  website:      ['website','url','web','site','website url','company website'],
  linkedin_url: ['linkedin','linkedin url','linkedin profile','linkedin link'],
  location:     ['location','city','address','region','area','place','geography'],
  source:       ['source','lead source','channel','origin','how did you hear'],
  source_detail:['source detail','campaign','referral name','campaign name','utm source','utm_source'],
  budget:       ['budget','budget range','spend','investment','price range','annual budget'],
  requirement:  ['requirement','needs','use case','pain point','problem','challenge','what do you need'],
  timeline:     ['timeline','timeframe','deadline','when','target date','expected start'],
  decision_maker:['decision maker','decision_maker','is decision maker','dm','authority'],
  company_size: ['company size','size','employees','headcount','team size','no of employees','number of employees'],
  industry:     ['industry','sector','vertical','domain','field'],
};

function matchHeader(header, aliases) {
  const h = header.toLowerCase().trim();
  return aliases.some(a => h === a || h.includes(a));
}

function detectDelimiter(line) {
  const tabCount   = (line.match(/\t/g) || []).length;
  const commaCount = (line.match(/,/g)  || []).length;
  return tabCount >= commaCount ? '\t' : ',';
}

function splitLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t').map(c => c.trim());
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV or TSV text into lead row objects.
 * @param {string} text - raw CSV/TSV content
 * @returns {{ rows: object[], errors: string[] }}
 */
export function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ['File must have a header row and at least one data row'] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers   = splitLine(lines[0], delimiter);

  // Build index map: field → column index
  const idx = {};
  Object.entries(ALIASES).forEach(([field, aliases]) => {
    const i = headers.findIndex(h => matchHeader(h, aliases));
    if (i >= 0) idx[field] = i;
  });

  const rows   = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);
    if (cols.every(c => !c)) continue; // skip blank lines

    const get = (field) => idx[field] != null ? (cols[idx[field]] || '').trim() : '';

    const name = get('name');
    if (!name) {
      errors.push(`Row ${i + 1}: skipped — missing name`);
      continue;
    }

    rows.push({
      name,
      email:         get('email'),
      phone:         get('phone'),
      company:       get('company'),
      job_title:     get('job_title'),
      website:       get('website'),
      linkedin_url:  get('linkedin_url'),
      location:      get('location'),
      source:        get('source'),
      source_detail: get('source_detail'),
      budget:        get('budget'),
      requirement:   get('requirement'),
      timeline:      get('timeline'),
      decision_maker:get('decision_maker'),
      company_size:  get('company_size'),
      industry:      get('industry'),
    });
  }

  return { rows, errors };
}

/**
 * Read a File object as UTF-8 text.
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Returns a sample CSV string for download.
 */
export function getSampleCSV() {
  return [
    'name,email,phone,company,job_title,location,source,budget,requirement,timeline,industry,company_size',
    'John Smith,john@acme.com,+91 98765 43210,Acme Corp,CTO,"Mumbai, Maharashtra",referral,500000,CRM integration,Q2 2026,SaaS,51-200',
    'Sarah Lee,sarah@techco.in,+91 87654 32109,Tech Co,VP Sales,"Bangalore, Karnataka",linkedin,200000,Sales automation,Q3 2026,IT Services,11-50',
    'Raj Kumar,raj@startup.io,,Startup IO,Founder,,website,,,,,1-10',
  ].join('\n');
}
