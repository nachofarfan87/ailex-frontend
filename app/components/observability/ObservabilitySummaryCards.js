import {
  formatCompactNumber,
  formatScore,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

const SUMMARY_ITEMS = [
  {
    key: 'total_observations',
    label: 'Observaciones',
    copy: 'Eventos de impacto auditables registrados por el ciclo adaptativo.',
    formatter: formatCompactNumber,
  },
  {
    key: 'total_adaptive_decisions',
    label: 'Decisiones adaptativas',
    copy: 'Aplicaciones, bloqueos y acciones observadas en runtime.',
    formatter: formatCompactNumber,
  },
  {
    key: 'unique_signatures',
    label: 'Signatures unicas',
    copy: 'Cantidad de patrones finos con memoria de impacto propia.',
    formatter: formatCompactNumber,
  },
  {
    key: 'unique_signature_families',
    label: 'Families unicas',
    copy: 'Agrupaciones de signatures para ver comportamiento agregado.',
    formatter: formatCompactNumber,
  },
  {
    key: 'unique_event_types',
    label: 'Tipos de evento',
    copy: 'Cobertura de eventos que ya estan generando feedback observable.',
    formatter: formatCompactNumber,
  },
  {
    key: 'reinforced_decisions',
    label: 'Reforzadas',
    copy: 'Decisiones favorecidas por memoria de impacto positiva.',
    formatter: formatCompactNumber,
    metaLabel: 'Bloqueadas',
    metaKey: 'blocked_decisions',
  },
  {
    key: 'neutral_decisions',
    label: 'Neutrales',
    copy: 'Decisiones sin senal suficiente o sin cambio neto.',
    formatter: formatCompactNumber,
    metaLabel: 'Media recency',
    metaKey: 'recency_weighted_avg_score',
    metaFormatter: (value) => formatScore(value, 3),
  },
  {
    key: 'avg_impact_score',
    label: 'Score promedio',
    copy: 'Lectura base del impacto historico agregado.',
    formatter: (value) => formatScore(value, 3),
  },
  {
    key: 'recency_weighted_avg_score',
    label: 'Score ponderado',
    copy: 'Promedio con mayor peso para observaciones recientes.',
    formatter: (value) => formatScore(value, 3),
  },
  {
    key: 'blocked_decisions',
    label: 'Bloqueadas',
    copy: 'Decisiones que el sistema prefirio frenar por senal negativa.',
    formatter: formatCompactNumber,
  },
];

export default function ObservabilitySummaryCards({ overview }) {
  return (
    <div className={styles.summaryGrid}>
      {SUMMARY_ITEMS.map((item, index) => (
        <article
          key={item.key}
          className={`${styles.summaryCard} ${index < 2 ? styles.summaryCardStrong : ''}`}
        >
          <span className="muted-label">{item.label}</span>
          <strong className={styles.summaryValue}>
            {item.formatter(overview?.[item.key])}
          </strong>
          {item.metaKey ? (
            <div className={styles.summaryMeta}>
              <span>{item.metaLabel}</span>
              <strong>
                {item.metaFormatter
                  ? item.metaFormatter(overview?.[item.metaKey])
                  : formatCompactNumber(overview?.[item.metaKey])}
              </strong>
            </div>
          ) : null}
          <p className={styles.summaryCopy}>{item.copy}</p>
        </article>
      ))}
    </div>
  );
}
