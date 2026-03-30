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
