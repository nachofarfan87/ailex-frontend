// frontend/app/lib/legalResultAdapter.js

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function pickFirstText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function humanizeDomain(domain) {
  const text = String(domain || '').trim();
  if (!text) return 'Resultado juridico';
  return text.replace(/_/g, ' ');
}

function humanizeFieldLabel(value) {
  const field = String(value || '').trim();
  const labels = {
    divorcio_modalidad: 'la modalidad del divorcio',
    hay_hijos: 'si hay hijos',
    hay_acuerdo: 'si hay acuerdo',
    cese_convivencia: 'si ya hubo cese de convivencia',
    hay_bienes: 'si hay bienes relevantes',
    vivienda_familiar: 'la vivienda familiar',
    convenio_regulador: 'si ya hay convenio regulador',
    alimentos_definidos: 'si ya definieron alimentos',
    cuota_alimentaria_porcentaje: 'el porcentaje de cuota alimentaria',
    regimen_comunicacional: 'si ya definieron regimen de comunicacion',
    regimen_comunicacional_frecuencia: 'la frecuencia del regimen de comunicacion',
    rol_procesal: 'el rol procesal',
    urgencia: 'si hay urgencia',
    situacion_economica: 'la situacion economica',
    hay_ingresos: 'si hay ingresos identificables',
  };
  return labels[field] || field.replace(/_/g, ' ');
}

function mapFactToLabel(value) {
  const field = String(value || '').trim();
  const labels = {
    divorcio_modalidad: 'Modalidad del divorcio',
    hay_hijos: 'Hijos',
    hay_hijos_edad: 'Edad de los hijos',
    hay_acuerdo: 'Acuerdo',
    cese_convivencia: 'Cese de convivencia',
    hay_bienes: 'Bienes',
    vivienda_familiar: 'Vivienda',
    convenio_regulador: 'Convenio regulador',
    alimentos_definidos: 'Alimentos definidos',
    cuota_alimentaria_porcentaje: 'Cuota alimentaria',
    regimen_comunicacional: 'Regimen comunicacional',
    regimen_comunicacional_frecuencia: 'Frecuencia de comunicacion',
    rol_procesal: 'Rol procesal',
    urgencia: 'Urgencia',
    situacion_economica: 'Situacion economica',
    hay_ingresos: 'Ingresos identificables',
    tema_alimentos: 'Tema: alimentos',
    tema_divorcio: 'Tema: divorcio',
    tema_cuidado: 'Tema: cuidado personal',
    vinculo_parental: 'Vinculo parental',
    // Slash-joined composite keys from completeness rules
    'divorcio_modalidad/hay_acuerdo': 'Modalidad o acuerdo',
    'situacion_economica/urgencia/hay_ingresos': 'Situacion economica o urgencia',
  };
  return labels[field] || humanizeFieldLabel(field);
}

function normalizeMode(mode) {
  const safeMode = asObject(mode);
  return {
    title: pickFirstText(safeMode.title),
    summary: pickFirstText(safeMode.summary),
    quick_start: pickFirstText(safeMode.quick_start),
    what_this_means: pickFirstText(safeMode.what_this_means),
    next_steps: asArray(safeMode.next_steps),
    key_risks: asArray(safeMode.key_risks),
    missing_information: asArray(safeMode.missing_information),
    confidence_explained: pickFirstText(safeMode.confidence_explained),
    strategic_narrative: pickFirstText(safeMode.strategic_narrative),
    conflict_summary: asArray(safeMode.conflict_summary),
    recommended_actions: asArray(safeMode.recommended_actions),
    risk_analysis: asArray(safeMode.risk_analysis),
    procedural_focus: asArray(safeMode.procedural_focus),
    critical_missing_information: asArray(safeMode.critical_missing_information),
    ordinary_missing_information: asArray(safeMode.ordinary_missing_information),
    normative_focus: asArray(safeMode.normative_focus),
  };
}

function normalizeConversational(raw) {
  const safe = asObject(raw);
  const caseCompleteness = asObject(safe.case_completeness);
  return {
    // Use extractDisplayText for fields that could arrive as object from backend
    message: extractDisplayText(safe.message),
    question: extractDisplayText(safe.question),
    options: asArray(safe.options).map((item) => extractDisplayText(item)).filter(Boolean),
    missing_facts: asArray(safe.missing_facts).map((item) => extractDisplayText(item)).filter(Boolean),
    next_step: extractDisplayText(safe.next_step),
    should_ask_first: Boolean(safe.should_ask_first),
    guided_response: extractDisplayText(safe.guided_response),
    known_facts: asObject(safe.known_facts),
    clarification_status: String(safe.clarification_status || '').trim(),
    asked_questions: asArray(safe.asked_questions).map((item) => extractDisplayText(item)).filter(Boolean),
    case_completeness: {
      is_complete: Boolean(caseCompleteness.is_complete),
      missing_critical: asArray(caseCompleteness.missing_critical).map((item) => extractDisplayText(item)).filter(Boolean),
      missing_optional: asArray(caseCompleteness.missing_optional).map((item) => extractDisplayText(item)).filter(Boolean),
      confidence_level: String(caseCompleteness.confidence_level || '').trim(),
      known_count: typeof caseCompleteness.known_count === 'number' ? caseCompleteness.known_count : 0,
    },
  };
}

function normalizeConversationalResponse(raw) {
  const safe = asObject(raw);
  return {
    mode: String(safe.mode || '').trim(),
    domain: String(safe.domain || '').trim(),
    messages: asArray(safe.messages)
      .map((item) => {
        const safeItem = asObject(item);
        const type = String(safeItem.type || '').trim();
        const text = extractDisplayText(safeItem.text);
        if (!type || !text) return null;
        return { type, text };
      })
      .filter(Boolean),
    primary_question: extractDisplayText(safe.primary_question),
  };
}

function normalizeForComparison(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[.,;:!?…\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function itemToText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return (
    item.label ||
    item.title ||
    item.titulo ||
    item.text ||
    item.question ||
    item.name ||
    item.article ||
    item.source_id ||
    ''
  );
}

function normalizeActionText(text) {
  return normalizeForComparison(String(text || '').replace(/^primer paso recomendado:\s*/i, ''));
}

function isSameAction(left, right) {
  const normalizedLeft = normalizeActionText(left);
  const normalizedRight = normalizeActionText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

/**
 * Defensive extractor: ensures ANY value becomes a display-safe string.
 * Handles: string, number, boolean, object (extracts known text fields),
 * null/undefined → ''.
 * NEVER returns '[object Object]'.
 */
function extractDisplayText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    const candidate =
      value.description ||
      value.action ||
      value.label ||
      value.title ||
      value.titulo ||
      value.text ||
      value.question ||
      value.name ||
      value.message ||
      '';
    // Recurse: the extracted field itself might be an object (nested structures).
    // This guarantees we NEVER return a non-primitive, preventing [object Object].
    return typeof candidate === 'string' ? candidate.trim() : extractDisplayText(candidate);
  }
  if (Array.isArray(value)) {
    return value.map(extractDisplayText).filter(Boolean).join('; ');
  }
  return '';
}

function deduplicateItems(items) {
  const texts = items.map((item) => ({
    display: itemToText(item),
    normalized: normalizeForComparison(itemToText(item)),
  }));

  const kept = [];
  for (const entry of texts) {
    if (!entry.normalized) continue;

    let dominated = false;
    const nextKept = [];
    for (const existing of kept) {
      if (existing.normalized.includes(entry.normalized)) {
        dominated = true;
        nextKept.push(existing);
        continue;
      }
      if (entry.normalized.includes(existing.normalized)) {
        continue;
      }
      nextKept.push(existing);
    }

    if (!dominated) {
      nextKept.push(entry);
    }
    kept.length = 0;
    kept.push(...nextKept);
  }

  return kept.map((entry) => entry.display);
}

function mergeAndDeduplicate(...arrays) {
  const all = arrays.flatMap((arr) => asArray(arr).map(itemToText).filter(Boolean));
  return deduplicateItems(all);
}

const ROBOTIC_PATTERNS = [
  /persisten cuestiones/i,
  /la informacion faltante.*es significativa/i,
  /persisten preguntas criticas/i,
  /aun quedan cuestiones/i,
  /se requiere informacion adicional para/i,
  /no se puede determinar con certeza/i,
];

function isRoboticPhrase(text) {
  const str = String(text || '');
  return ROBOTIC_PATTERNS.some((pattern) => pattern.test(str));
}

function filterRoboticPhrases(items) {
  return items.filter((item) => !isRoboticPhrase(item));
}

function factsToPills(facts) {
  const safeFacts = asObject(facts);
  const pills = [];

  const modalidad = String(safeFacts.divorcio_modalidad || '').trim();
  if (modalidad) {
    pills.push(`Divorcio ${modalidad}`);
  }

  if (typeof safeFacts.hay_hijos === 'boolean') {
    pills.push(safeFacts.hay_hijos ? 'Hay hijos' : 'No hay hijos');
  }

  if (typeof safeFacts.hay_acuerdo === 'boolean') {
    pills.push(safeFacts.hay_acuerdo ? 'Hay acuerdo' : 'Sin acuerdo');
  }

  const rolProcesal = String(safeFacts.rol_procesal || '').trim();
  if (rolProcesal) {
    pills.push(`Rol: ${rolProcesal}`);
  }

  if (typeof safeFacts.urgencia === 'boolean' && safeFacts.urgencia) {
    pills.push('Hay urgencia');
  }

  if (typeof safeFacts.cese_convivencia === 'boolean') {
    pills.push(safeFacts.cese_convivencia ? 'Cese de convivencia' : 'Siguen conviviendo');
  }

  if (typeof safeFacts.hay_bienes === 'boolean') {
    pills.push(safeFacts.hay_bienes ? 'Hay bienes' : 'Sin bienes relevantes');
  }

  if (typeof safeFacts.vivienda_familiar === 'boolean' && safeFacts.vivienda_familiar) {
    pills.push('Vivienda familiar');
  }

  if (typeof safeFacts.convenio_regulador === 'boolean' && safeFacts.convenio_regulador) {
    pills.push('Hay convenio regulador');
  }

  if (typeof safeFacts.alimentos_definidos === 'boolean' && safeFacts.alimentos_definidos) {
    pills.push('Alimentos definidos');
  }

  const cuotaAlimentaria = String(safeFacts.cuota_alimentaria_porcentaje || '').trim();
  if (cuotaAlimentaria) {
    pills.push(`Cuota: ${cuotaAlimentaria} del sueldo`);
  }

  if (typeof safeFacts.regimen_comunicacional === 'boolean' && safeFacts.regimen_comunicacional) {
    pills.push('Regimen comunicacional');
  }

  const frecuenciaComunicacion = String(safeFacts.regimen_comunicacional_frecuencia || '').trim();
  if (frecuenciaComunicacion) {
    pills.push(`Comunicacion: ${frecuenciaComunicacion}`);
  }

  const situacionEconomica = String(safeFacts.situacion_economica || '').trim();
  if (situacionEconomica) {
    pills.push(`Situacion economica: ${situacionEconomica}`);
  }

  if (typeof safeFacts.hay_ingresos === 'boolean') {
    pills.push(safeFacts.hay_ingresos ? 'Hay ingresos identificables' : 'No se identifican ingresos');
  }

  return deduplicateItems(pills);
}

function mapCompletenessList(items) {
  return deduplicateItems(asArray(items).map(humanizeFieldLabel));
}

function isMeaningfulFactValue(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return Boolean(value.trim());
  return value !== null && value !== undefined;
}

function buildCaseProgress(conversational) {
  const knownFacts = asObject(conversational.known_facts);
  const completeness = asObject(conversational.case_completeness);
  const defined = [];
  const missing = [];
  const seen = new Set();

  Object.entries(knownFacts).forEach(([key, value]) => {
    if (!isMeaningfulFactValue(value)) return;
    const normalized = String(key || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    defined.push({
      key: normalized,
      label: mapFactToLabel(normalized),
      state: 'done',
    });
  });

  asArray(completeness.missing_critical).forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    missing.push({
      key: normalized,
      label: mapFactToLabel(normalized),
      state: 'pending',
      optional: false,
    });
  });

  asArray(completeness.missing_optional).forEach((item) => {
    const normalized = String(item || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    missing.push({
      key: normalized,
      label: mapFactToLabel(normalized),
      state: 'pending',
      optional: true,
    });
  });

  const totalFields = defined.length + missing.length;
  if (totalFields < 2) {
    // Even with < 2 trackable fields, if backend reports known_count > 0,
    // show a minimal progress bar so the user sees progress != 0.
    const backendKnown = completeness.known_count || 0;
    if (backendKnown > 0 && defined.length === 0 && missing.length === 0) {
      return {
        percentage: Math.min(backendKnown * 15, 60),
        defined: [],
        missing: [],
        totalFields: backendKnown,
      };
    }
    return null;
  }

  return {
    percentage: Math.round((defined.length / totalFields) * 100),
    defined,
    missing,
    totalFields,
  };
}

export { extractDisplayText, buildCaseProgress, itemToText };

export function adaptLegalResultForDisplay(response) {
  const safeResponse = asObject(response);
  const reasoning = asObject(safeResponse.reasoning);
  const caseStrategy = asObject(safeResponse.case_strategy);
  const proceduralStrategy = asObject(safeResponse.procedural_strategy);
  const normativeReasoning = asObject(safeResponse.normative_reasoning);
  const outputModes = asObject(safeResponse.output_modes);
  const userMode = normalizeMode(outputModes.user);
  const professionalMode = normalizeMode(outputModes.professional);
  const rawResponseText = pickFirstText(safeResponse.response_text);
  const conversational = normalizeConversational(safeResponse.conversational);
  const conversationalResponse = normalizeConversationalResponse(
    safeResponse.conversationalResponse || safeResponse.conversational_response,
  );

  const summary =
    conversational.guided_response ||
    conversational.message ||
    userMode.summary ||
    pickFirstText(reasoning.short_answer, reasoning.case_analysis, rawResponseText);

  const quickStart = userMode.quick_start || pickFirstText(safeResponse.quick_start);
  const whatThisMeans =
    userMode.what_this_means ||
    conversational.guided_response ||
    conversational.message ||
    pickFirstText(caseStrategy.strategic_narrative, summary, rawResponseText);

  const completeness = conversational.case_completeness;
  const criticalCompletenessItems = mapCompletenessList(completeness.missing_critical);
  const optionalCompletenessItems = mapCompletenessList(completeness.missing_optional);
  const knownFactPills = factsToPills(conversational.known_facts);

  const rawPendingClarifications = conversational.missing_facts.length
    ? conversational.missing_facts
    : mergeAndDeduplicate(
        userMode.missing_information,
        professionalMode.critical_missing_information,
        professionalMode.ordinary_missing_information,
        caseStrategy.critical_questions,
        caseStrategy.ordinary_missing_information || caseStrategy.missing_information,
        proceduralStrategy.missing_information,
      );

  const pendingClarifications = filterRoboticPhrases(
    deduplicateItems(rawPendingClarifications.map(itemToText).filter(Boolean)),
  );

  const rawNextSteps = userMode.next_steps.length
    ? userMode.next_steps
    : mergeAndDeduplicate(
        caseStrategy.recommended_actions,
        proceduralStrategy.next_steps,
        professionalMode.recommended_actions,
      );
  const dedupedNextSteps = filterRoboticPhrases(
    deduplicateItems(rawNextSteps.map(itemToText).filter(Boolean)),
  );
  const nextSteps = dedupedNextSteps.filter((item) => !isSameAction(item, quickStart));

  const rawKeyRisks = userMode.key_risks.length
    ? userMode.key_risks
    : mergeAndDeduplicate(
        caseStrategy.risk_analysis,
        proceduralStrategy.risks,
        professionalMode.risk_analysis,
      );
  const keyRisks = filterRoboticPhrases(
    deduplicateItems(rawKeyRisks.map(itemToText).filter(Boolean)),
  );

  const normativeItems = professionalMode.normative_focus.length
    ? professionalMode.normative_focus
    : asArray(normativeReasoning.applied_rules);

  const confidenceExplained =
    userMode.confidence_explained ||
    pickFirstText(professionalMode.confidence_explained);

  const shouldAskFirst = conversational.should_ask_first;
  const mode = shouldAskFirst ? 'clarification' : 'advice';
  const modeLabel = shouldAskFirst ? 'Aclaracion breve' : 'Orientacion inicial';
  const modeDescription = shouldAskFirst
    ? 'AILEX necesita confirmar un punto para que la orientacion visible refleje mejor tu caso.'
    : 'AILEX ya tiene una base suficiente para orientarte con mas detalle.';

  const primaryClarifications = shouldAskFirst
    ? criticalCompletenessItems.length
      ? criticalCompletenessItems.slice(0, 2)
      : pendingClarifications.slice(0, 2)
    : pendingClarifications.slice(0, 4);
  const overflowClarifications = shouldAskFirst
    ? pendingClarifications.filter((item) => !primaryClarifications.includes(item)).slice(0, 4)
    : pendingClarifications.slice(4);

  const primaryNextSteps = nextSteps.slice(0, 3);
  const overflowNextSteps = nextSteps.slice(3);
  const primaryKeyRisks = keyRisks.slice(0, 3);
  const overflowKeyRisks = keyRisks.slice(3);
  const caseProgress = buildCaseProgress(conversational);

  return {
    title:
      userMode.title ||
      professionalMode.title ||
      humanizeDomain(safeResponse.case_domain),
    summary:
      summary ||
      'AILEX no devolvio un resumen claro, pero la respuesta completa sigue disponible.',
    primaryAction: quickStart,
    quickStart,
    whatThisMeans: whatThisMeans || summary || rawResponseText,
    nextSteps,
    keyRisks,
    missingInformation: pendingClarifications,
    confidenceExplained,
    professionalMode,
    rawResponseText,
    rawResponse: safeResponse,
    primaryClarifications,
    overflowClarifications,
    primaryNextSteps,
    overflowNextSteps,
    primaryKeyRisks,
    overflowKeyRisks,
    normativeItems,
    allClarifications: pendingClarifications,
    mode,
    modeLabel,
    modeDescription,
    conversational: {
      ...conversational,
      knownFactPills,
      missingCriticalItems: criticalCompletenessItems,
      missingOptionalItems: optionalCompletenessItems,
      secondaryMissingFacts: overflowClarifications,
      canRefineWithMoreData:
        !criticalCompletenessItems.length && optionalCompletenessItems.length > 0,
      caseProgress,
    },
    conversationalResponse,
  };
}
