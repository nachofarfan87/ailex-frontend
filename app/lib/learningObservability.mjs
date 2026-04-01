export function formatCompactNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }

  return new Intl.NumberFormat('es-AR', {
    notation: numeric >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: numeric >= 1000 ? 1 : 0,
  }).format(numeric);
}

export function formatScore(value, digits = 3) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0.000';
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(numeric);
}

export function formatPercent(value, digits = 1) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric);
}

export function formatDateTime(value) {
  if (!value) {
    return 'Sin registro';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatDateLabel(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

export function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

export function humanizeToken(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return 'No informado';
  }

  return raw
    .replace(/_/g, ' ')
    .replace(/:/g, ' / ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStatusTone(status) {
  switch (status) {
    case 'reinforced':
    case 'improved':
    case 'applied':
    case 'positive':
      return 'success';
    case 'blocked':
    case 'regressed':
    case 'negative':
    case 'skipped':
      return 'risk';
    case 'watch':
    case 'medium':
      return 'warning';
    case 'neutral':
    case 'none':
    default:
      return 'muted';
  }
}

export function getDecisionTone(mode) {
  switch (mode) {
    case 'boosted':
    case 'allowed':
    case 'reinforce':
      return 'success';
    case 'blocked':
    case 'block':
      return 'risk';
    case 'observed':
      return 'warning';
    default:
      return 'muted';
  }
}

export function getDirectionTone(direction) {
  switch (direction) {
    case 'positive':
      return 'success';
    case 'negative':
      return 'risk';
    case 'neutral':
    default:
      return 'muted';
  }
}

export function getDriftTone(level) {
  switch (level) {
    case 'high':
      return 'risk';
    case 'medium':
      return 'warning';
    case 'low':
      return 'trust';
    default:
      return 'success';
  }
}

export function getLiveAlertSeverityTone(severity) {
  switch (severity) {
    case 'critical':
      return 'risk';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'muted';
  }
}

export function getLiveAlertSeverityLabel(severity) {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Info';
    default:
      return humanizeToken(severity);
  }
}

export function buildEventTypeOptions(events = []) {
  return events
    .map((event) => event?.event_type)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'es'));
}

function includesSearch(text, search) {
  if (!search) {
    return true;
  }

  return String(text || '').toLowerCase().includes(search);
}

export function filterMetricRows(rows = [], options = {}) {
  const {
    search = '',
    eventType = '',
    sort = 'worst_score',
    searchKeys = [],
  } = options;
  const normalizedSearch = String(search || '').trim().toLowerCase();

  const filtered = rows.filter((row) => {
    if (eventType && row?.event_type !== eventType) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return searchKeys.some((key) => includesSearch(row?.[key], normalizedSearch));
  });

  const sorted = [...filtered];

  switch (sort) {
    case 'most_observations':
      sorted.sort((left, right) => {
        const byCount = Number(right?.observation_count ?? 0) - Number(left?.observation_count ?? 0);
        if (byCount !== 0) {
          return byCount;
        }
        return Number(left?.avg_score ?? 0) - Number(right?.avg_score ?? 0);
      });
      break;
    case 'best_score':
      sorted.sort((left, right) => {
        const byScore = Number(right?.avg_score ?? 0) - Number(left?.avg_score ?? 0);
        if (byScore !== 0) {
          return byScore;
        }
        return Number(right?.observation_count ?? 0) - Number(left?.observation_count ?? 0);
      });
      break;
    case 'recent':
      sorted.sort((left, right) => {
        const leftTime = left?.last_seen_at ? new Date(left.last_seen_at).getTime() : 0;
        const rightTime = right?.last_seen_at ? new Date(right.last_seen_at).getTime() : 0;
        return rightTime - leftTime;
      });
      break;
    case 'worst_score':
    default:
      sorted.sort((left, right) => {
        const byScore = Number(left?.avg_score ?? 0) - Number(right?.avg_score ?? 0);
        if (byScore !== 0) {
          return byScore;
        }
        return Number(right?.observation_count ?? 0) - Number(left?.observation_count ?? 0);
      });
      break;
  }

  return sorted;
}

export function filterDecisionRows(rows = [], options = {}) {
  const { search = '', eventType = '' } = options;
  const normalizedSearch = String(search || '').trim().toLowerCase();

  return rows.filter((row) => {
    if (eventType && row?.event_type !== eventType) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      row?.event_type,
      row?.recommendation_type,
      row?.decision_mode,
      row?.impact_decision_reason,
      row?.dominant_signal?.reference,
      row?.impact_score_reference?.signature,
      row?.impact_score_reference?.signature_family,
    ].some((value) => includesSearch(value, normalizedSearch));
  });
}

export function buildTimelineGeometry(items = [], dimensions = {}) {
  const width = Number(dimensions.width ?? Math.max(items.length * 84, 640));
  const height = Number(dimensions.height ?? 240);
  const padding = { top: 20, right: 18, bottom: 34, left: 18 };
  const innerWidth = Math.max(width - padding.left - padding.right, 1);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 1);
  const maxObservations = Math.max(...items.map((item) => Number(item?.observations ?? 0)), 1);
  const maxAbsScore = Math.max(...items.map((item) => Math.abs(Number(item?.net_score ?? 0))), 1);
  const zeroLineY = padding.top + innerHeight / 2;
  const stepX = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth / 2;

  const points = items.map((item, index) => {
    const x = padding.left + (items.length > 1 ? stepX * index : innerWidth / 2);
    const score = Number(item?.net_score ?? 0);
    const y = zeroLineY - (score / maxAbsScore) * (innerHeight * 0.42);

    const reinforcedHeight = (Number(item?.reinforced_count ?? 0) / maxObservations) * (innerHeight * 0.32);
    const blockedHeight = (Number(item?.blocked_count ?? 0) / maxObservations) * (innerHeight * 0.32);
    const neutralHeight = (Number(item?.neutral_count ?? 0) / maxObservations) * (innerHeight * 0.18);

    return {
      index,
      x,
      y,
      label: formatDateLabel(item?.date),
      score,
      bars: {
        reinforcedHeight,
        blockedHeight,
        neutralHeight,
      },
      raw: item,
    };
  });

  return {
    width,
    height,
    padding,
    zeroLineY,
    linePath: points.map((point) => `${point.x},${point.y}`).join(' '),
    points,
  };
}

export function extractSectionState(value, fallback) {
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : fallback;
  }

  if (fallback && typeof fallback === 'object') {
    return value && typeof value === 'object' ? value : fallback;
  }

  return value ?? fallback;
}

const LIVE_ALERT_SEVERITY_RANK = {
  critical: 0,
  warning: 1,
  info: 2,
};

const LIVE_ALERT_SCOPE_RANK = {
  signature: 0,
  family: 1,
  global: 2,
};

function sanitizeCountMap(value = {}) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, count]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) {
      return acc;
    }
    const numeric = Number(count ?? 0);
    acc[normalizedKey] = Number.isFinite(numeric) ? numeric : 0;
    return acc;
  }, {});
}

function normalizeAlertWindow(window = {}) {
  return {
    mode: window?.mode || 'mixed',
    last_hours: Number(window?.last_hours ?? 0) || 0,
    event_limit: Number(window?.event_limit ?? 0) || 0,
    recent_event_count: Number(window?.recent_event_count ?? 0) || 0,
  };
}

function normalizeAlertMetric(metric = {}) {
  return metric && typeof metric === 'object' ? metric : {};
}

function normalizeAlertThreshold(threshold = {}) {
  return threshold && typeof threshold === 'object' ? threshold : {};
}

function normalizeAlertEvidence(evidence = {}) {
  return evidence && typeof evidence === 'object' ? evidence : {};
}

export function sortLiveAlerts(alerts = []) {
  return [...alerts].sort((left, right) => {
    const severityDelta =
      (LIVE_ALERT_SEVERITY_RANK[left?.severity] ?? 99) -
      (LIVE_ALERT_SEVERITY_RANK[right?.severity] ?? 99);
    if (severityDelta !== 0) {
      return severityDelta;
    }

    const leftTime = left?.detected_at ? new Date(left.detected_at).getTime() : 0;
    const rightTime = right?.detected_at ? new Date(right.detected_at).getTime() : 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    const leftHasAction = left?.recommended_action ? 1 : 0;
    const rightHasAction = right?.recommended_action ? 1 : 0;
    if (rightHasAction !== leftHasAction) {
      return rightHasAction - leftHasAction;
    }

    const leftScope = LIVE_ALERT_SCOPE_RANK[getLiveAlertScope(left)] ?? 99;
    const rightScope = LIVE_ALERT_SCOPE_RANK[getLiveAlertScope(right)] ?? 99;
    return leftScope - rightScope;
  });
}

export function filterLiveAlerts(alerts = [], options = {}) {
  const { severity = '', category = '' } = options;
  return alerts.filter((alert) => {
    if (severity && alert?.severity !== severity) {
      return false;
    }
    if (category && alert?.category !== category) {
      return false;
    }
    return true;
  });
}

export function normalizeLiveAlertsSnapshot(snapshot = {}) {
  const rawAlerts = Array.isArray(snapshot?.alerts) ? snapshot.alerts : [];
  const alerts = sortLiveAlerts(
    rawAlerts.map((alert, index) => ({
      alert_id: alert?.alert_id || `alert-${index}`,
      category: alert?.category || 'unknown',
      severity: alert?.severity || 'info',
      title: alert?.title || 'Alerta operativa',
      description: alert?.description || 'Sin descripcion adicional.',
      detected_at: alert?.detected_at || '',
      window: normalizeAlertWindow(alert?.window),
      metric: normalizeAlertMetric(alert?.metric),
      threshold: normalizeAlertThreshold(alert?.threshold),
      related_family: alert?.related_family || '',
      related_signature: alert?.related_signature || '',
      event_type: alert?.event_type || '',
      output_mode: alert?.output_mode || '',
      recommended_action: alert?.recommended_action || '',
      should_surface_to_ui: Boolean(alert?.should_surface_to_ui),
      dedupe_key: alert?.dedupe_key || alert?.category || `alert-${index}`,
      evidence: normalizeAlertEvidence(alert?.evidence),
      source: alert?.source || 'live_alert_service',
    })),
  );

  const rawSummary = snapshot?.summary && typeof snapshot.summary === 'object' ? snapshot.summary : {};
  const bySeverity = sanitizeCountMap(rawSummary.by_severity);
  const byCategory = sanitizeCountMap(rawSummary.by_category);
  const activeCategories = Array.isArray(rawSummary.active_categories)
    ? rawSummary.active_categories.filter(Boolean)
    : Object.keys(byCategory);

  return {
    generated_at: snapshot?.generated_at || '',
    source: snapshot?.source || 'live_alert_service',
    has_data: Boolean(snapshot?.has_data),
    window: normalizeAlertWindow(snapshot?.window),
    summary: {
      total_alerts: Number(rawSummary.total_alerts ?? alerts.length) || 0,
      surfaced_alerts: Number(rawSummary.surfaced_alerts ?? alerts.filter((alert) => alert.should_surface_to_ui).length) || 0,
      by_severity: bySeverity,
      by_category: byCategory,
      active_categories: activeCategories,
    },
    alerts,
    sources: snapshot?.sources && typeof snapshot.sources === 'object' ? snapshot.sources : {},
    availableSeverities: ['critical', 'warning', 'info'].filter(
      (key) => (bySeverity[key] ?? 0) > 0 || alerts.some((alert) => alert.severity === key),
    ),
    availableCategories: Array.from(
      new Set([
        ...activeCategories,
        ...alerts.map((alert) => alert.category).filter(Boolean),
      ]),
    ).sort((left, right) => left.localeCompare(right, 'es')),
  };
}

export function getLiveAlertScope(alert = {}) {
  if (alert?.related_signature) {
    return 'signature';
  }
  if (alert?.related_family) {
    return 'family';
  }
  return 'global';
}

export function getLiveAlertScopeLabel(alert = {}) {
  switch (getLiveAlertScope(alert)) {
    case 'signature':
      return 'Signature';
    case 'family':
      return 'Family';
    case 'global':
    default:
      return 'Global';
  }
}

export function getLiveAlertImpactCopy(alert = {}) {
  const category = String(alert?.category || '').trim();
  const severity = String(alert?.severity || '').trim();
  const scope = getLiveAlertScope(alert);

  switch (category) {
    case 'resolution_drop':
      return 'Puede afectar calidad de respuesta reciente y demorar la salida accionable.';
    case 'excessive_clarification':
      return 'Puede estar alargando conversaciones sin mejorar el avance del caso.';
    case 'loop_risk':
      return 'Puede estar generando repreguntas innecesarias y desgaste conversacional.';
    case 'repeated_missing_fact_pattern':
      return scope === 'global'
        ? 'Puede indicar un dato faltante recurrente que la experiencia no esta capturando a tiempo.'
        : 'Puede indicar un faltante recurrente concentrado en este tipo de caso.';
    case 'spike_in_protective_mode':
      return 'Puede estar endureciendo demasiado la operacion reciente y degradando la respuesta.';
    case 'low_confidence_cluster':
      return 'Puede aumentar incertidumbre operativa y derivaciones a revision.';
    case 'family_specific_degradation':
      return 'Puede indicar degradacion concentrada en esta family y afectar resultados similares.';
    case 'signature_specific_regression':
      return 'Puede indicar una regresion puntual en esta signature y afectar decisiones repetidas.';
    case 'high_review_queue_pressure':
      return 'Puede aumentar la presion de revision y enlentecer la operacion diaria.';
    case 'auto_healing_hardening_event':
    case 'repeated_hardening':
      return 'Puede reflejar endurecimiento operativo reciente que merece auditoria.';
    default:
      if (severity === 'critical') {
        return 'Puede afectar la calidad operativa reciente y requiere revision prioritaria.';
      }
      if (severity === 'warning') {
        return 'Puede anticipar degradacion si se sostiene en la ventana reciente.';
      }
      return 'Conviene seguirla para confirmar si se estabiliza o escala.';
  }
}

export function summarizeLiveAlertThreshold(alert = {}) {
  const threshold = alert?.threshold && typeof alert.threshold === 'object' ? alert.threshold : {};
  const entries = Object.entries(threshold).filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!entries.length) {
    return '';
  }

  const [key, value] = entries[0];
  return `${humanizeToken(key)}: ${String(value)}`;
}

export function getTopLiveAlerts(alerts = [], limit = 3) {
  return sortLiveAlerts(alerts).slice(0, Math.max(0, limit));
}

export function formatLiveAlertWindow(window = {}) {
  const lastHours = Number(window?.last_hours ?? 0);
  const eventLimit = Number(window?.event_limit ?? 0);
  const recentEventCount = Number(window?.recent_event_count ?? 0);
  const parts = [];

  if (lastHours > 0) {
    parts.push(`Ultimas ${lastHours}h`);
  }
  if (eventLimit > 0) {
    parts.push(`${eventLimit} eventos max.`);
  }
  if (recentEventCount > 0) {
    parts.push(`${recentEventCount} observados`);
  }

  return parts.join(' · ') || 'Ventana reciente';
}

export function sortDecisionsByDate(rows = []) {
  return [...rows].sort((left, right) => {
    const leftTime = left?.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right?.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function getDecisionInsightSearchTerm(metrics = {}) {
  const candidates = [
    metrics.dominant_signal_reference,
    metrics['dominant_signal.reference'],
    metrics.impact_decision_reason,
    metrics.recommendation_type,
    metrics.signal_type === 'trend_inversion' ? 'trend_inversion' : '',
    metrics.block_rate !== undefined ? 'blocked' : '',
  ];

  return candidates.find((value) => String(value || '').trim()) || '';
}

function buildBaseAction(metrics = {}) {
  return {
    eventType: metrics.event_type || '',
    signatureSearch: '',
    familySearch: '',
    decisionSearch: '',
  };
}

export const INSIGHT_ACTION_MAP = {
  drift: {
    matches: () => true,
    resolve(metrics) {
      const targetTimeline = metrics.signal_type === 'trend_inversion';

      return {
        ...buildBaseAction(metrics),
        section: targetTimeline ? 'timeline' : 'drift',
        label: targetTimeline ? 'Ver timeline' : 'Ver drift',
      };
    },
  },
  signature: {
    matches: (metrics) => Boolean(metrics.signature),
    resolve(metrics) {
      return {
        ...buildBaseAction(metrics),
        section: 'signatures',
        label: 'Ver signature',
        signatureSearch: metrics.signature,
      };
    },
  },
  family: {
    matches: (metrics) => Boolean(metrics.signature_family),
    resolve(metrics) {
      return {
        ...buildBaseAction(metrics),
        section: 'families',
        label: 'Ver familia',
        familySearch: metrics.signature_family,
      };
    },
  },
  decisions: {
    matches: () => true,
    resolve(metrics) {
      return {
        ...buildBaseAction(metrics),
        section: 'decisions',
        label: 'Ver decisiones',
        decisionSearch: getDecisionInsightSearchTerm(metrics),
      };
    },
  },
};

export function resolveInsightAction(insight = {}) {
  const metrics = insight?.metrics || {};
  const config = INSIGHT_ACTION_MAP[insight?.type];

  if (!config || !config.matches(metrics, insight)) {
    return null;
  }

  return config.resolve(metrics, insight);
}

export function normalizeInsightExplanation(insight = {}) {
  const explanation = insight?.explanation;

  if (explanation && typeof explanation === 'object' && explanation.summary) {
    return {
      version: explanation.version || 'v1',
      source: explanation.source || 'learning_insights_service',
      summary: explanation.summary,
      conditions: Array.isArray(explanation.conditions) ? explanation.conditions : [],
      thresholds: explanation.thresholds && typeof explanation.thresholds === 'object'
        ? explanation.thresholds
        : {},
      evidence: explanation.evidence && typeof explanation.evidence === 'object'
        ? explanation.evidence
        : {},
      interpretation: explanation.interpretation || '',
      isFallback: false,
    };
  }

  return {
    version: 'v1',
    source: 'frontend_fallback',
      summary: insight?.message || 'No hay explicacion detallada disponible.',
      conditions: [],
      thresholds: {},
      evidence: insight?.metrics && typeof insight.metrics === 'object' ? insight.metrics : {},
      interpretation: 'Este insight no incluyo explicacion estructurada; se muestra el mensaje y la evidencia disponible.',
      isFallback: true,
  };
}
