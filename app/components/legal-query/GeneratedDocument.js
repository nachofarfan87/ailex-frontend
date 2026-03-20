'use client';

import styles from './LegalQuery.module.css';

export default function GeneratedDocument({ documentText = '' }) {
  if (!documentText) {
    return <p className={styles.emptyNote}>El backend no devolvió borrador generado para esta consulta.</p>;
  }

  return (
    <div className={styles.docBox}>
      <pre>{documentText}</pre>
    </div>
  );
}
