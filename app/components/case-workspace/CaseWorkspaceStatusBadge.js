'use client';

import styles from './CaseWorkspace.module.css';

export default function CaseWorkspaceStatusBadge({ status }) {
  if (!status?.label) return null;

  const toneClass =
    status.tone === 'success'
      ? styles.priorityLow
      : status.tone === 'danger'
        ? styles.statusBlocked
        : status.tone === 'warning'
          ? styles.priorityMedium
          : styles.tag;

  return <span className={`${styles.tag} ${toneClass}`}>{status.label}</span>;
}
