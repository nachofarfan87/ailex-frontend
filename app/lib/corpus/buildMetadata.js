import { randomUUID } from 'node:crypto';

export function buildChunks(documentId, rawChunks, meta) {
  return rawChunks.map((chunk, index) => ({
    chunkId: randomUUID(),
    documentId,
    title: meta.title ?? null,
    sourceType: meta.sourceType ?? null,
    subtype: meta.subtype ?? null,
    jurisdiction: meta.jurisdiction ?? null,
    legalArea: meta.legalArea ?? null,
    sourceName: meta.filename ?? null,
    article: chunk.article || null,
    book: chunk.book || null,
    section: chunk.section || null,
    chapter: chunk.chapter || null,
    legalTitle: chunk.legalTitle || null,
    priority: meta.priority ?? null,
    chunkIndex: index,
    text: chunk.text,
    embeddingText: buildEmbeddingText(meta, chunk),
  }));
}

export function buildDocumentDescriptor(id, meta, chunkCount) {
  return {
    id,
    filename: meta.filename ?? null,
    title: meta.title ?? null,
    sourceType: meta.sourceType ?? null,
    subtype: meta.subtype ?? null,
    jurisdiction: meta.jurisdiction ?? null,
    legalArea: meta.legalArea ?? null,
    description: meta.description ?? null,
    priority: meta.priority ?? null,
    status: meta.status ?? null,
    extractionMode: meta.extractionMode ?? null,
    extractedTextLength: meta.extractedTextLength ?? 0,
    chunkCount,
    createdAt: new Date().toISOString(),
  };
}

function buildEmbeddingText(meta, chunk) {
  return [
    meta.title,
    meta.sourceType,
    meta.subtype,
    meta.jurisdiction,
    meta.legalArea,
    chunk.book,
    chunk.legalTitle,
    chunk.chapter,
    chunk.section,
    chunk.article ? `Articulo ${chunk.article}` : null,
    chunk.text,
  ]
    .filter(Boolean)
    .join('\n')
    .replace(/\s+\n/g, '\n')
    .trim();
}
