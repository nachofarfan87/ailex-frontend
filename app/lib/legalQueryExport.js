import { collectLegalWarnings, formatListItem, normalizeLegalQueryResponse } from './legalQuery';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asTextList(items = []) {
  return items.map((item) => formatListItem(item)).filter(Boolean);
}

function buildCaseStrategyLines(caseStrategy = {}, { caseDomain = '', caseDomains = [] } = {}) {
  const lines = [];
  if (caseDomain) lines.push(`Dominio principal: ${caseDomain}`);
  if (caseDomains.length) lines.push(`Dominios detectados: ${caseDomains.join(', ')}`);
  if (caseStrategy.strategic_narrative) lines.push(`Estrategia: ${caseStrategy.strategic_narrative}`);
  asTextList(caseStrategy.conflict_summary || []).forEach((item) => {
    lines.push(`Conflicto principal: ${item}`);
  });
  asTextList(caseStrategy.recommended_actions || []).forEach((item) => {
    lines.push(`Accion recomendada: ${item}`);
  });
  asTextList(caseStrategy.risk_analysis || []).forEach((item) => {
    lines.push(`Riesgo: ${item}`);
  });
  asTextList(caseStrategy.procedural_focus || []).forEach((item) => {
    lines.push(`Foco procesal: ${item}`);
  });
  asTextList(caseStrategy.secondary_domain_notes || []).forEach((item) => {
    lines.push(`Nota por dominio secundario: ${item}`);
  });
  return lines;
}

function buildNormativeLines(normalized) {
  const lines = [];
  const genericNormative =
    String(normalized.normative_reasoning.summary || '').toLowerCase().includes('generico') ||
    normalized.normative_reasoning.warnings.some((item) =>
      String(item || '').toLowerCase().includes('fallback generico'),
    );

  if (!genericNormative) {
    asTextList(normalized.reasoning.normative_foundations || []).forEach((item) => lines.push(item));
  }
  asTextList(normalized.normative_reasoning.applied_rules || []).forEach((item) => lines.push(item));
  return lines;
}

export function buildLegalExportModel(response, requestContext = {}) {
  const normalized = normalizeLegalQueryResponse(response);

  return {
    query: normalized.query || requestContext.query || 'Consulta juridica',
    jurisdiction: normalized.jurisdiction || requestContext.jurisdiction || '',
    forum: normalized.forum || requestContext.forum || '',
    caseDomain: normalized.case_domain || '',
    caseDomains: normalized.case_domains || [],
    documentMode: requestContext.document_mode || '',
    topK: requestContext.top_k || '',
    shortAnswer: normalized.visible_summary || '',
    strategyNarrative: normalized.case_strategy.strategic_narrative || '',
    legalStrategyLines: buildCaseStrategyLines(normalized.case_strategy, {
      caseDomain: normalized.case_domain,
      caseDomains: normalized.case_domains,
    }),
    normativeLines: buildNormativeLines(normalized),
    warnings: collectLegalWarnings(normalized),
    nextSteps: normalized.procedural_strategy.next_steps || [],
    risks: normalized.procedural_strategy.risks || [],
    missingInformation: normalized.procedural_strategy.missing_information || [],
    criticalQuestions: normalized.case_strategy.critical_questions || [],
    confidence: normalized.confidence,
    citations: normalized.reasoning.citations_used || [],
    response: normalized,
    requestContext,
  };
}

export function buildLegalExportText(response, requestContext = {}) {
  const model = buildLegalExportModel(response, requestContext);
  const sections = [
    'AILEX - Exportacion de resultado juridico',
    '',
    `Consulta: ${model.query}`,
    model.jurisdiction ? `Jurisdiccion: ${model.jurisdiction}` : '',
    model.forum ? `Foro: ${model.forum}` : '',
    model.caseDomain ? `Dominio principal: ${model.caseDomain}` : '',
    model.caseDomains.length ? `Dominios detectados: ${model.caseDomains.join(', ')}` : '',
    model.documentMode ? `Salida: ${model.documentMode}` : '',
    model.topK ? `Top K: ${model.topK}` : '',
    typeof model.confidence === 'number'
      ? `Confianza: ${Math.round(Math.max(0, Math.min(1, model.confidence)) * 100)}%`
      : '',
    '',
    model.shortAnswer ? `Respuesta breve:\n${model.shortAnswer}` : '',
    model.legalStrategyLines.length
      ? `Estrategia juridica:\n${model.legalStrategyLines.map((item) => `- ${item}`).join('\n')}`
      : '',
    model.criticalQuestions.length
      ? `Preguntas criticas:\n${asTextList(model.criticalQuestions).map((item) => `- ${item}`).join('\n')}`
      : '',
    model.normativeLines.length
      ? `Normativa relevante o secundaria:\n${model.normativeLines.map((item) => `- ${item}`).join('\n')}`
      : '',
    model.nextSteps.length || model.risks.length || model.missingInformation.length
      ? `Estrategia procesal complementaria:\n${[
          ...asTextList(model.nextSteps).map((item) => `- Paso: ${item}`),
          ...asTextList(model.risks).map((item) => `- Riesgo: ${item}`),
          ...asTextList(model.missingInformation).map((item) => `- Falta: ${item}`),
        ].join('\n')}`
      : '',
    model.warnings.length
      ? `Advertencias:\n${model.warnings.map((item) => `- ${item}`).join('\n')}`
      : '',
    model.citations.length
      ? `Citas utilizadas:\n${asTextList(model.citations).map((item) => `- ${item}`).join('\n')}`
      : '',
  ];
  return sections.filter(Boolean).join('\n\n').trim();
}

function fallbackCopyText(text) {
  if (typeof document === 'undefined') {
    throw new Error('La API de copiado no esta disponible en este contexto.');
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('No se pudo copiar el contenido.');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyLegalExportToClipboard(response, requestContext = {}) {
  const text = buildLegalExportText(response, requestContext);
  const hasClipboardApi =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(window.isSecureContext) &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function';
  if (hasClipboardApi) {
    await navigator.clipboard.writeText(text);
    return;
  }
  fallbackCopyText(text);
}

export function buildLegalExportHtml(response, requestContext = {}) {
  const model = buildLegalExportModel(response, requestContext);
  const renderList = (items) =>
    asTextList(items).length
      ? `<ul>${asTextList(items).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>AILEX - Exportacion juridica</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #1a2438; margin: 40px; line-height: 1.6; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      h2 { margin: 28px 0 10px; font-size: 18px; }
      p { margin: 0 0 12px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 0 0 8px; }
      .meta { display: grid; gap: 6px; margin: 18px 0 22px; }
      .block { margin-top: 22px; }
    </style>
  </head>
  <body>
    <h1>AILEX - Resultado juridico</h1>
    <p>${escapeHtml(model.query)}</p>
    <div class="meta">
      ${model.jurisdiction ? `<div><strong>Jurisdiccion:</strong> ${escapeHtml(model.jurisdiction)}</div>` : ''}
      ${model.forum ? `<div><strong>Foro:</strong> ${escapeHtml(model.forum)}</div>` : ''}
      ${model.caseDomain ? `<div><strong>Dominio principal:</strong> ${escapeHtml(model.caseDomain)}</div>` : ''}
      ${model.caseDomains.length ? `<div><strong>Dominios detectados:</strong> ${escapeHtml(model.caseDomains.join(', '))}</div>` : ''}
      ${model.documentMode ? `<div><strong>Salida:</strong> ${escapeHtml(model.documentMode)}</div>` : ''}
      ${model.topK ? `<div><strong>Top K:</strong> ${escapeHtml(model.topK)}</div>` : ''}
      ${typeof model.confidence === 'number' ? `<div><strong>Confianza:</strong> ${Math.round(Math.max(0, Math.min(1, model.confidence)) * 100)}%</div>` : ''}
    </div>

    ${model.shortAnswer ? `<section class="block"><h2>Respuesta breve</h2><p>${escapeHtml(model.shortAnswer)}</p></section>` : ''}
    ${model.legalStrategyLines.length ? `<section class="block"><h2>Estrategia juridica</h2>${renderList(model.legalStrategyLines)}</section>` : ''}
    ${model.criticalQuestions.length ? `<section class="block"><h2>Preguntas criticas</h2>${renderList(model.criticalQuestions)}</section>` : ''}
    ${model.normativeLines.length ? `<section class="block"><h2>Normativa relevante o secundaria</h2>${renderList(model.normativeLines)}</section>` : ''}
    ${(model.nextSteps.length || model.risks.length || model.missingInformation.length) ? `<section class="block"><h2>Estrategia procesal complementaria</h2>${renderList(model.nextSteps)}${renderList(model.risks)}${renderList(model.missingInformation)}</section>` : ''}
    ${model.warnings.length ? `<section class="block"><h2>Advertencias</h2>${renderList(model.warnings)}</section>` : ''}
    ${model.citations.length ? `<section class="block"><h2>Citas utilizadas</h2>${renderList(model.citations)}</section>` : ''}
  </body>
</html>`;
}

export function printLegalExportToPdf(response, requestContext = {}) {
  const html = buildLegalExportHtml(response, requestContext);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) {
    throw new Error('El navegador bloqueo la ventana de impresion.');
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
