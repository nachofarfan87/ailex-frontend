// frontend/app/components/legal-query/ConversationalStateBlock.js
'use client';

import styles from './LegalQuery.module.css';

function InlinePills({ items = [], tone = 'neutral' }) {
  if (!items.length) return null;

  const className =
    tone === 'accent'
      ? styles.conversationPillAccent
      : tone === 'warning'
        ? styles.conversationPillWarning
        : styles.conversationPill;

  return (
    <div className={styles.conversationPillRow}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={className}>
          {item}
        </span>
      ))}
    </div>
  );
}

function safeText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? '');
  return value.description || value.label || value.title || value.text || value.action || '';
}

function SectionList({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <div className={styles.conversationMiniSection}>
      <p className={styles.conversationMiniTitle}>{title}</p>
      <ul className={styles.compactList}>
        {items.map((item, index) => {
          const text = safeText(item);
          return (
            <li key={`${text}-${index}`} className={styles.compactItem}>
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ConversationalStateBlock({
  display,
  onQuickReply,
  activeQuickReply = '',
  quickReplyDisabled = false,
}) {
  const conversational = display?.conversational || {};
  const caseProgress = conversational.caseProgress || null;
  const caseProgressSnapshot = conversational.caseProgressSnapshot || null;
  const isClarification = conversational.should_ask_first;
  const hasQuestion = Boolean(conversational.question);
  const statusClass = isClarification
    ? styles.conversationHeroClarification
    : styles.conversationHeroAdvice;

  return (
    <section className={`${styles.conversationHero} ${statusClass}`}>
      <div className={styles.conversationHeroHead}>
        <div className={styles.conversationHeroLead}>
          <span
            className={
              isClarification ? styles.conversationStatusAlert : styles.conversationStatusOk
            }
          >
            {display.modeLabel}
          </span>
          <h4 className={styles.conversationHeroTitle}>
            {hasQuestion && isClarification
              ? 'Para seguir, necesito confirmar este punto'
              : 'Lo que veo hasta ahora'}
          </h4>
        </div>
        {display.modeDescription ? (
          <p className={styles.conversationHeroDescription}>{display.modeDescription}</p>
        ) : null}
      </div>

      {isClarification && hasQuestion ? (
        <div className={styles.conversationQuestionCard}>
          <p className={styles.conversationQuestionLabel}>Pregunta principal</p>
          <p className={styles.conversationQuestionText}>{conversational.question}</p>
          {conversational.options.length ? (
            <div className={styles.conversationOptionRow}>
              {conversational.options.map((option, index) => {
                const isActive = activeQuickReply === option;
                return (
                  <button
                    key={`${option}-${index}`}
                    type="button"
                    className={`${styles.conversationOptionChip} ${
                      isActive ? styles.conversationOptionChipActive : ''
                    }`}
                    onClick={() => onQuickReply?.(option)}
                    disabled={quickReplyDisabled}
                    aria-pressed={isActive}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.conversationAdviceCard}>
          <p className={styles.conversationAdviceText}>
            {display.quickStart || display.summary}
          </p>
        </div>
      )}

      {caseProgress && !caseProgressSnapshot ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressHead}>
            <p className={styles.progressTitle}>
              Informacion del caso: {caseProgress.percentage}% completa
            </p>
          </div>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={caseProgress.percentage}
            aria-label="Completitud del caso"
          >
            <span
              className={styles.progressFill}
              style={{ width: `${caseProgress.percentage}%` }}
            />
          </div>
          <ul className={styles.progressList}>
            {caseProgress.defined.slice(0, 3).map((item) => (
              <li key={`done-${item.key}`} className={`${styles.progressItem} ${styles.progressDone}`}>
                <span className={styles.progressIcon}>✔</span>
                <span>{item.label} definido</span>
              </li>
            ))}
            {caseProgress.missing.slice(0, 3).map((item) => (
              <li key={`pending-${item.key}`} className={`${styles.progressItem} ${styles.progressPending}`}>
                <span className={styles.progressIcon}>?</span>
                <span>{item.label} pendiente</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conversational.next_step ? (
        <p className={styles.conversationNextStep}>
          <span className={styles.conversationNextStepLabel}>Siguiente paso sugerido:</span>{' '}
          {safeText(conversational.next_step)}
        </p>
      ) : null}

      {conversational.knownFactPills?.length ? (
        <div className={styles.conversationMiniSection}>
          <p className={styles.conversationMiniTitle}>Ya aclarado</p>
          <InlinePills items={conversational.knownFactPills} tone="accent" />
        </div>
      ) : null}

      {conversational.missingCriticalItems?.length ? (
        <SectionList title="Falta definir" items={conversational.missingCriticalItems} />
      ) : null}

      {isClarification && conversational.secondaryMissingFacts?.length ? (
        <SectionList
          title="Despues conviene aclarar tambien"
          items={conversational.secondaryMissingFacts}
        />
      ) : null}

      {!isClarification && conversational.missingOptionalItems?.length ? (
        <SectionList
          title="Se puede afinar con estos datos"
          items={conversational.missingOptionalItems}
        />
      ) : null}

      {conversational.asked_questions?.length ? (
        <details className={styles.inlineDisclosure}>
          <summary className={styles.inlineDisclosureSummary}>
            Ver lo ya aclarado ({conversational.asked_questions.length})
          </summary>
          <ul className={styles.compactList}>
            {conversational.asked_questions.map((item, index) => (
              <li key={`${item}-${index}`} className={styles.compactItem}>
                {item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
