function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeConversationalChat(value) {
  const safeValue = asObject(value);
  const messages = asArray(safeValue.messages)
    .map((item) => {
      const safeItem = asObject(item);
      const type = String(safeItem.type || '').trim();
      const text = String(safeItem.text || '').trim();
      if (!type || !text) return null;
      return { type, text };
    })
    .filter(Boolean);

  return {
    mode: String(safeValue.mode || '').trim(),
    domain: String(safeValue.domain || '').trim(),
    messages,
    primaryQuestion: String(safeValue.primary_question || '').trim(),
  };
}

export function getConversationalQuestion(messages = []) {
  const normalized = asArray(messages)
    .map((item) => asObject(item))
    .filter((item) => item.type && item.text);

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    if (normalized[index].type === 'question') {
      return normalized[index];
    }
  }
  return null;
}

export function getConversationalRevealDelay(index, message, totalMessages) {
  const safeMessage = asObject(message);
  const type = String(safeMessage.type || '').trim();

  if (index <= 0) {
    return 220;
  }

  let delay = 340;
  if (type === 'info') {
    delay = 240;
  } else if (type === 'practical') {
    delay = 360;
  } else if (type === 'focus') {
    delay = 410;
  } else if (type === 'question') {
    delay = 500;
  }

  if (index === totalMessages - 1 && type !== 'question') {
    delay += 30;
  }

  return delay;
}

export function shouldShowTypingIndicator(visibleCount, totalMessages) {
  return totalMessages > 1 && visibleCount > 0 && visibleCount < totalMessages;
}

export function buildTypingLabel(nextMessage) {
  const safeMessage = asObject(nextMessage);
  const type = String(safeMessage.type || '').trim();

  if (type === 'focus') {
    return 'AILEX esta afinando el punto clave...';
  }
  if (type === 'question') {
    return 'AILEX esta preparando la siguiente pregunta...';
  }
  if (type === 'info' || type === 'practical') {
    return 'AILEX esta preparando la respuesta...';
  }
  return 'AILEX esta organizando la respuesta...';
}

export function normalizeAnswerText(value) {
  return String(value || '').trim();
}

export function sanitizeAnswerDraft(value) {
  return String(value || '').replace(/^\s+/, '');
}

export function canSubmitConversationalAnswer(value) {
  return Boolean(normalizeAnswerText(value));
}

export function shouldAutoScroll(containerEl) {
  if (!containerEl || typeof containerEl !== 'object') {
    return true;
  }

  const hasScrollMetrics =
    typeof containerEl.scrollHeight === 'number' &&
    typeof containerEl.scrollTop === 'number' &&
    typeof containerEl.clientHeight === 'number';

  if (hasScrollMetrics) {
    const distanceToBottom =
      containerEl.scrollHeight - containerEl.clientHeight - containerEl.scrollTop;
    return distanceToBottom <= 120;
  }

  if (typeof containerEl.getBoundingClientRect === 'function') {
    const rect = containerEl.getBoundingClientRect();
    const viewportHeight =
      typeof window !== 'undefined' && typeof window.innerHeight === 'number'
        ? window.innerHeight
        : 900;
    return rect.bottom - viewportHeight <= 120;
  }

  return true;
}

export function submitConversationalAnswer(value, onSubmitAnswer) {
  const text = normalizeAnswerText(value);
  if (!text) {
    return {
      submitted: false,
      nextValue: value,
      text: '',
    };
  }

  if (typeof onSubmitAnswer === 'function') {
    onSubmitAnswer(text);
  }

  return {
    submitted: true,
    nextValue: '',
    text,
  };
}

export function shouldSubmitOnEnter(event) {
  return Boolean(
    event &&
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent?.isComposing,
  );
}

export function canStartSubmit(isSubmitting, value) {
  return !isSubmitting && canSubmitConversationalAnswer(value);
}
