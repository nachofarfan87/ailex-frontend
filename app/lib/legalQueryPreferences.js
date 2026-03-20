const STORAGE_KEY = 'ailex:legal-query-preferences:v1';

export const DEFAULT_LEGAL_QUERY_CONTEXT = {
  jurisdiction: 'jujuy',
  forum: 'civil',
  document_mode: 'estrategia',
  top_k: 5,
};

function browserWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeLegalQueryContext(value = {}) {
  const source = asObject(value);
  const jurisdiction = ['jujuy', 'nacional'].includes(source.jurisdiction)
    ? source.jurisdiction
    : DEFAULT_LEGAL_QUERY_CONTEXT.jurisdiction;
  const forum = ['civil', 'laboral', 'constitucional', 'general'].includes(source.forum)
    ? source.forum
    : DEFAULT_LEGAL_QUERY_CONTEXT.forum;
  const documentMode = ['estrategia'].includes(source.document_mode)
    ? source.document_mode
    : DEFAULT_LEGAL_QUERY_CONTEXT.document_mode;
  const topK = [3, 5, 8].includes(Number(source.top_k))
    ? Number(source.top_k)
    : DEFAULT_LEGAL_QUERY_CONTEXT.top_k;

  return {
    jurisdiction,
    forum,
    document_mode: documentMode,
    top_k: topK,
  };
}

export function readLegalQueryContext() {
  const browser = browserWindow();
  if (!browser) return DEFAULT_LEGAL_QUERY_CONTEXT;

  try {
    const raw = browser.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LEGAL_QUERY_CONTEXT;

    return normalizeLegalQueryContext(JSON.parse(raw));
  } catch {
    return DEFAULT_LEGAL_QUERY_CONTEXT;
  }
}

export function writeLegalQueryContext(value = {}) {
  const browser = browserWindow();
  if (!browser) return DEFAULT_LEGAL_QUERY_CONTEXT;

  const normalized = normalizeLegalQueryContext(value);
  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
