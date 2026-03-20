'use client';

import styles from './LegalQuery.module.css';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toLines(items = []) {
  return asArray(items)
    .map((item) => (typeof item === 'string' ? item : item?.label || item?.text || item?.question || ''))
    .filter(Boolean);
}

function StrategyBlock({ title, items }) {
  const lines = toLines(items);
  if (!lines.length) return null;
  return (
    <div className={styles.strategyBlock}>
      <h5 className={styles.foundationTitle}>{title}</h5>
      <ul className={styles.foundationList}>
        {lines.map((item, index) => (
          <li key={`${title}-${index}`} className={styles.foundationItem}>
            <p className={styles.panelText}>{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LegalStrategy({
  strategy = {},
  caseDomain = '',
  caseDomains = [],
}) {
  const strategicNarrative = String(strategy?.strategic_narrative || '').trim();
  const conflictSummary = toLines(strategy?.conflict_summary);
  const recommendedActions = toLines(strategy?.recommended_actions);
  const riskAnalysis = toLines(strategy?.risk_analysis);
  const proceduralFocus = toLines(strategy?.procedural_focus);
  const secondaryDomainNotes = toLines(strategy?.secondary_domain_notes);
  const criticalQuestions = toLines(strategy?.critical_questions);

  if (
    !strategicNarrative &&
    !conflictSummary.length &&
    !recommendedActions.length &&
    !riskAnalysis.length &&
    !proceduralFocus.length &&
    !secondaryDomainNotes.length &&
    !criticalQuestions.length
  ) {
    return <p className={styles.emptyNote}>No se devolvio estrategia juridica estructurada.</p>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.assistantMeta}>
        {caseDomain ? <span className={styles.pillStrong}>{caseDomain}</span> : null}
        {caseDomains.slice(0, 3).map((domain) => (
          <span key={domain} className={styles.pill}>
            {domain}
          </span>
        ))}
      </div>

      {strategicNarrative ? (
        <div className={styles.strategyBlock}>
          <h5 className={styles.foundationTitle}>Estrategia</h5>
          <p className={styles.panelText}>{strategicNarrative}</p>
        </div>
      ) : null}

      <StrategyBlock title="Conflicto principal" items={conflictSummary} />
      <StrategyBlock title="Acciones recomendadas" items={recommendedActions} />
      <StrategyBlock title="Riesgos" items={riskAnalysis} />
      <StrategyBlock title="Focos procesales" items={proceduralFocus} />
      <StrategyBlock title="Preguntas criticas" items={criticalQuestions} />
      <StrategyBlock title="Notas por dominio secundario" items={secondaryDomainNotes} />
    </div>
  );
}
