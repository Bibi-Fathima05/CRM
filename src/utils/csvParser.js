// ── CSV / Excel paste parser ──────────────────────────────────
// Handles: .csv files, .tsv files, Excel copy-paste (tab-separated)

/**
 * Parse a CSV or TSV string into an array of objects.
 * Auto-detects delimiter (comma or tab).
 */
export function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['File must have a header row and at least one data row'] };

  // Auto-detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  // Map common header variations to our field names
  const FIELD_MAP = {
    name: 'name', full_name: 'name', fullname: 'name', contact_name: 'name', lead_name: 'name',
    email: 'email', email_address: 'email', mail: 'email',
    phone: 'phone', mobile: 'phone', phone_number: 'phone', contact: 'phone', tel: 'phone',
    company: 'company', organization: 'company', org: 'company', company_name: 'company', business: 'company',
    source: 'source', lead_source: 'source', channel: 'source',
  };

  const mappedHeaders = headers.map(h => FIELD_MAP[h] || h);

  const rows = [];
  const errors = [];

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const values = parseCSVLine(line, delimiter);
    const row = {};
    mappedHeaders.forEach((field, j) => {
      row[field] = values[j]?.trim() || '';
    });

    // Validate required fields
    if (!row.name) {
      errors.push(`Row ${i + 2}: Missing name`);
      return;
    }

    rows.push({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      company: row.company || '',
      source: row.source || '',
      _rowNum: i + 2,
      _valid: !!row.name,
    });
  });

  return { rows, errors, headers: mappedHeaders };
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Read a File object as text.
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate a sample CSV string for download.
 */
export function getSampleCSV() {
  return `name,email,phone,company,source
John Smith,john@acme.com,+91 98765 43210,Acme Corp,linkedin
Sarah Johnson,sarah@techco.in,+91 87654 32109,TechCo,referral
Raj Patel,raj@startup.io,,Startup IO,website`;
}
