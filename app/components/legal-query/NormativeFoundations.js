'use client';

import styles from './LegalQuery.module.css';
import { compactText, humanizeLabel } from '@/app/lib/legalQuery';

function getFoundationTitle(item) {
  if (typeof item === 'string') return item;

  return (
    item?.label ||
    item?.title ||
    item?.titulo ||
    (item?.article ? `Artículo ${item.article}` : null) ||
    humanizeLabel(item?.source_id || 'Fundamento normativo')
  );
}

function getFoundationText(item) {
  if (typeof item === 'string') return '';

  return compactText(
    item?.texto ||
      item?.text ||
      item?.excerpt ||
      item?.summary ||
      item?.description ||
      '',
    360,
  );
}

export default function NormativeFoundations({ items = [] }) {
  if (!items.length) {
    return <p className={styles.emptyNote}>No se informaron fundamentos normativos en esta respuesta.</p>;
  }

  return (
    <ul className={styles.foundationList}>
      {items.map((item, index) => {
        const source = typeof item === 'object' ? item?.source_id || item?.source || item?.norma : '';
        const article = typeof item === 'object' ? item?.article || item?.articulo : '';
        const excerpt = getFoundationText(item);

        return (
          <li key={`${getFoundationTitle(item)}-${index}`} className={styles.foundationItem}>
            <div className={styles.foundationHead}>
              <h4 className={styles.foundationTitle}>{getFoundationTitle(item)}</h4>
              <div className={styles.foundationMeta}>
                {source ? <span className={styles.pill}>{humanizeLabel(source)}</span> : null}
                {article ? <span className={`${styles.pill} ${styles.mono}`}>Art. {article}</span> : null}
              </div>
            </div>
            {excerpt ? <p className={styles.panelText}>{excerpt}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
