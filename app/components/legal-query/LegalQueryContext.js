'use client';

import styles from './LegalQuery.module.css';

export default function LegalQueryContext({
  context,
  onChange,
  disabled = false,
  compact = false,
}) {
  function updateField(field, value) {
    onChange?.({
      ...context,
      [field]: field === 'top_k' ? Number(value) : value,
    });
  }

  return (
    <div className={`${styles.fieldGrid} ${compact ? styles.fieldGridCompact : ''}`}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Jurisdicción</span>
        <select
          className={styles.control}
          value={context.jurisdiction}
          onChange={(event) => updateField('jurisdiction', event.target.value)}
          disabled={disabled}
        >
          <option value="jujuy">Jujuy</option>
          <option value="nacional">Nacional</option>
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Fuero</span>
        <select
          className={styles.control}
          value={context.forum}
          onChange={(event) => updateField('forum', event.target.value)}
          disabled={disabled}
        >
          <option value="civil">Civil</option>
          <option value="laboral">Laboral</option>
          <option value="constitucional">Constitucional</option>
          <option value="general">General</option>
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Top K</span>
        <select
          className={styles.control}
          value={context.top_k}
          onChange={(event) => updateField('top_k', event.target.value)}
          disabled={disabled}
        >
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="8">8</option>
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Salida</span>
        <select
          className={styles.control}
          value={context.document_mode}
          onChange={(event) => updateField('document_mode', event.target.value)}
          disabled={disabled}
        >
          <option value="estrategia">Estrategia</option>
        </select>
      </label>
    </div>
  );
}
