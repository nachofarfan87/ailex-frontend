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
  textLooksRedundant,
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

function normalizeProfessionalJudgment(raw) {
  const safe = asObject(raw);
  const transparency = asObject(safe.decision_transparency);
  const technicalTrace = asObject(transparency.technical_trace);
  const confidenceContext = asObject(technicalTrace.confidence_context);
  const professionalExplanation = asObject(transparency.professional_explanation);
  const userExplanation = asObject(transparency.user_explanation);
  return {
    applies: Boolean(safe.applies),
    dominant_factor: pickFirstText(safe.dominant_factor),
    practical_risk: pickFirstText(safe.practical_risk),
    position_strength: String(safe.position_strength || '').trim(),
    blocking_issue: pickFirstText(safe.blocking_issue),
    best_next_move: pickFirstText(safe.best_next_move),
    prudence_level: String(safe.prudence_level || '').trim(),
    recommendation_stance: String(safe.recommendation_stance || '').trim(),
    why_this_matters_now: pickFirstText(safe.why_this_matters_now),
    exposure_level: String(safe.exposure_level || '').trim(),
    strengthens_position: pickFirstText(safe.strengthens_position),
    weakens_position: pickFirstText(safe.weakens_position),
    missing_to_strengthen: pickFirstText(safe.missing_to_strengthen),
    followup_why: pickFirstText(safe.followup_why),
    highlights: asArray(safe.highlights).map((item) => extractDisplayText(item)).filter(Boolean),
    decision_transparency: {
      applies: Boolean(transparency.applies),
      technical_trace: {
        decision_intent: String(technicalTrace.decision_intent || '').trim(),
        calibrated_state: String(technicalTrace.calibrated_state || '').trim(),
        dominant_signal: String(technicalTrace.dominant_signal || '').trim(),
        dominant_signal_score:
          typeof technicalTrace.dominant_signal_score === 'number'
            ? technicalTrace.dominant_signal_score
            : null,
      signal_scores: asObject(technicalTrace.signal_scores),
      decision_trace: asArray(technicalTrace.decision_trace).map((item) => extractDisplayText(item)).filter(Boolean),
      rule_trace: asArray(technicalTrace.rule_trace).map((item) => extractDisplayText(item)).filter(Boolean),
      clarification_status: String(technicalTrace.clarification_status || '').trim(),
      precision_required: Boolean(technicalTrace.precision_required),
      followup_present: Boolean(technicalTrace.followup_present),
      confidence_context: {
        summary: pickFirstText(confidenceContext.summary),
          decision_confidence_level: String(confidenceContext.decision_confidence_level || '').trim(),
          confidence_clarity_score:
            typeof confidenceContext.confidence_clarity_score === 'number'
              ? confidenceContext.confidence_clarity_score
              : null,
          confidence_stability_score:
            typeof confidenceContext.confidence_stability_score === 'number'
              ? confidenceContext.confidence_stability_score
              : null,
        },
      },
      professional_explanation: {
        decision_explanation: pickFirstText(professionalExplanation.decision_explanation),
        driving_signals: asArray(professionalExplanation.driving_signals).map((item) => extractDisplayText(item)).filter(Boolean),
        weakening_signals: asArray(professionalExplanation.weakening_signals).map((item) => extractDisplayText(item)).filter(Boolean),
        blocking_signals: asArray(professionalExplanation.blocking_signals).map((item) => extractDisplayText(item)).filter(Boolean),
        relevant_missing: asArray(professionalExplanation.relevant_missing).map((item) => extractDisplayText(item)).filter(Boolean),
        contradictions: asArray(professionalExplanation.contradictions).map((item) => extractDisplayText(item)).filter(Boolean),
      },
      user_explanation: {
        user_why_this: pickFirstText(userExplanation.user_why_this),
        what_limits_this: pickFirstText(userExplanation.what_limits_this),
        what_would_change_this: pickFirstText(userExplanation.what_would_change_this),
      },
      alternatives_considered: asArray(transparency.alternatives_considered)
        .map((item) => {
          const safeItem = asObject(item);
          return {
            option: pickFirstText(safeItem.option),
            status: String(safeItem.status || '').trim(),
            reason: pickFirstText(safeItem.reason),
          };
        })
        .filter((item) => item.option || item.reason),
    },
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

const ACTION_LEAD_VERBS = [
  'iniciar',
  'presentar',
  'pedir',
  'reunir',
  'responder',
  'confirmar',
  'acreditar',
  'definir',
  'precisar',
  'ordenar',
  'tramitar',
  'solicitar',
  'promover',
  'reclamar',
  'preparar',
  'consultar',
];

const URGENCY_HINT_PATTERNS = [
  'urgenc',
  'urgente',
  'cuanto antes',
  'inmediato',
  'inmediata',
  'riesgo',
  'violenc',
  'salud',
  'cautelar',
  'provisoria',
  'alimentos urgentes',
];

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function simplifyDecisionText(text) {
  let value = String(text || '').trim();
  if (!value) return '';

  value = value
    .replace(/^primer paso recomendado:\s*/i, '')
    .replace(/^lo mas conveniente ahora es\s*/i, 'Lo mas conveniente ahora es ')
    .replace(/^para avanzar(?: de forma concreta)?[:,]?\s*/i, '')
    .trim();

  const sentences = splitSentences(value);
  value = sentences[0] || value;

  if (value.includes(':')) {
    const [lead, tail] = value.split(':');
    if (tail && tail.trim()) {
      value = tail.trim();
    } else {
      value = lead.trim();
    }
  }

  const clauses = value
    .split(/,(?:\s+y\s+|\s+o\s+)?/i)
    .map((item) => item.trim())
    .filter(Boolean);
  const firstActionClause = clauses.find((item) =>
    ACTION_LEAD_VERBS.some((verb) => item.toLowerCase().startsWith(verb)),
  );
  value = firstActionClause || clauses[0] || value;

  if (value && !/[.!?]$/.test(value)) {
    value += '.';
  }
  return value;
}

function normalizeDecisionLead(text) {
  return String(text || '')
    .trim()
    .replace(/^lo mas conveniente ahora es\s+/i, '')
    .replace(/^en este punto,\s*conviene\s+/i, '')
    .replace(/^esto conviene hacerlo cuanto antes:\s*/i, '')
    .replace(/^podria convenir\s+/i, '')
    .trim();
}

function detectUrgencySignal({ safeResponse, quickStart, summary, conversational }) {
  const textSources = [
    quickStart,
    summary,
    conversational.question,
    conversational.message,
    JSON.stringify(conversational.known_facts || {}),
    JSON.stringify(asObject(safeResponse.case_profile)),
    JSON.stringify(asObject(safeResponse.smart_strategy)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return URGENCY_HINT_PATTERNS.some((pattern) => textSources.includes(pattern));
}

function buildDecisionCandidates({
  conversational,
  quickStart,
  caseProgressSnapshot,
  caseWorkspace,
  nextSteps,
  professionalJudgment,
}) {
  const workspaceActions = asArray(caseWorkspace?.actionPlan)
    .map((item) => extractDisplayText(item?.title || item?.description))
    .filter(Boolean);

  return deduplicateItems(
    [
      professionalJudgment?.best_next_move,
      conversational.next_step,
      quickStart,
      caseWorkspace?.primaryFocus?.label,
      caseProgressSnapshot?.nextStepLabel,
      ...workspaceActions,
      ...nextSteps,
    ]
      .map((item) => simplifyDecisionText(item))
      .filter(Boolean),
  );
}

function classifyFollowup({
  question,
  shouldAskFirst,
  caseProgress,
  conversational,
}) {
  const normalizedQuestion = String(question || '').trim();
  if (!normalizedQuestion) {
    return {
      followupType: '',
      followupPurpose: '',
      isBlockingFollowup: false,
    };
  }

  const nextStepType = String(caseProgress?.next_step_type || '').trim().toLowerCase();
  const readinessLabel = String(caseProgress?.readiness_label || '').trim().toLowerCase();
  const contradictionCount = Number(caseProgress?.contradiction_count || 0);
  const criticalGapCount = asArray(caseProgress?.critical_gaps).length;
  const completeness = asObject(conversational?.case_completeness);
  const missingCriticalCount = asArray(completeness.missing_critical).length;
  const loweredQuestion = normalizedQuestion.toLowerCase();

  if (
    nextStepType === 'resolve_contradiction' ||
    contradictionCount > 0 ||
    /\bdato correcto\b|\bconfirmar\b|\bseria\b/.test(loweredQuestion)
  ) {
    return {
      followupType: 'confirmation',
      followupPurpose: 'Esta pregunta confirma un punto sensible antes de avanzar.',
      isBlockingFollowup: true,
    };
  }

  if (
    nextStepType === 'ask' ||
    criticalGapCount > 0 ||
    missingCriticalCount > 0 ||
    (shouldAskFirst && readinessLabel !== 'high')
  ) {
    return {
      followupType: 'critical_data',
      followupPurpose: 'Necesito este dato para destrabar el siguiente paso.',
      isBlockingFollowup: true,
    };
  }

  return {
    followupType: 'refinement',
    followupPurpose:
      'Esta pregunta solo sirve para ajustar mejor la orientacion, pero no bloquea todo el caso.',
    isBlockingFollowup: false,
  };
}

function shouldSurfaceFollowup({
  question,
  classification,
  caseProgress,
  nextStepCandidate,
}) {
  if (!String(question || '').trim()) return false;
  if (classification.isBlockingFollowup) return true;

  const readinessLabel = String(caseProgress?.readiness_label || '').trim().toLowerCase();
  const nextStepType = String(caseProgress?.next_step_type || '').trim().toLowerCase();
  const hasBlockers = asArray(caseProgress?.blocking_issues).length > 0;
  const criticalGapCount = asArray(caseProgress?.critical_gaps).length;

  if (nextStepType === 'execute') return false;
  if (readinessLabel === 'high' && !hasBlockers && criticalGapCount === 0) return false;
  if (nextStepCandidate) return false;

  return true;
}

function shapeNextBestStep({
  rawNextBestStep,
  followup,
}) {
  if (followup.isBlockingFollowup) {
    if (followup.followupType === 'confirmation') {
      return 'Antes de avanzar con una accion concreta, conviene confirmar este punto.';
    }
    return 'Antes de avanzar con una accion concreta, conviene responder esta pregunta clave.';
  }
  return simplifyDecisionText(rawNextBestStep);
}

function resolveDecisionStrength({
  safeResponse,
  caseProgress,
  followup,
  nextBestStep,
  nextStepPriority,
  quickStart,
  summary,
  conversational,
  professionalJudgment,
}) {
  if (!nextBestStep) return 'soft';
  if (followup.isBlockingFollowup) return 'soft';

  const stance = String(professionalJudgment?.recommendation_stance || '').trim().toLowerCase();
  const prudenceLevel = String(professionalJudgment?.prudence_level || '').trim().toLowerCase();

  if (stance === 'urgent_action') return 'urgent';
  if (stance === 'firm_action' && prudenceLevel !== 'high') return 'strong';
  if (stance === 'guided_action') return 'recommended';
  if (stance === 'clarify_before_action' || prudenceLevel === 'high') return 'soft';

  const urgencySignal = detectUrgencySignal({
    safeResponse,
    quickStart,
    summary,
    conversational,
  });
  const readinessLabel = String(caseProgress?.readiness_label || '').trim().toLowerCase();
  const nextStepType = String(caseProgress?.next_step_type || '').trim().toLowerCase();
  const progressStatus = String(caseProgress?.progress_status || '').trim().toLowerCase();

  if (urgencySignal) return 'urgent';
  if (
    nextStepPriority === 'high_priority_action' &&
    (nextStepType === 'execute' || readinessLabel === 'high' || progressStatus === 'ready')
  ) {
    return 'strong';
  }
  if (nextStepPriority === 'high_priority_action' || nextStepPriority === 'optional_next_step') {
    return 'recommended';
  }
  return 'soft';
}

function applyDecisionStrengthWording(text, decisionStrength) {
  const rawText = String(text || '').trim();
  if (/^antes de avanzar\b/i.test(rawText)) {
    return rawText;
  }
  const simplified = simplifyDecisionText(rawText);
  if (/^antes de avanzar\b/i.test(simplified)) {
    return simplified;
  }
  const lead = normalizeDecisionLead(simplifyDecisionText(text));
  if (!lead) return '';

  if (decisionStrength === 'urgent') {
    return `Esto conviene hacerlo cuanto antes: ${lead}`;
  }
  if (decisionStrength === 'strong') {
    return `En este punto, conviene ${lead.charAt(0).toLowerCase()}${lead.slice(1)}`;
  }
  if (decisionStrength === 'recommended') {
    return `Lo mas conveniente ahora es ${lead.charAt(0).toLowerCase()}${lead.slice(1)}`;
  }
  return `Podria convenir ${lead.charAt(0).toLowerCase()}${lead.slice(1)}`;
}

function resolveNextStepPriority({
  nextBestStep,
  followup,
  caseProgressSnapshot,
  caseProgress,
}) {
  if (!nextBestStep) return 'informational_only';

  const nextStepType = String(
    caseProgressSnapshot?.nextStepType || caseProgress?.next_step_type || '',
  )
    .trim()
    .toLowerCase();

  if (followup.isBlockingFollowup) return 'high_priority_action';
  if (nextStepType === 'execute' || nextStepType === 'decide') return 'high_priority_action';
  if (ACTION_LEAD_VERBS.some((verb) => nextBestStep.toLowerCase().startsWith(verb))) {
    return 'high_priority_action';
  }
  return 'optional_next_step';
}

function buildSupportingNextSteps({
  primaryCandidates,
  nextBestStep,
  primaryReadingText,
  question,
}) {
  return primaryCandidates
    .filter((item) => item && !isSameAction(item, nextBestStep))
    .filter((item) => !textLooksRedundant(item, [primaryReadingText, question, nextBestStep]))
    .slice(0, 2);
}

function buildNextStepWhy({
  decisionStrength,
  followup,
  caseProgress,
  caseProgressSnapshot,
  nextBestStep,
  professionalJudgment,
}) {
  if (!nextBestStep) return '';
  const judgmentWhy = String(professionalJudgment?.why_this_matters_now || '').trim();
  const transparencyWhy = String(
    professionalJudgment?.decision_transparency?.user_explanation?.user_why_this || '',
  ).trim();
  const transparencyLimit = String(
    professionalJudgment?.decision_transparency?.user_explanation?.what_limits_this || '',
  ).trim();
  if (transparencyWhy) {
    return transparencyWhy.length > 150 ? splitSentences(transparencyWhy)[0] : transparencyWhy;
  }
  if (
    followup.isBlockingFollowup &&
    transparencyLimit &&
    !textLooksRedundant(transparencyLimit, [judgmentWhy])
  ) {
    return transparencyLimit.length > 150 ? splitSentences(transparencyLimit)[0] : transparencyLimit;
  }
  if (judgmentWhy) {
    return judgmentWhy.length > 150 ? splitSentences(judgmentWhy)[0] : judgmentWhy;
  }
  if (followup.isBlockingFollowup) {
    return followup.followupType === 'confirmation'
      ? 'Porque antes hace falta confirmar un punto sensible para no avanzar sobre una base contradictoria.'
      : 'Porque sin responder esto el siguiente paso puede quedar mal orientado o ser prematuro.';
  }

  if (String(caseProgress?.next_step_type || '').trim().toLowerCase() === 'execute') {
    return 'Porque ya hay base suficiente para pasar de ordenamiento a accion concreta.';
  }

  if (decisionStrength === 'urgent') {
    return 'Porque el contexto muestra urgencia y conviene mover esto antes de que el problema escale.';
  }

  if (caseProgressSnapshot?.nextStepReason) {
    const text = String(caseProgressSnapshot.nextStepReason || '').trim();
    return text.length > 140 ? splitSentences(text)[0] : text;
  }

  if (decisionStrength === 'strong') {
    return 'Porque con lo que ya esta definido, este es el movimiento mas firme para hacer avanzar el caso.';
  }

  if (decisionStrength === 'recommended') {
    return 'Porque es el paso que mejor ordena el caso sin abrir frentes innecesarios.';
  }

  return 'Porque ayuda a orientar mejor el caso sin cerrar en falso una decision todavia sensible.';
}

function buildFollowupWhy({
  followup,
  caseProgressSnapshot,
  professionalJudgment,
}) {
  if (!followup.followupType) return '';
  const judgmentWhy = String(professionalJudgment?.followup_why || '').trim();
  const userChangeHint = String(
    professionalJudgment?.decision_transparency?.user_explanation?.what_would_change_this || '',
  ).trim();
  if (judgmentWhy) {
    return judgmentWhy.length > 150 ? splitSentences(judgmentWhy)[0] : judgmentWhy;
  }
  if (userChangeHint) {
    return userChangeHint.length > 150 ? splitSentences(userChangeHint)[0] : userChangeHint;
  }
  if (caseProgressSnapshot?.questionTargetHint) {
    const hint = String(caseProgressSnapshot.questionTargetHint || '').trim();
    return hint.length > 140 ? splitSentences(hint)[0] : hint;
  }
  if (followup.followupType === 'confirmation') {
    return 'Esto sirve para confirmar un punto sensible antes de seguir.';
  }
  if (followup.followupType === 'critical_data') {
    return 'Esto destraba el dato clave que hoy condiciona el siguiente paso.';
  }
  return 'Esto ayuda a afinar la orientacion sin frenar todo el avance.';
}

function buildPrimaryReadingSupport({
  professionalJudgment,
  caseProgressSnapshot,
  modeDescription,
  decisionStrength,
  followup,
}) {
  const userLimit = String(
    professionalJudgment?.decision_transparency?.user_explanation?.what_limits_this || '',
  ).trim();
  if (
    userLimit &&
    (decisionStrength === 'soft' || followup?.isBlockingFollowup)
  ) {
    return userLimit;
  }

  return (
    String(professionalJudgment?.decision_transparency?.professional_explanation?.decision_explanation || '').trim() ||
    String(professionalJudgment?.decision_transparency?.technical_trace?.confidence_context?.summary || '').trim() ||
    String(professionalJudgment?.dominant_factor || '').trim() ||
    String(professionalJudgment?.blocking_issue || '').trim() ||
    String(professionalJudgment?.practical_risk || '').trim() ||
    String(caseProgressSnapshot?.caseDirection || '').trim() ||
    String(modeDescription || '').trim()
  );
}

function orderTransparencyLimitingSignals({
  professionalExplanation,
}) {
  return deduplicateItems(
    [
      ...asArray(professionalExplanation.blocking_signals),
      ...asArray(professionalExplanation.contradictions),
      ...asArray(professionalExplanation.relevant_missing),
      ...asArray(professionalExplanation.weakening_signals),
    ].map((item) => extractDisplayText(item)).filter(Boolean),
  );
}

function buildDecisionTransparencySummary(decisionTransparency) {
  const transparency = asObject(decisionTransparency);
  const professionalExplanation = asObject(transparency.professional_explanation);
  const userExplanation = asObject(transparency.user_explanation);
  const technicalTrace = asObject(transparency.technical_trace);
  const confidenceContext = asObject(technicalTrace.confidence_context);
  const alternatives = asArray(transparency.alternatives_considered)
    .map((item) => {
      const safeItem = asObject(item);
      return {
        option: pickFirstText(safeItem.option),
        status: String(safeItem.status || '').trim(),
        reason: pickFirstText(safeItem.reason),
      };
    })
    .filter((item) => (item.option || item.reason) && item.reason);

  return {
    applies: Boolean(transparency.applies),
    decisionExplanation: pickFirstText(professionalExplanation.decision_explanation),
    drivingSignals: deduplicateItems(asArray(professionalExplanation.driving_signals).map((item) => extractDisplayText(item)).filter(Boolean)).slice(0, 3),
    limitingSignals: orderTransparencyLimitingSignals({
      professionalExplanation,
    }).slice(0, 4),
    confidenceSummary: pickFirstText(professionalExplanation.confidence_context, confidenceContext.summary),
    userWhyThis: pickFirstText(userExplanation.user_why_this),
    userLimit: pickFirstText(userExplanation.what_limits_this),
    userChangeHint: pickFirstText(userExplanation.what_would_change_this),
    shouldSurfacePrudence:
      technicalTrace.decision_intent === 'act_with_guardrails' ||
      technicalTrace.calibrated_state === 'guarded_action' ||
      Boolean(pickFirstText(userExplanation.what_limits_this)),
    visibleAlternatives: alternatives.slice(0, 2),
  };
}

function buildProfessionalJudgmentHighlights(professionalJudgment) {
  return deduplicateItems(
    [
      professionalJudgment?.dominant_factor,
      professionalJudgment?.practical_risk,
      professionalJudgment?.strengthens_position,
      professionalJudgment?.weakens_position,
      professionalJudgment?.missing_to_strengthen,
      ...asArray(professionalJudgment?.highlights),
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  ).slice(0, 4);
}

export { extractDisplayText, buildCaseProgress, itemToText };

export function adaptLegalResultForDisplay(response) {
  const safeResponse = asObject(response);
  const reasoning = asObject(safeResponse.reasoning);
  const caseStrategy = asObject(safeResponse.case_strategy);
  const proceduralStrategy = asObject(safeResponse.procedural_strategy);
  const normativeReasoning = asObject(safeResponse.normative_reasoning);
  const professionalJudgment = normalizeProfessionalJudgment(safeResponse.professional_judgment);
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
  const primaryReadingText = shouldAskFirst
    ? pickFirstText(
        conversational.guided_response,
        conversational.message,
        userMode.summary,
        summary,
      )
    : pickFirstText(
        whatThisMeans,
        summary,
        conversational.message,
        rawResponseText,
      );
  const primaryReadingQuestion = shouldAskFirst
    ? pickFirstText(conversational.question, conversationalResponse.primary_question)
    : '';
  const followupClassification = classifyFollowup({
    question: primaryReadingQuestion,
    shouldAskFirst,
    caseProgress: safeResponse.case_progress,
    conversational,
  });
  const decisionCandidates = buildDecisionCandidates({
    conversational,
    quickStart,
    caseProgressSnapshot,
    caseWorkspace,
    nextSteps,
    professionalJudgment,
  });
  const rawNextBestStep = decisionCandidates[0] || '';
  const shouldExposeFollowup = shouldSurfaceFollowup({
    question: primaryReadingQuestion,
    classification: followupClassification,
    caseProgress: safeResponse.case_progress,
    nextStepCandidate: rawNextBestStep,
  });
  const effectiveFollowupQuestion = shouldExposeFollowup ? primaryReadingQuestion : '';
  const effectiveFollowup = shouldExposeFollowup
    ? followupClassification
    : {
        followupType: '',
        followupPurpose: '',
        isBlockingFollowup: false,
      };
  const nextBestStep = shapeNextBestStep({
    rawNextBestStep,
    followup: effectiveFollowup,
  });
  const nextStepPriority = resolveNextStepPriority({
    nextBestStep,
    followup: effectiveFollowup,
    caseProgressSnapshot,
    caseProgress: safeResponse.case_progress,
  });
  const decisionStrength = resolveDecisionStrength({
    safeResponse,
    caseProgress: safeResponse.case_progress,
    followup: effectiveFollowup,
    nextBestStep,
    nextStepPriority,
    quickStart,
    summary,
    conversational,
    professionalJudgment,
  });
  const nextBestStepWithStrength = applyDecisionStrengthWording(nextBestStep, decisionStrength);
  const nextStepWhy = buildNextStepWhy({
    decisionStrength,
    followup: effectiveFollowup,
    caseProgress: safeResponse.case_progress,
    caseProgressSnapshot,
    nextBestStep: nextBestStepWithStrength,
    professionalJudgment,
  });
  const followupWhy = buildFollowupWhy({
    followup: effectiveFollowup,
    caseProgressSnapshot,
    professionalJudgment,
  });
  const supportingNextSteps = buildSupportingNextSteps({
    primaryCandidates: decisionCandidates.slice(1),
    nextBestStep: nextBestStepWithStrength,
    primaryReadingText,
    question: effectiveFollowupQuestion,
  });
  const primaryReadingSupport = buildPrimaryReadingSupport({
    professionalJudgment,
    caseProgressSnapshot,
    modeDescription,
    decisionStrength,
    followup: effectiveFollowup,
  });
  const decisionTransparencySummary = buildDecisionTransparencySummary(
    professionalJudgment.decision_transparency,
  );
  const professionalJudgmentHighlights = buildProfessionalJudgmentHighlights(professionalJudgment);

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
    primaryReadingTitle: shouldAskFirst
      ? 'Antes de avanzar, conviene confirmar este punto'
      : 'Orientacion principal',
    primaryReadingEyebrow: shouldAskFirst ? 'Aclaracion necesaria' : 'Orientacion principal',
    primaryReadingText:
      primaryReadingText ||
      'AILEX no devolvio una orientacion breve clara, pero la respuesta completa sigue disponible.',
    primaryReadingSupport,
    primaryReadingQuestion: effectiveFollowupQuestion,
    nextBestStep: nextBestStepWithStrength,
    supportingNextSteps,
    nextStepPriority,
    decisionStrength,
    nextStepWhy,
    followupType: effectiveFollowup.followupType,
    followupPurpose: effectiveFollowup.followupPurpose,
    followupWhy,
    isBlockingFollowup: effectiveFollowup.isBlockingFollowup,
    professionalJudgment,
    decisionTransparency: professionalJudgment.decision_transparency,
    decisionTransparencySummary,
    professionalJudgmentHighlights,
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
