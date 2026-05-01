// ============================================================
// FlowCRM Excel & PDF File Parser
// Parses .xlsx, .xls, and .pdf files into lead row objects
// Uses the same alias-matching logic as csvParser.js
// ============================================================

import * as XLSX from 'xlsx';

// ── Column alias tables (mirrors csvParser.js) ────────────────
const ALIASES = {
  name:          ['name','full name','fullname','lead name','contact name','contact','customer name','customer','client name','client','person','first name','firstname'],
  email:         ['email','email address','e-mail','mail','email id','e mail'],
  phone:         ['phone','mobile','phone number','mobile number','contact number','tel','telephone','cell','mobile no','phone no','contact no','whatsapp'],
  company:       ['company','company name','organisation','organization','org','business','employer','firm'],
  job_title:     ['job title','title','position','role','designation','job role','function'],
  website:       ['website','url','web','site','website url','company website'],
  linkedin_url:  ['linkedin','linkedin url','linkedin profile','linkedin link'],
  location:      ['location','city','address','region','area','place','geography','state','country'],
  source:        ['source','lead source','channel','origin','how did you hear','medium'],
  source_detail: ['source detail','campaign','referral name','campaign name','utm source','utm_source'],
  budget:        ['budget','budget range','spend','investment','price range','annual budget','amount','value'],
  requirement:   ['requirement','needs','use case','pain point','problem','challenge','what do you need','interest','project','description'],
  timeline:      ['timeline','timeframe','deadline','when','target date','expected start','date'],
  decision_maker:['decision maker','decision_maker','is decision maker','dm','authority'],
  company_size:  ['company size','size','employees','headcount','team size','no of employees','number of employees'],
  industry:      ['industry','sector','vertical','domain','field'],
};

function matchHeader(header, aliases) {
  const h = header.toLowerCase().trim().replace(/[^a-z0-9 _]/g, '');
  return aliases.some(a => h === a || h.includes(a));
}

function buildColumnMap(headers) {
  const idx = {};
  Object.entries(ALIASES).forEach(([field, aliases]) => {
    const i = headers.findIndex(h => matchHeader(String(h || ''), aliases));
    if (i >= 0) idx[field] = i;
  });
  return idx;
}

function rowToLead(cells, idx) {
  const get = (field) => idx[field] != null ? String(cells[idx[field]] ?? '').trim() : '';
  const name = get('name');
  if (!name) return null;

  return {
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
  };
}

// ── Excel Parser ─────────────────────────────────────────────

/**
 * Parse an Excel file (.xlsx / .xls) into lead rows.
 * @param {File} file
 * @returns {Promise<{ rows: object[], errors: string[], sheetName: string }>}
 */
export async function parseExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    return { rows: [], errors: ['File must have a header row and at least one data row'], sheetName };
  }

  const headers = jsonData[0].map(h => String(h || ''));
  const idx = buildColumnMap(headers);
  const rows = [];
  const errors = [];

  // Check if we found at least a name column
  if (idx.name == null) {
    // Try to auto-detect: if no header matches, treat first column as name
    // This handles PDFs / unstructured data where column A is usually names
    idx.name = 0;
    if (headers.length > 1 && idx.email == null) idx.email = 1;
    if (headers.length > 2 && idx.phone == null) idx.phone = 2;
    if (headers.length > 3 && idx.company == null) idx.company = 3;
  }

  for (let i = 1; i < jsonData.length; i++) {
    const cells = jsonData[i];
    if (!cells || cells.every(c => !c && c !== 0)) continue; // skip blank rows

    const lead = rowToLead(cells, idx);
    if (lead) {
      rows.push(lead);
    } else {
      errors.push(`Row ${i + 1}: skipped — missing name`);
    }
  }

  return { rows, errors, sheetName };
}

// ── PDF Parser ───────────────────────────────────────────────

/**
 * Parse a PDF file into lead rows.
 * Extracts text content and tries to parse it as tabular data.
 * @param {File} file
 * @returns {Promise<{ rows: object[], errors: string[], pageCount: number }>}
 */
export async function parsePDFFile(file) {
  // Dynamic import of pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');

  // Set up the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;

  // Extract text from all pages
  const allLines = [];
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group text items by their Y position to reconstruct rows
    const itemsByY = {};
    content.items.forEach(item => {
      if (!item.str?.trim()) return;
      const y = Math.round(item.transform[5]); // Y position
      if (!itemsByY[y]) itemsByY[y] = [];
      itemsByY[y].push({ x: item.transform[4], text: item.str.trim() });
    });

    // Sort by Y position (descending — PDF coordinates start from bottom)
    const sortedYs = Object.keys(itemsByY).sort((a, b) => b - a);
    for (const y of sortedYs) {
      // Sort items in each row by X position (left to right)
      const rowItems = itemsByY[y].sort((a, b) => a.x - b.x);
      const line = rowItems.map(i => i.text).join('\t');
      if (line.trim()) allLines.push(line);
    }
  }

  if (allLines.length < 2) {
    return { rows: [], errors: ['PDF must contain at least a header and one data row'], pageCount };
  }

  // Try to detect delimiter in first line
  const firstLine = allLines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let headers, dataLines;

  if (tabCount >= 2) {
    // Tab-separated (from PDF text grouping)
    headers = firstLine.split('\t').map(h => h.trim());
    dataLines = allLines.slice(1);
  } else {
    // Try comma-separated
    const commaCount = (firstLine.match(/,/g) || []).length;
    if (commaCount >= 2) {
      headers = firstLine.split(',').map(h => h.trim());
      dataLines = allLines.slice(1);
    } else {
      // Fall back: try to detect if this is a structured list
      // Check if lines have a pattern like "Name: value" or similar
      return parsePDFUnstructured(allLines, pageCount);
    }
  }

  const idx = buildColumnMap(headers);
  const rows = [];
  const errors = [];

  // Auto-assign columns if none matched
  if (idx.name == null) {
    idx.name = 0;
    if (headers.length > 1 && idx.email == null) idx.email = 1;
    if (headers.length > 2 && idx.phone == null) idx.phone = 2;
    if (headers.length > 3 && idx.company == null) idx.company = 3;
  }

  for (let i = 0; i < dataLines.length; i++) {
    const delimiter = tabCount >= 2 ? '\t' : ',';
    const cells = dataLines[i].split(delimiter).map(c => c.trim());
    if (cells.every(c => !c)) continue;

    const lead = rowToLead(cells, idx);
    if (lead) {
      rows.push(lead);
    } else {
      errors.push(`Line ${i + 2}: skipped — missing name`);
    }
  }

  return { rows, errors, pageCount };
}

/**
 * Parse unstructured PDF text (key-value pairs, free-form contact info).
 * Handles formats like:
 *   Name: John Smith
 *   Email: john@example.com
 *   Phone: +91 98765 43210
 */
function parsePDFUnstructured(lines, pageCount) {
  const rows = [];
  const errors = [];

  // Strategy 1: Look for "Key: Value" pattern (contact cards)
  const kvPattern = /^(.+?):\s*(.+)$/;
  let currentLead = {};
  let hasKV = false;

  for (const line of lines) {
    const match = line.match(kvPattern);
    if (match) {
      hasKV = true;
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();

      // Map key to field
      let field = null;
      for (const [f, aliases] of Object.entries(ALIASES)) {
        if (matchHeader(key, aliases)) { field = f; break; }
      }

      if (field) {
        currentLead[field] = value;
      }
    } else if (hasKV && line.trim() === '') {
      // Empty line = separator between contacts
      if (currentLead.name) {
        rows.push({ ...emptyLead(), ...currentLead });
        currentLead = {};
      }
    }
  }

  // Don't forget the last entry
  if (currentLead.name) {
    rows.push({ ...emptyLead(), ...currentLead });
  }

  // Strategy 2: If no key-value pairs found, try to extract emails/phones from text
  if (rows.length === 0) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const nameRegex = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/;

    let currentContact = { ...emptyLead() };

    for (const line of lines) {
      const trimmed = line.trim();
      const emails = trimmed.match(emailRegex);
      const phones = trimmed.match(phoneRegex);

      if (emails && emails.length > 0) {
        if (currentContact.email && currentContact.name) {
          rows.push({ ...currentContact });
          currentContact = { ...emptyLead() };
        }
        currentContact.email = emails[0];
      }

      if (phones && phones.length > 0) {
        currentContact.phone = phones[0];
      }

      if (nameRegex.test(trimmed) && !currentContact.name) {
        currentContact.name = trimmed;
      }
    }

    if (currentContact.name) {
      rows.push({ ...currentContact });
    }
  }

  if (rows.length === 0) {
    errors.push('Could not extract lead data from PDF. Ensure it contains structured data (tables or key-value pairs).');
  }

  return { rows, errors, pageCount };
}

function emptyLead() {
  return {
    name: '', email: '', phone: '', company: '', job_title: '',
    website: '', linkedin_url: '', location: '', source: '',
    source_detail: '', budget: '', requirement: '', timeline: '',
    decision_maker: '', company_size: '', industry: '',
  };
}

/**
 * Detect file type and parse accordingly.
 * @param {File} file
 * @returns {Promise<{ rows: object[], errors: string[], meta: object }>}
 */
export async function parseFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const result = await parseExcelFile(file);
    return {
      rows: result.rows,
      errors: result.errors,
      meta: { type: 'excel', sheetName: result.sheetName },
    };
  }

  if (name.endsWith('.pdf')) {
    const result = await parsePDFFile(file);
    return {
      rows: result.rows,
      errors: result.errors,
      meta: { type: 'pdf', pageCount: result.pageCount },
    };
  }

  throw new Error(`Unsupported file type: ${name.split('.').pop()}`);
}
