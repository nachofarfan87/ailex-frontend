import {
  formatCompactNumber,
  formatScore,
  getStatusTone,
  humanizeToken,
} from '../../lib/learningObservability.mjs';
import styles from './Observability.module.css';

function PatternList({ items, kind, emptyLabel }) {
  if (!items?.length) {
    return <p className={styles.emptyInline}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.patternList}>
      {items.map((item) => {
        const title = item.signature || item.signature_family || 'Patron';
        return (
          <article key={title} className={styles.patternRow}>
            <div className={styles.patternTitle}>{title}</div>
            <div className={styles.patternMeta}>
              <span className={`badge badge--${getStatusTone(item.status || kind)}`}>
                {humanizeToken(item.status || kind)}
              </span>
              <span>{humanizeToken(item.event_type)}</span>
              <span>{formatCompactNumber(item.observation_count)} obs.</span>
              <span>{formatScore(item.avg_score, 3)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ObservabilityPatterns({ patterns }) {
  return (
    <section className="surface-panel surface-panel--soft">
      <div className="surface-panel__body">
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderCopy}>
            <h2>Top patterns</h2>
            <p>
              Ranking directo desde el backend para ver que signatures y familias estan
              empujando refuerzos o bloqueos.
            </p>
          </div>
        </div>

        <div className={styles.patternsGrid}>
          <article className={styles.patternCard}>
            <div className={styles.panelHeaderCopy}>
              <h3>Signatures positivas</h3>
              <p>Patrones con mejor score medio.</p>
            </div>
            <PatternList
              items={patterns?.top_positive_signatures}
              kind="positive"
              emptyLabel="Todavia no hay signatures positivas destacadas."
            />
          </article>

          <article className={styles.patternCard}>
            <div className={styles.panelHeaderCopy}>
              <h3>Signatures negativas</h3>
              <p>Patrones que conviene auditar primero.</p>
            </div>
            <PatternList
              items={patterns?.top_negative_signatures}
              kind="negative"
              emptyLabel="No hay signatures negativas relevantes."
            />
          </article>

          <article className={styles.patternCard}>
            <div className={styles.panelHeaderCopy}>
              <h3>Families positivas</h3>
              <p>Vista agregada para confirmar consistencia por familia.</p>
            </div>
            <PatternList
              items={patterns?.top_positive_families}
              kind="positive"
              emptyLabel="Todavia no hay familias positivas destacadas."
            />
          </article>

          <article className={styles.patternCard}>
            <div className={styles.panelHeaderCopy}>
              <h3>Families negativas</h3>
              <p>Senales agrupadas con deterioro sostenido.</p>
            </div>
            <PatternList
              items={patterns?.top_negative_families}
              kind="negative"
              emptyLabel="No hay familias negativas relevantes."
            />
          </article>
        </div>
      </div>
    </section>
  );
}
