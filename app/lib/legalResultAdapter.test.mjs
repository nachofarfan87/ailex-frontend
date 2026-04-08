// frontend/app/lib/legalResultAdapter.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptLegalResultForDisplay,
  extractDisplayText,
  buildCaseProgress,
  itemToText,
} from './legalResultAdapter.js';

// ═══════════════════════════════════════════════════════════════════════════
// extractDisplayText — never returns [object Object]
// ═══════════════════════════════════════════════════════════════════════════

test('extractDisplayText returns string as-is', () => {
  assert.equal(extractDisplayText('hola'), 'hola');
});

test('extractDisplayText returns empty string for null/undefined', () => {
  assert.equal(extractDisplayText(null), '');
  assert.equal(extractDisplayText(undefined), '');
});

test('extractDisplayText extracts description from object', () => {
  const obj = {
    title: 'Siguiente paso sugerido',
    description: 'Consultar si la hija convive con quien reclama',
    action: 'Preguntar convivencia actual',
  };
  assert.equal(extractDisplayText(obj), 'Consultar si la hija convive con quien reclama');
});

test('extractDisplayText extracts title when no description', () => {
  const obj = { title: 'Mi titulo', action: 'Mi accion' };
  // description is falsy, so falls through to action? No: order is description, action, label, title...
  // Actually: description || action || label || title — action comes before title
  assert.equal(extractDisplayText(obj), 'Mi accion');
});

test('extractDisplayText falls back to label then title', () => {
  assert.equal(extractDisplayText({ title: 'T', label: 'L' }), 'L');
  assert.equal(extractDisplayText({ title: 'T' }), 'T');
});

test('extractDisplayText returns empty for empty object', () => {
  assert.equal(extractDisplayText({}), '');
});

test('extractDisplayText handles arrays', () => {
  const result = extractDisplayText(['a', 'b', 'c']);
  assert.equal(result, 'a; b; c');
});

test('extractDisplayText never returns [object Object]', () => {
  const tricky = { nested: { deep: true } };
  const result = extractDisplayText(tricky);
  assert.ok(!result.includes('[object Object]'));
});

// ═══════════════════════════════════════════════════════════════════════════
// CASO 3: next_step as object renders human text
// ═══════════════════════════════════════════════════════════════════════════

test('CASO 3: next_step object is normalized to string', () => {
  const response = {
    case_domain: 'alimentos',
    conversational: {
      message: 'Orientacion',
      question: null,
      options: [],
      missing_facts: [],
      next_step: {
        title: 'Siguiente paso sugerido',
        description: 'Consultar si la hija convive con quien reclama',
        action: 'Preguntar convivencia actual',
      },
      should_ask_first: false,
      guided_response: '',
      known_facts: {},
      clarification_status: 'none',
      asked_questions: [],
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [] },
    },
    output_modes: {
      user: {
        title: 'Test',
        summary: 'Test summary',
        quick_start: '',
        what_this_means: '',
        next_steps: [],
        key_risks: [],
        missing_information: [],
        confidence_explained: '',
      },
      professional: {
        title: '',
        summary: '',
        strategic_narrative: '',
        conflict_summary: [],
        recommended_actions: [],
        risk_analysis: [],
        procedural_focus: [],
        critical_missing_information: [],
        ordinary_missing_information: [],
        normative_focus: [],
      },
    },
  };

  const display = adaptLegalResultForDisplay(response);
  const nextStep = display.conversational.next_step;

  assert.equal(typeof nextStep, 'string');
  assert.ok(!nextStep.includes('[object Object]'));
  assert.ok(nextStep.length > 0);
  assert.equal(nextStep, 'Consultar si la hija convive con quien reclama');
});

// ═══════════════════════════════════════════════════════════════════════════
// CASO 4: next_step as string legacy still works
// ═══════════════════════════════════════════════════════════════════════════

test('CASO 4: next_step string legacy works unchanged', () => {
  const response = {
    case_domain: 'divorcio',
    conversational: {
      message: 'Test',
      next_step: 'Definir como conviene iniciar el tramite.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: { is_complete: false },
    },
    output_modes: { user: {}, professional: {} },
  };

  const display = adaptLegalResultForDisplay(response);
  assert.equal(display.conversational.next_step, 'Definir como conviene iniciar el tramite.');
});

// ═══════════════════════════════════════════════════════════════════════════
// buildCaseProgress — does not show 0% when data exists
// ═══════════════════════════════════════════════════════════════════════════

test('buildCaseProgress with known facts shows percentage > 0', () => {
  const conversational = {
    known_facts: {
      hay_hijos: true,
      tema_alimentos: 'inferred',
    },
    case_completeness: {
      is_complete: false,
      missing_critical: ['rol_procesal'],
      missing_optional: ['urgencia'],
      known_count: 2,
    },
  };

  const progress = buildCaseProgress(conversational);
  assert.ok(progress !== null);
  assert.ok(progress.percentage > 0);
  assert.ok(progress.defined.length > 0);
});

test('buildCaseProgress returns non-null when known_count > 0 but no structured fields', () => {
  const conversational = {
    known_facts: {},
    case_completeness: {
      is_complete: false,
      missing_critical: [],
      missing_optional: [],
      known_count: 3,
    },
  };

  const progress = buildCaseProgress(conversational);
  assert.ok(progress !== null);
  assert.ok(progress.percentage > 0);
});

test('buildCaseProgress returns null when truly empty', () => {
  const conversational = {
    known_facts: {},
    case_completeness: {
      is_complete: false,
      missing_critical: [],
      missing_optional: [],
      known_count: 0,
    },
  };

  const progress = buildCaseProgress(conversational);
  assert.equal(progress, null);
});

test('adaptLegalResultForDisplay surfaces convenio and regimen facts as pills', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    conversational: {
      message: 'Test',
      should_ask_first: false,
      known_facts: {
        convenio_regulador: true,
        alimentos_definidos: true,
        cuota_alimentaria_porcentaje: '20%',
        regimen_comunicacional: true,
        regimen_comunicacional_frecuencia: '3 dias por semana',
      },
      case_completeness: {
        is_complete: true,
        missing_critical: [],
        missing_optional: [],
        known_count: 5,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.ok(display.conversational.knownFactPills.includes('Hay convenio regulador'));
  assert.ok(display.conversational.knownFactPills.includes('Alimentos definidos'));
  assert.ok(display.conversational.knownFactPills.includes('Cuota: 20% del sueldo'));
  assert.ok(display.conversational.knownFactPills.includes('Regimen comunicacional'));
  assert.ok(display.conversational.knownFactPills.includes('Comunicacion: 3 dias por semana'));
});

test('adaptLegalResultForDisplay removes quick start from next steps and limits visible support actions', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    quick_start:
      'Primer paso recomendado: Redactar el convenio con precision suficiente para homologacion.',
    case_strategy: {
      recommended_actions: [
        'Redactar el convenio con precision suficiente para homologacion.',
        'Preparar presentacion inicial de divorcio con encuadre correcto.',
        'Acreditar documental basica del vinculo.',
        'Precisar competencia judicial y domicilios relevantes.',
        'Ordenar anexos patrimoniales.',
      ],
      risk_analysis: [],
    },
    procedural_strategy: {
      next_steps: [
        'Redactar el convenio con precision suficiente para homologacion.',
        'Preparar presentacion inicial de divorcio con encuadre correcto.',
        'Acreditar documental basica del vinculo.',
        'Precisar competencia judicial y domicilios relevantes.',
        'Ordenar anexos patrimoniales.',
      ],
    },
    conversational: {
      message: 'Test',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: true,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.primaryAction, 'Primer paso recomendado: Redactar el convenio con precision suficiente para homologacion.');
  assert.ok(display.nextSteps.every((item) => !item.includes('Redactar el convenio con precision suficiente para homologacion.')));
  assert.equal(display.primaryNextSteps.length, 3);
});

test('adaptLegalResultForDisplay arma una capa de lectura principal para aclaracion', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Necesito confirmar un dato clave antes de seguir.',
      guided_response: 'Con ese dato te puedo orientar mucho mejor.',
      question: 'El otro progenitor aporta algo actualmente?',
      next_step: 'Responder si existe algun aporte actual.',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['aportes_actuales'],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.primaryReadingEyebrow, 'Aclaracion necesaria');
  assert.equal(display.primaryReadingQuestion, 'El otro progenitor aporta algo actualmente?');
  assert.equal(
    display.nextBestStep,
    'Antes de avanzar con una accion concreta, conviene responder esta pregunta clave.',
  );
  assert.equal(display.followupType, 'critical_data');
  assert.equal(display.isBlockingFollowup, true);
  assert.ok(display.primaryReadingText.includes('orientar'));
});

test('adaptLegalResultForDisplay prioriza quick start como proximo mejor paso cuando no hay next_step conversacional', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    quick_start: 'Reunir la documentacion basica para iniciar el tramite.',
    case_strategy: {
      recommended_actions: [
        'Reunir la documentacion basica para iniciar el tramite.',
        'Precisar el ultimo domicilio conyugal.',
      ],
    },
    conversational: {
      message: 'Hay base suficiente para orientar.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.nextBestStep,
    'Lo mas conveniente ahora es reunir la documentacion basica para iniciar el tramite.',
  );
  assert.ok(!display.supportingNextSteps.includes(display.nextBestStep));
});

test('solo deja un nextBestStep principal y maximo dos supportingNextSteps', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    quick_start: 'Iniciar el reclamo principal.',
    case_strategy: {
      recommended_actions: [
        'Iniciar el reclamo principal.',
        'Reunir partida de nacimiento.',
        'Acreditar gastos del hijo.',
        'Precisar domicilio relevante.',
        'Ordenar recibos y comprobantes.',
      ],
    },
    procedural_strategy: {
      next_steps: [
        'Iniciar el reclamo principal.',
        'Reunir partida de nacimiento.',
        'Acreditar gastos del hijo.',
        'Precisar domicilio relevante.',
      ],
    },
    conversational: {
      message: 'Hay base suficiente para avanzar.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.nextBestStep,
    'Lo mas conveniente ahora es iniciar el reclamo principal.',
  );
  assert.ok(Array.isArray(display.supportingNextSteps));
  assert.ok(display.supportingNextSteps.length <= 2);
});

test('clasifica followup como critical_data cuando destraba un gap critico', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      message: 'Necesito confirmar un punto.',
      question: 'En que provincia tramitaria esto?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.followupType, 'critical_data');
  assert.equal(display.isBlockingFollowup, true);
  assert.ok(display.followupPurpose.includes('destrabar') || display.followupPurpose.includes('dato'));
  assert.ok(display.followupWhy.length > 0);
});

test('clasifica followup como confirmation cuando hay contradiccion', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      message: 'Hay un punto inconsistente.',
      question: 'Cual es el dato correcto sobre el domicilio?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'inconsistente',
      readiness_label: 'low',
      progress_status: 'blocked',
      next_step_type: 'resolve_contradiction',
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [{ key: 'domicilio_relevante', summary: 'Hay dos domicilios distintos.' }],
      contradiction_count: 1,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.followupType, 'confirmation');
  assert.equal(display.isBlockingFollowup, true);
});

test('bloquea followup innecesario cuando el caso ya permite avanzar', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Presentar el escrito inicial.',
    conversational: {
      message: 'Ya hay base suficiente para avanzar.',
      question: 'Cuanto gana la otra parte?',
      should_ask_first: true,
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: ['ingresos'],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      critical_gaps: [],
      important_gaps: [{ key: 'ingresos', label: 'los ingresos' }],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.primaryReadingQuestion, '');
  assert.equal(display.followupType, '');
  assert.equal(display.isBlockingFollowup, false);
  assert.equal(display.nextStepPriority, 'high_priority_action');
  assert.equal(display.decisionStrength, 'strong');
});

test('mantiene coherencia entre next step prudente y followup bloqueante', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Iniciar demanda.',
    conversational: {
      message: 'Antes de seguir, necesito un dato clave.',
      question: 'En que ciudad vive hoy el nino?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['domicilio_relevante'],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'domicilio_relevante', label: 'el domicilio relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.isBlockingFollowup, true);
  assert.ok(display.nextBestStep.toLowerCase().includes('responder esta pregunta clave'));
  assert.equal(display.decisionStrength, 'soft');
  assert.ok(display.nextStepWhy.toLowerCase().includes('sin responder') || display.nextStepWhy.toLowerCase().includes('antes'));
});

test('evita duplicacion semantica entre primaryReading next step y supporting steps', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Reunir la documentacion basica.',
    case_strategy: {
      recommended_actions: [
        'Reunir la documentacion basica.',
        'Reunir documentacion basica.',
        'Acreditar el vinculo.',
        'Precisar jurisdiccion.',
      ],
    },
    conversational: {
      message: 'Lo mas conveniente ahora es reunir la documentacion basica.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.nextBestStep,
    'Lo mas conveniente ahora es reunir la documentacion basica.',
  );
  assert.ok(display.supportingNextSteps.every((item) => !/documentacion basica/i.test(item)));
});

test('decisionStrength urgent endurece el wording del next step', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Pedir una medida provisoria.',
    conversational: {
      message: 'Hay una urgencia alimentaria actual.',
      should_ask_first: false,
      known_facts: { urgencia_alimentaria: true },
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.decisionStrength, 'urgent');
  assert.ok(display.nextBestStep.startsWith('Esto conviene hacerlo cuanto antes:'));
  assert.ok(display.nextStepWhy.length > 0);
});

test('decisionStrength recommended usa wording intermedio', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Reunir la documentacion basica.',
    conversational: {
      message: 'Hay base razonable para ordenar el caso.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: ['domicilio'],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'estructuracion',
      readiness_label: 'medium',
      progress_status: 'advancing',
      next_step_type: 'decide',
      critical_gaps: [],
      important_gaps: [{ key: 'domicilio', label: 'el domicilio relevante' }],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.decisionStrength, 'recommended');
  assert.ok(display.nextBestStep.startsWith('Lo mas conveniente ahora es'));
});

test('professional_judgment refuerza la lectura principal y la justificacion del paso', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Presentar el reclamo principal.',
    professional_judgment: {
      applies: true,
      dominant_factor: 'Lo que mas pesa hoy es que ya hay base suficiente para actuar.',
      best_next_move: 'Presentar el reclamo principal.',
      why_this_matters_now: 'Porque ya hay base suficiente para pasar de ordenamiento a accion.',
      recommendation_stance: 'firm_action',
      prudence_level: 'low',
      highlights: [
        'Lo que mas pesa hoy es que ya hay base suficiente para actuar.',
        'La posicion ya tiene una base util para pasar a una accion concreta.',
      ],
    },
    conversational: {
      message: 'Hay base suficiente para orientar.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.decisionStrength, 'strong');
  assert.equal(
    display.primaryReadingSupport,
    'Lo que mas pesa hoy es que ya hay base suficiente para actuar.',
  );
  assert.equal(
    display.nextStepWhy,
    'Porque ya hay base suficiente para pasar de ordenamiento a accion.',
  );
  assert.ok(display.professionalJudgmentHighlights.length >= 2);
});

test('professional_judgment explica para que sirve el follow-up sin duplicar el next step', () => {
  const display = adaptLegalResultForDisplay({
    professional_judgment: {
      applies: true,
      recommendation_stance: 'clarify_before_action',
      prudence_level: 'high',
      followup_why:
        'Esto permite cerrar la jurisdiccion relevante, que hoy condiciona el siguiente paso.',
      blocking_issue: 'Hoy falta cerrar la jurisdiccion relevante para que el siguiente paso no quede flojo.',
    },
    conversational: {
      message: 'Necesito confirmar un punto.',
      question: 'En que jurisdiccion tramitaria esto?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.decisionStrength, 'soft');
  assert.ok(display.nextBestStep.toLowerCase().includes('responder esta pregunta clave'));
  assert.equal(
    display.followupWhy,
    'Esto permite cerrar la jurisdiccion relevante, que hoy condiciona el siguiente paso.',
  );
  assert.notEqual(display.followupWhy, display.nextStepWhy);
});

test('nextStepWhy y followupWhy no son excesivamente largos ni redundantes', () => {
  const display = adaptLegalResultForDisplay({
    quick_start: 'Iniciar el reclamo principal.',
    conversational: {
      message: 'Necesito confirmar un dato clave.',
      question: 'En que jurisdiccion tramitaria esto?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.ok(display.nextStepWhy.length <= 140);
  assert.ok(display.followupWhy.length <= 140);
  assert.notEqual(display.nextStepWhy, display.followupWhy);
});

// ═══════════════════════════════════════════════════════════════════════════
// Full integration: no [object Object] anywhere in serialized output
// ═══════════════════════════════════════════════════════════════════════════

test('Full display output never contains [object Object]', () => {
  const response = {
    case_domain: 'alimentos',
    conversational: {
      message: { title: 'Msg', description: 'Real message' },
      question: { question: 'Real question?' },
      options: ['Si', 'No'],
      missing_facts: [{ label: 'rol procesal' }, 'urgencia'],
      next_step: { description: 'Paso siguiente real' },
      should_ask_first: true,
      guided_response: 'Para orientarte bien...',
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: ['rol_procesal'],
        missing_optional: [],
        known_count: 1,
      },
    },
    output_modes: { user: {}, professional: {} },
  };

  const display = adaptLegalResultForDisplay(response);
  const serialized = JSON.stringify(display);
  assert.ok(!serialized.includes('[object Object]'), `Found [object Object] in: ${serialized.slice(0, 500)}`);
});

test('adaptLegalResultForDisplay construye snapshot de caso desde case_progress real', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Hay base suficiente para orientar.',
      should_ask_first: false,
      known_facts: {
        hay_hijos: true,
        convenio_regulador: true,
      },
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: ['urgencia'],
        known_count: 2,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_level: 0.73,
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      critical_gaps: [],
      important_gaps: [
        { key: 'jurisdiccion', label: 'la jurisdiccion relevante', purpose: 'procesal' },
      ],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    case_progress_narrative: {
      applies: true,
      progress_block: 'Ya hay una base suficiente para definir la via principal.',
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.ok(snapshot);
  assert.equal(snapshot.stage, 'decision');
  assert.equal(snapshot.stageLabel, 'Definiendo la estrategia');
  assert.equal(snapshot.nextStepType, 'decide');
  assert.equal(snapshot.importantGaps[0].label, 'la jurisdiccion relevante');
  assert.ok(snapshot.percentage >= 70);
});

test('adaptLegalResultForDisplay vuelve mas prudente la ejecucion con contradicciones o gaps visibles', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    conversational: {
      message: 'Se puede avanzar con cautela.',
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_level: 0.81,
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.ok(snapshot.summary.includes('dato sensible') || snapshot.summary.includes('consolidar'));
  assert.equal(snapshot.nextStepType, 'execute');
  assert.equal(snapshot.statusTone, 'warning');
  assert.equal(snapshot.criticalGaps[0].label, 'la jurisdiccion relevante');
});

test('adaptLegalResultForDisplay agrega justificacion del proximo paso cuando hay follow-up', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    conversational: {
      message: 'Necesito confirmar un punto.',
      question: '¿En qué provincia o jurisdicción tramitarías esto?',
      should_ask_first: true,
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_level: 0.62,
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.ok(snapshot.nextStepReason);
  assert.ok(snapshot.nextStepReason.includes('avanzar') || snapshot.nextStepReason.includes('errores'));
  assert.equal(
    snapshot.questionTargetHint,
    'Esta pregunta apunta a definir la jurisdiccion relevante.',
  );
});

test('adaptLegalResultForDisplay marca warning en caso inconsistente con contradicciones', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Antes de seguir conviene aclarar un punto.',
      should_ask_first: true,
      question: '¿Cuál es el domicilio relevante para este caso?',
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'inconsistente',
      readiness_level: 0.34,
      readiness_label: 'low',
      progress_status: 'blocked',
      next_step_type: 'resolve_contradiction',
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [{ type: 'contradictions', severity: 'high', reason: 'informacion inconsistente' }],
      contradictions: [
        { key: 'domicilio_relevante', prev_value: 'Jujuy', new_value: 'Salta' },
      ],
      contradiction_count: 1,
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.equal(snapshot.statusTone, 'warning');
  assert.ok(snapshot.nextStepReason.includes('contradictoria') || snapshot.nextStepReason.includes('resolver'));
});

test('focusLabel prioriza contradicciones', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: true,
      question: '¿Cuál es el dato correcto?',
      known_facts: {},
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [], known_count: 0 },
    },
    case_progress: {
      stage: 'inconsistente',
      readiness_label: 'low',
      progress_status: 'blocked',
      next_step_type: 'resolve_contradiction',
      contradictions: [{ key: 'domicilio_relevante', prev_value: 'Jujuy', new_value: 'Salta' }],
      contradiction_count: 1,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.focusLabel,
    'Antes de avanzar, conviene resolver una inconsistencia.',
  );
});

test('focusLabel prioriza critical gaps sobre stage optimista', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: true,
      question: '¿En qué provincia tramitarías esto?',
      known_facts: {},
      case_completeness: { is_complete: false, missing_critical: ['jurisdiccion'], missing_optional: [], known_count: 0 },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.focusLabel,
    'Lo mas importante ahora es completar los datos clave del caso.',
  );
});

test('focusLabel refleja decision sin gaps criticos', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.conversational.caseProgressSnapshot.focusLabel, '');
});

test('focusLabel refleja ejecucion sin bloqueo', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: true, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.conversational.caseProgressSnapshot.focusLabel, '');
});

test('primaryGap prioriza critical gap sobre important gap', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: true,
      question: '¿En qué provincia tramitarías esto?',
      known_facts: {},
      case_completeness: { is_complete: false, missing_critical: ['jurisdiccion'], missing_optional: [], known_count: 0 },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [{ key: 'monto_estimado', label: 'el monto estimado' }],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.primaryGap.label,
    'la jurisdiccion relevante',
  );
});

test('anti redundancia suprime nextStepReason cuando repite el foco', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: true, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.equal(snapshot.focusLabel, '');
  assert.equal(snapshot.nextStepReason, '');
});

test('caseDirection prioriza contradicciones', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: true,
      question: '¿Cuál es el dato correcto?',
      known_facts: {},
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [], known_count: 0 },
    },
    case_progress: {
      stage: 'inconsistente',
      readiness_label: 'low',
      progress_status: 'blocked',
      next_step_type: 'resolve_contradiction',
      contradictions: [{ key: 'domicilio_relevante', prev_value: 'Jujuy', new_value: 'Salta' }],
      contradiction_count: 1,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.caseDirection,
    'Antes de avanzar, es clave resolver las inconsistencias del caso.',
  );
});

test('caseDirection prioriza critical gaps', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: true,
      question: '¿En qué provincia tramitarías esto?',
      known_facts: {},
      case_completeness: { is_complete: false, missing_critical: ['jurisdiccion'], missing_optional: [], known_count: 0 },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.caseDirection,
    'El foco ahora esta en completar la informacion necesaria para poder avanzar con seguridad.',
  );
});

test('caseDirection refleja decision', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.caseDirection,
    'El caso ya tiene base suficiente para evaluar opciones y tomar una decision.',
  );
});

test('caseDirection refleja ejecucion', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: true, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'ejecucion',
      readiness_label: 'high',
      progress_status: 'ready',
      next_step_type: 'execute',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(
    display.conversational.caseProgressSnapshot.caseDirection,
    'El caso esta listo para avanzar con acciones concretas.',
  );
});

test('follow-up se conecta semanticamente con la direccion del caso', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      message: 'Necesito confirmar un punto.',
      question: '¿En qué provincia o jurisdicción tramitarías esto?',
      should_ask_first: true,
      known_facts: { hay_hijos: true },
      case_completeness: {
        is_complete: false,
        missing_critical: ['jurisdiccion'],
        missing_optional: [],
        known_count: 1,
      },
    },
    case_progress: {
      stage: 'decision',
      readiness_level: 0.62,
      readiness_label: 'medium',
      progress_status: 'stalled',
      next_step_type: 'ask',
      critical_gaps: [{ key: 'jurisdiccion', label: 'la jurisdiccion relevante' }],
      important_gaps: [],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.ok(snapshot.caseDirection.includes('informacion necesaria'));
  assert.equal(
    snapshot.questionTargetHint,
    'Esta pregunta apunta a definir la jurisdiccion relevante.',
  );
  assert.equal(
    snapshot.followupDirectionHint,
    'Esta pregunta sigue la direccion actual del caso y busca destrabar el punto prioritario.',
  );
});

test('no hay redundancia excesiva entre caseDirection focus y nextStepReason', () => {
  const display = adaptLegalResultForDisplay({
    conversational: {
      should_ask_first: false,
      known_facts: { hay_hijos: true },
      case_completeness: { is_complete: true, missing_critical: [], missing_optional: [], known_count: 1 },
    },
    case_progress: {
      stage: 'decision',
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      contradictions: [],
      contradiction_count: 0,
      critical_gaps: [],
      important_gaps: [],
      blocking_issues: [],
    },
    output_modes: { user: {}, professional: {} },
  });

  const snapshot = display.conversational.caseProgressSnapshot;

  assert.equal(
    snapshot.caseDirection,
    'El caso ya tiene base suficiente para evaluar opciones y tomar una decision.',
  );
  assert.equal(snapshot.focusLabel, '');
  assert.equal(snapshot.nextStepReason, '');
});

test('adaptLegalResultForDisplay construye un case workspace util para UI', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    visible_summary: 'Resumen breve del caso.',
    case_workspace: {
      case_id: 'conv-123',
      workspace_version: 'case_workspace_v1',
      case_status: 'needs_information',
      case_summary: 'Caso de alimentos con base inicial y un dato critico pendiente.',
      facts_confirmed: [
        { key: 'hay_hijos', label: 'Hijos', value: true },
        { key: 'ingresos', label: 'Ingresos del otro progenitor', value: 'Aproximados' },
      ],
      facts_missing: [
        { key: 'domicilio_relevante', label: 'Domicilio relevante', category: 'critical' },
      ],
      facts_conflicting: [
        { key: 'vinculo', prev_value: 'padre', new_value: 'tio' },
      ],
      action_plan: [
        {
          id: 'step_1',
          title: 'Aclarar el domicilio relevante',
          description: 'Confirmar donde corresponde tramitar el caso.',
          priority: 'high',
          status: 'pending',
          why_it_matters: 'Eso destraba la via correcta.',
        },
      ],
      evidence_checklist: {
        critical: [{ key: 'dni', label: 'DNI', reason: 'Sirve para acreditar identidad.' }],
        recommended: [{ key: 'recibos', label: 'Recibos', reason: 'Ayudan a estimar ingresos.' }],
        optional: [],
      },
      risk_alerts: [{ type: 'fact_conflict', severity: 'high', message: 'Hay un dato contradictorio.' }],
      recommended_next_question: 'En que ciudad vive hoy el nino?',
      professional_handoff: {
        ready_for_professional_review: true,
        handoff_reason: 'Conviene una revision profesional breve.',
        suggested_focus: 'Confirmar competencia y documentacion minima.',
        open_items: ['Domicilio relevante'],
        next_question: 'En que ciudad vive hoy el nino?',
      },
      last_updated_at: '2026-04-08T00:00:00Z',
    },
    conversational: {
      message: 'Orientacion inicial.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.caseWorkspace.available, true);
  assert.equal(display.caseWorkspace.shouldRenderPanel, true);
  assert.equal(display.caseWorkspace.status.label, 'Falta una aclaracion importante');
  assert.equal(display.caseWorkspace.primaryDefinedFacts.length, 2);
  assert.equal(display.caseWorkspace.primaryMissingFacts[0], 'vinculo: aparece como "padre" y tambien como "tio"');
  assert.equal(display.caseWorkspace.actionPlan[0].title, 'Aclarar el domicilio relevante');
  assert.equal(display.caseWorkspace.evidenceChecklist.critical[0].label, 'DNI');
  assert.equal(display.caseWorkspace.handoff.openItems[0], 'Domicilio relevante');
});

test('adaptLegalResultForDisplay oculta case workspace cuando no viene', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'divorcio',
    conversational: {
      message: 'Orientacion simple.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.caseWorkspace.available, false);
  assert.equal(display.caseWorkspace.actionPlan.length, 0);
});

test('adaptLegalResultForDisplay evita duplicar la misma pregunta entre conversacion y workspace', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Necesito una aclaracion breve.',
      question: 'En que ciudad vive hoy el nino?',
      should_ask_first: true,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: ['domicilio_relevante'],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_workspace: {
      case_id: 'conv-dup',
      workspace_version: 'case_workspace_v1',
      case_status: 'needs_information',
      case_summary: 'Falta una aclaracion para seguir.',
      facts_confirmed: [],
      facts_missing: [{ key: 'domicilio_relevante', label: 'Domicilio relevante', category: 'critical' }],
      facts_conflicting: [],
      action_plan: [],
      evidence_checklist: { critical: [], recommended: [], optional: [] },
      risk_alerts: [],
      recommended_next_question: 'En que ciudad vive hoy el nino?',
      professional_handoff: {},
      last_updated_at: '2026-04-08T00:00:00Z',
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.caseWorkspace.nextQuestion, '');
  assert.equal(display.caseWorkspace.primaryMissingFacts[0], 'Domicilio relevante');
});

test('adaptLegalResultForDisplay expone fase operativa y handoff reforzado', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Hay base para revisar.',
      should_ask_first: false,
      known_facts: {},
      case_completeness: {
        is_complete: false,
        missing_critical: [],
        missing_optional: [],
        known_count: 0,
      },
    },
    case_workspace: {
      case_id: 'conv-phase',
      workspace_version: 'case_workspace_v1',
      case_status: 'ready_for_strategy_decision',
      recommended_phase: 'define_strategy',
      recommended_phase_label: 'Definir estrategia',
      operating_phase: 'decide',
      operating_phase_reason: 'La base actual ya permite comparar vias.',
      primary_focus: {
        type: 'strategy',
        label: 'Definir la via principal del caso',
        reason: 'La pregunta central ya no es solo que falta.',
      },
      case_summary: 'Caso suficientemente ordenado para evaluar una via principal.',
      facts_confirmed: [],
      facts_missing: [],
      facts_conflicting: [],
      action_plan: [
        {
          id: 'step_1',
          step_id: 'step_1',
          title: 'Definir la via principal',
          description: 'Comparar la opcion mas conveniente.',
          priority: 'high',
          status: 'pending',
          is_primary: true,
          phase: 'decide',
          phase_label: 'Definir la via principal',
          blocked_by_missing_info: false,
          why_now: 'Ahora conviene fijar criterio para que el caso no siga disperso.',
          why_it_matters: 'Eso ordena el siguiente movimiento.',
        },
      ],
      evidence_checklist: {
        critical: [],
        recommended: [
          {
            key: 'constancia_domicilio',
            label: 'Constancia de domicilio',
            why_it_matters: 'Ayuda a sostener la competencia.',
            supports_step: 'step_1',
          },
        ],
        optional: [],
      },
      risk_alerts: [],
      professional_handoff: {
        ready_for_professional_review: true,
        review_readiness: 'decision_ready',
        handoff_reason: 'La base actual permite una revision profesional util.',
        primary_friction: 'Falta cerrar la via principal.',
        recommended_professional_focus: 'Comparar alternativas y descartar la menos robusta.',
        professional_entry_point: 'Entrar por la definicion de la via principal.',
        open_items: ['Via principal'],
      },
      last_updated_at: '2026-04-08T00:00:00Z',
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.equal(display.caseWorkspace.phase.label, 'Definir estrategia');
  assert.equal(display.caseWorkspace.primaryFocus.label, 'Definir la via principal del caso');
  assert.equal(display.caseWorkspace.actionPlan[0].isPrimary, true);
  assert.equal(display.caseWorkspace.actionPlan[0].phaseLabel, 'Definir la via principal');
  assert.ok(display.caseWorkspace.actionPlan[0].whyNow.includes('criterio'));
  assert.equal(
    display.caseWorkspace.evidenceChecklist.recommended[0].supportsStepTitle,
    'Definir la via principal',
  );
  assert.equal(
    display.caseWorkspace.handoff.reviewReadinessLabel,
    'Listo para decision profesional',
  );
  assert.ok(display.caseWorkspace.handoff.professionalEntryPoint.includes('via principal'));
});
