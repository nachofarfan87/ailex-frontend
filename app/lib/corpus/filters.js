/**
 * Pre-filter chunks before scoring to narrow search space.
 *
 * @param {object[]} chunks
 * @param {{ jurisdiction?: string, sourceTypes?: string[], legalArea?: string }} filters
 * @returns {object[]}
 */
export function applyFilters(chunks, filters = {}) {
  let result = chunks;

  if (filters.sourceTypes && filters.sourceTypes.length > 0) {
    const allowed = new Set(filters.sourceTypes.map((s) => s.toLowerCase()));
    result = result.filter(
      (chunk) => chunk.sourceType && allowed.has(chunk.sourceType.toLowerCase()),
    );
  }

  if (filters.jurisdiction) {
    const target = filters.jurisdiction.toLowerCase();
    result = result.filter(
      (chunk) =>
        !chunk.jurisdiction || chunk.jurisdiction.toLowerCase() === target,
    );
  }

  if (filters.legalArea) {
    const target = filters.legalArea.toLowerCase();
    result = result.filter(
      (chunk) =>
        !chunk.legalArea || chunk.legalArea.toLowerCase().includes(target),
    );
  }

  return result;
}
