import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLegalQueryResponse } from './legalQuery.js';

test('normalizeLegalQueryResponse no serializa next_step object como [object Object]', () => {
  const normalized = normalizeLegalQueryResponse({
    conversational: {
      message: { description: 'Mensaje real' },
      question: { question: 'Pregunta real?' },
      next_step: { description: 'Paso humano' },
      options: [{ label: 'Si' }, { label: 'No' }],
      missing_facts: [{ label: 'Hay hijos' }],
      asked_questions: [{ question: 'Ya preguntado?' }],
      guided_response: { description: 'Necesito confirmar esto' },
      should_ask_first: true,
      case_completeness: {},
    },
    conversational_response: {
      messages: [{ type: 'question', text: { question: 'Pregunta real?' } }],
      primary_question: { question: 'Pregunta real?' },
    },
  });

  assert.equal(normalized.conversational.message, 'Mensaje real');
  assert.equal(normalized.conversational.question, 'Pregunta real?');
  assert.equal(normalized.conversational.next_step, 'Paso humano');
  assert.deepEqual(normalized.conversational.options, ['Si', 'No']);
  assert.deepEqual(normalized.conversational.missing_facts, ['Hay hijos']);
  assert.deepEqual(normalized.conversational.asked_questions, ['Ya preguntado?']);
  assert.equal(normalized.conversational.guided_response, 'Necesito confirmar esto');
  assert.equal(normalized.conversational_response.primary_question, 'Pregunta real?');
  assert.equal(normalized.conversational_response.messages[0].text, 'Pregunta real?');
});

test('normalizeLegalQueryResponse preserva case_progress y su narrativa para la UI', () => {
  const normalized = normalizeLegalQueryResponse({
    case_progress: {
      stage: 'decision',
      readiness_level: 0.71,
      readiness_label: 'high',
      progress_status: 'advancing',
      next_step_type: 'decide',
      critical_gaps: [],
      important_gaps: [{ key: 'jurisdiccion', label: 'jurisdiccion relevante' }],
      blocking_issues: [],
      contradictions: [],
      contradiction_count: 0,
      basis: { confirmed_fact_count: 4 },
    },
    case_progress_snapshot: {
      stage: 'decision',
      next_step_type: 'decide',
    },
    case_progress_narrative: {
      applies: true,
      progress_block: 'Ya hay una base suficiente para definir la via principal.',
      priority_block: 'Lo siguiente mas util es definir la jurisdiccion.',
    },
  });

  assert.equal(normalized.case_progress.stage, 'decision');
  assert.equal(normalized.case_progress.next_step_type, 'decide');
  assert.equal(normalized.case_progress.important_gaps[0].key, 'jurisdiccion');
  assert.equal(normalized.case_progress_snapshot.stage, 'decision');
  assert.equal(normalized.case_progress_narrative.applies, true);
  assert.equal(
    normalized.case_progress_narrative.priority_block,
    'Lo siguiente mas util es definir la jurisdiccion.',
  );
});

test('normalizeLegalQueryResponse preserva professional_judgment para la UI', () => {
  const normalized = normalizeLegalQueryResponse({
    smart_strategy: {
      strategy_mode: 'action_first',
      recommended_tone: 'directo',
    },
    professional_judgment: {
      applies: true,
      dominant_factor: 'Lo que mas pesa hoy es que ya hay base suficiente para actuar.',
      best_next_move: 'Presentar el reclamo principal.',
      why_this_matters_now: 'Porque ya hay base suficiente para pasar a accion.',
      followup_why: 'Esto permite confirmar un punto sensible.',
      highlights: [
        'Lo que mas pesa hoy es que ya hay base suficiente para actuar.',
        'El riesgo practico es demorar una medida util.',
      ],
      decision_transparency: {
        applies: true,
        technical_trace: {
          decision_intent: 'act',
          decision_trace: ['actionability dominates because the base is already usable'],
          clarification_status: 'none',
          precision_required: false,
          confidence_context: {
            summary: 'La decision tiene buena claridad y tambien una base bastante estable.',
            decision_confidence_level: 'high',
            confidence_clarity_score: 84,
            confidence_stability_score: 81,
          },
        },
        professional_explanation: {
          decision_explanation:
            'La decision prioriza presentar el reclamo principal porque ese movimiento hoy ordena mejor el caso.',
        },
        user_explanation: {
          user_why_this: 'Este paso se prioriza porque hoy es el que mejor hace avanzar el caso.',
        },
        alternatives_considered: [
          {
            option: 'Seguir preguntando antes de actuar',
            status: 'deferred',
            reason: 'No se priorizo porque la base ya permite avanzar.',
          },
        ],
      },
    },
  });

  assert.equal(normalized.smart_strategy.strategy_mode, 'action_first');
  assert.equal(normalized.professional_judgment.applies, true);
  assert.equal(
    normalized.professional_judgment.best_next_move,
    'Presentar el reclamo principal.',
  );
  assert.equal(normalized.professional_judgment.highlights.length, 2);
  assert.equal(normalized.professional_judgment.decision_transparency.applies, true);
  assert.equal(
    normalized.professional_judgment.decision_transparency.technical_trace.decision_intent,
    'act',
  );
  assert.equal(
    normalized.professional_judgment.decision_transparency.technical_trace.clarification_status,
    'none',
  );
  assert.equal(
    normalized.professional_judgment.decision_transparency.user_explanation.user_why_this,
    'Este paso se prioriza porque hoy es el que mejor hace avanzar el caso.',
  );
});

test('normalizeLegalQueryResponse limpia placeholders rotos en campos visibles', () => {
  const normalized = normalizeLegalQueryResponse({
    jurisdiction: { label: 'Jujuy' },
    forum: { label: 'Civil' },
    case_domain: { label: 'Divorcio' },
    output_modes: {
      user: {
        title: 'Orientacion inicial para {}',
        summary: 'Resumen con [object Object]',
      },
    },
  });

  assert.equal(normalized.jurisdiction, 'Jujuy');
  assert.equal(normalized.forum, 'Civil');
  assert.equal(normalized.case_domain, 'Divorcio');
  assert.equal(normalized.output_modes.user.title, 'Orientacion inicial para');
  assert.equal(normalized.output_modes.user.summary, 'Resumen con');
});
