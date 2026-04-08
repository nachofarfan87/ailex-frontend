import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTypingLabel,
  canStartSubmit,
  getConversationalQuestion,
  getConversationalRevealDelay,
  normalizeConversationalChat,
  shouldAutoScroll,
  shouldShowTypingIndicator,
  shouldSubmitOnEnter,
  submitConversationalAnswer,
} from './conversationalChat.js';
import { adaptLegalResultForDisplay } from './legalResultAdapter.js';

test('renderiza mensajes conversacionales en orden conservado', () => {
  const chat = normalizeConversationalChat({
    messages: [
      { type: 'info', text: 'Primero' },
      { type: 'practical', text: 'Segundo' },
      { type: 'question', text: 'Tercero' },
    ],
  });

  assert.equal(chat.messages.length, 3);
  assert.deepEqual(
    chat.messages.map((item) => item.text),
    ['Primero', 'Segundo', 'Tercero'],
  );
});

test('detecta la pregunta principal al final', () => {
  const question = getConversationalQuestion([
    { type: 'info', text: 'Orientacion' },
    { type: 'question', text: '¿Aporta algo actualmente?' },
  ]);

  assert.deepEqual(question, {
    type: 'question',
    text: '¿Aporta algo actualmente?',
  });
});

test('delay helper devuelve valores coherentes por tipo', () => {
  assert.equal(getConversationalRevealDelay(0, { type: 'info' }, 4), 220);
  assert.equal(getConversationalRevealDelay(1, { type: 'info' }, 4), 240);
  assert.equal(getConversationalRevealDelay(2, { type: 'practical' }, 4), 360);
  assert.equal(getConversationalRevealDelay(2, { type: 'focus' }, 4), 410);
  assert.equal(getConversationalRevealDelay(3, { type: 'question' }, 4), 500);
});

test('typing indicator aparece cuando corresponde y desaparece al final', () => {
  assert.equal(shouldShowTypingIndicator(0, 3), false);
  assert.equal(shouldShowTypingIndicator(1, 3), true);
  assert.equal(shouldShowTypingIndicator(2, 3), true);
  assert.equal(shouldShowTypingIndicator(3, 3), false);
});

test('typing label cambia segun tipo del siguiente mensaje', () => {
  assert.equal(buildTypingLabel({ type: 'info' }), 'AILEX esta preparando la respuesta...');
  assert.equal(buildTypingLabel({ type: 'practical' }), 'AILEX esta preparando la respuesta...');
  assert.equal(buildTypingLabel({ type: 'focus' }), 'AILEX esta afinando el punto clave...');
  assert.equal(buildTypingLabel({ type: 'question' }), 'AILEX esta preparando la siguiente pregunta...');
  assert.equal(buildTypingLabel(null), 'AILEX esta organizando la respuesta...');
});

test('autoscroll helper devuelve true si el usuario esta cerca del final', () => {
  assert.equal(
    shouldAutoScroll({
      scrollHeight: 1000,
      clientHeight: 500,
      scrollTop: 390,
    }),
    true,
  );
});

test('autoscroll helper devuelve false si el usuario se alejo del final', () => {
  assert.equal(
    shouldAutoScroll({
      scrollHeight: 1500,
      clientHeight: 500,
      scrollTop: 600,
    }),
    false,
  );
});

test('autoscroll helper no fuerza scroll global si el contenedor no tiene overflow propio', () => {
  assert.equal(
    shouldAutoScroll({
      scrollHeight: 480,
      clientHeight: 480,
      scrollTop: 0,
    }),
    false,
  );
});

test('boton disabled con input vacio', () => {
  assert.equal(canStartSubmit(false, ''), false);
  assert.equal(canStartSubmit(false, '   '), false);
  assert.equal(canStartSubmit(false, 'respuesta valida'), true);
});

test('doble submit bloqueado localmente', () => {
  assert.equal(canStartSubmit(true, 'respuesta valida'), false);
  assert.equal(canStartSubmit(false, 'respuesta valida'), true);
});

test('callback se dispara con Enter', () => {
  assert.equal(
    shouldSubmitOnEnter({ key: 'Enter', shiftKey: false, nativeEvent: { isComposing: false } }),
    true,
  );
});

test('callback recibe texto trimmeado e input se limpia tras enviar', () => {
  const calls = [];
  const result = submitConversationalAnswer('  respuesta util  ', (text) => {
    calls.push(text);
  });

  assert.equal(result.submitted, true);
  assert.equal(result.nextValue, '');
  assert.equal(result.text, 'respuesta util');
  assert.deepEqual(calls, ['respuesta util']);
});

test('no rompe si no hay callback', () => {
  const result = submitConversationalAnswer('  hola  ');
  assert.equal(result.submitted, true);
  assert.equal(result.nextValue, '');
  assert.equal(result.text, 'hola');
});

test('Shift+Enter no dispara submit y texto vacio no envia', () => {
  assert.equal(
    shouldSubmitOnEnter({ key: 'Enter', shiftKey: true, nativeEvent: { isComposing: false } }),
    false,
  );

  const calls = [];
  const result = submitConversationalAnswer('   ', (text) => {
    calls.push(text);
  });
  assert.equal(result.submitted, false);
  assert.deepEqual(calls, []);
});

test('fallback sigue intacto si falta conversational_response', () => {
  const display = adaptLegalResultForDisplay({
    case_domain: 'alimentos',
    conversational: {
      message: 'Fallback legacy',
      question: '',
      options: [],
      missing_facts: [],
      next_step: '',
      should_ask_first: false,
      guided_response: '',
      known_facts: {},
      clarification_status: '',
      asked_questions: [],
      case_completeness: { is_complete: false, missing_critical: [], missing_optional: [] },
    },
    output_modes: { user: {}, professional: {} },
  });

  assert.deepEqual(display.conversationalResponse.messages, []);
  assert.equal(display.conversational.message, 'Fallback legacy');
});
