const ARTICLE_PATTERN =
  /(?:^|\n)\s*(?:art(?:[ií]culo)?|art\.)\s+(\d+[a-z]?(?:\s*(?:bis|ter|quater|quinquies))?)(?:\s*[\u00b0\u00ba])?(?=[\s.:\-])/gim;
const HIERARCHY_PATTERNS = {
  book: /^\s*libro\s+([a-z0-9ivxlcdm]+.*)$/i,
  legalTitle: /^\s*t[ií]tulo\s+([a-z0-9ivxlcdm]+.*)$/i,
  chapter: /^\s*cap[ií]tulo\s+([a-z0-9ivxlcdm]+.*)$/i,
  section: /^\s*secci[oó]n\s+([a-z0-9ivxlcdm]+.*)$/i,
};
const JURISPRUDENCE_SECTION_PATTERN =
  /(?:^|\n)\s*(autos(?:\s+y\s+vistos?)?|y\s+vistos?|vistos?|considerando(?:s)?|resuelve|falla|por\s+ello)\s*[:.-]?(?=\n|$)/gim;
const DEFAULT_MIN = 800;
const DEFAULT_MAX = 1200;

export function splitNormByArticle(text) {
  const matches = [...text.matchAll(ARTICLE_PATTERN)];

  if (matches.length === 0) {
    return splitGenericText(text);
  }

  const chunks = [];
  let hierarchy = emptyHierarchy();

  const preamble = text.slice(0, matches[0].index).trim();
  hierarchy = applyHierarchyUpdates(text.slice(0, matches[0].index), hierarchy);

  if (preamble) {
    chunks.push(createChunk(preamble, { article: 'preambulo', ...hierarchy }));
  }

  let cursor = matches[0].index;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;

    if (start > cursor) {
      hierarchy = applyHierarchyUpdates(text.slice(cursor, start), hierarchy);
    }

    const article = cleanArticleId(match[1]);
    const body = text.slice(start, end).trim();

    if (body) {
      chunks.push(createChunk(body, { article, ...hierarchy }));
    }

    cursor = end;
  }

  return chunks.length ? chunks : splitGenericText(text);
}

export function splitJurisprudenceSections(text) {
  const matches = [...text.matchAll(JURISPRUDENCE_SECTION_PATTERN)];

  if (matches.length === 0) {
    return splitGenericText(text);
  }

  const chunks = [];
  const intro = text.slice(0, matches[0].index).trim();

  if (intro) {
    chunks.push(...splitTextWithContext(intro, { section: 'encabezado' }, { min: 600, max: 1400 }));
  }

  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const heading = normalizeSectionLabel(matches[index][1]);
    const body = text.slice(start, end).trim();

    if (!body) {
      continue;
    }

    chunks.push(...splitTextWithContext(body, { section: heading }, { min: 600, max: 1400 }));
  }

  return chunks.length ? chunks : splitGenericText(text);
}

export function splitGenericText(text, { min = DEFAULT_MIN, max = DEFAULT_MAX } = {}) {
  return splitTextWithContext(text, {}, { min, max });
}

export function chunkDocument(text, descriptor = {}) {
  const options = typeof descriptor === 'string' ? { sourceType: descriptor } : descriptor;
  const sourceType = options.sourceType || null;
  const subtype = options.subtype || null;

  if (sourceType === 'jurisprudencia') {
    return splitJurisprudenceSections(text);
  }

  if (
    sourceType === 'norma' ||
    subtype === 'constitucion' ||
    subtype === 'constitucion_provincial' ||
    String(subtype || '').startsWith('codigo')
  ) {
    return splitNormByArticle(text);
  }

  return splitGenericText(text);
}

function splitTextWithContext(text, context = {}, { min = DEFAULT_MIN, max = DEFAULT_MAX } = {}) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let buffer = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${trimmed}` : trimmed;

    if (candidate.length > max && buffer) {
      chunks.push(createChunk(buffer, context));
      buffer = trimmed;
    } else {
      buffer = candidate;
    }

    if (buffer.length >= max) {
      chunks.push(createChunk(buffer, context));
      buffer = '';
    }
  }

  if (buffer.trim()) {
    const tail = buffer.trim();
    if (chunks.length > 0 && tail.length < min) {
      chunks[chunks.length - 1].text = `${chunks[chunks.length - 1].text}\n\n${tail}`;
    } else {
      chunks.push(createChunk(tail, context));
    }
  }

  return chunks.filter((chunk) => chunk.text);
}

function applyHierarchyUpdates(segment, current) {
  const next = { ...current };

  for (const rawLine of segment.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.match(HIERARCHY_PATTERNS.book)) {
      next.book = line;
      next.legalTitle = null;
      next.chapter = null;
      next.section = null;
      continue;
    }

    if (line.match(HIERARCHY_PATTERNS.legalTitle)) {
      next.legalTitle = line;
      next.chapter = null;
      next.section = null;
      continue;
    }

    if (line.match(HIERARCHY_PATTERNS.chapter)) {
      next.chapter = line;
      next.section = null;
      continue;
    }

    if (line.match(HIERARCHY_PATTERNS.section)) {
      next.section = line;
    }
  }

  return next;
}

function createChunk(text, context = {}) {
  return {
    text: text.trim(),
    article: context.article || null,
    book: context.book || null,
    legalTitle: context.legalTitle || null,
    chapter: context.chapter || null,
    section: context.section || null,
  };
}

function emptyHierarchy() {
  return {
    book: null,
    legalTitle: null,
    chapter: null,
    section: null,
  };
}

function cleanArticleId(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeSectionLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}
