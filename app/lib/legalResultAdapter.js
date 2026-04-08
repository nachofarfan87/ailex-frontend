// frontend/app/lib/legalResultAdapter.js

import {
  asArray,
  asObject,
  deduplicateItems,
  extractDisplayText,
  isSameAction,
  itemToText,
  mergeAndDeduplicate,
  pickFirstText,
} from './displayTextUtils.js';
import {
  buildCaseProgress,
  buildCaseProgressSnapshot,
  factsToPills,
  mapCompletenessList,
} from './caseProgressAdapter.js';
import { buildCaseWorkspaceDisplay } from './caseWorkspaceAdapter.js';

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

function normalizeConversational(raw) {
  const safe = asObject(raw);
  const caseCompleteness = asObject(safe.case_completeness);
  return {
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
    ? 'Necesito confirmar un punto antes de darte una orientacion mas ajustada a tu caso.'
    : 'Con lo que me contaste, tengo suficiente para darte una orientacion concreta.';

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
  const caseWorkspace = buildCaseWorkspaceDisplay(safeResponse, nextSteps, pendingClarifications);
  const caseProgressSnapshot = buildCaseProgressSnapshot(safeResponse, conversational, caseProgress);

  return {
    title: userMode.title || professionalMode.title || humanizeDomain(safeResponse.case_domain),
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
    caseWorkspace,
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
      caseProgressSnapshot,
    },
    conversationalResponse,
  };
}
