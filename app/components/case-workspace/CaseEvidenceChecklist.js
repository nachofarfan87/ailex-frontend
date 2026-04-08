'use client';

import styles from './CaseWorkspace.module.css';

function EvidenceBucket({ title, items = [], tone = 'recommended' }) {
  const columnClass =
    tone === 'critical'
      ? styles.criticalColumn
      : tone === 'optional'
        ? styles.optionalColumn
        : styles.recommendedColumn;
  const labelClass =
    tone === 'critical'
      ? styles.bucketLabelCritical
      : tone === 'optional'
        ? styles.bucketLabelOptional
        : styles.bucketLabelRecommended;

  return (
    <section className={`${styles.evidenceColumn} ${columnClass}`}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={`${styles.bucketLabel} ${labelClass}`}>{title}</p>
          <h4 className={styles.bucketTitle}>
            {items.length ? `${items.length} item${items.length > 1 ? 's' : ''}` : 'Sin items'}
          </h4>
        </div>
      </div>

          {items.length ? (
            <ul className={styles.bucketList}>
              {items.map((item) => (
                <li key={item.key} className={styles.listItem}>
                  <span className={styles.factLabel}>{item.label}</span>
                  {item.reason ? <p className={styles.evidenceReason}>{item.reason}</p> : null}
                  {item.whyItMatters ? (
                    <p className={styles.evidenceReason}>{item.whyItMatters}</p>
                  ) : null}
                  {item.resolves?.length ? (
                    <p className={styles.evidenceReason}>
                      Ayuda a cubrir: {item.resolves.join(', ')}
                    </p>
                  ) : null}
                  {item.supportsStepTitle ? (
                    <p className={styles.evidenceReason}>
                      Sirve especialmente para: {item.supportsStepTitle}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
      ) : (
        <p className={styles.emptyText}>No aparece una necesidad clara en este grupo.</p>
      )}
    </section>
  );
}

export default function CaseEvidenceChecklist({ checklist }) {
  const safeChecklist = checklist || {};
  const total =
    (safeChecklist.critical?.length || 0) +
    (safeChecklist.recommended?.length || 0) +
    (safeChecklist.optional?.length || 0);

  if (!total) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.sectionEyebrow}>Prueba y documentos</p>
        <p className={styles.emptyText}>
          Todavia no hay una checklist probatoria lo bastante clara como para mostrarla aca.
        </p>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Prueba y documentos</p>
          <h4 className={styles.bucketTitle}>Checklist para ordenar el caso</h4>
        </div>
        <span className={styles.countTag}>{total} item{total > 1 ? 's' : ''}</span>
      </div>

      <div className={styles.evidenceGrid}>
        <EvidenceBucket title="Critico" items={safeChecklist.critical || []} tone="critical" />
        <EvidenceBucket
          title="Recomendado"
          items={safeChecklist.recommended || []}
          tone="recommended"
        />
        <EvidenceBucket title="Opcional" items={safeChecklist.optional || []} tone="optional" />
      </div>
    </section>
  );
}
