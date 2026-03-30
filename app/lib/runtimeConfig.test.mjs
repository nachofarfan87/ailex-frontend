import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AILEX_ENV,
  GUEST_QUERY_LIMIT,
  buildGuestAccessMessage,
  buildGuestLimitReachedMessage,
  isGuestQueryLimitEnabled,
} from './runtimeConfig.js';

test('runtimeConfig defaults to unlimited guest mode in dev', () => {
  assert.equal(AILEX_ENV, 'dev');
  assert.equal(GUEST_QUERY_LIMIT, 0);
  assert.equal(isGuestQueryLimitEnabled(), false);
});

test('runtimeConfig builds internal testing message when guest limit is disabled', () => {
  assert.match(buildGuestAccessMessage(12), /sin limite de consultas/i);
  assert.match(buildGuestLimitReachedMessage(), /no hay limite de consultas/i);
});
