'use client';

import { useState } from 'react';

import styles from './LegalQuery.module.css';
import readingStyles from './LegalQueryReading.module.css';
import ConversationalChat from './ConversationalChat';
import { adaptLegalResultForDisplay } from '@/app/lib/legalResultAdapter';
import { normalizeLegalQueryResponse } from '@/app/lib/legalQuery';

function CompactList({ items = [], className = '' }) {
  if (!items.length) return null;
  return (
    <ul className={`${styles.compactList} ${className}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={styles.compactItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function safeText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? '').trim();
  return (
    value.description ||
    value.label ||
    value.title ||
    value.text ||
    value.action ||
    ''
  );
}

function FollowupCard({
  question = '',
  options = [],
  onQuickReply,
  onSubmitAnswer,
  activeQuickReply = '',
  quickReplyDisabled = false,
  hint = '',
  followupType = '',
  eyebrow = '',
}) {
  if (!question) return null;

  const eyebrowText = eyebrow ||
    followupType === 'critical_data'
      ? 'Dato clave para afinar'
      : followupType === 'confirmation'
        ? 'Confirmacion para ajustar'
        : 'Dato para afinar';
  const [answer, setAnswer] = useState('');
  const canSubmit = Boolean(onSubmitAnswer) && !quickReplyDisabled && answer.trim();

  function handleSubmit() {
    const nextAnswer = answer.trim();
    if (!nextAnswer || !onSubmitAnswer) return;
    onSubmitAnswer(nextAnswer);
    setAnswer('');
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!canSubmit) return;
    handleSubmit();
  }

  return (
    <section className={readingStyles.followupCard}>
      <div className={readingStyles.followupHead}>
        <span className={readingStyles.followupEyebrow}>{eyebrowText}</span>
        <h4 className={readingStyles.followupTitle}>{question}</h4>
      </div>
      {hint ? <p className={readingStyles.followupHint}>{hint}</p> : null}
      {options.length ? (
        <div className={styles.conversationOptionRow}>
          {options.map((option, index) => {
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
      {onSubmitAnswer ? (
        <div className={styles.followupAnswerBox}>
          <p className={styles.followupAnswerLabel}>Tu respuesta</p>
          <div className={styles.followupAnswerRow}>
            <input
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.followupAnswerInput}
              placeholder="Escribi tu respuesta..."
              aria-label="Respuesta a la aclaracion de AILEX"
              disabled={quickReplyDisabled}
            />
            <button
              type="button"
              className={styles.followupAnswerButton}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Responder
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildNaturalTitle({ display, normalized }) {
  const caseDomains = Array.isArray(normalized.case_domains)
    ? normalized.case_domains.filter(Boolean)
    : [];
  const parts = [
    String(normalized.case_domain || '').trim(),
    ...caseDomains,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => item.replace(/_/g, ' '));

  const uniqueParts = [...new Set(parts.map((item) => item.toLowerCase()))]
    .map((key) => parts.find((item) => item.toLowerCase() === key))
    .filter(Boolean);

  if (uniqueParts.length) {
    return uniqueParts
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(' y ');
  }
  if (display.title) return display.title;
  return 'Orientacion';
}

function isGenericLeadText(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return true;
  return [
    'ya tengo la base',
    'ahora el foco es definir',
    'con lo que ya esta definido',
    'con lo que ya está definido',
    'ya hay base suficiente',
    'necesito un dato puntual',
    'necesito confirmar un punto',
    'esto ayuda a ajustar mejor',
  ].some((fragment) => normalized.includes(fragment));
}

function pickVisibleLeadText(display) {
  const candidates = [
    display.coreDirectAnswer,
    display.whatThisMeans,
    display.summary,
    display.primaryReadingText,
  ].map((item) => String(item || '').trim());

  return (
    candidates.find((item) => item && !isGenericLeadText(item)) ||
    candidates.find(Boolean) ||
    'Aca tenes una orientacion inicial para saber que conviene hacer primero.'
  );
}

function CoreLegalResponseSection({ title, eyebrow = '', items = [], text = '' }) {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const normalizedText = String(text || '').trim();
  if (!normalizedItems.length && !normalizedText) return null;

  return (
    <section className={readingStyles.nextBestStepCard}>
      <div className={readingStyles.nextBestStepHead}>
        <span className={readingStyles.nextBestStepEyebrow}>{eyebrow || title}</span>
      </div>
      <h4 className={readingStyles.primaryReadingTitle}>{title}</h4>
      {normalizedText ? (
        <p className={readingStyles.nextBestStepReason}>{normalizedText}</p>
      ) : null}
      {normalizedItems.length ? (
        <CompactList
          items={normalizedItems}
          className={readingStyles.nextBestStepList}
        />
      ) : null}
    </section>
  );
}

export default function LegalQueryResults({
  response,
  requestContext = {},
  onQuickReply,
  onSubmitAnswer,
  activeQuickReply = '',
  quickReplyDisabled = false,
}) {
  const normalized = normalizeLegalQueryResponse(response);
  const display = adaptLegalResultForDisplay(normalized);
  const hasConversationalChat = display.conversationalResponse.messages.length > 0;
  const hasCoreLegalResponse = Boolean(display.hasCoreLegalResponse);
  const hasCoreActionSteps = display.coreActionSteps?.length > 0;
  const hasCoreOptionalClarification = Boolean(display.coreOptionalClarification);
  const nextBestStep = display.nextBestStep || display.quickStart || display.summary;
  const shouldRenderLegacyFollowup = !hasConversationalChat && !hasCoreOptionalClarification;
  const naturalTitle = buildNaturalTitle({ display, normalized });
  const visibleDirectAnswer = pickVisibleLeadText(display);
  const visibleActionSteps = hasCoreActionSteps
    ? display.coreActionSteps
    : [
        safeText(nextBestStep)
          .replace(/^Lo mas conveniente ahora es\s*/i, '')
          .replace(/^Esto conviene hacerlo cuanto antes:\s*/i, '')
          .replace(/^En este punto, conviene\s*/i, '')
          .replace(/^Podria convenir\s*/i, ''),
        ...display.supportingNextSteps,
      ].filter(Boolean);

  return (
    <article className={styles.assistantCard}>
      <header className={styles.assistantHeader}>
        <div className={styles.assistantLead}>
          <h3 className={styles.assistantTitle}>{naturalTitle}</h3>
        </div>
      </header>

      <div className={readingStyles.readingFlow}>
        <section className={readingStyles.primaryReadingCard}>
          <p className={readingStyles.primaryReadingText}>{visibleDirectAnswer}</p>
        </section>

        {visibleActionSteps.length ? (
          <CoreLegalResponseSection
            title="Que tenes que hacer ahora"
            items={visibleActionSteps}
          />
        ) : null}

        {hasConversationalChat ? (
          <section className={readingStyles.primaryConversationSection}>
            <div className={readingStyles.primaryConversationHead}>
              <p className={readingStyles.primaryConversationText}>
                Si queres afinar mejor la orientacion, contame esto:
              </p>
            </div>
            <ConversationalChat
              conversationalResponse={display.conversationalResponse}
              onSubmitAnswer={onSubmitAnswer || onQuickReply}
            />
          </section>
        ) : null}
        {hasCoreOptionalClarification ? (
          <FollowupCard
            question={display.coreOptionalClarification}
            options={display.conversational.options}
            onQuickReply={onQuickReply}
            onSubmitAnswer={onSubmitAnswer || onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
            hint=""
            followupType={display.followupType}
            eyebrow="Si queres, contame esto"
          />
        ) : null}
        {shouldRenderLegacyFollowup ? (
          <FollowupCard
            question={display.primaryReadingQuestion}
            options={display.conversational.options}
            onQuickReply={onQuickReply}
            onSubmitAnswer={onSubmitAnswer || onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
            hint=""
            followupType={display.followupType}
            eyebrow="Si queres, contame esto"
          />
        ) : null}
      </div>
    </article>
  );
}
