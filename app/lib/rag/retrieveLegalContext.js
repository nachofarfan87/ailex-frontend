import { searchCorpus } from '@/app/lib/corpus/searchCorpus.js';

const DEFAULT_LIMIT = 8;
const MIN_SCORE_THRESHOLD = 0.05;

/**
 * Retrieve the most relevant legal chunks for a given message.
 *
 * @param {string} message - The user's legal question.
 * @param {{
 *   jurisdiction?: string,
 *   sourceTypes?: string[],
 *   legalArea?: string,
 *   limit?: number,
 * }} options
 * @returns {Promise<{
 *   chunks: object[],
 *   queryMeta: object,
 * }>}
 */
export async function retrieveLegalContext(message, options = {}) {
  const { jurisdiction, sourceTypes, legalArea, limit = DEFAULT_LIMIT } = options;

  const { results, query: queryMeta } = await searchCorpus(message, {
    jurisdiction,
    sourceTypes,
    legalArea,
    limit,
  });

  // Filter out very-low-scoring results to avoid injecting noise
  const chunks = results.filter(
    (r) => r._scores && r._scores.total >= MIN_SCORE_THRESHOLD,
  );

  return { chunks, queryMeta };
}
