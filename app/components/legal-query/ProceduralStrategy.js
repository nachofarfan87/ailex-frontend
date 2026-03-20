'use client';

import styles from './LegalQuery.module.css';
import { formatListItem } from '@/app/lib/legalQuery';

function StrategyColumn({ title, items, emptyMessage }) {
  return (
    <div className={styles.panel}>
      <h4 className={styles.panelTitle}>{title}</h4>
      {items.length ? (
        <ul className={styles.strategyList}>
          {items.map((item, index) => (
            <li key={`${formatListItem(item)}-${index}`} className={styles.strategyItem}>
              <p className={styles.panelText}>{formatListItem(item)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyNote}>{emptyMessage}</p>
      )}
    </div>
  );
}

export default function ProceduralStrategy({
  nextSteps = [],
  risks = [],
  missingInformation = [],
}) {
  return (
    <div className={styles.resultsGrid}>
      <StrategyColumn
        title="Próximos pasos"
        items={nextSteps}
        emptyMessage="No se informaron próximos pasos concretos."
      />
      <StrategyColumn
        title="Riesgos procesales"
        items={risks}
        emptyMessage="No se informaron riesgos procesales concretos."
      />
      <div className={`${styles.panel} ${styles.panelFull}`}>
        <h4 className={styles.panelTitle}>Información faltante</h4>
        {missingInformation.length ? (
          <ul className={styles.strategyList}>
            {missingInformation.map((item, index) => (
              <li key={`${formatListItem(item)}-${index}`} className={styles.strategyItem}>
                <p className={styles.panelText}>{formatListItem(item)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNote}>No se reportó información faltante adicional.</p>
        )}
      </div>
    </div>
  );
}
