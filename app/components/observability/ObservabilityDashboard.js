'use client';

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import EmptyState from '../EmptyState';
import PageHeader from '../PageHeader';
import DecisionTraceList from './DecisionTraceList';
import DriftSummary from './DriftSummary';
import InsightsPanel from './InsightsPanel';
import ObservabilityPatterns from './ObservabilityPatterns';
import ObservabilitySummaryCards from './ObservabilitySummaryCards';
import ObservabilityTable from './ObservabilityTable';
import ObservabilityTimeline from './ObservabilityTimeline';
import styles from './Observability.module.css';
import {
  getLearningObservabilityDecisions,
  getLearningObservabilityDrift,
  getLearningObservabilityEvents,
  getLearningObservabilityFamilies,
  getLearningObservabilityInsights,
  getLearningObservabilityOverview,
  getLearningObservabilitySignatures,
  getLearningObservabilityTimeline,
  getLearningObservabilityTopPatterns,
} from '../../lib/api';
import {
  buildEventTypeOptions,
  extractSectionState,
  filterDecisionRows,
  filterMetricRows,
  formatCompactNumber,
  humanizeToken,
  resolveInsightAction,
  sortDecisionsByDate,
  toDateInputValue,
} from '../../lib/learningObservability.mjs';

const EMPTY_OVERVIEW = {
  total_observations: 0,
  total_adaptive_decisions: 0,
  unique_signatures: 0,
  unique_signature_families: 0,
  unique_event_types: 0,
  reinforced_decisions: 0,
  blocked_decisions: 0,
  neutral_decisions: 0,
  avg_impact_score: 0,
  recency_weighted_avg_score: 0,
};

const EMPTY_PATTERNS = {
  top_positive_signatures: [],
  top_negative_signatures: [],
  top_positive_families: [],
  top_negative_families: [],
};

const EMPTY_DRIFT = {
  drift_detected: false,
  drift_level: 'none',
  drift_signals: [],
  compared_windows: {},
};

const EMPTY_SNAPSHOT = {
  overview: EMPTY_OVERVIEW,
  patterns: EMPTY_PATTERNS,
  drift: EMPTY_DRIFT,
  events: [],
  signatures: [],
  families: [],
  timeline: [],
  decisions: [],
  insights: [],
  errors: {},
};

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.75 15.25V10.75M8.25 15.25V5.75M12.75 15.25V8.25M17.25 15.25V3.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

async function loadObservabilitySnapshot(filters) {
  const requests = {
    overview: getLearningObservabilityOverview({
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    patterns: getLearningObservabilityTopPatterns({
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    drift: getLearningObservabilityDrift(),
    events: getLearningObservabilityEvents(),
    signatures: getLearningObservabilitySignatures({
      event_type: filters.eventType,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      limit: 200,
    }),
    families: getLearningObservabilityFamilies({
      event_type: filters.eventType,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      limit: 200,
    }),
    timeline: getLearningObservabilityTimeline({
      event_type: filters.eventType,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      bucket_days: filters.bucketDays,
    }),
    decisions: getLearningObservabilityDecisions({
      event_type: filters.eventType,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      limit: 75,
    }),
    insights: getLearningObservabilityInsights({
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
  };

  const entries = Object.entries(requests);
  const settled = await Promise.allSettled(entries.map(([, request]) => request));
  const nextSnapshot = { ...EMPTY_SNAPSHOT, errors: {} };

  settled.forEach((result, index) => {
    const [key] = entries[index];

    if (result.status === 'fulfilled') {
      nextSnapshot[key] = result.value;
      return;
    }

    nextSnapshot.errors[key] = result.reason?.message || 'No se pudo cargar la seccion.';
  });

  return nextSnapshot;
}

export default function ObservabilityDashboard() {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [eventType, setEventType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bucketDays, setBucketDays] = useState('1');
  const [signatureSearch, setSignatureSearch] = useState('');
  const [familySearch, setFamilySearch] = useState('');
  const [decisionSearch, setDecisionSearch] = useState('');
  const [signatureSort, setSignatureSort] = useState('worst_score');
  const [familySort, setFamilySort] = useState('worst_score');
  const [decisionPage, setDecisionPage] = useState(1);
  const [decisionPageSize, setDecisionPageSize] = useState(10);
  const [highlightedSection, setHighlightedSection] = useState('');
  const [filterHistory, setFilterHistory] = useState([]);
  const [actionFeedback, setActionFeedback] = useState(null);

  const insightsRef = useRef(null);
  const driftRef = useRef(null);
  const decisionsRef = useRef(null);
  const timelineRef = useRef(null);
  const signaturesRef = useRef(null);
  const familiesRef = useRef(null);

  const deferredSignatureSearch = useDeferredValue(signatureSearch);
  const deferredFamilySearch = useDeferredValue(familySearch);
  const deferredDecisionSearch = useDeferredValue(decisionSearch);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (loading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const nextSnapshot = await loadObservabilitySnapshot({
          eventType,
          dateFrom,
          dateTo,
          bucketDays: Number(bucketDays),
        });

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSnapshot({
            overview: extractSectionState(nextSnapshot.overview, EMPTY_OVERVIEW),
            patterns: extractSectionState(nextSnapshot.patterns, EMPTY_PATTERNS),
            drift: extractSectionState(nextSnapshot.drift, EMPTY_DRIFT),
            events: extractSectionState(nextSnapshot.events, []),
            signatures: extractSectionState(nextSnapshot.signatures, []),
            families: extractSectionState(nextSnapshot.families, []),
            timeline: extractSectionState(nextSnapshot.timeline, []),
            decisions: extractSectionState(nextSnapshot.decisions, []),
            insights: extractSectionState(nextSnapshot.insights, []),
            errors: nextSnapshot.errors || {},
          });
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [eventType, dateFrom, dateTo, bucketDays, refreshToken]);

  const eventOptions = useMemo(
    () => buildEventTypeOptions(snapshot.events),
    [snapshot.events],
  );

  const filteredSignatures = useMemo(
    () =>
      filterMetricRows(snapshot.signatures, {
        eventType,
        search: deferredSignatureSearch,
        sort: signatureSort,
        searchKeys: ['signature', 'signature_family', 'event_type', 'status'],
      }),
    [snapshot.signatures, eventType, deferredSignatureSearch, signatureSort],
  );

  const filteredFamilies = useMemo(
    () =>
      filterMetricRows(snapshot.families, {
        eventType,
        search: deferredFamilySearch,
        sort: familySort,
        searchKeys: ['signature_family', 'event_type', 'status'],
      }),
    [snapshot.families, eventType, deferredFamilySearch, familySort],
  );

  const filteredDecisions = useMemo(
    () =>
      sortDecisionsByDate(
        filterDecisionRows(snapshot.decisions, {
          eventType,
          search: deferredDecisionSearch,
        }),
      ),
    [snapshot.decisions, eventType, deferredDecisionSearch],
  );

  const totalDecisionPages = Math.max(1, Math.ceil(filteredDecisions.length / decisionPageSize));
  const pagedDecisions = useMemo(() => {
    const safePage = Math.min(decisionPage, totalDecisionPages);
    const start = (safePage - 1) * decisionPageSize;
    return filteredDecisions.slice(start, start + decisionPageSize);
  }, [filteredDecisions, decisionPage, decisionPageSize, totalDecisionPages]);

  useEffect(() => {
    setDecisionPage(1);
  }, [eventType, dateFrom, dateTo, decisionSearch, decisionPageSize]);

  useEffect(() => {
    if (decisionPage > totalDecisionPages) {
      setDecisionPage(totalDecisionPages);
    }
  }, [decisionPage, totalDecisionPages]);

  useEffect(() => {
    if (!highlightedSection) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedSection('');
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedSection]);

  useEffect(() => {
    if (!actionFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActionFeedback(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [actionFeedback]);

  function captureFilterState() {
    return {
      eventType,
      dateFrom,
      dateTo,
      bucketDays,
      signatureSearch,
      familySearch,
      decisionSearch,
      decisionPage,
    };
  }

  function applyFilterState(state) {
    setEventType(state.eventType || '');
    setDateFrom(state.dateFrom || '');
    setDateTo(state.dateTo || '');
    setBucketDays(state.bucketDays || '1');
    setSignatureSearch(state.signatureSearch || '');
    setFamilySearch(state.familySearch || '');
    setDecisionSearch(state.decisionSearch || '');
    setDecisionPage(state.decisionPage || 1);
  }

  function buildActionFeedback(action) {
    const badges = [];

    if (action.eventType) {
      badges.push(`event_type: ${action.eventType}`);
    }
    if (action.signatureSearch) {
      badges.push(`signature: ${action.signatureSearch}`);
    }
    if (action.familySearch) {
      badges.push(`family: ${action.familySearch}`);
    }
    if (action.decisionSearch) {
      badges.push(`decision_search: ${action.decisionSearch}`);
    }

    return {
      message: `Accion aplicada: ${action.label || 'Ver detalle'}`,
      badges,
      section: action.section,
    };
  }

  function getSectionRef(section) {
    switch (section) {
      case 'drift':
        return driftRef;
      case 'timeline':
        return timelineRef;
      case 'signatures':
        return signaturesRef;
      case 'families':
        return familiesRef;
      case 'decisions':
        return decisionsRef;
      case 'insights':
        return insightsRef;
      default:
        return null;
    }
  }

  function focusSection(section) {
    const targetRef = getSectionRef(section);
    const node = targetRef?.current;

    if (!node) {
      return;
    }

    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightedSection(section);
  }

  function handleInsightAction(_insight, explicitAction) {
    const action = explicitAction || resolveInsightAction(_insight);
    if (!action) {
      return;
    }

    setFilterHistory((current) => [...current.slice(-4), captureFilterState()]);

    if (action.eventType !== undefined) {
      setEventType(action.eventType);
    }
    if (action.signatureSearch !== undefined) {
      setSignatureSearch(action.signatureSearch);
    }
    if (action.familySearch !== undefined) {
      setFamilySearch(action.familySearch);
    }
    if (action.decisionSearch !== undefined) {
      setDecisionSearch(action.decisionSearch);
    }
    if (action.section === 'decisions') {
      setDecisionPage(1);
    }

    setActionFeedback(buildActionFeedback(action));

    window.setTimeout(() => {
      focusSection(action.section);
    }, 40);
  }

  function restorePreviousFilters() {
    setFilterHistory((current) => {
      if (!current.length) {
        return current;
      }

      const previousState = current[current.length - 1];
      applyFilterState(previousState);
      setActionFeedback({
        message: 'Estado anterior restaurado',
        badges: [],
        section: '',
      });
      return current.slice(0, -1);
    });
  }

  const totalErrors = Object.keys(snapshot.errors || {}).length;
  const allSectionsFailed = totalErrors >= 8;

  if (loading) {
    return (
      <div className="workspace page-shell">
        <PageHeader
          breadcrumb="Aprendizaje / Observabilidad"
          icon={<OverviewIcon />}
          title="Observabilidad"
          description="Cargando snapshot de observabilidad del aprendizaje adaptativo."
        />
        <div className={styles.loadingState}>
          <strong>Cargando panel</strong>
          <span>Consultando overview, patterns, drift, timeline y decisiones recientes.</span>
        </div>
      </div>
    );
  }

  if (allSectionsFailed) {
    return (
      <div className="workspace page-shell">
        <PageHeader
          breadcrumb="Aprendizaje / Observabilidad"
          icon={<OverviewIcon />}
          title="Observabilidad"
          description="No se pudo construir el snapshot del panel."
        />
        <div className={styles.authState}>
          <strong>No fue posible cargar la observabilidad.</strong>
          <span>
            Los endpoints son autenticados. Si la sesion vencio, ingresa nuevamente desde el chat y
            recarga esta vista.
          </span>
          <div className={styles.headerActions}>
            <Link href="/" className="button">
              Ir al chat
            </Link>
            <button type="button" className="ghost-button" onClick={() => setRefreshToken((value) => value + 1)}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace page-shell">
      <PageHeader
        breadcrumb="Aprendizaje / Observabilidad"
        icon={<OverviewIcon />}
        title="Visual Debug Panel"
        description="Lectura, auditoria e inspeccion del aprendizaje adaptativo consumiendo los endpoints read-only existentes."
      />

      <div className={styles.shell}>
        <section className="surface-panel">
          <div className="surface-panel__body">
            <div className={styles.toolbar}>
              <div className={styles.toolbarCopy}>
                <h2 className={styles.toolbarTitle}>Snapshot operativo</h2>
                <p className={styles.toolbarText}>
                  El panel muestra {formatCompactNumber(snapshot.overview.total_observations)} observaciones y{' '}
                  {formatCompactNumber(snapshot.decisions.length)} decisiones recientes para debugging humano.
                </p>
              </div>

              <div className={styles.toolbarControls}>
                <div className={styles.toolbarField}>
                  <label htmlFor="event-type">Filtrar por event_type</label>
                  <select
                    id="event-type"
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {eventOptions.map((option) => (
                      <option key={option} value={option}>
                        {humanizeToken(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.toolbarField}>
                  <label htmlFor="date-from">Desde</label>
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(event) => setDateFrom(toDateInputValue(event.target.value))}
                  />
                </div>

                <div className={styles.toolbarField}>
                  <label htmlFor="date-to">Hasta</label>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(event) => setDateTo(toDateInputValue(event.target.value))}
                  />
                </div>

                <div className={styles.toolbarField}>
                  <label htmlFor="bucket-days">Bucket timeline</label>
                  <select
                    id="bucket-days"
                    value={bucketDays}
                    onChange={(event) => setBucketDays(event.target.value)}
                  >
                    <option value="1">1 dia</option>
                    <option value="7">7 dias</option>
                    <option value="14">14 dias</option>
                  </select>
                </div>

                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEventType('');
                      setDateFrom('');
                      setDateTo('');
                    }}
                  >
                    Limpiar filtros
                  </button>
                  {filterHistory.length ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={restorePreviousFilters}
                    >
                      Volver al estado previo
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={refreshing}
                    onClick={() => setRefreshToken((value) => value + 1)}
                  >
                    {refreshing ? 'Actualizando...' : 'Actualizar snapshot'}
                  </button>
                </div>
              </div>
            </div>

            {actionFeedback ? (
              <div className={styles.actionFeedback}>
                <div className={styles.actionFeedbackMain}>
                  <strong>{actionFeedback.message}</strong>
                  {actionFeedback.section ? (
                    <span className={styles.actionFeedbackTarget}>
                      Destino: {humanizeToken(actionFeedback.section)}
                    </span>
                  ) : null}
                </div>
                {actionFeedback.badges.length ? (
                  <div className={styles.actionFeedbackBadges}>
                    {actionFeedback.badges.map((badge) => (
                      <span key={badge} className="badge">
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {totalErrors ? (
          <div className={styles.sectionError}>
            Algunas secciones no cargaron correctamente: {Object.keys(snapshot.errors).join(', ')}.
          </div>
        ) : null}

        <div
          id="insights"
          ref={insightsRef}
          className={`${styles.sectionAnchor} ${highlightedSection === 'insights' ? styles.sectionHighlight : ''}`}
        >
          <InsightsPanel insights={snapshot.insights} onInsightAction={handleInsightAction} />
        </div>

        <ObservabilitySummaryCards overview={snapshot.overview} />

        <div
          id="drift"
          ref={driftRef}
          className={`${styles.sectionAnchor} ${highlightedSection === 'drift' ? styles.sectionHighlight : ''}`}
        >
          <DriftSummary drift={snapshot.drift} />
        </div>

        <div
          id="decisions"
          ref={decisionsRef}
          className={`${styles.sectionAnchor} ${highlightedSection === 'decisions' ? styles.sectionHighlight : ''}`}
        >
          <DecisionTraceList
            rows={pagedDecisions}
            search={decisionSearch}
            onSearchChange={setDecisionSearch}
            page={Math.min(decisionPage, totalDecisionPages)}
            totalPages={totalDecisionPages}
            pageSize={decisionPageSize}
            onPageChange={setDecisionPage}
            onPageSizeChange={setDecisionPageSize}
          />
        </div>

        <div className={styles.dashboardGrid}>
          <div
            id="timeline"
            ref={timelineRef}
            className={`${styles.sectionAnchor} ${highlightedSection === 'timeline' ? styles.sectionHighlight : ''}`}
          >
            <ObservabilityTimeline timeline={snapshot.timeline} drift={snapshot.drift} />
          </div>
          <ObservabilityPatterns patterns={snapshot.patterns} />
        </div>

        <div className="dual-grid">
          <div
            id="signatures"
            ref={signaturesRef}
            className={`${styles.sectionAnchor} ${highlightedSection === 'signatures' ? styles.sectionHighlight : ''}`}
          >
            <ObservabilityTable
              title="Signatures"
              description="Tabla base para inspeccionar score, mezcla de impacto y ultima observacion por signature."
              rows={filteredSignatures}
              search={signatureSearch}
              onSearchChange={setSignatureSearch}
              sort={signatureSort}
              onSortChange={setSignatureSort}
              emptyLabel="No hay signatures para este filtro. Proba con otro event_type o limpia la busqueda."
            />
          </div>

          <div
            id="families"
            ref={familiesRef}
            className={`${styles.sectionAnchor} ${highlightedSection === 'families' ? styles.sectionHighlight : ''}`}
          >
            <ObservabilityTable
              title="Families"
              description="Vista agregada por familia para detectar deterioro sostenido o consolidacion positiva."
              rows={filteredFamilies}
              kind="families"
              search={familySearch}
              onSearchChange={setFamilySearch}
              sort={familySort}
              onSortChange={setFamilySort}
              emptyLabel="No hay familias para este filtro. Proba con otro event_type o limpia la busqueda."
            />
          </div>
        </div>

        {!snapshot.signatures.length &&
        !snapshot.families.length &&
        !snapshot.timeline.length &&
        !snapshot.decisions.length ? (
          <EmptyState
            title="No hay datos observables todavia"
            description="El backend respondio sin registros para la combinacion actual de filtros."
            features={['overview vacio', 'timeline vacio', 'decision trace vacio']}
          />
        ) : null}
      </div>
    </div>
  );
}
