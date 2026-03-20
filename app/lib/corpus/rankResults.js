/**
 * Legal-aware ranking with score breakdown.
 *
 * Applies procedural bias, minimum score threshold,
 * and per-document deduplication to scored chunks.
 */

const MIN_SCORE_THRESHOLD = 0.05;
const PROCEDURAL_BOOST = 1.3;
const PROCEDURAL_SOURCE_TYPES = new Set(['norma']);
const PROCEDURAL_SUBTYPES = new Set(['codigo_procesal', 'constitucion', 'constitucion_provincial']);

/**
 * @param {object[]} scoredChunks — chunks with `_scores` attached
 * @param {object} analysis — output of analyzeQuery
 * @param {number} limit
 * @returns {object[]}
 */
export function rankResults(scoredChunks, analysis, limit = 10) {
  let results = scoredChunks.filter((c) => c._scores.total >= MIN_SCORE_THRESHOLD);

  if (analysis.isProcedural) {
    results = results.map((chunk) => {
      const shouldBoost =
        PROCEDURAL_SOURCE_TYPES.has(chunk.sourceType) ||
        PROCEDURAL_SUBTYPES.has(chunk.subtype);

      if (!shouldBoost) return chunk;

      const boosted = { ...chunk._scores, total: chunk._scores.total * PROCEDURAL_BOOST };
      return { ...chunk, _scores: boosted };
    });
  }

  results.sort((a, b) => b._scores.total - a._scores.total);

  results = deduplicateByDocument(results);

  results = results.slice(0, limit);

  return results.map(formatResult);
}

/**
 * Keep at most 3 chunks per document to avoid flooding results
 * with a single large document.
 */
function deduplicateByDocument(sorted) {
  const countByDoc = new Map();
  const MAX_PER_DOC = 3;

  return sorted.filter((chunk) => {
    const docId = chunk.documentId;
    const current = countByDoc.get(docId) || 0;
    if (current >= MAX_PER_DOC) return false;
    countByDoc.set(docId, current + 1);
    return true;
  });
}

function formatResult(chunk) {
  const scores = chunk._scores;

  return {
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    title: chunk.title,
    sourceType: chunk.sourceType,
    subtype: chunk.subtype || null,
    jurisdiction: chunk.jurisdiction,
    legalArea: chunk.legalArea,
    article: chunk.article,
    book: chunk.book || null,
    chapter: chunk.chapter || null,
    section: chunk.section || null,
    legalTitle: chunk.legalTitle || null,
    priority: chunk.priority,
    score: round(scores.total),
    scoreBreakdown: {
      text: round(scores.text),
      metadata: round(scores.metadata),
      jurisdiction: round(scores.jurisdiction),
      priority: round(scores.priority),
    },
    text: chunk.text,
    snippet: chunk._snippet || chunk.text.slice(0, 200),
  };
}

function round(value) {
  return Math.round((value || 0) * 1000) / 1000;
}
