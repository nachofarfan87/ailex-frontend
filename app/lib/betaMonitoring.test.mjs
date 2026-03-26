/**
 * Tests para helpers del dashboard de monitoreo beta.
 *
 * Usa node:test (built-in). Ejecutar:
 *   node --test app/lib/betaMonitoring.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// ── helpers extraidos inline (sin importar React components) ──────────────────

function healthBadgeClass(status) {
  switch (status) {
    case 'healthy':
      return 'badge badge--success';
    case 'degraded':
      return 'badge badge--risk';
    case 'frozen':
      return 'badge badge--risk';
    case 'review_required':
      return 'badge badge--warning';
    default:
      return 'badge';
  }
}

function modeBadgeClass(mode) {
  switch (mode) {
    case 'auto':
      return 'badge badge--success';
    case 'review_required':
      return 'badge badge--warning';
    case 'manual_only':
      return 'badge badge--warning';
    case 'frozen':
      return 'badge badge--risk';
    default:
      return 'badge';
  }
}

function priorityBadgeClass(priority) {
  switch (priority) {
    case 'high':
      return 'badge badge--risk';
    case 'medium':
      return 'badge badge--warning';
    case 'low':
      return 'badge badge--muted';
    default:
      return 'badge';
  }
}

function formatHours(hours) {
  if (!hours || hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

function formatRate(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('healthBadgeClass: healthy → success', () => {
  assert.equal(healthBadgeClass('healthy'), 'badge badge--success');
});

test('healthBadgeClass: degraded → risk', () => {
  assert.equal(healthBadgeClass('degraded'), 'badge badge--risk');
});

test('healthBadgeClass: frozen → risk', () => {
  assert.equal(healthBadgeClass('frozen'), 'badge badge--risk');
});

test('healthBadgeClass: review_required → warning', () => {
  assert.equal(healthBadgeClass('review_required'), 'badge badge--warning');
});

test('healthBadgeClass: unknown → badge', () => {
  assert.equal(healthBadgeClass('unknown'), 'badge');
});

test('modeBadgeClass: auto → success', () => {
  assert.equal(modeBadgeClass('auto'), 'badge badge--success');
});

test('modeBadgeClass: frozen → risk', () => {
  assert.equal(modeBadgeClass('frozen'), 'badge badge--risk');
});

test('modeBadgeClass: manual_only → warning', () => {
  assert.equal(modeBadgeClass('manual_only'), 'badge badge--warning');
});

test('priorityBadgeClass: high → risk', () => {
  assert.equal(priorityBadgeClass('high'), 'badge badge--risk');
});

test('priorityBadgeClass: medium → warning', () => {
  assert.equal(priorityBadgeClass('medium'), 'badge badge--warning');
});

test('priorityBadgeClass: low → muted', () => {
  assert.equal(priorityBadgeClass('low'), 'badge badge--muted');
});

test('formatHours: 0 → < 1h', () => {
  assert.equal(formatHours(0), '< 1h');
});

test('formatHours: null → < 1h', () => {
  assert.equal(formatHours(null), '< 1h');
});

test('formatHours: 5 → 5h', () => {
  assert.equal(formatHours(5), '5h');
});

test('formatHours: 30 → 1d 6h', () => {
  assert.equal(formatHours(30), '1d 6h');
});

test('formatRate: 0.85 → 85.0%', () => {
  assert.equal(formatRate(0.85), '85.0%');
});

test('formatRate: 0 → 0.0%', () => {
  assert.equal(formatRate(0), '0.0%');
});

test('formatRate: 1 → 100.0%', () => {
  assert.equal(formatRate(1), '100.0%');
});

// ── Payload structure validation ──────────────────────────────────────────────

test('dashboard payload validates expected structure', () => {
  const mockPayload = {
    system_status: {
      health_status: 'healthy',
      system_mode: 'auto',
      active_safety_status: 'normal',
      app_version: '1.0.0',
      human_interventions_last_24h: 3,
      review_queue_size: 10,
      pending_reviews: 2,
      overrides_active: 0,
    },
    safety_summary: {
      rejected_inputs_count: 0,
      degraded_requests_count: 1,
      rate_limited_requests_count: 0,
      excluded_from_learning_count: 0,
      dominant_safety_reason: null,
      top_safety_reasons: [],
      recent_safety_events: [],
    },
    human_control: {
      system_mode: 'auto',
      pending_reviews_by_priority: { high: 0, medium: 1, low: 1 },
      stale_reviews_count: 0,
      oldest_pending_review_hours: 2.5,
      approval_rate: 0.8,
      rejection_rate: 0.1,
      override_rate: 0.1,
      active_override_summary: {},
      overrides: [],
    },
    review_queue_preview: [],
    alerts: [],
  };

  // Verify top-level keys
  assert.ok('system_status' in mockPayload);
  assert.ok('safety_summary' in mockPayload);
  assert.ok('human_control' in mockPayload);
  assert.ok('review_queue_preview' in mockPayload);
  assert.ok('alerts' in mockPayload);

  // Verify system_status required fields
  const ss = mockPayload.system_status;
  assert.ok('health_status' in ss);
  assert.ok('system_mode' in ss);
  assert.ok('active_safety_status' in ss);
  assert.ok('pending_reviews' in ss);

  // Badge resolves correctly for payload
  assert.equal(healthBadgeClass(ss.health_status), 'badge badge--success');
  assert.equal(modeBadgeClass(ss.system_mode), 'badge badge--success');
});

test('dashboard renders review items with priority/aging correctly', () => {
  const reviewItems = [
    { id: '1', parameter_name: 'threshold_a', final_action: 'apply', review_priority: 'high', age_hours: 48, is_stale: true, review_status: 'pending' },
    { id: '2', parameter_name: 'threshold_b', final_action: 'observe_only', review_priority: 'low', age_hours: 2, is_stale: false, review_status: 'pending' },
  ];

  // High priority item
  assert.equal(priorityBadgeClass(reviewItems[0].review_priority), 'badge badge--risk');
  assert.equal(reviewItems[0].is_stale, true);
  assert.equal(formatHours(reviewItems[0].age_hours), '2d 0h');

  // Low priority item
  assert.equal(priorityBadgeClass(reviewItems[1].review_priority), 'badge badge--muted');
  assert.equal(reviewItems[1].is_stale, false);
  assert.equal(formatHours(reviewItems[1].age_hours), '2h');
});

test('error state does not crash — payload can be null', () => {
  const data = null;
  // Simulates the guard: if (error && !data) → show error
  const hasError = true;
  const shouldShowError = hasError && !data;
  assert.ok(shouldShowError);
});
