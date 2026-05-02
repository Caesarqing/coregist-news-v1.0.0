const crypto = require('crypto');

const TRACKING_QUERY_PREFIXES = ['utm_', 'spm', 'fbclid', 'gclid', 'igshid', 'mc_', 'yclid'];
const TRACKING_QUERY_KEYS = new Set(['ref', 'ref_src', 'ref_url', 'source', 'campaign', 'cmpid']);

function normalizeText(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function canonicalizeUrl(rawUrl) {
  const text = (rawUrl || '').toString().trim();
  if (!text) return '';
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return text;
  }
  parsed.hash = '';
  parsed.protocol = (parsed.protocol || 'https:').toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  parsed.pathname = parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

  const pairs = Array.from(parsed.searchParams.entries())
    .filter(([key]) => {
      const lower = key.toLowerCase();
      if (TRACKING_QUERY_KEYS.has(lower)) return false;
      if (TRACKING_QUERY_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false;
      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  parsed.search = '';
  for (const [key, value] of pairs) {
    parsed.searchParams.append(key, value);
  }
  return parsed.toString().replace(/\/$/, parsed.pathname === '/' ? '/' : '');
}

function buildTitleHash(title) {
  const normalized = normalizeText(title);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function buildNewsIdentity({ link = '', title = '' } = {}) {
  return {
    canonical_link: canonicalizeUrl(link),
    title_hash: buildTitleHash(title),
  };
}

function buildNewsLookupQuery({ link = '', canonical_link = '', title_hash = '', sourceId = '' } = {}) {
  const clauses = [];
  if (link) clauses.push({ link });
  if (canonical_link) clauses.push({ canonical_link });
  if (title_hash && sourceId) clauses.push({ title_hash, sourceId });
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
}

module.exports = {
  buildNewsIdentity,
  buildNewsLookupQuery,
  buildTitleHash,
  canonicalizeUrl,
  normalizeText,
};
