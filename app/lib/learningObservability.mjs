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
