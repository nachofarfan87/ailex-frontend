export function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function pickFirstText(...values) {
  for (const value of values) {
    const text = extractDisplayText(value);
    if (text) return text;
  }
  return '';
}

export function normalizeForComparison(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,;:!?…\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function itemToText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return extractDisplayText(
    item.label ||
    item.title ||
    item.titulo ||
    item.text ||
    item.question ||
    item.name ||
    item.article ||
    item.source_id
  );
}

export function normalizeActionText(text) {
  return normalizeForComparison(String(text || '').replace(/^primer paso recomendado:\s*/i, ''));
}

export function isSameAction(left, right) {
  const normalizedLeft = normalizeActionText(left);
  const normalizedRight = normalizeActionText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

export function extractDisplayText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const cleaned = sanitizeVisibleString(value);
    return looksBrokenVisibleText(cleaned) ? '' : cleaned;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const candidate =
      value.description ||
      value.action ||
      value.label ||
      value.title ||
      value.titulo ||
      value.text ||
      value.question ||
      value.name ||
      value.message ||
      '';
    return typeof candidate === 'string' ? candidate.trim() : extractDisplayText(candidate);
  }
  if (Array.isArray(value)) {
    return value.map(extractDisplayText).filter(Boolean).join('; ');
  }
  return '';
}

function looksBrokenVisibleText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '[object object]' || normalized === '{}' || normalized === 'undefined' || normalized === 'null';
}

function sanitizeVisibleString(value) {
  return String(value || '')
    .replace(/\[object Object\]/gi, '')
    .replace(/\{\}/g, '')
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function deduplicateItems(items) {
  const texts = items.map((item) => ({
    display: itemToText(item),
    normalized: normalizeForComparison(itemToText(item)),
  }));

  const kept = [];
  for (const entry of texts) {
    if (!entry.normalized) continue;

    let dominated = false;
    const nextKept = [];
    for (const existing of kept) {
      if (existing.normalized.includes(entry.normalized)) {
        dominated = true;
        nextKept.push(existing);
        continue;
      }
      if (entry.normalized.includes(existing.normalized)) {
        continue;
      }
      nextKept.push(existing);
    }

    if (!dominated) {
      nextKept.push(entry);
    }
    kept.length = 0;
    kept.push(...nextKept);
  }

  return kept.map((entry) => entry.display);
}

export function mergeAndDeduplicate(...arrays) {
  const all = arrays.flatMap((arr) => asArray(arr).map(itemToText).filter(Boolean));
  return deduplicateItems(all);
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function textLooksRedundant(candidate, references = []) {
  const normalizedCandidate = normalizeText(candidate);
  if (!normalizedCandidate) return true;
  const candidateTokens = normalizedCandidate
    .split(' ')
    .filter((token) => token.length >= 4);

  return references.some((reference) => {
    const normalizedReference = normalizeText(reference);
    if (!normalizedReference) return false;
    const referenceTokens = normalizedReference
      .split(' ')
      .filter((token) => token.length >= 4);
    const sharedTokens = candidateTokens.filter((token) => referenceTokens.includes(token));
    return (
      normalizedCandidate === normalizedReference ||
      normalizedCandidate.includes(normalizedReference) ||
      normalizedReference.includes(normalizedCandidate) ||
      (sharedTokens.length >= 2 && sharedTokens.length === candidateTokens.length)
    );
  });
}
