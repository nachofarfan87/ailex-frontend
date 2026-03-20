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
