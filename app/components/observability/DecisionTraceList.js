import {
  formatDateTime,
  formatScore,
  getDecisionTone,
  getDirectionTone,
  getStatusTone,
  humanizeToken,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function JsonCard({ value }) {
  return (
    <pre className={styles.jsonCard}>
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  );
}

export default function DecisionTraceList({
  rows,
  search,
  onSearchChange,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  return (
    <section className={`surface-panel ${styles.decisionsPrimary}`}>
      <div className="surface-panel__body">
        <div className={styles.tableShell}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderCopy}>
              <h2>Decision trace</h2>
              <p>
                Vista reciente para auditar por que una recomendacion se reforzo, se bloqueo o
                quedo neutral.
              </p>
            </div>
            <span className="badge">{rows.length} decisiones</span>
          </div>

          <div className={styles.tableControls}>
            <div className={styles.tableControlsLeft}>
              <div className={styles.tableControl}>
                <label htmlFor="decision-search">Busqueda</label>
                <input
                  id="decision-search"
                  type="search"
                  placeholder="Buscar por reason, signature o event_type..."
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableControlsRight}>
              <div className={styles.tableControl}>
                <label htmlFor="decision-page-size">Pagina</label>
                <select
                  id="decision-page-size"
                  value={String(pageSize)}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
                >
                  <option value="10">10 por pagina</option>
                  <option value="20">20 por pagina</option>
                  <option value="30">30 por pagina</option>
                </select>
              </div>
            </div>
          </div>

          {rows.length ? (
            <>
              <div className={styles.paginationBar}>
                <span className={styles.secondaryText}>
                  Pagina {page} de {totalPages}
                </span>
                <div className={styles.paginationControls}>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className={styles.decisions}>
                {rows.map((decision) => (
                <details key={decision.id} className={styles.decisionItem}>
                  <summary className={styles.decisionSummary}>
                    <div className={styles.decisionSummaryGrid}>
                      <div className={styles.decisionMain}>
                        <span className={styles.decisionTitle}>
                          {humanizeToken(decision.event_type)}
                        </span>
                        <span className={styles.decisionMeta}>
                          {formatDateTime(decision.created_at)}
                        </span>
                      </div>

                      <div className={styles.decisionMain}>
                        <span className={styles.decisionTitle}>
                          {decision.recommendation_type || 'Sin recommendation_type'}
                        </span>
                        <span className={styles.decisionMeta}>
                          {decision.impact_decision_reason || 'Sin reason'}
                        </span>
                      </div>

                      <div className={styles.decisionMain}>
                        <span className={`badge badge--${getDecisionTone(decision.decision_mode)}`}>
                          {humanizeToken(decision.decision_mode)}
                        </span>
                        <span className={styles.decisionExpandHint}>
                          {humanizeToken(decision.base_decision)} to{' '}
                          {humanizeToken(decision.final_decision)}
                        </span>
                      </div>

                      <div className={styles.decisionMain}>
                        <div className={styles.signalBadgeRow}>
                          <span className={`badge badge--trust`}>
                            {humanizeToken(decision.dominant_signal?.layer)}
                          </span>
                          <span className={`badge badge--${getDirectionTone(decision.dominant_signal?.direction)}`}>
                            {humanizeToken(decision.dominant_signal?.direction)}
                          </span>
                        </div>
                        <span className={styles.decisionMeta}>
                          Impact: {humanizeToken(decision.impact_status)}
                        </span>
                      </div>

                      <div className={styles.decisionMain}>
                        <span className={styles.decisionTitle}>
                          {formatScore(decision.dominant_signal?.score, 3)}
                        </span>
                        <span className={styles.decisionMeta}>
                          {decision.dominant_signal?.reference || 'Sin referencia'}
                        </span>
                      </div>

                      <div className={styles.decisionMain}>
                        <span className={styles.decisionTitle}>
                          Conf {formatScore(decision.confidence_score, 2)}
                        </span>
                        <span className={styles.decisionMeta}>
                          Prioridad {formatScore(decision.priority, 2)}
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className={styles.decisionBody}>
                    <div className={styles.decisionGrid}>
                      <article className={styles.detailCard}>
                        <h4>Dominant signal</h4>
                        <dl className={styles.detailList}>
                          <div>
                            <dt>Layer</dt>
                            <dd>{humanizeToken(decision.dominant_signal?.layer)}</dd>
                          </div>
                          <div>
                            <dt>Direction</dt>
                            <dd>{humanizeToken(decision.dominant_signal?.direction)}</dd>
                          </div>
                          <div>
                            <dt>Score</dt>
                            <dd>{formatScore(decision.dominant_signal?.score, 3)}</dd>
                          </div>
                          <div>
                            <dt>Reference</dt>
                            <dd className={styles.mono}>
                              {decision.dominant_signal?.reference || 'Sin referencia'}
                            </dd>
                          </div>
                        </dl>
                      </article>

                      <article className={styles.detailCard}>
                        <h4>Decision metadata</h4>
                        <dl className={styles.detailList}>
                          <div>
                            <dt>Base</dt>
                            <dd>{humanizeToken(decision.base_decision)}</dd>
                          </div>
                          <div>
                            <dt>Final</dt>
                            <dd>{humanizeToken(decision.final_decision)}</dd>
                          </div>
                          <div>
                            <dt>Mode</dt>
                            <dd>{humanizeToken(decision.decision_mode)}</dd>
                          </div>
                          <div>
                            <dt>Impact status</dt>
                            <dd>{humanizeToken(decision.impact_status)}</dd>
                          </div>
                        </dl>
                      </article>

                      <article className={styles.detailCard}>
                        <h4>Thresholds</h4>
                        <JsonCard value={decision.thresholds_used} />
                      </article>
                    </div>

                    <article className={styles.detailCard}>
                      <h4>Explanation layers</h4>
                      {decision.explanation_layers?.length ? (
                        <div className={styles.layerList}>
                          {decision.explanation_layers.map((layer) => (
                            <div
                              key={`${decision.id}-${layer.layer}-${layer.reference}`}
                              className={styles.layerItem}
                            >
                              <div className={styles.layerHeader}>
                                <strong>{humanizeToken(layer.layer)}</strong>
                                <span className={`badge badge--${getDecisionTone(layer.effect)}`}>
                                  {humanizeToken(layer.effect)}
                                </span>
                              </div>
                              <div className={styles.layerStats}>
                                <span className={styles.mono}>{layer.reference || 'Sin referencia'}</span>
                                <span>Score {formatScore(layer.score, 3)}</span>
                                <span>Peso {formatScore(layer.weight, 2)}</span>
                                <span>Raw {formatScore(layer.raw_total, 0)}</span>
                                <span>Weighted {formatScore(layer.weighted_total, 2)}</span>
                                <span>Mem conf {formatScore(layer.memory_confidence, 2)}</span>
                                <span>{layer.available ? 'Available' : 'Unavailable'}</span>
                                <span>{layer.strong_enough ? 'Strong' : 'Weak'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyInline}>No hay explanation layers disponibles.</p>
                      )}
                    </article>

                    <div className={styles.decisionGrid}>
                      <article className={styles.detailCard}>
                        <h4>Impact score reference</h4>
                        <JsonCard value={decision.impact_score_reference} />
                      </article>

                      <article className={styles.detailCard}>
                        <h4>Reason</h4>
                        <p className={styles.emptyInline}>
                          {decision.impact_decision_reason || 'Sin motivo informado.'}
                        </p>
                      </article>

                      <article className={styles.detailCard}>
                        <h4>Scores</h4>
                        <dl className={styles.detailList}>
                          <div>
                            <dt>Confidence</dt>
                            <dd>{formatScore(decision.confidence_score, 2)}</dd>
                          </div>
                          <div>
                            <dt>Priority</dt>
                            <dd>{formatScore(decision.priority, 2)}</dd>
                          </div>
                        </dl>
                      </article>
                    </div>
                  </div>
                </details>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-box">
              <strong>Sin decisiones</strong>
              <div>No hay decisiones recientes para la combinacion actual de filtros.</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
