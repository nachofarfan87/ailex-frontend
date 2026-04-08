'use client';

import styles from './CaseProgressSnapshot.module.css';

function Section({ title, items = [], emptyLabel = '' }) {
  if (!items.length && !emptyLabel) return null;

  return (
    <section className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      {items.length ? (
        <ul className={styles.list}>
          {items.map((item, index) => {
            const text = typeof item === 'string' ? item : item.summary || item.label || '';
            if (!text) return null;
            return (
              <li key={`${text}-${index}`} className={styles.listItem}>
                {text}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.emptyLabel}>{emptyLabel}</p>
      )}
    </section>
  );
}

function ToneBadge({ tone = 'neutral', children }) {
  const className =
    tone === 'success'
      ? styles.badgeSuccess
      : tone === 'warning'
        ? styles.badgeWarning
        : tone === 'danger'
          ? styles.badgeDanger
          : styles.badgeNeutral;

  return <span className={className}>{children}</span>;
}

export default function CaseProgressSnapshot({ snapshot }) {
  if (!snapshot?.available) return null;

  return (
    <section className={styles.snapshotCard}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Estado del caso</p>
          <h4 className={styles.title}>{snapshot.title}</h4>
          {snapshot.summary ? <p className={styles.summary}>{snapshot.summary}</p> : null}
        </div>
        <div className={styles.meta}>
          {snapshot.stageLabel ? <ToneBadge tone={snapshot.statusTone}>{snapshot.stageLabel}</ToneBadge> : null}
          {snapshot.readinessText ? <ToneBadge>{snapshot.readinessText}</ToneBadge> : null}
          {snapshot.progressStatusText ? <ToneBadge>{snapshot.progressStatusText}</ToneBadge> : null}
        </div>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressHead}>
          <span className={styles.progressLabel}>Base consolidada del caso</span>
          <span className={styles.progressValue}>{snapshot.percentage}%</span>
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={snapshot.percentage}
          aria-label="Estado del caso"
        >
          <span className={styles.progressFill} style={{ width: `${snapshot.percentage}%` }} />
        </div>
      </div>

      {snapshot.caseDirection ? (
        <div className={styles.directionCard}>
          <p className={styles.directionLabel}>Direccion del caso</p>
          <p className={styles.directionText}>{snapshot.caseDirection}</p>
        </div>
      ) : null}

      {snapshot.focusLabel ? (
        <div className={styles.focusCard}>
          <p className={styles.focusLabel}>En este momento</p>
          <p className={styles.focusText}>{snapshot.focusLabel}</p>
          {snapshot.primaryGap && !snapshot.questionTargetHint ? (
            <p className={styles.primaryGapHint}>
              Esto es lo que estamos intentando definir ahora: {snapshot.primaryGap.label}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.nextStepCard}>
        <p className={styles.nextStepLabel}>Proximo mejor paso</p>
        <p className={styles.nextStepText}>{snapshot.nextStepLabel || 'Seguir ordenando el caso'}</p>
        {snapshot.nextStepReason ? (
          <p className={styles.nextStepReason}>{snapshot.nextStepReason}</p>
        ) : null}
        {snapshot.questionTargetHint ? (
          <p className={styles.questionTargetHint}>{snapshot.questionTargetHint}</p>
        ) : snapshot.primaryGap ? (
          <p className={styles.primaryGapHint}>
            Esto apunta a definir {snapshot.primaryGap.label}.
          </p>
        ) : null}
        {snapshot.followupDirectionHint ? (
          <p className={styles.followupDirectionHint}>{snapshot.followupDirectionHint}</p>
        ) : null}
      </div>

      <div className={styles.grid}>
        <Section
          title="Ya esta claro"
          items={snapshot.clarifiedItems}
          emptyLabel="Todavia no hay hechos claros suficientes para mostrar aca."
        />
        <Section
          title="Falta prioritario"
          items={snapshot.criticalGaps}
          emptyLabel="No aparecen faltantes criticos en este momento."
        />
        <Section
          title="Falta para afinar"
          items={snapshot.importantGaps}
          emptyLabel="No hay faltantes importantes destacados."
        />
        <Section
          title="Bloqueos o contradicciones"
          items={[
            ...snapshot.contradictions.map((item) => item.summary),
            ...snapshot.blockers.map((item) => item.summary),
          ]}
          emptyLabel="No hay bloqueos fuertes ni contradicciones visibles."
        />
      </div>

      {snapshot.narrativeHighlights?.length ? (
        <div className={styles.highlights}>
          {snapshot.narrativeHighlights.map((item, index) => (
            <p key={`${item}-${index}`} className={styles.highlight}>
              {item}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
