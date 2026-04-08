import {
  asArray,
  asObject,
  deduplicateItems,
  extractDisplayText,
  normalizeText,
  textLooksRedundant,
} from './displayTextUtils.js';

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
    'divorcio_modalidad/hay_acuerdo': 'Modalidad o acuerdo',
    'situacion_economica/urgencia/hay_ingresos': 'Situacion economica o urgencia',
  };
  return labels[field] || humanizeFieldLabel(field);
}

export function factsToPills(facts) {
  const safeFacts = asObject(facts);
  const pills = [];

  const modalidad = String(safeFacts.divorcio_modalidad || '').trim();
  if (modalidad) pills.push(`Divorcio ${modalidad}`);
  if (typeof safeFacts.hay_hijos === 'boolean') pills.push(safeFacts.hay_hijos ? 'Hay hijos' : 'No hay hijos');
  if (typeof safeFacts.hay_acuerdo === 'boolean') pills.push(safeFacts.hay_acuerdo ? 'Hay acuerdo' : 'Sin acuerdo');

  const rolProcesal = String(safeFacts.rol_procesal || '').trim();
  if (rolProcesal) pills.push(`Rol: ${rolProcesal}`);
  if (typeof safeFacts.urgencia === 'boolean' && safeFacts.urgencia) pills.push('Hay urgencia');
  if (typeof safeFacts.cese_convivencia === 'boolean') pills.push(safeFacts.cese_convivencia ? 'Cese de convivencia' : 'Siguen conviviendo');
  if (typeof safeFacts.hay_bienes === 'boolean') pills.push(safeFacts.hay_bienes ? 'Hay bienes' : 'Sin bienes relevantes');
  if (typeof safeFacts.vivienda_familiar === 'boolean' && safeFacts.vivienda_familiar) pills.push('Vivienda familiar');
  if (typeof safeFacts.convenio_regulador === 'boolean' && safeFacts.convenio_regulador) pills.push('Hay convenio regulador');
  if (typeof safeFacts.alimentos_definidos === 'boolean' && safeFacts.alimentos_definidos) pills.push('Alimentos definidos');

  const cuotaAlimentaria = String(safeFacts.cuota_alimentaria_porcentaje || '').trim();
  if (cuotaAlimentaria) pills.push(`Cuota: ${cuotaAlimentaria} del sueldo`);
  if (typeof safeFacts.regimen_comunicacional === 'boolean' && safeFacts.regimen_comunicacional) pills.push('Regimen comunicacional');

  const frecuenciaComunicacion = String(safeFacts.regimen_comunicacional_frecuencia || '').trim();
  if (frecuenciaComunicacion) pills.push(`Comunicacion: ${frecuenciaComunicacion}`);

  const situacionEconomica = String(safeFacts.situacion_economica || '').trim();
  if (situacionEconomica) pills.push(`Situacion economica: ${situacionEconomica}`);
  if (typeof safeFacts.hay_ingresos === 'boolean') pills.push(safeFacts.hay_ingresos ? 'Hay ingresos identificables' : 'No se identifican ingresos');

  return deduplicateItems(pills);
}

export function mapCompletenessList(items) {
  return deduplicateItems(asArray(items).map(humanizeFieldLabel));
}

function isMeaningfulFactValue(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return Boolean(value.trim());
  return value !== null && value !== undefined;
}

export function buildCaseProgress(conversational) {
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

function humanizeCaseStage(value) {
  const labels = {
    exploracion: 'Exploracion',
    estructuracion: 'Ordenando el caso',
    decision: 'Definiendo la estrategia',
    ejecucion: 'Listo para avanzar',
    bloqueado: 'Caso bloqueado',
    inconsistente: 'Caso inconsistente',
  };
  const key = String(value || '').trim().toLowerCase();
  return labels[key] || humanizeFieldLabel(key);
}

function humanizeReadiness(value) {
  const labels = {
    low: 'Base todavia preliminar',
    medium: 'Base razonable',
    high: 'Base solida',
  };
  return labels[String(value || '').trim().toLowerCase()] || '';
}

function humanizeProgressStatus(value) {
  const labels = {
    initial: 'Recien iniciado',
    advancing: 'Avanzando',
    stalled: 'Avance con cautela',
    ready: 'Listo para el siguiente paso',
    blocked: 'Necesita destrabe',
  };
  return labels[String(value || '').trim().toLowerCase()] || '';
}

function humanizeNextStepType(value) {
  const labels = {
    ask: 'Conviene preguntar un punto clave',
    orient: 'Conviene ordenar y orientar',
    decide: 'Conviene elegir camino',
    execute: 'Conviene pasar a la accion',
    resolve_contradiction: 'Conviene resolver una contradiccion',
  };
  return labels[String(value || '').trim().toLowerCase()] || '';
}

function safePercentage(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gapToUiItem(item) {
  const safe = asObject(item);
  const key = String(safe.key || safe.need_key || '').trim();
  const label = extractDisplayText(safe.label) || humanizeFieldLabel(key);
  return {
    key: key || label,
    label,
    priority: String(safe.priority || '').trim().toLowerCase(),
    purpose: String(safe.purpose || safe.category || '').trim().toLowerCase(),
    source: String(safe.source || '').trim().toLowerCase(),
  };
}

function contradictionToUiItem(item) {
  const safe = asObject(item);
  const key = String(safe.key || '').trim();
  const label = humanizeFieldLabel(key);
  const prevValue = extractDisplayText(safe.prev_value);
  const nextValue = extractDisplayText(safe.new_value);
  const summary = prevValue && nextValue
    ? `${label}: aparece como "${prevValue}" y tambien como "${nextValue}"`
    : label;
  return {
    key: key || summary,
    label,
    summary,
  };
}

function blockerToUiItem(item) {
  const safe = asObject(item);
  const reason = extractDisplayText(safe.reason);
  const type = String(safe.type || safe.key || '').trim();
  const summary = reason || humanizeFieldLabel(type);
  return {
    key: type || summary,
    summary,
    severity: String(safe.severity || '').trim().toLowerCase(),
  };
}

function findQuestionTarget(question, candidates) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return null;

  for (const candidate of candidates) {
    const safeCandidate = asObject(candidate);
    const label = String(safeCandidate.label || '').trim();
    const key = String(safeCandidate.key || '').trim();
    const purpose = String(safeCandidate.purpose || '').trim();
    const haystack = [label, key, purpose]
      .map(normalizeText)
      .filter(Boolean);

    if (haystack.some((item) => item && normalizedQuestion.includes(item))) {
      return safeCandidate;
    }

    const keyWords = normalizeText(key).split(' ').filter(Boolean);
    if (keyWords.length && keyWords.some((word) => word.length >= 4 && normalizedQuestion.includes(word))) {
      return safeCandidate;
    }
  }

  return null;
}

function buildFocusLabel({ contradictions, criticalGaps, stage, nextStepType, blockers, readinessLabel }) {
  if (contradictions.length) return 'Antes de avanzar, conviene resolver una inconsistencia.';
  if (criticalGaps.length) return 'Lo mas importante ahora es completar los datos clave del caso.';
  if (stage === 'decision' && !criticalGaps.length) return 'El caso ya permite comparar opciones y decidir.';
  if ((stage === 'ejecucion' || nextStepType === 'execute') && !blockers.length && readinessLabel === 'high') {
    return 'El caso esta listo para avanzar con acciones concretas.';
  }
  if (stage === 'estructuracion') return 'Lo mas importante ahora es ordenar la informacion util del caso.';
  if (stage === 'exploracion') return 'Todavia estamos reuniendo la base inicial del caso.';
  return '';
}

function buildCaseDirection({ contradictions, criticalGaps, stage, nextStepType, blockers, readinessLabel }) {
  if (contradictions.length) return 'Antes de avanzar, es clave resolver las inconsistencias del caso.';
  if (criticalGaps.length) return 'El foco ahora esta en completar la informacion necesaria para poder avanzar con seguridad.';
  if (stage === 'decision' && !criticalGaps.length) return 'El caso ya tiene base suficiente para evaluar opciones y tomar una decision.';
  if ((stage === 'ejecucion' || nextStepType === 'execute') && !blockers.length && readinessLabel === 'high') {
    return 'El caso esta listo para avanzar con acciones concretas.';
  }
  if (stage === 'estructuracion') return 'Ahora conviene ordenar los datos utiles para darle direccion al caso.';
  if (stage === 'exploracion') return 'Todavia estamos construyendo la base minima para orientar el caso.';
  return '';
}

export function buildCaseProgressSnapshot(response, conversational, fallbackProgress) {
  const progress = asObject(response.case_progress);
  const narrative = asObject(response.case_progress_narrative);
  const snapshot = asObject(response.case_progress_snapshot);
  const knownFactPills = factsToPills(conversational.known_facts);
  const criticalGaps = asArray(progress.critical_gaps).map(gapToUiItem).filter((item) => item.label);
  const importantGaps = asArray(progress.important_gaps).map(gapToUiItem).filter((item) => item.label);
  const blockers = asArray(progress.blocking_issues).map(blockerToUiItem).filter((item) => item.summary);
  const contradictions = asArray(progress.contradictions).map(contradictionToUiItem).filter((item) => item.summary);
  const followupQuestion = extractDisplayText(conversational.question);

  const stage = String(progress.stage || snapshot.stage || '').trim().toLowerCase();
  const readinessLabel = String(progress.readiness_label || snapshot.readiness_label || '').trim().toLowerCase();
  const progressStatus = String(progress.progress_status || snapshot.progress_status || '').trim().toLowerCase();
  const nextStepType = String(progress.next_step_type || snapshot.next_step_type || '').trim().toLowerCase();
  const hasBackendProgress =
    Boolean(stage || readinessLabel || progressStatus || nextStepType) ||
    criticalGaps.length > 0 ||
    importantGaps.length > 0 ||
    blockers.length > 0 ||
    contradictions.length > 0;

  if (!hasBackendProgress && !fallbackProgress) return null;

  const primaryGap = criticalGaps[0] || importantGaps[0] || null;
  const fallbackPercentage = fallbackProgress?.percentage ?? null;
  const readinessPercentage =
    typeof progress.readiness_level === 'number' ? safePercentage(progress.readiness_level * 100) : null;
  const percentage = readinessPercentage ?? fallbackPercentage ?? 0;
  const clarifiedItems = fallbackProgress?.defined?.map((item) => item.label) || knownFactPills;
  const clarifiedPreview = deduplicateItems(clarifiedItems).slice(0, 4);
  const title =
    stage === 'inconsistente'
      ? 'Antes de avanzar, conviene ordenar una inconsistencia'
      : stage === 'bloqueado'
        ? 'Hay un freno que conviene destrabar'
        : stage === 'decision'
          ? 'El caso ya esta en etapa de decision'
          : stage === 'ejecucion'
            ? 'El caso ya permite avanzar de forma concreta'
            : 'Asi esta el caso ahora';
  const rawSummary =
    extractDisplayText(narrative.contradiction_block) ||
    extractDisplayText(narrative.priority_block) ||
    extractDisplayText(narrative.progress_block) ||
    (nextStepType === 'resolve_contradiction'
      ? 'Hay informacion contradictoria y lo mas util ahora es aclarar ese punto.'
      : nextStepType === 'ask'
        ? 'Todavia falta una pieza sensible para seguir con seguridad.'
        : nextStepType === 'decide'
          ? 'Ya hay base para comparar caminos y elegir el encuadre mas conveniente.'
          : nextStepType === 'execute'
            ? criticalGaps.length
              ? 'Ya se puede avanzar, pero todavia queda un dato sensible por consolidar.'
              : 'Ya hay base suficiente para pasar a pasos concretos.'
            : 'El caso tiene una base conversacional util para seguir avanzando.');

  const rawFocusLabel = buildFocusLabel({ contradictions, criticalGaps, stage, nextStepType, blockers, readinessLabel });
  const rawCaseDirection = buildCaseDirection({ contradictions, criticalGaps, stage, nextStepType, blockers, readinessLabel });
  const nextStepLabel = humanizeNextStepType(nextStepType);
  const rawNextStepReason =
    extractDisplayText(narrative.priority_block) ||
    (contradictions.length
      ? 'Hay informacion contradictoria que conviene resolver antes de seguir.'
      : criticalGaps.length
        ? 'Este dato es necesario para poder avanzar sin errores.'
        : nextStepType === 'decide'
          ? 'Ya hay base suficiente para comparar opciones.'
          : nextStepType === 'execute'
            ? 'Ya hay base suficiente para avanzar con acciones concretas.'
            : '');
  const questionTarget = findQuestionTarget(followupQuestion, criticalGaps) || findQuestionTarget(followupQuestion, importantGaps);
  const rawQuestionTargetHint =
    followupQuestion && questionTarget ? `Esta pregunta apunta a definir ${questionTarget.label}.` : '';
  const caseDirection = rawCaseDirection;
  const shouldSuppressFocusByMode =
    Boolean(caseDirection) &&
    !contradictions.length &&
    !criticalGaps.length &&
    ['decide', 'execute'].includes(nextStepType);
  const focusLabel =
    shouldSuppressFocusByMode || textLooksRedundant(rawFocusLabel, [caseDirection]) ? '' : rawFocusLabel;
  const shouldSuppressNextStepReasonByMode =
    (nextStepType === 'decide' && Boolean(caseDirection || focusLabel)) ||
    (nextStepType === 'execute' &&
      Boolean(caseDirection || focusLabel) &&
      !criticalGaps.length &&
      !contradictions.length);
  const summary = textLooksRedundant(rawSummary, [caseDirection, focusLabel]) ? '' : rawSummary;
  const nextStepReason =
    shouldSuppressNextStepReasonByMode ||
    textLooksRedundant(rawNextStepReason, [caseDirection, focusLabel, summary])
      ? ''
      : rawNextStepReason;
  const questionTargetHint = textLooksRedundant(rawQuestionTargetHint, [
    caseDirection,
    focusLabel,
    summary,
    nextStepReason,
  ])
    ? ''
    : rawQuestionTargetHint;
  const followupDirectionHint =
    followupQuestion &&
    !textLooksRedundant(
      'Esta pregunta sigue la direccion actual del caso y busca destrabar el punto prioritario.',
      [caseDirection, focusLabel, nextStepReason, questionTargetHint],
    )
      ? 'Esta pregunta sigue la direccion actual del caso y busca destrabar el punto prioritario.'
      : '';
  const stageLabel = humanizeCaseStage(stage);
  const readinessText = humanizeReadiness(readinessLabel);
  const progressStatusText = humanizeProgressStatus(progressStatus);
  const statusTone =
    contradictions.length || stage === 'inconsistente'
      ? 'warning'
      : blockers.length || progressStatus === 'blocked'
        ? 'danger'
        : criticalGaps.length
          ? 'warning'
          : progressStatus === 'ready' || stage === 'ejecucion'
            ? 'success'
            : 'neutral';

  return {
    available: true,
    title,
    summary,
    caseDirection,
    focusLabel,
    percentage,
    stage,
    stageLabel,
    readinessLabel,
    readinessText,
    progressStatus,
    progressStatusText,
    nextStepType,
    nextStepLabel,
    nextStepReason,
    statusTone,
    contradictionCount:
      typeof progress.contradiction_count === 'number' ? progress.contradiction_count : contradictions.length,
    blockers,
    contradictions,
    criticalGaps,
    importantGaps,
    primaryGap,
    followupQuestion,
    followupDirectionHint,
    questionTargetHint,
    clarifiedItems: clarifiedPreview,
    fallbackProgress,
    narrativeHighlights: [
      extractDisplayText(narrative.opening),
      extractDisplayText(narrative.known_block),
      extractDisplayText(narrative.missing_block),
    ].filter(Boolean),
  };
}
