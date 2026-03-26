'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSessionAnalyticsSummary } from '../lib/api';
import styles from './MonitoreoBeta.module.css';

const AUTO_REFRESH_MS = 30000;

function formatRate(value) {
  const numeric = Number(value || 0);
  return `${Math.round(numeric * 100)}%`;
}

function formatMetric(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function MetricCard({ label, value, tone = 'neutral' }) {
  return (
    <article className={`${styles.metricCard} ${styles[`metricCard${tone}`] || ''}`}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{formatMetric(value)}</strong>
    </article>
  );
}

function TopList({ title, items = [], emptyLabel }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
      </div>
      <div className={styles.panelBody}>
        {items.length ? (
          <ol className={styles.rankList}>
            {items.map((item, index) => (
              <li key={`${item.value}-${index}`} className={styles.rankItem}>
                <span className={styles.rankValue}>{item.value}</span>
                <span className={styles.rankCount}>{item.count}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyState}>{emptyLabel}</p>
        )}
      </div>
    </section>
  );
}

export default function MonitoreoBetaPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const payload = await getSessionAnalyticsSummary();
      setData(payload);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || 'No se pudo cargar el monitoreo beta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [load]);

  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Beta controlada</span>
          <h1 className="page-title">Monitoreo Beta</h1>
          <p className="page-description">
            Vista interna minima para leer rapido el uso real de la beta y detectar friccion conversacional.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="ghost-button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Actualizando...' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className={styles.toolbar}>
        <p className={styles.toolbarText}>
          {lastUpdatedAt
            ? `Ultima actualizacion: ${lastUpdatedAt.toLocaleTimeString('es-AR')}`
            : 'Sin datos cargados todavia.'}
        </p>
        <span className={styles.refreshNote}>Auto-refresh cada 30s</span>
      </section>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {loading && !data ? (
        <div className={styles.loadingState}>Cargando analytics de sesiones...</div>
      ) : (
        <>
          <section className={styles.grid}>
            <MetricCard label="Sesiones totales" value={data?.total_sessions} tone="strong" />
            <MetricCard label="Sesiones activas" value={data?.active_sessions} />
            <MetricCard label="Sesiones completadas" value={data?.completed_sessions} tone="positive" />
            <MetricCard label="Sesiones abandonadas" value={data?.abandoned_sessions} tone="warning" />
          </section>

          <section className={styles.grid}>
            <MetricCard label="Promedio de turnos" value={data?.avg_turns_per_session} />
            <MetricCard label="Tasa de clarificacion" value={formatRate(data?.clarification_rate)} />
            <MetricCard label="Tasa de cierre" value={formatRate(data?.closure_rate)} />
            <MetricCard label="Tasa de quick reply" value={formatRate(data?.quick_reply_rate)} />
          </section>

          <section className={styles.grid}>
            <MetricCard label="Tiempo medio hasta advice" value={data?.avg_time_to_advice_seconds === null ? '—' : `${formatMetric(data?.avg_time_to_advice_seconds)}s`} />
          </section>

          <div className={styles.panelGrid}>
            <TopList
              title="Dominios mas consultados"
              items={data?.top_case_domains || []}
              emptyLabel="Todavia no hay dominios suficientes para mostrar."
            />
            <TopList
              title="Preguntas de clarificacion mas frecuentes"
              items={data?.top_clarification_questions || []}
              emptyLabel="Todavia no hay preguntas de clarificacion registradas."
            />
            <TopList
              title="Quick replies mas usados"
              items={data?.top_quick_replies || []}
              emptyLabel="Todavia no hay quick replies registrados."
            />
          </div>
        </>
      )}
    </div>
  );
}
