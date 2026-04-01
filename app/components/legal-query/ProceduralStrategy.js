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
  primaryAction = '',
  nextSteps = [],
  risks = [],
  missingInformation = [],
}) {
  return (
    <div className={styles.resultsGrid}>
      <div className={styles.panel}>
        <h4 className={styles.panelTitle}>Accion principal</h4>
        {primaryAction ? (
          <p className={styles.panelText}>{formatListItem(primaryAction)}</p>
        ) : (
          <p className={styles.emptyNote}>No se informo una accion principal concreta.</p>
        )}
      </div>
      <StrategyColumn
        title="Acciones de soporte"
        items={nextSteps}
        emptyMessage="No se informaron acciones de soporte concretas."
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
