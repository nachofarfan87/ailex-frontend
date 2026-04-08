import {
  asArray,
  asObject,
  deduplicateItems,
  extractDisplayText,
  isSameAction,
  normalizeText,
} from './displayTextUtils.js';

function humanizeFieldLabel(value) {
  const field = String(value || '').trim();
  const labels = {
    domicilio_relevante: 'domicilio relevante',
    jurisdiccion: 'la jurisdiccion relevante',
    vinculo: 'vinculo',
  };
  return labels[field] || field.replace(/_/g, ' ');
}

function mapFactToLabel(value) {
  const field = String(value || '').trim();
  const labels = {
    hay_hijos: 'Hijos',
    ingresos: 'Ingresos',
    domicilio_relevante: 'Domicilio relevante',
    jurisdiccion: 'Jurisdiccion relevante',
    vinculo: 'Vinculo',
  };
  return labels[field] || humanizeFieldLabel(field);
}

function formatFactValue(value) {
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => extractDisplayText(item)).filter(Boolean).join(', ');
  }
  return extractDisplayText(value);
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

function humanizeCaseWorkspaceStatus(value) {
  const labels = {
    needs_fact_reconciliation: 'Hay que aclarar un dato clave',
    blocked: 'Hay un freno para avanzar',
    ready_for_execution: 'Ya se puede avanzar',
    ready_for_strategy_decision: 'Ya se puede elegir camino',
    needs_information: 'Falta una aclaracion importante',
    structuring_case: 'Estamos ordenando el caso',
    substantive_review: 'Listo para revision mas profunda',
    intake_in_progress: 'Base inicial del caso',
  };
  const key = String(value || '').trim().toLowerCase();
  return labels[key] || humanizeFieldLabel(key);
}

function humanizeOperatingPhase(value) {
  const labels = {
    clarify_facts: 'Aclarar hechos',
    resolve_conflicts: 'Resolver conflictos',
    define_strategy: 'Definir estrategia',
    prepare_action: 'Preparar accion',
    execute_action: 'Ejecutar accion',
    clarify: 'Aclarar',
    structure: 'Ordenar',
    decide: 'Decidir',
    review: 'Revisar',
    execute: 'Ejecutar',
  };
  return labels[String(value || '').trim().toLowerCase()] || '';
}

function humanizeReviewReadiness(value) {
  const labels = {
    needs_reconciliation: 'No listo para revision',
    limited: 'Revision limitada',
    preliminary: 'Base preliminar',
    reviewable: 'Base revisable',
    decision_ready: 'Listo para decision profesional',
    execution_ready: 'Listo para paso concreto',
  };
  return labels[String(value || '').trim().toLowerCase()] || '';
}

function caseWorkspaceTone(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'ready_for_execution' || status === 'ready_for_strategy_decision') return 'success';
  if (status === 'blocked' || status === 'needs_fact_reconciliation') return 'danger';
  if (status === 'needs_information' || status === 'structuring_case') return 'warning';
  return 'neutral';
}

function caseWorkspaceHelper(value) {
  const status = String(value || '').trim().toLowerCase();
  const messages = {
    needs_fact_reconciliation: 'Conviene resolver primero la inconsistencia que hoy mas condiciona el caso.',
    blocked: 'Antes del siguiente movimiento conviene ordenar el bloqueo actual.',
    ready_for_execution: 'Ya hay base suficiente para pasar a una accion concreta.',
    ready_for_strategy_decision: 'La informacion disponible ya permite comparar vias con prudencia.',
    needs_information: 'Todavia falta una aclaracion que puede cambiar la orientacion practica.',
    structuring_case: 'Ya hay base util, pero todavia conviene ordenar mejor el caso.',
    substantive_review: 'La base actual ya da para una revision profesional mas completa.',
    intake_in_progress: 'Todavia estamos reuniendo la base minima para orientar el caso.',
  };
  return messages[status] || '';
}

function buildWorkspaceFactItem(item, fallbackLabel) {
  const safe = asObject(item);
  const key = String(safe.key || '').trim();
  const label = extractDisplayText(safe.label) || fallbackLabel || mapFactToLabel(key);
  const value = formatFactValue(safe.value);
  const summary = value ? `${label}: ${value}` : label;
  return {
    key: key || label,
    label,
    value,
    summary,
    source: String(safe.source || '').trim(),
    category: String(safe.category || '').trim().toLowerCase(),
    priority: String(safe.priority || '').trim().toLowerCase(),
    purpose: String(safe.purpose || '').trim().toLowerCase(),
  };
}

function buildWorkspaceActionStep(item) {
  const safe = asObject(item);
  const id = String(safe.id || '').trim();
  const title = extractDisplayText(safe.title);
  if (!title) return null;

  return {
    id: id || normalizeText(title).replace(/\s+/g, '_'),
    stepId: String(safe.step_id || safe.id || '').trim() || id || normalizeText(title).replace(/\s+/g, '_'),
    title,
    description: extractDisplayText(safe.description),
    priority: String(safe.priority || 'medium').trim().toLowerCase() || 'medium',
    status: String(safe.status || 'pending').trim().toLowerCase() || 'pending',
    isPrimary: Boolean(safe.is_primary),
    phase: String(safe.phase || '').trim().toLowerCase(),
    phaseLabel: extractDisplayText(safe.phase_label) || humanizeOperatingPhase(safe.phase),
    blockedByMissingInfo: Boolean(safe.blocked_by_missing_info),
    whyNow: extractDisplayText(safe.why_now),
    dependsOn: asArray(safe.depends_on).map((value) => String(value || '').trim()).filter(Boolean),
    whyItMatters: extractDisplayText(safe.why_it_matters),
    sourceHint: extractDisplayText(safe.source_hint),
  };
}

function buildWorkspaceEvidenceItem(item, fallbackLevel) {
  const safe = asObject(item);
  const key = String(safe.key || '').trim();
  const label = extractDisplayText(safe.label);
  if (!label) return null;
  return {
    key: key || normalizeText(label).replace(/\s+/g, '_'),
    label,
    description: extractDisplayText(safe.description),
    reason: extractDisplayText(safe.reason),
    missingLevel: String(safe.missing_level || fallbackLevel || 'recommended').trim().toLowerCase(),
    priorityRank: typeof safe.priority_rank === 'number' ? safe.priority_rank : 0,
    evidenceRole: String(safe.evidence_role || '').trim().toLowerCase(),
    whyItMatters: extractDisplayText(safe.why_it_matters),
    resolves: asArray(safe.resolves).map((item) => String(item || '').trim()).filter(Boolean),
    supportsStep: String(safe.supports_step || '').trim(),
  };
}

export function buildCaseWorkspaceDisplay(response, fallbackNextSteps = [], fallbackMissing = []) {
  const rawWorkspace = asObject(response.case_workspace);
  const conversational = asObject(response.conversational);
  const hasWorkspaceSignals = Boolean(
    rawWorkspace.case_summary ||
      rawWorkspace.case_status ||
      rawWorkspace.operating_phase ||
      asArray(rawWorkspace.facts_confirmed).length ||
      asArray(rawWorkspace.facts_missing).length ||
      asArray(rawWorkspace.action_plan).length ||
      asObject(rawWorkspace.evidence_checklist).critical?.length ||
      asObject(rawWorkspace.evidence_checklist).recommended?.length ||
      asObject(rawWorkspace.evidence_checklist).optional?.length,
  );

  if (!hasWorkspaceSignals) {
    return {
      available: false,
      factsDefined: [],
      factsMissing: [],
      factsConflicting: [],
      actionPlan: [],
      evidenceChecklist: { critical: [], recommended: [], optional: [], total: 0 },
      riskAlerts: [],
      handoff: null,
    };
  }

  const evidenceChecklist = asObject(rawWorkspace.evidence_checklist);
  const factsDefined = asArray(rawWorkspace.facts_confirmed)
    .map((item) => buildWorkspaceFactItem(item))
    .filter((item) => item?.summary);
  const factsMissing = asArray(rawWorkspace.facts_missing)
    .map((item) => buildWorkspaceFactItem(item))
    .filter((item) => item?.label);
  const factsConflicting = asArray(rawWorkspace.facts_conflicting)
    .map((item) => contradictionToUiItem(item))
    .filter((item) => item?.summary);
  const actionPlan = asArray(rawWorkspace.action_plan)
    .map(buildWorkspaceActionStep)
    .filter(Boolean);
  const evidence = {
    critical: asArray(evidenceChecklist.critical)
      .map((item) => buildWorkspaceEvidenceItem(item, 'critical'))
      .filter(Boolean),
    recommended: asArray(evidenceChecklist.recommended)
      .map((item) => buildWorkspaceEvidenceItem(item, 'recommended'))
      .filter(Boolean),
    optional: asArray(evidenceChecklist.optional)
      .map((item) => buildWorkspaceEvidenceItem(item, 'optional'))
      .filter(Boolean),
  };
  const riskAlerts = asArray(rawWorkspace.risk_alerts)
    .map((item) => {
      const safe = asObject(item);
      const message = extractDisplayText(safe.message);
      if (!message) return null;
      return {
        message,
        severity: String(safe.severity || '').trim().toLowerCase(),
        type: String(safe.type || '').trim().toLowerCase(),
      };
    })
    .filter(Boolean);

  const recommendedNextQuestion = extractDisplayText(rawWorkspace.recommended_next_question);
  const conversationalQuestion = extractDisplayText(conversational.question);
  const primaryMissing = [
    ...factsConflicting.map((item) => item.summary),
    ...factsMissing
      .filter((item) => item.category !== 'optional')
      .map((item) => item.label),
  ];
  const dedupedMissing = deduplicateItems([
    ...primaryMissing,
    ...fallbackMissing,
  ]);
  const quickActions = actionPlan.length
    ? actionPlan
    : fallbackNextSteps.slice(0, 3).map((text, index) => ({
        id: `fallback_step_${index + 1}`,
        title: text,
        description: text,
        priority: index === 0 ? 'high' : 'medium',
        status: 'pending',
        isPrimary: index === 0,
        phase: 'prepare',
        phaseLabel: 'Ordenar',
        blockedByMissingInfo: false,
        dependsOn: [],
        whyItMatters: '',
        sourceHint: 'fallback.next_steps',
      }));

  const handoffRaw = asObject(rawWorkspace.professional_handoff);
  const handoffHasSignals = Boolean(
    handoffRaw.ready_for_professional_review ||
      extractDisplayText(handoffRaw.suggested_focus) ||
      extractDisplayText(handoffRaw.recommended_professional_focus) ||
      extractDisplayText(handoffRaw.primary_friction) ||
      asArray(handoffRaw.open_items).length ||
      extractDisplayText(handoffRaw.handoff_reason),
  );
  const effectiveNextQuestion =
    conversationalQuestion && isSameAction(recommendedNextQuestion, conversationalQuestion)
      ? ''
      : recommendedNextQuestion;
  const evidenceTotal =
    evidence.critical.length + evidence.recommended.length + evidence.optional.length;
  const stepTitleById = Object.fromEntries(
    quickActions.map((step) => [String(step.stepId || step.id || ''), step.title]).filter(([key]) => key),
  );
  const linkedEvidence = {
    critical: evidence.critical.map((item) => ({
      ...item,
      supportsStepTitle: stepTitleById[item.supportsStep] || '',
    })),
    recommended: evidence.recommended.map((item) => ({
      ...item,
      supportsStepTitle: stepTitleById[item.supportsStep] || '',
    })),
    optional: evidence.optional.map((item) => ({
      ...item,
      supportsStepTitle: stepTitleById[item.supportsStep] || '',
    })),
  };
  const hasSubstantivePanelSignal = Boolean(
    factsDefined.length ||
      factsMissing.length ||
      factsConflicting.length ||
      quickActions.length ||
      evidenceTotal ||
      riskAlerts.length ||
      handoffHasSignals,
  );
  const showDuringClarification = Boolean(
    evidenceTotal ||
      riskAlerts.length ||
      (handoffHasSignals && asArray(handoffRaw.open_items).length) ||
      quickActions.length > 1,
  );

  return {
    available: true,
    shouldRenderPanel: hasSubstantivePanelSignal,
    showDuringClarification,
    caseId: String(rawWorkspace.case_id || '').trim(),
    workspaceVersion: String(rawWorkspace.workspace_version || '').trim(),
    status: {
      key: String(rawWorkspace.case_status || '').trim(),
      label:
        extractDisplayText(rawWorkspace.case_status_label) ||
        humanizeCaseWorkspaceStatus(rawWorkspace.case_status),
      tone: caseWorkspaceTone(rawWorkspace.case_status),
      helper:
        extractDisplayText(rawWorkspace.case_status_helper) ||
        caseWorkspaceHelper(rawWorkspace.case_status),
    },
    phase: {
      key:
        String(rawWorkspace.recommended_phase || rawWorkspace.operating_phase || '').trim(),
      label:
        extractDisplayText(rawWorkspace.recommended_phase_label) ||
        humanizeOperatingPhase(rawWorkspace.recommended_phase || rawWorkspace.operating_phase),
      reason: extractDisplayText(rawWorkspace.operating_phase_reason),
    },
    primaryFocus: {
      type: String(asObject(rawWorkspace.primary_focus).type || '').trim(),
      label: extractDisplayText(asObject(rawWorkspace.primary_focus).label),
      reason: extractDisplayText(asObject(rawWorkspace.primary_focus).reason),
    },
    summary:
      extractDisplayText(rawWorkspace.case_summary) ||
      extractDisplayText(response.visible_summary) ||
      '',
    factsDefined,
    factsMissing,
    factsConflicting,
    primaryDefinedFacts: factsDefined.slice(0, 4),
    overflowDefinedFacts: factsDefined.slice(4),
    primaryMissingFacts: dedupedMissing.slice(0, 4),
    overflowMissingFacts: dedupedMissing.slice(4),
    actionPlan: quickActions,
    primaryActionPlan: quickActions.slice(0, 3),
    overflowActionPlan: quickActions.slice(3),
    evidenceChecklist: {
      ...linkedEvidence,
      total: evidenceTotal,
    },
    riskAlerts,
    recommendedNextQuestion: effectiveNextQuestion,
    nextQuestion: effectiveNextQuestion || extractDisplayText(handoffRaw.next_question),
    handoff: handoffHasSignals
      ? {
          readyForProfessionalReview: Boolean(handoffRaw.ready_for_professional_review),
          reviewReadiness: String(handoffRaw.review_readiness || '').trim().toLowerCase(),
          reviewReadinessLabel: humanizeReviewReadiness(handoffRaw.review_readiness),
          reason: extractDisplayText(handoffRaw.handoff_reason),
          primaryFriction: extractDisplayText(handoffRaw.primary_friction),
          professionalEntryPoint: extractDisplayText(handoffRaw.professional_entry_point),
          focus:
            extractDisplayText(handoffRaw.recommended_professional_focus) ||
            extractDisplayText(handoffRaw.suggested_focus),
          openItems: asArray(handoffRaw.open_items).map((item) => extractDisplayText(item)).filter(Boolean),
          summary:
            extractDisplayText(handoffRaw.summary_for_professional) ||
            extractDisplayText(rawWorkspace.case_summary),
          nextQuestion:
            extractDisplayText(handoffRaw.next_question) || effectiveNextQuestion,
        }
      : null,
    lastUpdatedAt: String(rawWorkspace.last_updated_at || '').trim(),
    hasMeaningfulMissing:
      dedupedMissing.length > 0 ||
      fallbackMissing.length > 0 ||
      Boolean(effectiveNextQuestion),
  };
}
