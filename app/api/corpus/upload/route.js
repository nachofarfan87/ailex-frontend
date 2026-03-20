import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { ingestDocument } from '../../../lib/corpus/ingestDocument.js';

export const runtime = 'nodejs';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title') || '';
    const sourceType = formData.get('sourceType') || '';
    const jurisdiction = formData.get('jurisdiction') || '';
    const legalArea = formData.get('legalArea') || '';
    const description = formData.get('description') || '';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Falta el archivo. Envia un campo "file" con el documento.' },
        { status: 400 },
      );
    }

    const originalName = file.name || 'unknown';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Formato "${ext}" no soportado. Solo se admiten: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
        { status: 400 },
      );
    }

    await mkdir(UPLOADS_DIR, { recursive: true });

    const timestamp = Date.now();
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFilename = `${timestamp}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, savedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const result = await ingestDocument({
      filePath,
      filename: originalName,
      title,
      sourceType,
      jurisdiction,
      legalArea,
      description,
    });

    return NextResponse.json({
      documentId: result.documentId,
      chunkCount: result.chunkCount,
      status: result.status,
      extractionMode: result.extractionMode,
      sourceType: result.sourceType,
      subtype: result.subtype,
      jurisdiction: result.jurisdiction,
      legalArea: result.legalArea,
      message:
        result.status === 'ocr_required'
          ? 'Documento cargado. Se marco como ocr_required porque el PDF requiere OCR o una mejor extraccion.'
          : `Documento procesado correctamente. ${result.chunkCount} chunks generados.`,
    });
  } catch (error) {
    console.error('[corpus/upload] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Error interno al procesar el documento.' },
      { status: 500 },
    );
  }
}
