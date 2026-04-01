'use client';

import { useMemo, useState } from 'react';
import EmptyState from '../EmptyState';
import styles from './Observability.module.css';
import {
  filterLiveAlerts,
  formatDateTime,
  formatLiveAlertWindow,
  getLiveAlertImpactCopy,
  getLiveAlertScopeLabel,
  getLiveAlertSeverityLabel,
  getLiveAlertSeverityTone,
  getTopLiveAlerts,
  humanizeToken,
  summarizeLiveAlertThreshold,
} from '../../lib/learningObservability.mjs';

function renderMetricValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Sin dato';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Sin dato';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getPrimaryMetric(alert) {
  const metricName = alert?.metric?.name || '';
  const metricValue = alert?.metric?.value;
  if (!metricName && (metricValue === null || metricValue === undefined || metricValue === '')) {
    return '';
  }
  if (!metricName) {
    return renderMetricValue(metricValue);
  }
  return `${humanizeToken(metricName)}: ${renderMetricValue(metricValue)}`;
}

function KeyValueRows({ title, values }) {
  const entries = Object.entries(values || {}).filter(([, value]) => {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  });

  if (!entries.length) {
    return null;
  }

  return (
    <section className={styles.liveAlertBlock}>
      <h4>{title}</h4>
      <div className={styles.liveAlertFacts}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.liveAlertFact}>
            <dt>{humanizeToken(key)}</dt>
            <dd>{renderMetricValue(value)}</dd>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertSummary({ snapshot, categories }) {
  const summary = snapshot?.summary || {};
  const critical = summary?.by_severity?.critical || 0;
  const warning = summary?.by_severity?.warning || 0;
  const info = summary?.by_severity?.info || 0;

  return (
    <div className={styles.liveAlertSummaryGrid}>
      <article className={`${styles.summaryCard} ${styles.summaryCardStrong}`}>
        <span className="muted-label">Alertas activas</span>
        <strong className={styles.summaryValue}>{summary?.total_alerts || 0}</strong>
        <div className={styles.summaryMeta}>
          <span>Actualizado</span>
          <strong>{formatDateTime(snapshot?.generated_at)}</strong>
        </div>
        <p className={styles.summaryCopy}>{formatLiveAlertWindow(snapshot?.window)}</p>
      </article>
      <article className={styles.summaryCard}>
        <span className="muted-label">Critical</span>
        <strong className={styles.summaryValue}>{critical}</strong>
        <p className={styles.summaryCopy}>Señales que conviene mirar primero porque pueden afectar operacion y calidad reciente.</p>
      </article>
      <article className={styles.summaryCard}>
        <span className="muted-label">Warning</span>
        <strong className={styles.summaryValue}>{warning}</strong>
        <p className={styles.summaryCopy}>Problemas recientes que merecen seguimiento antes de que se consoliden.</p>
      </article>
      <article className={styles.summaryCard}>
        <span className="muted-label">Info</span>
        <strong className={styles.summaryValue}>{info}</strong>
        <p className={styles.summaryCopy}>Señales leves o informativas para seguir la estabilidad del sistema.</p>
      </article>
      <article className={styles.summaryCard}>
        <span className="muted-label">Categorias activas</span>
        <strong className={styles.summaryValue}>{categories.length}</strong>
        <p className={styles.summaryCopy}>
          {categories.length ? categories.slice(0, 3).map((category) => humanizeToken(category)).join(', ') : 'Sin categorias activas'}
        </p>
      </article>
    </div>
  );
}

function PriorityAlertRow({ alert }) {
  const tone = getLiveAlertSeverityTone(alert.severity);
  const impactCopy = getLiveAlertImpactCopy(alert);
  const primaryMetric = getPrimaryMetric(alert);

  return (
    <article className={styles.priorityAlertItem}>
      <div className={styles.priorityAlertHeader}>
        <div className={styles.liveAlertBadgeRow}>
          <span className={`badge badge--${tone}`}>{getLiveAlertSeverityLabel(alert.severity)}</span>
          <span className="badge">{humanizeToken(alert.category)}</span>
          <span className="badge">{getLiveAlertScopeLabel(alert)}</span>
        </div>
        <span className={styles.liveAlertDetectedAt}>{formatDateTime(alert.detected_at)}</span>
      </div>
      <strong className={styles.priorityAlertTitle}>{alert.title}</strong>
      <p className={styles.priorityAlertDescription}>{alert.description}</p>
      <p className={styles.priorityAlertImpact}>{impactCopy}</p>
      <div className={styles.priorityAlertMeta}>
        {primaryMetric ? <span className={styles.liveAlertMetaPill}>{primaryMetric}</span> : null}
        {summarizeLiveAlertThreshold(alert) ? (
          <span className={styles.liveAlertMetaPill}>Threshold: {summarizeLiveAlertThreshold(alert)}</span>
        ) : null}
      </div>
      <div className={styles.priorityAlertAction}>
        <span className={styles.priorityAlertActionLabel}>Conviene hacer</span>
        <p>{alert.recommended_action || 'Sin accion sugerida por el backend.'}</p>
      </div>
    </article>
  );
}

function PriorityAlerts({ alerts }) {
  if (!alerts.length) {
    return null;
  }

  return (
    <section className={styles.priorityAlertsSection}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderCopy}>
          <h3>Alertas prioritarias</h3>
          <p>Las primeras alertas para mirar al entrar, ordenadas por severidad, recencia y utilidad operativa inmediata.</p>
        </div>
      </div>
      <div className={styles.priorityAlertsGrid}>
        {alerts.map((alert) => (
          <PriorityAlertRow key={`priority-${alert.alert_id}`} alert={alert} />
        ))}
      </div>
    </section>
  );
}

function AlertCard({ alert }) {
  const tone = getLiveAlertSeverityTone(alert.severity);
  const primaryMetric = getPrimaryMetric(alert);
  const thresholdSummary = summarizeLiveAlertThreshold(alert);
  const impactCopy = getLiveAlertImpactCopy(alert);

  return (
    <details className={styles.liveAlertCard}>
      <summary className={styles.liveAlertSummary}>
        <div className={styles.liveAlertHeader}>
          <div className={styles.liveAlertBadgeRow}>
            <span className={`badge badge--${tone}`}>{getLiveAlertSeverityLabel(alert.severity)}</span>
            <span className="badge">{humanizeToken(alert.category)}</span>
            <span className="badge">{getLiveAlertScopeLabel(alert)}</span>
            {alert.output_mode ? <span className="badge">{humanizeToken(alert.output_mode)}</span> : null}
          </div>
          <span className={styles.insightExpandHint}>Ver evidencia</span>
        </div>

        <div className={styles.liveAlertTitleRow}>
          <strong className={styles.liveAlertTitle}>{alert.title}</strong>
          <span className={styles.liveAlertDetectedAt}>{formatDateTime(alert.detected_at)}</span>
        </div>

        <p className={styles.liveAlertDescription}>{alert.description}</p>
        <p className={styles.liveAlertImpact}>{impactCopy}</p>

        <div className={styles.liveAlertActionSummary}>
          <span className={styles.liveAlertActionLabel}>Conviene hacer</span>
          <p>{alert.recommended_action || 'Sin accion sugerida por el backend.'}</p>
        </div>

        <div className={styles.liveAlertMetaRow}>
          {primaryMetric ? <span className={styles.liveAlertMetaPill}>{primaryMetric}</span> : null}
          {thresholdSummary ? <span className={styles.liveAlertMetaPill}>Threshold: {thresholdSummary}</span> : null}
          <span className={styles.liveAlertMetaPill}>{formatLiveAlertWindow(alert.window)}</span>
          {alert.related_family ? <span className={styles.liveAlertMetaPill}>Family: {alert.related_family}</span> : null}
          {alert.related_signature ? <span className={styles.liveAlertMetaPill}>Signature: {alert.related_signature}</span> : null}
        </div>
      </summary>

      <div className={styles.liveAlertBody}>
        <div className={styles.liveAlertContextRow}>
          <div className={styles.liveAlertContextCard}>
            <h4>Contexto</h4>
            <dl className={styles.liveAlertFacts}>
              <div className={styles.liveAlertFact}>
                <dt>Detectada</dt>
                <dd>{formatDateTime(alert.detected_at)}</dd>
              </div>
              <div className={styles.liveAlertFact}>
                <dt>Ventana</dt>
                <dd>{formatLiveAlertWindow(alert.window)}</dd>
              </div>
              <div className={styles.liveAlertFact}>
                <dt>Alcance</dt>
                <dd>{getLiveAlertScopeLabel(alert)}</dd>
              </div>
              {alert.event_type ? (
                <div className={styles.liveAlertFact}>
                  <dt>Event type</dt>
                  <dd>{humanizeToken(alert.event_type)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className={styles.liveAlertContextCard}>
            <h4>Por que importa</h4>
            <p className={styles.liveAlertRecommendation}>{impactCopy}</p>
          </div>
        </div>

        <div className={styles.liveAlertEvidenceGrid}>
          <KeyValueRows title="Metrica actual" values={alert.metric} />
          <KeyValueRows title="Threshold disparado" values={alert.threshold} />
          <KeyValueRows title="Evidencia" values={alert.evidence} />
        </div>
      </div>
    </details>
  );
}

function EmptyLiveAlertsState({ snapshot }) {
  return (
    <div className={styles.liveAlertsStableState}>
      <EmptyState
        title="Sin alertas activas"
        description="No se detecto degradacion visible en la ventana reciente evaluada."
        features={[formatLiveAlertWindow(snapshot?.window), `Actualizado: ${formatDateTime(snapshot?.generated_at)}`]}
      />
      <p className={styles.liveAlertsStableCopy}>
        La consola operativa no encontro loops, caidas recientes ni presion visible que requiera seguimiento inmediato en esta ventana.
      </p>
    </div>
  );
}

export default function LiveAlertsPanel({
  snapshot,
  error = '',
  refreshing = false,
  onRefresh,
}) {
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const alerts = snapshot?.alerts || [];
  const categories = snapshot?.availableCategories || [];
  const severities = snapshot?.availableSeverities || [];
  const topAlerts = useMemo(() => getTopLiveAlerts(alerts, 3), [alerts]);
  const filteredAlerts = useMemo(
    () => filterLiveAlerts(alerts, { severity: severityFilter, category: categoryFilter }),
    [alerts, severityFilter, categoryFilter],
  );

  return (
    <section className={`surface-panel ${styles.liveAlertsPanel}`}>
      <div className="surface-panel__body">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderCopy}>
            <h2>Live alerts</h2>
            <p>Consola breve para detectar rapido degradacion, loops y presion operativa reciente.</p>
            <div className={styles.liveAlertsFreshness}>
              <span className={styles.liveAlertsFreshnessItem}>
                <strong>Actualizado:</strong> {formatDateTime(snapshot?.generated_at)}
              </span>
              <span className={styles.liveAlertsFreshnessItem}>
                <strong>Ventana:</strong> {formatLiveAlertWindow(snapshot?.window)}
              </span>
              <span className={styles.liveAlertsFreshnessItem}>
                <strong>Activas:</strong> {snapshot?.summary?.total_alerts || 0}
              </span>
            </div>
          </div>

          <div className={styles.liveAlertsToolbar}>
            <div className={styles.tableControl}>
              <label htmlFor="live-alert-severity">Severidad</label>
              <select
                id="live-alert-severity"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="">Todas</option>
                {severities.map((severity) => (
                  <option key={severity} value={severity}>
                    {getLiveAlertSeverityLabel(severity)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.tableControl}>
              <label htmlFor="live-alert-category">Categoria</label>
              <select
                id="live-alert-category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {humanizeToken(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.headerActions}>
              <button type="button" className="ghost-button" disabled={refreshing} onClick={() => onRefresh?.()}>
                {refreshing ? 'Actualizando...' : 'Actualizar alertas'}
              </button>
            </div>
          </div>
        </div>

        {error ? <div className={styles.sectionError}>No se pudieron cargar las live alerts: {error}</div> : null}

        <AlertSummary snapshot={snapshot} categories={categories} />

        {!alerts.length ? (
          <EmptyLiveAlertsState snapshot={snapshot} />
        ) : (
          <>
            <PriorityAlerts alerts={topAlerts} />

            {filteredAlerts.length ? (
              <div className={styles.liveAlertsList}>
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.alert_id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyInline}>
                No hay alertas que coincidan con los filtros actuales. Proba con otra severidad o categoria.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
