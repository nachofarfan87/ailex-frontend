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
