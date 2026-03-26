import {
  formatScore,
  formatPercent,
  humanizeToken,
  normalizeInsightExplanation,
  resolveInsightAction,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function getSeverityTone(severity) {
  switch (severity) {
    case 'high':
      return 'risk';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'muted';
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    case 'low':
      return 'Baja';
    default:
      return severity;
  }
}

function getTypeLabel(type) {
  switch (type) {
    case 'drift':
      return 'Drift';
    case 'signature':
      return 'Signature';
    case 'family':
      return 'Familia';
    case 'decisions':
      return 'Decisiones';
    default:
      return humanizeToken(type);
  }
}

function MetricPills({ metrics }) {
  if (!metrics || !Object.keys(metrics).length) {
    return null;
  }

  const pills = [];

  if (metrics.delta !== undefined && metrics.delta !== null) {
    pills.push(`Delta: ${formatScore(metrics.delta, 3)}`);
  }
  if (metrics.recent_value !== undefined && metrics.recent_value !== null) {
    pills.push(`Reciente: ${formatScore(metrics.recent_value, 3)}`);
  }
  if (metrics.previous_value !== undefined && metrics.previous_value !== null) {
    pills.push(`Previa: ${formatScore(metrics.previous_value, 3)}`);
  }
  if (metrics.block_rate !== undefined) {
    pills.push(`Block rate: ${formatPercent(metrics.block_rate, 1)}`);
  }
  if (metrics.avg_score !== undefined) {
    pills.push(`Score: ${formatScore(metrics.avg_score, 3)}`);
  }
  if (metrics.observation_count !== undefined) {
    pills.push(`Obs: ${metrics.observation_count}`);
  }
  if (metrics.blocked !== undefined && metrics.total !== undefined) {
    pills.push(`${metrics.blocked}/${metrics.total} bloqueadas`);
  }
  if (metrics.low_confidence_count !== undefined) {
    pills.push(`${metrics.low_confidence_count} baja confianza`);
  }
  if (metrics.count !== undefined && metrics.new_negative_signatures) {
    pills.push(`${metrics.count} patron(es)`);
  }

  if (!pills.length) {
    return null;
  }

  return (
    <div className={styles.insightMetrics}>
      {pills.map((pill) => (
        <span key={pill} className={styles.insightMetricPill}>{pill}</span>
      ))}
    </div>
  );
}

function KeyValueList({ values }) {
  const entries = Object.entries(values || {}).filter(([, value]) => {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });

  if (!entries.length) {
    return <p className={styles.explanationEmpty}>Sin datos adicionales.</p>;
  }

  return (
    <div className={styles.explanationFacts}>
      {entries.map(([key, value]) => (
        <div key={key} className={styles.explanationFact}>
          <dt>{humanizeToken(key)}</dt>
          <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
        </div>
      ))}
    </div>
  );
}

function getActionDestinationLabel(section) {
  switch (section) {
    case 'drift':
      return 'Drift';
    case 'timeline':
      return 'Timeline';
    case 'signatures':
      return 'Signatures';
    case 'families':
      return 'Families';
    case 'decisions':
      return 'Decision trace';
    default:
      return 'Detalle';
  }
}

export default function InsightsPanel({ insights = [], onInsightAction }) {
  if (!insights.length) {
    return null;
  }

  const highCount = insights.filter((i) => i.severity === 'high').length;
  const mediumCount = insights.filter((i) => i.severity === 'medium').length;

  return (
    <section className={`surface-panel ${highCount ? styles.insightsPanelHigh : ''}`}>
      <div className="surface-panel__body">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderCopy}>
            <h2>Insights</h2>
            <p>
              {insights.length} hallazgo{insights.length !== 1 ? 's' : ''} detectado{insights.length !== 1 ? 's' : ''} por heuristicas sobre los datos actuales.
              {highCount ? ` ${highCount} de severidad alta.` : ''}
              {mediumCount && !highCount ? ` ${mediumCount} de severidad media.` : ''}
            </p>
          </div>
          <div className={styles.insightBadges}>
            {highCount ? (
              <span className="badge badge--risk">{highCount} alta{highCount !== 1 ? 's' : ''}</span>
            ) : null}
            {mediumCount ? (
              <span className="badge badge--warning">{mediumCount} media{mediumCount !== 1 ? 's' : ''}</span>
            ) : null}
          </div>
        </div>

        <div className={styles.insightsList}>
          {insights.map((insight, index) => {
            const tone = getSeverityTone(insight.severity);
            const action = resolveInsightAction(insight);
            const explanation = normalizeInsightExplanation(insight);

            return (
              <details key={`${insight.type}-${index}`} className={styles.insightItem}>
                <summary className={styles.insightSummary}>
                  <div className={styles.insightHeader}>
                    <div className={styles.insightBadgeRow}>
                      <span className={`badge badge--${tone}`}>
                        {getSeverityLabel(insight.severity)}
                      </span>
                      <span className="badge">
                        {getTypeLabel(insight.type)}
                      </span>
                    </div>
                    <span className={styles.insightExpandHint}>Ver explicacion</span>
                  </div>
                  <p className={styles.insightHumanSummary}>
                    {insight.human_summary || explanation.summary}
                  </p>
                  <p className={styles.insightMessage}>{insight.message}</p>
                  <MetricPills metrics={insight.metrics} />
                </summary>

                <div className={styles.insightExplainBody}>
                  <section className={styles.explanationBlock}>
                    <h3>Por que se genero</h3>
                    <div className={styles.explanationMeta}>
                      <span className="badge">{explanation.version}</span>
                      <span className="badge">{humanizeToken(explanation.source)}</span>
                      {insight.heuristic_key ? (
                        <span className="badge">{insight.heuristic_key}</span>
                      ) : null}
                    </div>
                    <p className={styles.explanationSummary}>{explanation.summary}</p>
                    <p className={styles.explanationInterpretation}>{explanation.interpretation}</p>
                    {insight.recommended_target ? (
                      <p className={styles.explanationReviewTarget}>
                        Mirar en: <strong>{humanizeToken(insight.recommended_target)}</strong>
                      </p>
                    ) : null}
                    {explanation.isFallback ? (
                      <span className="badge">Explicacion fallback</span>
                    ) : null}
                  </section>

                  <div className={styles.explanationGrid}>
                    <section className={styles.explanationBlock}>
                      <h3>Condiciones activadas</h3>
                      {explanation.conditions.length ? (
                        <ul className={styles.explanationList}>
                          {explanation.conditions.map((condition) => (
                            <li key={condition} className={styles.explanationCondition}>{condition}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.explanationEmpty}>No se informaron condiciones detalladas.</p>
                      )}
                    </section>

                    <section className={styles.explanationBlock}>
                      <h3>Thresholds</h3>
                      <div className={styles.explanationThresholds}>
                        <KeyValueList values={explanation.thresholds} />
                      </div>
                    </section>
                  </div>

                  <section className={`${styles.explanationBlock} ${styles.explanationEvidenceBlock}`}>
                    <h3>Evidencia</h3>
                    <KeyValueList values={explanation.evidence} />
                  </section>

                  {action ? (
                    <div className={styles.insightActions}>
                      <span className={styles.insightTarget}>
                        Destino: {getActionDestinationLabel(action.section)}
                      </span>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => onInsightAction?.(insight, action)}
                      >
                        {action.label || 'Ver detalle'}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.insightActions}>
                      <span className={styles.insightTarget}>Sin metadata suficiente para navegar</span>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
