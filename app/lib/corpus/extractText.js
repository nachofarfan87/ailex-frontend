import { readFile } from 'node:fs/promises';
import path from 'node:path';

const PDF_MIN_TEXT_LENGTH = 200;
const PDF_MIN_WORD_COUNT = 40;
const PDF_MIN_LETTER_RATIO = 0.45;
const MOJIBAKE_PATTERN = /(?:\u00c3.|\u00c2.|\u00e2.)/;

export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    return extractTxtText(filePath);
  }

  if (ext === '.pdf') {
    return extractPdfText(filePath);
  }

  throw new Error(`Formato no soportado: ${ext}. Solo se admiten archivos .txt y .pdf`);
}

async function extractTxtText(filePath) {
  const buffer = await readFile(filePath);
  const text = normalise(decodeTextBuffer(buffer));

  if (!text) {
    return {
      text: '',
      status: 'error',
      extractionMode: 'txt',
      extractedTextLength: 0,
      error: 'El archivo de texto no contiene contenido legible.',
    };
  }

  return {
    text,
    status: 'processed',
    extractionMode: 'txt',
    extractedTextLength: text.length,
    error: null,
  };
}

async function extractPdfText(filePath) {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = await readFile(filePath);

  try {
    const data = await pdfParse(buffer);
    const text = normalise(repairCommonMojibake(String(data.text || '')));
    const quality = assessPdfExtraction(text);

    return {
      text,
      status: quality.status,
      extractionMode: quality.status === 'processed' ? 'pdf_text' : 'ocr_required',
      extractedTextLength: text.length,
      error: quality.error,
    };
  } catch (error) {
    return {
      text: '',
      status: 'ocr_required',
      extractionMode: 'ocr_required',
      extractedTextLength: 0,
      error: error.message || 'No se pudo extraer texto seleccionable del PDF.',
    };
  }
}

function assessPdfExtraction(text) {
  if (!text) {
    return {
      status: 'ocr_required',
      error: 'No se pudo extraer texto seleccionable del PDF.',
    };
  }

  const compact = text.replace(/\s+/g, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const letterCount = (compact.match(/\p{L}/gu) || []).length;
  const letterRatio = compact.length ? letterCount / compact.length : 0;
  const reasons = [];

  if (text.length < PDF_MIN_TEXT_LENGTH) {
    reasons.push('Texto extraido demasiado corto para un PDF legal.');
  }

  if (wordCount < PDF_MIN_WORD_COUNT) {
    reasons.push('Muy pocas palabras detectadas en la extraccion.');
  }

  if (letterRatio < PDF_MIN_LETTER_RATIO) {
    reasons.push('La extraccion contiene demasiados caracteres no alfabeticos.');
  }

  if (reasons.length > 0) {
    return {
      status: 'ocr_required',
      error: reasons.join(' '),
    };
  }

  return {
    status: 'processed',
    error: null,
  };
}

function decodeTextBuffer(buffer) {
  return repairCommonMojibake(buffer.toString('utf-8'));
}

function repairCommonMojibake(text) {
  if (!MOJIBAKE_PATTERN.test(text)) {
    return text;
  }

  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf-8');
    return scoreText(repaired) >= scoreText(text) ? repaired : text;
  } catch {
    return text;
  }
}

function scoreText(text) {
  const letters = (text.match(/\p{L}/gu) || []).length;
  const replacementPenalty = (text.match(/[\u00c3\u00c2\u00e2\ufffd]/g) || []).length;
  return letters - replacementPenalty * 5;
}

function normalise(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
