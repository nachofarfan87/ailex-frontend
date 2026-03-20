import { NextResponse } from 'next/server';

import { searchCorpus } from '../../../lib/corpus/searchCorpus.js';

export const runtime = 'nodejs';

/**
 * POST /api/corpus/search
 *
 * Body (JSON):
 *   query        – required search query string
 *   jurisdiction – optional, e.g. "Jujuy"
 *   sourceTypes  – optional, e.g. ["norma", "jurisprudencia"]
 *   legalArea    – optional, e.g. "Procesal"
 *   limit        – optional, default 10
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { query, jurisdiction, sourceTypes, legalArea, limit } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Se requiere un campo "query" con la consulta de busqueda.' },
        { status: 400 },
      );
    }

    const result = await searchCorpus(query.trim(), {
      jurisdiction,
      sourceTypes,
      legalArea,
      limit: limit || 10,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[corpus/search] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Error interno en la busqueda.' },
      { status: 500 },
    );
  }
}
