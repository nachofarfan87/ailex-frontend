import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventTypeOptions,
  buildTimelineGeometry,
  filterDecisionRows,
  filterMetricRows,
  getDecisionTone,
  getDecisionInsightSearchTerm,
  getDirectionTone,
  getDriftTone,
  INSIGHT_ACTION_MAP,
  normalizeInsightExplanation,
  resolveInsightAction,
  sortDecisionsByDate,
} from './learningObservability.mjs';

test('buildEventTypeOptions ordena y extrae tipos', () => {
  const options = buildEventTypeOptions([
    { event_type: 'domain_override' },
    { event_type: 'threshold_adjustment' },
    { event_type: 'domain_override' },
  ]);

  assert.deepEqual(options, [
    'domain_override',
    'domain_override',
    'threshold_adjustment',
  ]);
});

test('filterMetricRows prioriza peor score por defecto', () => {
  const rows = [
    { signature: 'a', event_type: 'threshold_adjustment', observation_count: 3, avg_score: 0.4 },
    { signature: 'b', event_type: 'domain_override', observation_count: 8, avg_score: -0.6 },
    { signature: 'c', event_type: 'domain_override', observation_count: 5, avg_score: -0.1 },
  ];

  const filtered = filterMetricRows(rows, {
    eventType: 'domain_override',
    search: 'b',
    searchKeys: ['signature'],
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].signature, 'b');
});

test('filterDecisionRows filtra por texto y event_type', () => {
  const rows = [
    {
      event_type: 'threshold_adjustment',
      recommendation_type: 'Adjust thresholds',
      impact_decision_reason: 'boosted_by_positive_signature_impact',
      dominant_signal: { reference: 'threshold_adjustment:low_confidence' },
      impact_score_reference: { signature: 'threshold_adjustment:low_confidence' },
    },
    {
      event_type: 'domain_override',
      recommendation_type: 'Prefer alimentos',
      impact_decision_reason: 'blocked_by_negative_signature_impact',
      dominant_signal: { reference: 'domain_override:prefer_hybrid:alimentos' },
      impact_score_reference: { signature_family: 'domain_override:prefer_hybrid' },
    },
  ];

  const filtered = filterDecisionRows(rows, {
    eventType: 'domain_override',
    search: 'blocked',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].event_type, 'domain_override');
});

test('buildTimelineGeometry genera puntos y path para timeline', () => {
  const geometry = buildTimelineGeometry([
    {
      date: '2026-03-20T00:00:00',
      observations: 3,
      net_score: -1,
      reinforced_count: 0,
      blocked_count: 2,
      neutral_count: 1,
    },
    {
      date: '2026-03-21T00:00:00',
      observations: 4,
      net_score: 2,
      reinforced_count: 3,
      blocked_count: 1,
      neutral_count: 0,
    },
  ]);

  assert.equal(geometry.points.length, 2);
  assert.match(geometry.linePath, /,/);
  assert.ok(geometry.zeroLineY > 0);
});

test('tones de drift y decision reflejan semantica esperada', () => {
  assert.equal(getDriftTone('high'), 'risk');
  assert.equal(getDriftTone('none'), 'success');
  assert.equal(getDecisionTone('blocked'), 'risk');
  assert.equal(getDecisionTone('boosted'), 'success');
  assert.equal(getDirectionTone('positive'), 'success');
  assert.equal(getDirectionTone('negative'), 'risk');
});

test('sortDecisionsByDate ordena descendente por fecha', () => {
  const sorted = sortDecisionsByDate([
    { id: 'a', created_at: '2026-03-20T10:00:00' },
    { id: 'b', created_at: '2026-03-22T10:00:00' },
    { id: 'c', created_at: '2026-03-21T10:00:00' },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ['b', 'c', 'a']);
});

test('resolveInsightAction mapea signature a tabla filtrada', () => {
  const action = resolveInsightAction({
    type: 'signature',
    metrics: {
      signature: 'threshold_adjustment:low_confidence',
      event_type: 'threshold_adjustment',
    },
  });

  assert.deepEqual(action, {
    section: 'signatures',
    label: 'Ver signature',
    eventType: 'threshold_adjustment',
    signatureSearch: 'threshold_adjustment:low_confidence',
    familySearch: '',
    decisionSearch: '',
  });
});

test('resolveInsightAction mapea family a tabla de familias', () => {
  const action = resolveInsightAction({
    type: 'family',
    metrics: {
      signature_family: 'domain_override:prefer_hybrid',
    },
  });

  assert.equal(action.section, 'families');
  assert.equal(action.familySearch, 'domain_override:prefer_hybrid');
});

test('resolveInsightAction mapea decisions a decision trace', () => {
  const action = resolveInsightAction({
    type: 'decisions',
    metrics: {
      dominant_signal_reference: 'domain_override:prefer_hybrid:alimentos',
      block_rate: 0.47,
    },
  });

  assert.equal(action.section, 'decisions');
  assert.equal(action.decisionSearch, 'domain_override:prefer_hybrid:alimentos');
});

test('resolveInsightAction devuelve null si falta metadata util', () => {
  const action = resolveInsightAction({
    type: 'signature',
    metrics: {},
  });

  assert.equal(action, null);
});

test('getDecisionInsightSearchTerm usa fallback semantico para decisiones', () => {
  assert.equal(
    getDecisionInsightSearchTerm({
      impact_decision_reason: 'blocked_by_negative_signature_impact',
      block_rate: 0.47,
    }),
    'blocked_by_negative_signature_impact',
  );

  assert.equal(
    getDecisionInsightSearchTerm({
      block_rate: 0.47,
    }),
    'blocked',
  );
});

test('INSIGHT_ACTION_MAP expone acciones declarativas esperadas', () => {
  assert.equal(typeof INSIGHT_ACTION_MAP.signature.resolve, 'function');
  assert.equal(typeof INSIGHT_ACTION_MAP.family.resolve, 'function');
  assert.equal(typeof INSIGHT_ACTION_MAP.drift.resolve, 'function');
  assert.equal(typeof INSIGHT_ACTION_MAP.decisions.resolve, 'function');
});

test('normalizeInsightExplanation conserva estructura backend', () => {
  const explanation = normalizeInsightExplanation({
    type: 'drift',
    message: 'Drift detectado',
    explanation: {
      version: 'v1',
      source: 'learning_insights_service',
      summary: 'Se detecto cambio relevante.',
      conditions: ['delta >= 0.25'],
      thresholds: { score_delta_threshold: 0.25 },
      evidence: { delta: 0.4 },
      interpretation: 'Conviene revisar timeline.',
    },
  });

  assert.equal(explanation.summary, 'Se detecto cambio relevante.');
  assert.deepEqual(explanation.conditions, ['delta >= 0.25']);
  assert.equal(explanation.version, 'v1');
  assert.equal(explanation.source, 'learning_insights_service');
  assert.equal(explanation.isFallback, false);
});

test('normalizeInsightExplanation usa fallback cuando falta explanation', () => {
  const explanation = normalizeInsightExplanation({
    type: 'signature',
    message: 'Patron critico detectado',
    metrics: { signature: 'threshold_adjustment:low_confidence' },
  });

  assert.equal(explanation.summary, 'Patron critico detectado');
  assert.equal(explanation.isFallback, true);
  assert.equal(explanation.source, 'frontend_fallback');
  assert.equal(explanation.evidence.signature, 'threshold_adjustment:low_confidence');
});
