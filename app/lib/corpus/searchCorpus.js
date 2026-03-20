import { applyFilters } from './filters.js';
import { loadCorpus } from './loadCorpus.js';
import { analyzeQuery } from './queryAnalysis.js';
import { rankResults } from './rankResults.js';

const WEIGHT_TEXT = 0.50;
const WEIGHT_METADATA = 0.20;
const WEIGHT_JURISDICTION = 0.15;
const WEIGHT_PRIORITY = 0.15;

const MAX_PRIORITY = 6;

/**
 * Search the processed legal corpus.
 *
 * @param {string} query
 * @param {{
 *   jurisdiction?: string,
 *   sourceTypes?: string[],
 *   legalArea?: string,
 *   limit?: number,
 * }} options
 * @returns {Promise<{ results: object[], query: object }>}
 */
export async function searchCorpus(query, options = {}) {
  const { jurisdiction, sourceTypes, legalArea, limit = 10 } = options;

  const analysis = analyzeQuery(query);
  const { chunks } = await loadCorpus();

  const requestedJurisdiction = jurisdiction || analysis.jurisdiction;
  const requestedLegalArea = legalArea || analysis.legalArea;

  const filtered = applyFilters(chunks, {
    jurisdiction: sourceTypes?.length ? null : null,
    sourceTypes,
    legalArea: null,
  });

  const scored = filtered.map((chunk) => {
    const textScore = computeTextScore(chunk, analysis);
    const metadataScore = computeMetadataScore(chunk, analysis, requestedLegalArea);
    const jurisdictionScore = computeJurisdictionScore(chunk, requestedJurisdiction);
    const priorityScore = computePriorityScore(chunk);

    const total =
      textScore * WEIGHT_TEXT +
      metadataScore * WEIGHT_METADATA +
      jurisdictionScore * WEIGHT_JURISDICTION +
      priorityScore * WEIGHT_PRIORITY;

    const snippet = generateSnippet(chunk, analysis);

    return {
      ...chunk,
      _scores: { text: textScore, metadata: metadataScore, jurisdiction: jurisdictionScore, priority: priorityScore, total },
      _snippet: snippet,
    };
  });

  const results = rankResults(scored, analysis, limit);

  return {
    results,
    query: {
      original: query,
      normalizedQuery: analysis.normalizedQuery,
      detectedJurisdiction: analysis.jurisdiction,
      detectedLegalArea: analysis.legalArea,
      isProcedural: analysis.isProcedural,
      topics: analysis.topics,
      appliedFilters: { jurisdiction: requestedJurisdiction, sourceTypes, legalArea: requestedLegalArea },
      totalChunksSearched: filtered.length,
      totalResults: results.length,
    },
  };
}

// ─── Text scoring ─────────────────────────────────────────────────────────────

function computeTextScore(chunk, analysis) {
  const { queryTerms, normalizedQuery } = analysis;
  if (!queryTerms.length) return 0;

  const searchable = normalizeText(`${chunk.embeddingText || ''} ${chunk.text || ''} ${chunk.title || ''}`);

  let score = 0;

  // Exact phrase match bonus
  if (searchable.includes(normalizedQuery)) {
    score += 0.35;
  }

  // Per-term matching with frequency weighting
  let matchedTerms = 0;
  for (const term of queryTerms) {
    if (searchable.includes(term)) {
      matchedTerms += 1;

      // Count occurrences (capped at 3 for diminishing returns)
      const regex = new RegExp(escapeRegex(term), 'gi');
      const occurrences = Math.min((searchable.match(regex) || []).length, 3);
      score += 0.05 * occurrences;
    }
  }

  // Term coverage: proportion of query terms found
  const coverage = matchedTerms / queryTerms.length;
  score += coverage * 0.40;

  // Article reference match bonus
  if (chunk.article && chunk.article !== 'preambulo') {
    const articleRef = `articulo ${chunk.article}`;
    if (normalizedQuery.includes(articleRef) || normalizedQuery.includes(`art ${chunk.article}`)) {
      score += 0.20;
    }
  }

  // Title match bonus
  if (chunk.title) {
    const normalizedTitle = normalizeText(chunk.title);
    const titleTermMatches = queryTerms.filter((t) => normalizedTitle.includes(t)).length;
    if (titleTermMatches > 0) {
      score += 0.10 * (titleTermMatches / queryTerms.length);
    }
  }

  return Math.min(score, 1.0);
}

// ─── Metadata scoring ────────────────────────────────────────────────────────

function computeMetadataScore(chunk, analysis, requestedLegalArea) {
  let score = 0;

  // Legal area match
  if (requestedLegalArea && chunk.legalArea) {
    const chunkArea = normalizeText(chunk.legalArea);
    const targetArea = normalizeText(requestedLegalArea);
    if (chunkArea.includes(targetArea) || targetArea.includes(chunkArea)) {
      score += 0.40;
    }
  }

  // Subtype relevance to query topics
  if (chunk.subtype && analysis.topics.length > 0) {
    const normalizedSubtype = normalizeText(chunk.subtype);
    for (const topic of analysis.topics) {
      if (normalizedSubtype.includes(topic)) {
        score += 0.20;
        break;
      }
    }
  }

  // Source type relevance
  if (chunk.sourceType) {
    const normalizedSourceType = normalizeText(chunk.sourceType);
    if (analysis.queryTerms.some((t) => normalizedSourceType.includes(t))) {
      score += 0.20;
    }
  }

  // Structural depth bonus — chunks with article/chapter info are richer
  if (chunk.article && chunk.article !== 'preambulo') score += 0.10;
  if (chunk.chapter) score += 0.05;
  if (chunk.book) score += 0.05;

  return Math.min(score, 1.0);
}

// ─── Jurisdiction scoring ─────────────────────────────────────────────────────

function computeJurisdictionScore(chunk, requestedJurisdiction) {
  if (!requestedJurisdiction) {
    return 0.5;
  }

  if (!chunk.jurisdiction) {
    return 0.3;
  }

  if (chunk.jurisdiction.toLowerCase() === requestedJurisdiction.toLowerCase()) {
    return 1.0;
  }

  if (chunk.jurisdiction.toLowerCase() === 'nacional') {
    return 0.6;
  }

  return 0.1;
}

// ─── Priority scoring ────────────────────────────────────────────────────────

function computePriorityScore(chunk) {
  const priority = chunk.priority || MAX_PRIORITY;
  return Math.max(0, (MAX_PRIORITY - priority + 1) / MAX_PRIORITY);
}

// ─── Snippet generation ──────────────────────────────────────────────────────

function generateSnippet(chunk, analysis) {
  const text = chunk.text || '';
  const maxLen = 250;

  if (text.length <= maxLen) {
    return text;
  }

  // Try to find a window around the first matching term
  const normalizedText = normalizeText(text);
  let bestPos = -1;

  for (const term of analysis.queryTerms) {
    const pos = normalizedText.indexOf(term);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) {
    return text.slice(0, maxLen).trim() + '...';
  }

  // Center the snippet around the match
  const halfWindow = Math.floor(maxLen / 2);
  let start = Math.max(0, bestPos - halfWindow);
  let end = Math.min(text.length, start + maxLen);

  // Adjust start to not cut mid-word
  if (start > 0) {
    const spaceIdx = text.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx < start + 30) {
      start = spaceIdx + 1;
    }
  }

  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
