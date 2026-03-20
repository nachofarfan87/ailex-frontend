'use client';

import styles from './LegalQuery.module.css';

export default function LegalWarnings({ items = [], guard = {} }) {
  if (!items.length && guard?.is_safe !== false) {
    return <p className={styles.emptyNote}>No se reportaron advertencias operativas para esta consulta.</p>;
  }

  return (
    <div className={styles.shell}>
      {guard?.is_safe === false ? (
        <div className={styles.errorBox}>
          <strong>Guardia anti alucinación activa</strong>
          <span>
            El backend marcó la respuesta como no segura. Severidad:{' '}
            {guard?.severity || 'no informada'}.
          </span>
        </div>
      ) : null}

      {items.length ? (
        <ul className={styles.warningList}>
          {items.map((warning, index) => (
            <li key={`${warning}-${index}`} className={styles.warningItem}>
              <p className={styles.panelText}>{warning}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
