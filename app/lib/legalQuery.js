function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function extractDisplayText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(extractDisplayText).filter(Boolean).join('; ');
  }
  if (typeof value === 'object') {
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
    return extractDisplayText(candidate);
  }
  return '';
}

function normalizeOutputMode(mode) {
  const safeMode = asObject(mode);
  return {
    title: String(safeMode.title || ''),
    summary: String(safeMode.summary || ''),
    quick_start: String(safeMode.quick_start || ''),
    what_this_means: String(safeMode.what_this_means || ''),
    next_steps: asArray(safeMode.next_steps),
    key_risks: asArray(safeMode.key_risks),
    missing_information: asArray(safeMode.missing_information),
    confidence_explained: String(safeMode.confidence_explained || ''),
    strategic_narrative: String(safeMode.strategic_narrative || ''),
    conflict_summary: asArray(safeMode.conflict_summary),
    recommended_actions: asArray(safeMode.recommended_actions),
    risk_analysis: asArray(safeMode.risk_analysis),
    procedural_focus: asArray(safeMode.procedural_focus),
    critical_missing_information: asArray(safeMode.critical_missing_information),
    ordinary_missing_information: asArray(safeMode.ordinary_missing_information),
    normative_focus: asArray(safeMode.normative_focus),
  };
}

function normalizeCaseCompleteness(value) {
  const safeValue = asObject(value);
  return {
    is_complete: Boolean(safeValue.is_complete),
    missing_critical: asArray(safeValue.missing_critical),
    missing_optional: asArray(safeValue.missing_optional),
    confidence_level: String(safeValue.confidence_level || ''),
    known_count: typeof safeValue.known_count === 'number' ? safeValue.known_count : 0,
  };
}

function normalizeConversational(value) {
  const safeValue = asObject(value);
  const knownFacts = asObject(safeValue.known_facts);

  return {
    message: extractDisplayText(safeValue.message),
    question: extractDisplayText(safeValue.question),
    options: asArray(safeValue.options).map(extractDisplayText).filter(Boolean),
    missing_facts: asArray(safeValue.missing_facts).map(extractDisplayText).filter(Boolean),
    next_step: extractDisplayText(safeValue.next_step),
    should_ask_first: Boolean(safeValue.should_ask_first),
    guided_response: extractDisplayText(safeValue.guided_response),
    known_facts: knownFacts,
    clarification_status: String(safeValue.clarification_status || ''),
    asked_questions: asArray(safeValue.asked_questions).map(extractDisplayText).filter(Boolean),
    case_completeness: normalizeCaseCompleteness(safeValue.case_completeness),
  };
}

function normalizeConversationalResponse(value) {
  const safeValue = asObject(value);
  const rawMessages = asArray(safeValue.messages);
  return {
    mode: String(safeValue.mode || '').trim(),
    domain: String(safeValue.domain || '').trim(),
    messages: rawMessages
      .map((item) => {
        const safeItem = asObject(item);
        const type = String(safeItem.type || '').trim();
        const text = extractDisplayText(safeItem.text);
        if (!type || !text) return null;
        return { type, text };
      })
      .filter(Boolean),
    primary_question: extractDisplayText(safeValue.primary_question),
  };
}

function normalizeCaseProgress(value) {
  const safeValue = asObject(value);
  const basis = asObject(safeValue.basis);
  return {
    stage: String(safeValue.stage || '').trim(),
    readiness_level:
      typeof safeValue.readiness_level === 'number' ? safeValue.readiness_level : null,
    readiness_label: String(safeValue.readiness_label || '').trim(),
    progress_status: String(safeValue.progress_status || '').trim(),
    next_step_type: String(safeValue.next_step_type || '').trim(),
    blocking_issues: asArray(safeValue.blocking_issues),
    critical_gaps: asArray(safeValue.critical_gaps),
    important_gaps: asArray(safeValue.important_gaps),
    contradictions: asArray(safeValue.contradictions),
    contradiction_count:
      typeof safeValue.contradiction_count === 'number' ? safeValue.contradiction_count : 0,
    has_contradictions: Boolean(safeValue.has_contradictions),
    progress_delta: String(safeValue.progress_delta || '').trim(),
    basis,
  };
}

function normalizeCaseProgressNarrative(value) {
  const safeValue = asObject(value);
  return {
    applies: Boolean(safeValue.applies),
    opening: extractDisplayText(safeValue.opening),
    known_block: extractDisplayText(safeValue.known_block),
    contradiction_block: extractDisplayText(safeValue.contradiction_block),
    missing_block: extractDisplayText(safeValue.missing_block),
    progress_block: extractDisplayText(safeValue.progress_block),
    priority_block: extractDisplayText(safeValue.priority_block),
  };
}

function normalizeCaseWorkspaceFact(value) {
  const safeValue = asObject(value);
  return {
    key: String(safeValue.key || '').trim(),
    label: extractDisplayText(safeValue.label),
    value: safeValue.value,
    source: String(safeValue.source || '').trim(),
    confidence:
      typeof safeValue.confidence === 'number' ? safeValue.confidence : null,
    category: String(safeValue.category || '').trim(),
    priority: String(safeValue.priority || '').trim(),
    purpose: String(safeValue.purpose || '').trim(),
  };
}

function normalizeCaseWorkspaceConflict(value) {
  const safeValue = asObject(value);
  return {
    key: String(safeValue.key || '').trim(),
    label: extractDisplayText(safeValue.label),
    prev_value: safeValue.prev_value,
    new_value: safeValue.new_value,
    detected_at:
      typeof safeValue.detected_at === 'number' ? safeValue.detected_at : null,
  };
}

function normalizeCaseWorkspaceAction(value) {
  const safeValue = asObject(value);
  return {
    id: String(safeValue.id || '').trim(),
    step_id: String(safeValue.step_id || safeValue.id || '').trim(),
    title: extractDisplayText(safeValue.title),
    description: extractDisplayText(safeValue.description),
    priority: String(safeValue.priority || '').trim(),
    status: String(safeValue.status || '').trim(),
    is_primary: Boolean(safeValue.is_primary),
    phase: String(safeValue.phase || '').trim(),
    phase_label: extractDisplayText(safeValue.phase_label),
    blocked_by_missing_info: Boolean(safeValue.blocked_by_missing_info),
    why_now: extractDisplayText(safeValue.why_now),
    depends_on: asArray(safeValue.depends_on).map((item) => String(item || '').trim()).filter(Boolean),
    why_it_matters: extractDisplayText(safeValue.why_it_matters),
    source_hint: extractDisplayText(safeValue.source_hint),
  };
}

function normalizeCaseWorkspaceEvidenceItem(value) {
  const safeValue = asObject(value);
  return {
    key: String(safeValue.key || '').trim(),
    label: extractDisplayText(safeValue.label),
    description: extractDisplayText(safeValue.description),
    reason: extractDisplayText(safeValue.reason),
    missing_level: String(safeValue.missing_level || '').trim(),
    priority_rank:
      typeof safeValue.priority_rank === 'number' ? safeValue.priority_rank : 0,
    evidence_role: String(safeValue.evidence_role || '').trim(),
    why_it_matters: extractDisplayText(safeValue.why_it_matters),
    resolves: asArray(safeValue.resolves).map((item) => String(item || '').trim()).filter(Boolean),
    supports_step: String(safeValue.supports_step || '').trim(),
  };
}

function normalizeCaseWorkspaceEvidenceChecklist(value) {
  const safeValue = asObject(value);
  return {
    critical: asArray(safeValue.critical).map(normalizeCaseWorkspaceEvidenceItem),
    recommended: asArray(safeValue.recommended).map(normalizeCaseWorkspaceEvidenceItem),
    optional: asArray(safeValue.optional).map(normalizeCaseWorkspaceEvidenceItem),
  };
}

function normalizeProfessionalHandoff(value) {
  const safeValue = asObject(value);
  return {
    ready_for_professional_review: Boolean(safeValue.ready_for_professional_review),
    status: String(safeValue.status || '').trim(),
    review_readiness: String(safeValue.review_readiness || '').trim(),
    handoff_reason: extractDisplayText(safeValue.handoff_reason),
    primary_friction: extractDisplayText(safeValue.primary_friction),
    recommended_professional_focus: extractDisplayText(
      safeValue.recommended_professional_focus,
    ),
    professional_entry_point: extractDisplayText(safeValue.professional_entry_point),
    suggested_focus: extractDisplayText(safeValue.suggested_focus),
    open_items: asArray(safeValue.open_items).map(extractDisplayText).filter(Boolean),
    next_question: extractDisplayText(safeValue.next_question),
    summary_for_professional: extractDisplayText(safeValue.summary_for_professional),
  };
}

function normalizeCaseWorkspace(value) {
  const safeValue = asObject(value);
  const strategySnapshot = asObject(safeValue.strategy_snapshot);

  return {
    case_id: String(safeValue.case_id || '').trim(),
    workspace_version: String(safeValue.workspace_version || '').trim(),
    case_status: String(safeValue.case_status || '').trim(),
    case_status_label: extractDisplayText(safeValue.case_status_label),
    case_status_helper: extractDisplayText(safeValue.case_status_helper),
    operating_phase: String(safeValue.operating_phase || '').trim(),
    recommended_phase: String(safeValue.recommended_phase || '').trim(),
    recommended_phase_label: extractDisplayText(safeValue.recommended_phase_label),
    operating_phase_reason: extractDisplayText(safeValue.operating_phase_reason),
    primary_focus: asObject(safeValue.primary_focus),
    case_summary: extractDisplayText(safeValue.case_summary),
    facts_confirmed: asArray(safeValue.facts_confirmed).map(normalizeCaseWorkspaceFact),
    facts_missing: asArray(safeValue.facts_missing).map(normalizeCaseWorkspaceFact),
    facts_conflicting: asArray(safeValue.facts_conflicting).map(normalizeCaseWorkspaceConflict),
    strategy_snapshot: {
      strategy_mode: String(strategySnapshot.strategy_mode || '').trim(),
      response_goal: extractDisplayText(strategySnapshot.response_goal),
      reason: extractDisplayText(strategySnapshot.reason),
      output_mode: String(strategySnapshot.output_mode || '').trim(),
      recommended_tone: String(strategySnapshot.recommended_tone || '').trim(),
      recommended_structure: String(strategySnapshot.recommended_structure || '').trim(),
      allow_followup: Boolean(strategySnapshot.allow_followup),
      prioritize_action: Boolean(strategySnapshot.prioritize_action),
    },
    action_plan: asArray(safeValue.action_plan).map(normalizeCaseWorkspaceAction),
    evidence_checklist: normalizeCaseWorkspaceEvidenceChecklist(safeValue.evidence_checklist),
    risk_alerts: asArray(safeValue.risk_alerts).map((item) => {
      const safeItem = asObject(item);
      return {
        type: String(safeItem.type || '').trim(),
        severity: String(safeItem.severity || '').trim(),
        message: extractDisplayText(safeItem.message),
        source: String(safeItem.source || '').trim(),
      };
    }),
    recommended_next_question: extractDisplayText(safeValue.recommended_next_question),
    professional_handoff: normalizeProfessionalHandoff(safeValue.professional_handoff),
    last_updated_at: String(safeValue.last_updated_at || '').trim(),
  };
}

export function normalizeLegalQueryResponse(payload = {}) {
  const safePayload = asObject(payload);
  const reasoning = asObject(safePayload.reasoning);
  const citationValidation = asObject(safePayload.citation_validation);
  const hallucinationGuard = asObject(safePayload.hallucination_guard);
  const proceduralStrategy = asObject(safePayload.procedural_strategy);
  const legalStrategy = asObject(safePayload.legal_strategy);
  const caseProfile = asObject(safePayload.case_profile || legalStrategy.case_profile);
  const caseStrategy = asObject(safePayload.case_strategy || legalStrategy.case_strategy);
  const normativeReasoning = asObject(safePayload.normative_reasoning);
  const outputModes = asObject(safePayload.output_modes);
  const caseProgress = normalizeCaseProgress(safePayload.case_progress);
  const caseProgressSnapshot = asObject(safePayload.case_progress_snapshot);
  const caseProgressNarrative = normalizeCaseProgressNarrative(
    safePayload.case_progress_narrative,
  );

  const caseDomain = String(
    safePayload.case_domain || legalStrategy.case_domain || caseProfile.case_domain || '',
  ).trim();
  const caseDomains = asArray(
    safePayload.case_domains || legalStrategy.case_domains || caseProfile.case_domains,
  ).filter(Boolean);

  const summaryText = pickFirstText(
    caseStrategy.strategic_narrative,
    reasoning.short_answer,
    reasoning.case_analysis,
    reasoning.applied_analysis,
  );

  const normalized = {
    query: String(safePayload.query || ''),
    jurisdiction: String(safePayload.jurisdiction || ''),
    forum: String(safePayload.forum || ''),
    case_domain: caseDomain,
    case_domains: caseDomains,
    retrieved_items: asArray(safePayload.retrieved_items),
    context: asObject(safePayload.context),
    reasoning: {
      short_answer: String(reasoning.short_answer || ''),
      case_analysis: String(reasoning.case_analysis || ''),
      applied_analysis: String(reasoning.applied_analysis || ''),
      normative_foundations: asArray(reasoning.normative_foundations),
      warnings: asArray(reasoning.warnings),
      citations_used: asArray(reasoning.citations_used),
      confidence_score:
        typeof reasoning.confidence_score === 'number'
          ? reasoning.confidence_score
          : typeof reasoning.confidence === 'number'
            ? reasoning.confidence
            : null,
    },
    normative_reasoning: {
      summary: String(normativeReasoning.summary || ''),
      inferences: asArray(normativeReasoning.inferences),
      requirements: asArray(normativeReasoning.requirements),
      applied_rules: asArray(normativeReasoning.applied_rules),
      unresolved_issues: asArray(normativeReasoning.unresolved_issues),
      warnings: asArray(normativeReasoning.warnings),
    },
    citation_validation: {
      valid_citations: asArray(citationValidation.valid_citations || citationValidation.valid),
      invalid_citations: asArray(citationValidation.invalid_citations || citationValidation.invalid),
      warnings: asArray(citationValidation.warnings),
    },
    hallucination_guard: {
      is_safe:
        typeof hallucinationGuard.is_safe === "boolean" ? hallucinationGuard.is_safe : null,
      warnings: asArray(hallucinationGuard.warnings),
      severity: String(hallucinationGuard.severity || ''),
      confidence_adjustment:
        typeof hallucinationGuard.confidence_adjustment === 'number'
          ? hallucinationGuard.confidence_adjustment
          : null,
    },
    procedural_strategy: {
      next_steps: asArray(proceduralStrategy.next_steps),
      risks: asArray(proceduralStrategy.risks),
      missing_information: asArray(
        proceduralStrategy.missing_information || proceduralStrategy.missing_info,
      ),
      steps: asArray(proceduralStrategy.steps),
    },
    case_profile: caseProfile,
    case_strategy: {
      strategic_narrative: String(caseStrategy.strategic_narrative || ''),
      conflict_summary: asArray(caseStrategy.conflict_summary),
      risk_analysis: asArray(caseStrategy.risk_analysis),
      recommended_actions: asArray(caseStrategy.recommended_actions),
      procedural_focus: asArray(caseStrategy.procedural_focus),
      secondary_domain_notes: asArray(caseStrategy.secondary_domain_notes),
      critical_questions: asArray(caseStrategy.critical_questions),
    },
    legal_strategy: legalStrategy,
    output_modes: {
      user: normalizeOutputMode(outputModes.user),
      professional: normalizeOutputMode(outputModes.professional),
    },
    conversational: normalizeConversational(safePayload.conversational),
    conversational_response: normalizeConversationalResponse(safePayload.conversational_response),
    case_progress: caseProgress,
    case_progress_snapshot: caseProgressSnapshot,
    case_progress_narrative: caseProgressNarrative,
    case_workspace: normalizeCaseWorkspace(safePayload.case_workspace),
    response_text: String(safePayload.response_text || ''),
    quick_start: String(safePayload.quick_start || ''),
    visible_summary: summaryText,
    generated_document:
      typeof safePayload.generated_document === 'string' ? safePayload.generated_document : '',
    warnings: asArray(safePayload.warnings),
    confidence:
      typeof safePayload.confidence === 'number'
        ? safePayload.confidence
        : typeof reasoning.confidence_score === 'number'
          ? reasoning.confidence_score
          : typeof reasoning.confidence === 'number'
            ? reasoning.confidence
            : null,
  };

  normalized.is_partial = _isPartial(normalized);
  normalized.is_empty = _isEmpty(normalized);
  return normalized;
}

export function isEmptyLegalQueryResponse(response) {
  return _isEmpty(normalizeLegalQueryResponse(response));
}

export function isPartialLegalQueryResponse(response) {
  return _isPartial(normalizeLegalQueryResponse(response));
}

export function collectLegalWarnings(response) {
  const normalized = normalizeLegalQueryResponse(response);
  const seen = new Set();

  return [
    ...normalized.warnings,
    ...normalized.reasoning.warnings,
    ...normalized.normative_reasoning.warnings,
    ...normalized.citation_validation.warnings,
    ...normalized.hallucination_guard.warnings,
  ]
    .map((warning) => formatListItem(warning))
    .filter((warning) => {
      const text = String(warning || '').trim();
      if (!text || seen.has(text)) return false;
      seen.add(text);
      return true;
    });
}

export function formatConfidence(confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return 'No informada';
  }
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
}

export function humanizeLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function compactText(value, maxLength = 320) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function formatListItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return (
    item.label ||
    item.title ||
    item.titulo ||
    item.article ||
    item.source_id ||
    item.name ||
    item.text ||
    item.question ||
    JSON.stringify(item)
  );
}

function _isEmpty(normalized) {
  return !(
    normalized.visible_summary ||
    normalized.case_strategy.strategic_narrative ||
    normalized.case_strategy.recommended_actions.length ||
    normalized.case_strategy.risk_analysis.length ||
    normalized.case_strategy.conflict_summary.length ||
    normalized.procedural_strategy.next_steps.length ||
    normalized.generated_document ||
    normalized.warnings.length ||
    normalized.retrieved_items.length
  );
}

function _isPartial(normalized) {
  return Boolean(
    normalized.visible_summary &&
      !normalized.case_strategy.strategic_narrative &&
      !normalized.case_strategy.recommended_actions.length &&
      !normalized.case_strategy.conflict_summary.length,
  );
}
