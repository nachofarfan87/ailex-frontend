import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLatestAssistantTurn,
  getLatestAssistantTurnId,
  shouldScrollToAssistantTurn,
} from './threadScroll.js';

test('devuelve el ultimo turno del asistente', () => {
  const latest = getLatestAssistantTurn([
    { id: 'u1', role: 'user' },
    { id: 'a1', role: 'assistant' },
    { id: 'u2', role: 'user' },
    { id: 'a2', role: 'assistant' },
  ]);

  assert.deepEqual(latest, { id: 'a2', role: 'assistant' });
});

test('devuelve string vacio si no hay turno de asistente', () => {
  assert.equal(getLatestAssistantTurnId([{ id: 'u1', role: 'user' }]), '');
  assert.equal(getLatestAssistantTurnId(null), '');
});

test('solo habilita scroll cuando aparece un nuevo turno de asistente', () => {
  assert.equal(shouldScrollToAssistantTurn('assistant-2', ''), true);
  assert.equal(shouldScrollToAssistantTurn('assistant-2', 'assistant-1'), true);
  assert.equal(shouldScrollToAssistantTurn('assistant-2', 'assistant-2'), false);
  assert.equal(shouldScrollToAssistantTurn('', 'assistant-2'), false);
});
