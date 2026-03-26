'use client';

import { useState } from 'react';
import LegalQueryContext from './LegalQueryContext';
import styles from './LegalQuery.module.css';

export default function LegalQueryForm({
  onSubmit,
  context,
  onContextChange,
  loading = false,
  disabled = false,
  centered = false,
  status = '',
  suggestions = [],
  onResetConversation,
  showReset = false,
  showContext = true,
}) {
  const [query, setQuery] = useState('');

  const locked = disabled || loading;

  async function handleSubmit(event) {
    event?.preventDefault();

    const trimmed = query.trim();
    if (!trimmed || locked) return;

    const submitted = await onSubmit?.({
      query: trimmed,
      jurisdiction: context.jurisdiction,
      forum: context.forum,
      top_k: Number(context.top_k),
      document_mode: context.document_mode,
      facts: {},
    });

    if (submitted) {
      setQuery('');
    }
  }

  return (
    <form
      className={`${styles.form} ${centered ? styles.formCentered : ''}`}
      onSubmit={handleSubmit}
    >
      {showContext ? (
        <LegalQueryContext context={context} onChange={onContextChange} disabled={locked} />
      ) : null}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Consulta juridica</span>
        <textarea
          className={styles.textarea}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            disabled
              ? 'Limite de prueba alcanzado. Inicia sesion para seguir consultando.'
              : 'Ej.: plazo para contestar demanda, art 34 cpcc jujuy, garantia de defensa en juicio...'
          }
          disabled={locked}
          rows={4}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
      </label>

      {suggestions.length ? (
        <div className={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestion}
              onClick={() => setQuery(suggestion)}
              disabled={locked}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.actions}>
        {status ? <span className={styles.authHint}>{status}</span> : <span />}

        <div className={styles.actionButtons}>
          {showReset ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onResetConversation}
              disabled={locked}
            >
              Nueva conversacion
            </button>
          ) : null}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={locked || !query.trim()}
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>
    </form>
  );
}
