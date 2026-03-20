import { NextResponse } from 'next/server';

import { chatWithCorpus } from '@/app/lib/rag/chatWithCorpus.js';

export const runtime = 'nodejs';

/**
 * POST /api/chat
 *
 * Body (JSON):
 *   message      – required: the user's legal question
 *   jurisdiction – optional: e.g. "Jujuy"
 *   sourceTypes  – optional: e.g. ["norma", "jurisprudencia"]
 *   legalArea    – optional: e.g. "Procesal"
 *   limit        – optional: max chunks to retrieve (default 8)
 *
 * Response:
 *   { answer, sources, confidence }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { message, jurisdiction, sourceTypes, legalArea, limit } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Se requiere el campo "message" con la consulta legal.' },
        { status: 400 },
      );
    }

    const result = await chatWithCorpus(message.trim(), {
      jurisdiction,
      sourceTypes,
      legalArea,
      limit,
    });

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('[chat] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Error interno al procesar la consulta.' },
      { status: 500 },
    );
  }
}
