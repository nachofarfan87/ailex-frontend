import {
  formatCompactNumber,
  formatDateTime,
  formatPercent,
  formatScore,
  getDriftTone,
  getStatusTone,
  humanizeToken,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function readSignalValue(signals, type) {
  return signals.find((signal) => signal.type === type);
}

function WindowCard({ title, window }) {
  return (
    <article className={styles.windowCard}>
      <div className={styles.panelHeaderCopy}>
        <h3>{title}</h3>
        <p>
          {formatDateTime(window?.start)} a {formatDateTime(window?.end)}
        </p>
      </div>
      <div className={styles.windowStats}>
        <div>
          <span className="muted-label">Observaciones</span>
          <strong>{formatCompactNumber(window?.total_observations)}</strong>
        </div>
        <div>
          <span className="muted-label">Score medio</span>
          <strong>{formatScore(window?.avg_score, 3)}</strong>
        </div>
        <div>
          <span className="muted-label">Block rate</span>
          <strong>{formatPercent(window?.block_rate, 1)}</strong>
        </div>
        <div>
          <span className="muted-label">Mix</span>
          <strong>
            {formatCompactNumber(window?.improved)} / {formatCompactNumber(window?.regressed)} /{' '}
            {formatCompactNumber(window?.neutral)}
          </strong>
        </div>
      </div>
    </article>
  );
}

export default function DriftSummary({ drift }) {
  const recent = drift?.compared_windows?.recent || {};
  const previous = drift?.compared_windows?.previous || {};
  const signals = drift?.drift_signals || [];
  const tone = getDriftTone(drift?.drift_level);
  const scoreDeltaSignal = readSignalValue(signals, 'score_delta');
  const blockRateSignal = readSignalValue(signals, 'block_rate_increase');

  return (
    <section className={`surface-panel ${styles.driftPriority}`}>
      <div className="surface-panel__body">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderCopy}>
            <h2>Drift</h2>
            <p>
              Resumen de deterioro o mejora entre la ventana reciente y la ventana previa.
            </p>
          </div>
          <span className={`badge badge--${tone}`}>
            {drift?.drift_detected ? 'Drift detectado' : 'Sin drift'} /{' '}
            {humanizeToken(drift?.drift_level)}
          </span>
        </div>

        <div className={styles.driftStatus}>
          <div className={styles.driftMain}>
            <div className={styles.panelHeaderCopy}>
              <h3>Nivel actual</h3>
              <p>
                El backend ya consolido senales como `score_delta`, `block_rate_increase` y
                `trend_inversion`.
              </p>
            </div>
            <span className={`badge badge--${tone}`}>{humanizeToken(drift?.drift_level)}</span>
          </div>

          <div className={styles.driftHighlights}>
            <article className={styles.driftMetricCard}>
              <span className="muted-label">Score delta</span>
              <strong>{formatScore(scoreDeltaSignal?.delta ?? 0, 3)}</strong>
              <span className={styles.secondaryText}>
                {scoreDeltaSignal
                  ? `${formatScore(scoreDeltaSignal.previous_value, 3)} -> ${formatScore(scoreDeltaSignal.recent_value, 3)}`
                  : 'Sin cambio material detectado'}
              </span>
            </article>

            <article className={styles.driftMetricCard}>
              <span className="muted-label">Block rate change</span>
              <strong>{formatPercent(blockRateSignal?.delta ?? 0, 1)}</strong>
              <span className={styles.secondaryText}>
                {blockRateSignal
                  ? `${formatPercent(blockRateSignal.previous_value, 1)} -> ${formatPercent(blockRateSignal.recent_value, 1)}`
                  : 'Sin aumento relevante'}
              </span>
            </article>
          </div>

          <div className={styles.driftWindows}>
            <WindowCard title="Ventana reciente" window={recent} />
            <WindowCard title="Ventana previa" window={previous} />
          </div>

          <div className={styles.signalList}>
            {signals.length ? (
              signals.map((signal) => (
                <article key={`${signal.type}-${signal.description}`} className={styles.signalItem}>
                  <div className={styles.signalMeta}>
                    <span className={`badge badge--${getStatusTone(signal.severity)}`}>
                      {humanizeToken(signal.severity)}
                    </span>
                    <span className="badge">{humanizeToken(signal.type)}</span>
                  </div>
                  <p className={styles.signalDescription}>{signal.description}</p>
                  <div className={styles.signalNumbers}>
                    {signal.delta !== null && signal.delta !== undefined ? (
                      <span>Delta: {formatScore(signal.delta, 3)}</span>
                    ) : null}
                    {signal.recent_value !== null && signal.recent_value !== undefined ? (
                      <span>Reciente: {formatScore(signal.recent_value, 3)}</span>
                    ) : null}
                    {signal.previous_value !== null && signal.previous_value !== undefined ? (
                      <span>Previa: {formatScore(signal.previous_value, 3)}</span>
                    ) : null}
                    {signal.signatures?.length ? (
                      <span>Signatures: {signal.signatures.join(', ')}</span>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className={styles.emptyInline}>
                No hay senales activas. El comportamiento reciente se mantiene estable respecto de
                la ventana anterior.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
