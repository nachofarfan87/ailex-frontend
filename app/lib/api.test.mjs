import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeApiErrorMessage } from './api.js';

test('normalizeApiErrorMessage vuelve legible un error con detail objeto', () => {
  const message = normalizeApiErrorMessage({
    detail: {
      message: 'La consulta no pudo procesarse por formato invalido.',
      reasons: ['input_too_short'],
    },
  });

  assert.equal(message, 'La consulta no pudo procesarse por formato invalido.');
});

test('normalizeApiErrorMessage usa reasons cuando detail trae solo estructura', () => {
  const message = normalizeApiErrorMessage({
    detail: {
      reasons: ['input_too_short', 'clarification_required'],
    },
  });

  assert.equal(message, 'input_too_short | clarification_required');
});

test('normalizeApiErrorMessage nunca devuelve [object Object]', () => {
  const message = normalizeApiErrorMessage({
    detail: {
      nested: true,
    },
    reasons: ['input_too_short'],
  });

  assert.ok(!message.includes('[object Object]'));
  assert.equal(message, 'input_too_short');
});
