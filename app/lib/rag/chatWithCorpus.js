import Anthropic from '@anthropic-ai/sdk';

import { retrieveLegalContext } from './retrieveLegalContext.js';
import { buildLegalContext } from './buildLegalContext.js';

const MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `Eres AILEX, un asistente juridico para abogados.

Tu tarea es responder preguntas legales usando exclusivamente las fuentes del corpus juridico que se te proporcionan.

Reglas:
- Prefiere siempre las fuentes de la jurisdiccion del usuario.
- Nunca inventes leyes, articulos ni jurisprudencia.
- Cita las fuentes por su numero [1], [2], etc., cuando sean relevantes.
- Si las fuentes son insuficientes para responder, dilo explicitamente.
- Responde en espanol, con precision juridica y tono profesional.

Formato de respuesta obligatorio (JSON puro, sin markdown):
{
  "answer": "<respuesta detallada>",
  "sources": [
    {
      "title": "<nombre del cuerpo legal>",
      "article": "<numero de articulo o null>",
      "jurisdiction": "<jurisdiccion o null>",
      "chunkId": "<id del chunk>"
    }
  ],
  "confidence": "high | medium | low"
}

Criterios de confianza:
- "high": las fuentes responden directa y completamente la pregunta.
- "medium": las fuentes son parcialmente relevantes o requieren inferencia razonable.
- "low": las fuentes son escasas, perifericas, o la pregunta excede el corpus disponible.`;

export async function chatWithCorpus(message, options = {}) {
  const client = getAnthropicClient();

  const { chunks, queryMeta } = await retrieveLegalContext(message, options);
  const { contextBlock, sources: retrievedSources } = buildLegalContext(chunks);

  const userPrompt = contextBlock
    ? `${contextBlock}\n\nPREGUNTA DEL USUARIO:\n${message}`
    : `No se encontraron fuentes relevantes en el corpus para esta consulta.\n\nPREGUNTA DEL USUARIO:\n${message}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ]
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const rawText = textBlock ? textBlock.text.trim() : '';
  const parsed = parseStructuredResponse(rawText, retrievedSources);

  return {
    ...parsed,
    queryMeta,
  };
}

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('Anthropic key loaded:', !!process.env.ANTHROPIC_API_KEY);

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing. Add it to .env.local');
  }

  return new Anthropic({ apiKey });
}

function parseStructuredResponse(rawText, fallbackSources) {
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      answer: String(parsed.answer || ''),
      sources: Array.isArray(parsed.sources) ? parsed.sources : fallbackSources,
      confidence: validateConfidence(parsed.confidence),
    };
  } catch {
    return {
      answer: rawText,
      sources: fallbackSources,
      confidence: 'low',
    };
  }
}

function validateConfidence(value) {
  const valid = ['high', 'medium', 'low'];
  return valid.includes(value) ? value : 'low';
}
