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

export function adaptLegalResultForDisplay(response) {
  const safeResponse = asObject(response);
  const reasoning = asObject(safeResponse.reasoning);
  const caseStrategy = asObject(safeResponse.case_strategy);
  const outputModes = asObject(safeResponse.output_modes);
  const userMode = normalizeMode(outputModes.user);
  const professionalMode = normalizeMode(outputModes.professional);
  const rawResponseText = pickFirstText(safeResponse.response_text);

  const summary =
    userMode.summary ||
    pickFirstText(reasoning.short_answer, reasoning.case_analysis, rawResponseText);

  const quickStart = userMode.quick_start || pickFirstText(safeResponse.quick_start);
  const whatThisMeans =
    userMode.what_this_means ||
    pickFirstText(caseStrategy.strategic_narrative, summary, rawResponseText);

  const nextSteps = userMode.next_steps.length
    ? userMode.next_steps
    : asArray(caseStrategy.recommended_actions).slice(0, 5);

  const keyRisks = userMode.key_risks.length
    ? userMode.key_risks
    : asArray(caseStrategy.risk_analysis).slice(0, 5);

  const missingInformation = userMode.missing_information.length
    ? userMode.missing_information
    : asArray(
        caseStrategy.ordinary_missing_information ||
          caseStrategy.missing_information ||
          caseStrategy.critical_missing_information,
      ).slice(0, 5);

  const confidenceExplained =
    userMode.confidence_explained ||
    pickFirstText(professionalMode.confidence_explained);

  return {
    title:
      userMode.title ||
      professionalMode.title ||
      humanizeDomain(safeResponse.case_domain),
    summary:
      summary ||
      'AILEX no devolvio un resumen claro, pero la respuesta completa sigue disponible.',
    quickStart,
    whatThisMeans: whatThisMeans || summary || rawResponseText,
    nextSteps,
    keyRisks,
    missingInformation,
    confidenceExplained,
    professionalMode,
    rawResponseText,
    rawResponse: safeResponse,
  };
}
