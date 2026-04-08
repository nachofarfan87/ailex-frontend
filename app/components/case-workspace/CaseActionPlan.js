'use client';

import styles from './CaseWorkspace.module.css';

function priorityLabel(priority) {
  const labels = {
    high: 'Alta prioridad',
    medium: 'Prioridad media',
    low: 'Prioridad baja',
  };
  return labels[String(priority || '').trim().toLowerCase()] || 'Paso sugerido';
}

function statusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    blocked: 'Bloqueado',
    done: 'Resuelto',
  };
  return labels[String(status || '').trim().toLowerCase()] || 'Pendiente';
}

function phaseLabel(phase) {
  const labels = {
    clarify: 'Aclarar',
    prepare: 'Preparar',
    prove: 'Respaldar',
    decide: 'Decidir',
    review: 'Revisar',
    file: 'Presentar',
    execute: 'Ejecutar',
  };
  return labels[String(phase || '').trim().toLowerCase()] || 'Paso';
}

export default function CaseActionPlan({ steps = [] }) {
  if (!steps.length) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.sectionEyebrow}>Que hacer ahora</p>
        <p className={styles.emptyText}>
          Todavia no hay pasos accionables suficientemente claros para sugerir aca.
        </p>
      </div>
    );
  }

  return (
    <section className={styles.actions}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Que hacer ahora</p>
          <h4 className={styles.bucketTitle}>Plan de accion sugerido</h4>
        </div>
      </div>

      <ul className={styles.actionList}>
        {steps.map((step) => {
          const priority = String(step.priority || 'medium').trim().toLowerCase();
          const status = String(step.status || 'pending').trim().toLowerCase();
          const priorityClass =
            priority === 'high'
              ? styles.priorityHigh
              : priority === 'low'
                ? styles.priorityLow
                : styles.priorityMedium;
          const statusClass =
            status === 'blocked'
              ? styles.statusBlocked
              : status === 'done'
                ? styles.statusDone
                : styles.statusPending;

          return (
            <li key={step.id || step.title} className={styles.actionCard}>
              <div className={styles.actionHeader}>
                <h5 className={styles.actionTitle}>{step.title}</h5>
                <div className={styles.actionTagRow}>
                  {step.isPrimary ? (
                    <span className={styles.countTag}>Paso dominante</span>
                  ) : null}
                  {step.phaseLabel || step.phase ? (
                    <span className={styles.tag}>{step.phaseLabel || phaseLabel(step.phase)}</span>
                  ) : null}
                  <span className={`${styles.priorityTag} ${priorityClass}`}>
                    {priorityLabel(priority)}
                  </span>
                  <span className={`${styles.statusTag} ${statusClass}`}>
                    {statusLabel(status)}
                  </span>
                </div>
              </div>

              {step.description ? (
                <p className={styles.actionDescription}>{step.description}</p>
              ) : null}

              {step.whyItMatters ? (
                <p className={styles.actionWhy}>{step.whyItMatters}</p>
              ) : null}

              {step.whyNow ? (
                <p className={styles.actionWhy}>Por que ahora: {step.whyNow}</p>
              ) : null}

              {step.blockedByMissingInfo ? (
                <p className={styles.actionWhy}>
                  Este paso queda condicionado por el faltante o bloqueo principal del caso.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
