'use client';

import CaseActionPlan from './CaseActionPlan';
import CaseEvidenceChecklist from './CaseEvidenceChecklist';
import ProfessionalHandoffCard from './ProfessionalHandoffCard';
import CaseWorkspaceStatusBadge from './CaseWorkspaceStatusBadge';
import styles from './CaseWorkspace.module.css';

function FactList({ items = [], emptyText = 'Todavia no hay items claros para mostrar.' }) {
  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.key || item.summary || item.label} className={styles.listItem}>
          <div className={styles.factRow}>
            <span className={styles.factLabel}>{item.label || item.summary}</span>
            {item.value ? <span className={styles.factValue}>{item.value}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function MissingList({ items = [], nextQuestion = '' }) {
  if (!items.length && !nextQuestion) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>No aparecen faltantes prioritarios en este momento.</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      {items.length ? (
        <ul className={styles.list}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {nextQuestion ? (
        <div className={styles.questionCard}>
          <p className={styles.questionLabel}>Pregunta prioritaria</p>
          <p className={styles.questionText}>{nextQuestion}</p>
        </div>
      ) : null}
    </div>
  );
}

function RiskAlerts({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Alertas</p>
          <h4 className={styles.bucketTitle}>Puntos para mirar con cautela</h4>
        </div>
      </div>
      <ul className={styles.riskList}>
        {items.map((item, index) => (
          <li key={`${item.message}-${index}`} className={styles.riskItem}>
            {item.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CaseWorkspacePanel({ workspace }) {
  if (!workspace?.available) return null;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Workspace del caso</p>
          <h3 className={styles.title}>Orden rapido del caso</h3>
          {workspace.summary ? <p className={styles.summary}>{workspace.summary}</p> : null}
          {workspace.status?.helper ? <p className={styles.helper}>{workspace.status.helper}</p> : null}
          {workspace.phase?.reason ? <p className={styles.helper}>{workspace.phase.reason}</p> : null}
        </div>

        <div className={styles.headerMeta}>
          <CaseWorkspaceStatusBadge status={workspace.status} />
          {workspace.phase?.label ? <span className={styles.countTag}>Fase: {workspace.phase.label}</span> : null}
          {workspace.lastUpdatedAt ? (
            <span className={styles.timestamp}>Actualizado {workspace.lastUpdatedAt}</span>
          ) : null}
        </div>
      </div>

      {workspace.primaryFocus?.label ? (
        <div className={styles.questionCard}>
          <p className={styles.questionLabel}>Lo mas importante ahora</p>
          <p className={styles.questionText}>{workspace.primaryFocus.label}</p>
          {workspace.primaryFocus.reason ? (
            <p className={styles.helper}>{workspace.primaryFocus.reason}</p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.miniGrid}>
        <section className={`${styles.miniCard} ${styles.miniCardAccent}`}>
          <p className={styles.miniLabel}>Ya esta definido</p>
          <FactList
            items={workspace.primaryDefinedFacts}
            emptyText="Aun no hay hechos confirmados suficientes para resumir aca."
          />
        </section>

        <section className={`${styles.miniCard} ${styles.miniCardWarning}`}>
          <p className={styles.miniLabel}>Todavia falta</p>
          <MissingList
            items={workspace.primaryMissingFacts}
            nextQuestion={workspace.nextQuestion}
          />
        </section>
      </div>

      <div className={styles.grid}>
        <CaseActionPlan steps={workspace.actionPlan} />
        <ProfessionalHandoffCard handoff={workspace.handoff} nextQuestion={workspace.nextQuestion} />
      </div>

      <CaseEvidenceChecklist checklist={workspace.evidenceChecklist} />
      <RiskAlerts items={workspace.riskAlerts} />
    </section>
  );
}
