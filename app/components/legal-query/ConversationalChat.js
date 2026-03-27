'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  buildTypingLabel,
  canStartSubmit,
  getConversationalQuestion,
  getConversationalRevealDelay,
  normalizeConversationalChat,
  sanitizeAnswerDraft,
  shouldAutoScroll,
  shouldShowTypingIndicator,
  shouldSubmitOnEnter,
  submitConversationalAnswer,
} from '@/app/lib/conversationalChat';

import styles from './ConversationalChat.module.css';

function bubbleClassName(type) {
  switch (type) {
    case 'practical':
      return styles.bubblePractical;
    case 'focus':
      return styles.bubbleFocus;
    case 'question':
      return styles.bubbleQuestion;
    case 'info':
    default:
      return styles.bubbleInfo;
  }
}

const SUBMIT_LOCK_MS = 320;

export default function ConversationalChat({ conversationalResponse, onSubmitAnswer }) {
  const chat = useMemo(
    () => normalizeConversationalChat(conversationalResponse),
    [conversationalResponse],
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const endRef = useRef(null);
  const timerRef = useRef(null);
  const submitLockRef = useRef(null);

  const visibleMessages = chat.messages.slice(0, visibleCount);
  const questionMessage = getConversationalQuestion(visibleMessages);
  const nextMessage = chat.messages[visibleCount] || null;
  const showTypingIndicator = shouldShowTypingIndicator(visibleCount, chat.messages.length);
  const typingLabel = buildTypingLabel(nextMessage);
  const canSubmit = canStartSubmit(isSubmitting, answer);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (submitLockRef.current) {
        window.clearTimeout(submitLockRef.current);
        submitLockRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setVisibleCount(0);
    if (!chat.messages.length) {
      return undefined;
    }

    setVisibleCount(1);
    let nextIndex = 1;

    const revealNext = () => {
      if (nextIndex >= chat.messages.length) {
        timerRef.current = null;
        return;
      }

      const delay = getConversationalRevealDelay(
        nextIndex,
        chat.messages[nextIndex],
        chat.messages.length,
      );

      timerRef.current = window.setTimeout(() => {
        setVisibleCount(nextIndex + 1);
        nextIndex += 1;
        revealNext();
      }, delay);
    };

    revealNext();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [chat.messages]);

  useEffect(() => {
    if (!endRef.current || visibleCount === 0) {
      return;
    }

    const containerEl = containerRef.current;
    if (!shouldAutoScroll(containerEl)) {
      return;
    }

    endRef.current.scrollIntoView({
      block: 'end',
      inline: 'nearest',
      behavior: visibleCount > 1 ? 'smooth' : 'auto',
    });
  }, [visibleCount]);

  useEffect(() => {
    if (!questionMessage || !inputRef.current) {
      return;
    }
    inputRef.current.focus();
  }, [questionMessage]);

  function releaseSubmitLock() {
    if (submitLockRef.current) {
      window.clearTimeout(submitLockRef.current);
    }
    submitLockRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
      submitLockRef.current = null;
    }, SUBMIT_LOCK_MS);
  }

  function handleSubmit() {
    if (!canStartSubmit(isSubmitting, answer)) {
      return;
    }

    setIsSubmitting(true);
    const result = submitConversationalAnswer(answer, onSubmitAnswer);
    if (result.submitted) {
      setAnswer(result.nextValue);
    }
    releaseSubmitLock();
  }

  function handleKeyDown(event) {
    if (!shouldSubmitOnEnter(event)) {
      return;
    }
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    handleSubmit();
  }

  if (!chat.messages.length) {
    return null;
  }

  return (
    <section
      ref={containerRef}
      className={styles.chatContainer}
      aria-label="Conversacion juridica guiada"
    >
      {visibleMessages.map((message, index) => (
        <div
          key={`${message.type}-${index}-${message.text}`}
          className={`${styles.message} ${styles.messageLeft}`}
        >
          <div className={`${styles.bubble} ${bubbleClassName(message.type)}`}>{message.text}</div>
        </div>
      ))}

      {showTypingIndicator ? (
        <div className={`${styles.message} ${styles.messageLeft}`}>
          <div
            className={`${styles.bubble} ${styles.bubbleInfo} ${styles.typingBubble}`}
            aria-live="polite"
            aria-label={typingLabel}
          >
            <span className={styles.typingText}>{typingLabel}</span>
            <span className={styles.typingDots} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
          </div>
        </div>
      ) : null}

      {questionMessage ? (
        <div className={styles.inputContainer}>
          <p className={styles.inputLabel}>Tu respuesta</p>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(event) => setAnswer(sanitizeAnswerDraft(event.target.value))}
              onKeyDown={handleKeyDown}
              className={styles.input}
              placeholder="Escribi tu respuesta..."
              aria-label="Respuesta a la pregunta de AILEX"
            />
            <button
              type="button"
              className={styles.button}
              disabled={!canSubmit}
              onClick={handleSubmit}
              aria-label="Enviar respuesta"
            >
              Responder
            </button>
          </div>
        </div>
      ) : null}

      <div ref={endRef} className={styles.scrollAnchor} aria-hidden="true" />
    </section>
  );
}
