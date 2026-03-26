'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getHierarchySummary, getJurisdictionProfile } from '../lib/api';
import styles from './Sidebar.module.css';

const NAV = [
  {
    href: '/',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M15.75 3.75H2.25V12.75H5.25V15.75L8.625 12.75H15.75V3.75Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/corpus',
    label: 'Corpus',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M4.5 2.25H13.5C14.3284 2.25 15 2.92157 15 3.75V14.25C15 15.0784 14.3284 15.75 13.5 15.75H4.5C3.67157 15.75 3 15.0784 3 14.25V3.75C3 2.92157 3.67157 2.25 4.5 2.25Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path d="M6 6H12M6 9H12M6 12H9.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/casos',
    label: 'Casos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M3 4.5C3 3.67157 3.67157 3 4.5 3H8.25L9.75 4.5H13.5C14.3284 4.5 15 5.17157 15 6V13.5C15 14.3284 14.3284 15 13.5 15H4.5C3.67157 15 3 14.3284 3 13.5V4.5Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path d="M6 8.25H12M6 11.25H10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/plantillas',
    label: 'Plantillas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M5.25 3H12.75L15 5.25V14.25C15 15.0784 14.3284 15.75 13.5 15.75H5.25C4.42157 15.75 3.75 15.0784 3.75 14.25V4.5C3.75 3.67157 4.42157 3 5.25 3Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path d="M12.75 3V5.25H15" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M6.75 9H12M6.75 12H10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/configuracion',
    label: 'Configuracion',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M9 1.875V3.375M9 14.625V16.125M1.875 9H3.375M14.625 9H16.125M3.96 3.96L5.017 5.017M12.983 12.983L14.04 14.04M3.96 14.04L5.017 12.983M12.983 5.017L14.04 3.96"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/observabilidad',
    label: 'Observabilidad',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M3 14.25V10.5M7.5 14.25V6.75M12 14.25V9M16.5 14.25V3.75"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/monitoreo-beta',
    label: 'Monitoreo Beta',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d="M9 2.25V5.25M9 12.75V15.75M2.25 9H5.25M12.75 9H15.75"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="9" cy="9" r="6.75" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 3" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [jurisdiction, setJurisdiction] = useState('Jujuy');
  const [documentCount, setDocumentCount] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarStatus() {
      try {
        const [jurisdictionResponse, summaryResponse] = await Promise.all([
          getJurisdictionProfile(),
          getHierarchySummary(),
        ]);

        if (cancelled) return;

        setJurisdiction(jurisdictionResponse?.jurisdiction || 'Jujuy');
        setDocumentCount(summaryResponse?.total_documents ?? 0);
      } catch {
        if (cancelled) return;
        setDocumentCount(0);
      }
    }

    loadSidebarStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>AI</div>
        <div>
          <div className={styles.brandName}>AILEX</div>
          <p className={styles.brandCopy}>Operacion juridica asistida por chat</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.statusCard}>
        <span className={styles.statusEyebrow}>Estado operativo</span>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Jurisdiccion activa</span>
          <strong className={styles.statusValue}>{jurisdiction}</strong>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Documentos en corpus</span>
          <strong className={styles.statusValue}>
            {documentCount === null ? '...' : documentCount}
          </strong>
        </div>
        <p className={styles.statusCopy}>Chat, corpus y plantillas listos para trabajo profesional.</p>
      </div>
    </aside>
  );
}
