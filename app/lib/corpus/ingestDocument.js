import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildChunks, buildDocumentDescriptor } from './buildMetadata.js';
import { chunkDocument } from './chunkers.js';
import { derivePriority, detectDocumentType, inferDocumentTitle } from './detectDocumentType.js';
import { extractText } from './extractText.js';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const DOCUMENTS_DIR = path.join(PROCESSED_DIR, 'documents');
const CHUNKS_DIR = path.join(PROCESSED_DIR, 'chunks');

export async function ingestDocument({
  filePath,
  filename,
  title,
  sourceType,
  jurisdiction,
  legalArea,
  description,
}) {
  const documentId = randomUUID();
  const manualMeta = {
    filename,
    title: normalizeOptional(title),
    sourceType: normalizeOptional(sourceType),
    jurisdiction: normalizeOptional(jurisdiction),
    legalArea: normalizeOptional(legalArea),
    description: normalizeOptional(description),
  };

  try {
    const extraction = await extractText(filePath);
    const detection = detectDocumentType({
      filename,
      title: manualMeta.title || '',
      text: extraction.text,
    });

    const resolvedSourceType = manualMeta.sourceType || detection.sourceType || 'escrito';
    const resolvedSubtype = detection.subtype || fallbackSubtype(manualMeta.sourceType);
    const resolvedMeta = {
      filename,
      title: inferDocumentTitle({
        title: manualMeta.title || '',
        filename,
        text: extraction.text,
      }),
      sourceType: resolvedSourceType,
      subtype: resolvedSubtype,
      jurisdiction: manualMeta.jurisdiction || detection.jurisdiction || null,
      legalArea: manualMeta.legalArea || detection.legalArea || null,
      description: manualMeta.description || null,
      priority: derivePriority(resolvedSourceType, resolvedSubtype),
      status: extraction.status,
      extractionMode: extraction.extractionMode,
      extractedTextLength: extraction.extractedTextLength,
    };

    const rawChunks =
      extraction.status === 'processed'
        ? chunkDocument(extraction.text, {
            sourceType: resolvedMeta.sourceType,
            subtype: resolvedMeta.subtype,
          })
        : [];

    const enrichedChunks = buildChunks(documentId, rawChunks, resolvedMeta);
    const descriptor = buildDocumentDescriptor(documentId, resolvedMeta, enrichedChunks.length);

    await persistProcessedOutputs(documentId, descriptor, enrichedChunks);

    if (extraction.status === 'error') {
      throw new Error(extraction.error || 'No se pudo extraer texto legible del documento.');
    }

    return {
      documentId,
      chunkCount: enrichedChunks.length,
      status: resolvedMeta.status,
      extractionMode: resolvedMeta.extractionMode,
      sourceType: resolvedMeta.sourceType,
      subtype: resolvedMeta.subtype,
      jurisdiction: resolvedMeta.jurisdiction,
      legalArea: resolvedMeta.legalArea,
    };
  } catch (error) {
    const errorDescriptor = buildDocumentDescriptor(
      documentId,
      {
        filename,
        title: manualMeta.title || inferDocumentTitle({ filename, text: '' }),
        sourceType: manualMeta.sourceType || 'escrito',
        subtype: fallbackSubtype(manualMeta.sourceType),
        jurisdiction: manualMeta.jurisdiction || null,
        legalArea: manualMeta.legalArea || null,
        description: manualMeta.description || null,
        priority: derivePriority(manualMeta.sourceType || 'escrito', fallbackSubtype(manualMeta.sourceType)),
        status: 'error',
        extractionMode: null,
        extractedTextLength: 0,
      },
      0,
    );

    await persistProcessedOutputs(documentId, errorDescriptor, []);
    throw error;
  }
}

async function persistProcessedOutputs(documentId, descriptor, chunks) {
  await mkdir(DOCUMENTS_DIR, { recursive: true });
  await mkdir(CHUNKS_DIR, { recursive: true });

  await writeFile(path.join(DOCUMENTS_DIR, `${documentId}.json`), JSON.stringify(descriptor, null, 2), 'utf-8');
  await writeFile(path.join(CHUNKS_DIR, `${documentId}.json`), JSON.stringify(chunks, null, 2), 'utf-8');
}

function normalizeOptional(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function fallbackSubtype(sourceType) {
  switch (sourceType) {
    case 'modelo':
      return 'modelo';
    case 'nota_interna':
      return 'nota_interna';
    case 'doctrina':
      return 'articulo_doctrinario';
    case 'escrito':
      return 'escrito';
    default:
      return null;
  }
}
