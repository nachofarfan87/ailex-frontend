import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventTypeOptions,
  buildTimelineGeometry,
  filterDecisionRows,
  filterLiveAlerts,
  filterMetricRows,
  getDecisionTone,
  getDecisionInsightSearchTerm,
  getDirectionTone,
  getDriftTone,
  formatLiveAlertWindow,
  getLiveAlertImpactCopy,
  getLiveAlertScope,
  getLiveAlertScopeLabel,
  getLiveAlertSeverityLabel,
  getLiveAlertSeverityTone,
  getTopLiveAlerts,
  INSIGHT_ACTION_MAP,
  normalizeLiveAlertsSnapshot,
  normalizeInsightExplanation,
  resolveInsightAction,
  sortLiveAlerts,
  summarizeLiveAlertThreshold,
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

test('normalizeLiveAlertsSnapshot ordena por severidad y recencia', () => {
  const normalized = normalizeLiveAlertsSnapshot({
    generated_at: '2026-03-31T12:00:00+00:00',
    summary: {
      total_alerts: 3,
      surfaced_alerts: 3,
      by_severity: { critical: 1, warning: 1, info: 1 },
      by_category: { loop_risk: 1, resolution_drop: 1, low_confidence_cluster: 1 },
      active_categories: ['loop_risk', 'resolution_drop', 'low_confidence_cluster'],
    },
    alerts: [
      {
        alert_id: 'info-1',
        category: 'low_confidence_cluster',
        severity: 'info',
        title: 'Info',
        description: 'info',
        detected_at: '2026-03-31T11:55:00+00:00',
      },
      {
        alert_id: 'warning-1',
        category: 'loop_risk',
        severity: 'warning',
        title: 'Warning',
        description: 'warning',
        detected_at: '2026-03-31T11:59:00+00:00',
      },
      {
        alert_id: 'critical-1',
        category: 'resolution_drop',
        severity: 'critical',
        title: 'Critical',
        description: 'critical',
        detected_at: '2026-03-31T11:50:00+00:00',
      },
    ],
  });

  assert.deepEqual(normalized.alerts.map((item) => item.alert_id), ['critical-1', 'warning-1', 'info-1']);
  assert.equal(normalized.summary.by_severity.critical, 1);
  assert.equal(normalized.availableCategories.length, 3);
});

test('normalizeLiveAlertsSnapshot tolera datos parciales', () => {
  const normalized = normalizeLiveAlertsSnapshot({
    alerts: [
      {
        category: 'loop_risk',
        severity: 'warning',
      },
    ],
  });

  assert.equal(normalized.alerts.length, 1);
  assert.equal(normalized.alerts[0].title, 'Alerta operativa');
  assert.deepEqual(normalized.alerts[0].metric, {});
  assert.deepEqual(normalized.alerts[0].threshold, {});
  assert.deepEqual(normalized.alerts[0].evidence, {});
});

test('filterLiveAlerts filtra por severidad y categoria', () => {
  const alerts = [
    { alert_id: 'a', severity: 'critical', category: 'resolution_drop' },
    { alert_id: 'b', severity: 'warning', category: 'loop_risk' },
    { alert_id: 'c', severity: 'warning', category: 'resolution_drop' },
  ];

  assert.deepEqual(
    filterLiveAlerts(alerts, { severity: 'warning' }).map((item) => item.alert_id),
    ['b', 'c'],
  );
  assert.deepEqual(
    filterLiveAlerts(alerts, { category: 'resolution_drop' }).map((item) => item.alert_id),
    ['a', 'c'],
  );
});

test('sortLiveAlerts prioriza severidad y luego recencia', () => {
  const sorted = sortLiveAlerts([
    { alert_id: 'a', severity: 'warning', detected_at: '2026-03-31T11:00:00+00:00' },
    { alert_id: 'b', severity: 'critical', detected_at: '2026-03-31T10:00:00+00:00' },
    { alert_id: 'c', severity: 'warning', detected_at: '2026-03-31T12:00:00+00:00', recommended_action: 'Revisar' },
  ]);

  assert.deepEqual(sorted.map((item) => item.alert_id), ['b', 'c', 'a']);
});

test('helpers de severidad de live alerts usan tonos esperados', () => {
  assert.equal(getLiveAlertSeverityTone('critical'), 'risk');
  assert.equal(getLiveAlertSeverityTone('warning'), 'warning');
  assert.equal(getLiveAlertSeverityTone('info'), 'muted');
  assert.equal(getLiveAlertSeverityLabel('critical'), 'Critical');
  assert.equal(getLiveAlertSeverityLabel('warning'), 'Warning');
});

test('scope badge distingue global, family y signature', () => {
  assert.equal(getLiveAlertScope({ related_signature: 'sig:test' }), 'signature');
  assert.equal(getLiveAlertScope({ related_family: 'fam:test' }), 'family');
  assert.equal(getLiveAlertScope({}), 'global');
  assert.equal(getLiveAlertScopeLabel({ related_signature: 'sig:test' }), 'Signature');
  assert.equal(getLiveAlertScopeLabel({ related_family: 'fam:test' }), 'Family');
  assert.equal(getLiveAlertScopeLabel({}), 'Global');
});

test('impact copy traduce la alerta a una consecuencia operativa', () => {
  assert.match(
    getLiveAlertImpactCopy({ category: 'loop_risk', severity: 'warning' }),
    /repreguntas innecesarias/i,
  );
  assert.match(
    getLiveAlertImpactCopy({ category: 'high_review_queue_pressure', severity: 'critical' }),
    /presion de revision/i,
  );
});

test('getTopLiveAlerts devuelve las alertas prioritarias segun orden mejorado', () => {
  const alerts = getTopLiveAlerts([
    { alert_id: 'global-warning', severity: 'warning', detected_at: '2026-03-31T11:30:00+00:00' },
    { alert_id: 'signature-warning', severity: 'warning', detected_at: '2026-03-31T11:30:00+00:00', recommended_action: 'Revisar', related_signature: 'sig:a' },
    { alert_id: 'family-critical', severity: 'critical', detected_at: '2026-03-31T10:00:00+00:00', related_family: 'fam:a' },
    { alert_id: 'info', severity: 'info', detected_at: '2026-03-31T12:00:00+00:00' },
  ], 2);

  assert.deepEqual(alerts.map((item) => item.alert_id), ['family-critical', 'signature-warning']);
});

test('formatLiveAlertWindow resume ventana y freshness', () => {
  assert.equal(
    formatLiveAlertWindow({ last_hours: 6, event_limit: 200, recent_event_count: 18 }),
    'Ultimas 6h · 200 eventos max. · 18 observados',
  );
  assert.equal(formatLiveAlertWindow({}), 'Ventana reciente');
});

test('summarizeLiveAlertThreshold toma el primer threshold disponible', () => {
  assert.equal(
    summarizeLiveAlertThreshold({ threshold: { warning_ratio: 0.65, critical_ratio: 0.8 } }),
    'Warning Ratio: 0.65',
  );
  assert.equal(summarizeLiveAlertThreshold({ threshold: {} }), '');
});
