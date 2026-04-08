'use client';

import styles from './CaseWorkspace.module.css';

export default function ProfessionalHandoffCard({ handoff, nextQuestion = '' }) {
  if (!handoff) return null;

  const hasOpenItems = handoff.openItems?.length > 0;
  const finalNextQuestion = handoff.nextQuestion || nextQuestion;

  return (
    <section className={styles.handoffCard}>
      <div className={styles.handoffHeader}>
        <div>
          <p className={styles.handoffLabel}>Vista profesional</p>
          <h4 className={styles.handoffTitle}>
            {handoff.readyForProfessionalReview
              ? 'Punto de traspaso claro'
              : 'Base util para seguimiento'}
          </h4>
        </div>
        <span className={styles.countTag}>
          {handoff.readyForProfessionalReview ? 'Listo para revisar' : 'Seguimiento sugerido'}
        </span>
      </div>

      {handoff.reviewReadinessLabel ? (
        <p className={styles.handoffText}>Readiness profesional: {handoff.reviewReadinessLabel}</p>
      ) : null}
      {handoff.reason ? <p className={styles.handoffText}>{handoff.reason}</p> : null}
      {handoff.primaryFriction ? (
        <p className={styles.handoffText}>Friccion principal: {handoff.primaryFriction}</p>
      ) : null}
      {handoff.professionalEntryPoint ? (
        <p className={styles.handoffText}>
          Entrada profesional: {handoff.professionalEntryPoint}
        </p>
      ) : null}
      {handoff.focus ? <p className={styles.handoffText}>{handoff.focus}</p> : null}

      {hasOpenItems ? (
        <div className={styles.section}>
          <p className={styles.miniLabel}>Pendiente de cerrar</p>
          <ul className={styles.inlineList}>
            {handoff.openItems.map((item, index) => (
              <li key={`${item}-${index}`} className={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {finalNextQuestion ? (
        <div className={styles.questionCard}>
          <p className={styles.questionLabel}>Pregunta que mas destraba</p>
          <p className={styles.questionText}>{finalNextQuestion}</p>
        </div>
      ) : null}
    </section>
  );
}
