// Approximate safe character limit for context injection.
// ~4 chars per token, target ≤ 6 000 tokens → 24 000 chars.
const MAX_CONTEXT_CHARS = 24_000;

/**
 * Build a structured legal context block from retrieved chunks.
 *
 * @param {object[]} chunks - Ranked results from retrieveLegalContext.
 * @returns {{
 *   contextBlock: string,
 *   sources: Array<{ title: string, article: string|null, jurisdiction: string|null, chunkId: string }>,
 * }}
 */
export function buildLegalContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return { contextBlock: '', sources: [] };
  }

  const sources = [];
  const lines = ['FUENTES LEGALES'];
  let charCount = lines[0].length;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const index = i + 1;

    const title = chunk.title || 'Fuente desconocida';
    const article = chunk.article ? `Art. ${chunk.article}` : null;
    const jurisdiction = chunk.jurisdiction || null;
    const snippet = (chunk._snippet || chunk.text || '').trim();

    // Build the entry header
    const headerParts = [title];
    if (article) headerParts.push(article);
    if (jurisdiction) headerParts.push(`[${jurisdiction}]`);
    const header = `[${index}] ${headerParts.join(' — ')}`;

    // Truncate snippet if it would push us over the limit
    const entryText = `${header}\n"${snippet}"`;
    const entryLen = entryText.length + 2; // +2 for newlines

    if (charCount + entryLen > MAX_CONTEXT_CHARS) {
      break;
    }

    lines.push('');
    lines.push(entryText);
    charCount += entryLen;

    sources.push({
      title,
      article: chunk.article || null,
      jurisdiction,
      chunkId: chunk.chunkId,
    });
  }

  return {
    contextBlock: lines.join('\n'),
    sources,
  };
}
