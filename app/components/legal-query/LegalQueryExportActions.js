'use client';

import { useState } from 'react';
import styles from './LegalQuery.module.css';
import { exportLegalQueryDocx } from '@/app/lib/api';
import {
  copyLegalExportToClipboard,
  printLegalExportToPdf,
} from '@/app/lib/legalQueryExport';

export default function LegalQueryExportActions({ response, requestContext = {} }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');

  async function handleDocx() {
    try {
      setBusy('docx');
      setStatus('');
      await exportLegalQueryDocx({
        response,
        request_context: requestContext,
      });
      setStatus('DOCX descargado.');
    } catch (error) {
      setStatus(error.message || 'No se pudo exportar el DOCX.');
    } finally {
      setBusy('');
    }
  }

  async function handleCopy() {
    try {
      setBusy('copy');
      setStatus('');
      await copyLegalExportToClipboard(response, requestContext);
      setStatus('Texto copiado al portapapeles.');
    } catch (error) {
      setStatus(error.message || 'No se pudo copiar el texto.');
    } finally {
      setBusy('');
    }
  }

  function handlePdf() {
    try {
      setBusy('pdf');
      setStatus('');
      printLegalExportToPdf(response, requestContext);
      setStatus('Se abrió el diálogo para guardar como PDF.');
    } catch (error) {
      setStatus(error.message || 'No se pudo preparar el PDF.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className={styles.exportBar}>
      <div className={styles.exportActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleDocx}
          disabled={Boolean(busy)}
        >
          {busy === 'docx' ? 'Exportando DOCX...' : 'Exportar DOCX'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handlePdf}
          disabled={Boolean(busy)}
        >
          {busy === 'pdf' ? 'Preparando PDF...' : 'Exportar PDF'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleCopy}
          disabled={Boolean(busy)}
        >
          {busy === 'copy' ? 'Copiando...' : 'Copiar texto'}
        </button>
      </div>

      {status ? <span className={styles.exportStatus}>{status}</span> : null}
    </div>
  );
}
