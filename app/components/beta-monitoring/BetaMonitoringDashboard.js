'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBetaDashboard } from '../../lib/api';
import styles from './BetaMonitoring.module.css';

const AUTO_REFRESH_MS = 25_000;

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

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

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  } catch {
    return ts;
  }
}

/* ------------------------------------------------------------------ */
/*  sub-components                                                     */
/* ------------------------------------------------------------------ */

function AlertStrip({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className={styles.alertStrip}>
      {alerts.map((alert, i) => (
        <div key={i} className={styles.alertItem} data-level={alert.level}>
          <span className={styles.alertDot} />
          {alert.message}
        </div>
      ))}
    </div>
  );
}

function SystemStatusCards({ status }) {
  return (
    <div className={styles.statusGrid}>
      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Health</span>
        <span className={healthBadgeClass(status.health_status)}>
          {status.health_status?.toUpperCase()}
        </span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>System Mode</span>
        <span className={modeBadgeClass(status.system_mode)}>
          {status.system_mode?.toUpperCase()}
        </span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Safety Status</span>
        <span className={healthBadgeClass(
          status.active_safety_status === 'normal' ? 'healthy' : 'degraded'
        )}>
          {status.active_safety_status?.toUpperCase()}
        </span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Pending Reviews</span>
        <span className={styles.statusValue}>{status.pending_reviews ?? 0}</span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Review Queue</span>
        <span className={styles.statusValue}>{status.review_queue_size ?? 0}</span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Overrides Activos</span>
        <span className={styles.statusValue}>{status.overrides_active ?? 0}</span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Intervenciones 24h</span>
        <span className={styles.statusValue}>{status.human_interventions_last_24h ?? 0}</span>
      </div>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Version</span>
        <span className={styles.statusValue} style={{ fontSize: '1rem' }}>
          {status.app_version || '—'}
        </span>
      </div>
    </div>
  );
}

function SafetyPanel({ safety }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Safety Summary</h3>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.metricList}>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Inputs rechazados</span>
            <span className={styles.metricValue}>{safety.rejected_inputs_count}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Requests degradados</span>
            <span className={styles.metricValue}>{safety.degraded_requests_count}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Rate limited</span>
            <span className={styles.metricValue}>{safety.rate_limited_requests_count}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Excluidos de learning</span>
            <span className={styles.metricValue}>{safety.excluded_from_learning_count}</span>
          </div>
          {safety.dominant_safety_reason && (
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Razon dominante</span>
              <span className={styles.metricValue}>{safety.dominant_safety_reason}</span>
            </div>
          )}
        </div>

        {safety.top_safety_reasons?.length > 0 && (
          <>
            <h4 style={{ margin: '16px 0 8px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Top razones
            </h4>
            <div className={styles.metricList}>
              {safety.top_safety_reasons.map((item, i) => (
                <div key={i} className={styles.metricRow}>
                  <span className={styles.metricLabel}>{item.reason}</span>
                  <span className={styles.metricValue}>{item.count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {safety.recent_safety_events?.length > 0 && (
          <>
            <h4 style={{ margin: '16px 0 8px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Eventos recientes
            </h4>
            <div className={styles.eventList}>
              {safety.recent_safety_events.map((ev, i) => (
                <div key={i} className={styles.eventItem}>
                  <span className={styles.eventType}>{ev.event_type}</span>
                  <span className={styles.eventTime}>{formatTimestamp(ev.created_at)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HumanControlPanel({ control }) {
  const byPriority = control.pending_reviews_by_priority || {};

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Human Control</h3>
        <span className={modeBadgeClass(control.system_mode)}>
          {control.system_mode?.toUpperCase()}
        </span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.metricList}>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Pending high</span>
            <span className={priorityBadgeClass('high')}>{byPriority.high ?? 0}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Pending medium</span>
            <span className={priorityBadgeClass('medium')}>{byPriority.medium ?? 0}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Pending low</span>
            <span className={priorityBadgeClass('low')}>{byPriority.low ?? 0}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Stale reviews</span>
            <span className={styles.metricValue}>
              {control.stale_reviews_count > 0 ? (
                <span className="badge badge--warning">{control.stale_reviews_count}</span>
              ) : (
                '0'
              )}
            </span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Oldest pending</span>
            <span className={styles.metricValue}>{formatHours(control.oldest_pending_review_hours)}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Approval rate</span>
            <span className={styles.metricValue}>{formatRate(control.approval_rate)}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Rejection rate</span>
            <span className={styles.metricValue}>{formatRate(control.rejection_rate)}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Override rate</span>
            <span className={styles.metricValue}>{formatRate(control.override_rate)}</span>
          </div>
        </div>

        {control.overrides?.length > 0 && (
          <>
            <h4 style={{ margin: '16px 0 8px', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              Overrides activos
            </h4>
            <div className={styles.metricList}>
              {control.overrides.map((ov, i) => (
                <div key={i} className={styles.metricRow}>
                  <span className={styles.metricLabel}>
                    {ov.override_type}: {ov.parameter_name || '—'}
                  </span>
                  <span className="badge badge--warning">{ov.reason || 'active'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewQueuePreview({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Review Queue Preview</h3>
        </div>
        <div className={styles.emptyMessage}>No hay reviews pendientes</div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Review Queue Preview</h3>
        <span className="badge">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className={styles.panelBody} style={{ overflowX: 'auto' }}>
        <table className={styles.reviewTable}>
          <thead>
            <tr>
              <th>Parametro</th>
              <th>Accion</th>
              <th>Prioridad</th>
              <th>Edad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {item.parameter_name || '—'}
                </td>
                <td>{item.final_action || '—'}</td>
                <td>
                  <span className={priorityBadgeClass(item.review_priority)}>
                    {item.review_priority?.toUpperCase()}
                  </span>
                </td>
                <td>
                  {item.is_stale ? (
                    <span className="badge badge--warning">
                      {formatHours(item.age_hours)} STALE
                    </span>
                  ) : (
                    formatHours(item.age_hours)
                  )}
                </td>
                <td>{item.review_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  main component                                                     */
/* ------------------------------------------------------------------ */

export default function BetaMonitoringDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await getBetaDashboard();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  if (loading && !data) {
    return <div className={styles.loadingShell}>Cargando monitoreo beta...</div>;
  }

  if (error && !data) {
    return (
      <div className={styles.errorShell}>
        <span>{error}</span>
        <button className="ghost-button" onClick={load}>Reintentar</button>
      </div>
    );
  }

  const { system_status, safety_summary, human_control, review_queue_preview, alerts } = data;

  return (
    <div className={styles.shell}>
      {/* toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <h2 className={styles.toolbarTitle}>Estado del sistema</h2>
          <p className={styles.toolbarText}>
            Vista operativa de AILEX para monitoreo beta.
            {lastRefresh && (
              <> Actualizado: {lastRefresh.toLocaleTimeString('es-AR')}</>
            )}
          </p>
        </div>
        <button className="ghost-button" onClick={load} disabled={loading}>
          {loading ? 'Actualizando...' : 'Refresh'}
        </button>
      </div>

      {/* alerts */}
      <AlertStrip alerts={alerts} />

      {/* error banner if partial refresh failed */}
      {error && data && (
        <div className={styles.alertItem} data-level="warning" style={{ margin: 0 }}>
          <span className={styles.alertDot} />
          Error en ultima actualizacion: {error}
        </div>
      )}

      {/* system status cards */}
      <SystemStatusCards status={system_status} />

      {/* two-column panels */}
      <div className={styles.dualGrid}>
        <SafetyPanel safety={safety_summary} />
        <HumanControlPanel control={human_control} />
      </div>

      {/* review queue preview */}
      <ReviewQueuePreview items={review_queue_preview} />
    </div>
  );
}
