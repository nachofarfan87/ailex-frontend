'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import {
  getHierarchySummary,
  getSourceTypes,
  listDocuments,
  searchHybrid,
  uploadFileDocument,
  uploadTextDocument,
} from '../lib/api';

const EMPTY_UPLOAD = {
  source_type: 'automatico',
  jurisdiction: '',
  legal_area: '',
  description: '',
  tags: '',
  text: '',
};

const UPLOAD_TYPE_OPTIONS = [
  { value: 'automatico', label: 'Automatico' },
  { value: 'norma', label: 'Norma' },
  { value: 'jurisprudencia', label: 'Jurisprudencia' },
  { value: 'doctrina', label: 'Doctrina' },
  { value: 'interno', label: 'Interno' },
];

function formatDate(value) {
  if (!value) return 'Sin fecha';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDetectedUploadType(document) {
  if (document?.source_hierarchy === 'normativa') return 'Norma';
  if (document?.source_hierarchy === 'jurisprudencia') return 'Jurisprudencia';
  if (document?.source_hierarchy === 'doctrina') return 'Doctrina';
  return 'Interno';
}

function formatExtractionMode(mode) {
  if (mode === 'ocr') return 'OCR';
  return 'texto';
}

export default function CorpusPage() {
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sourceTypes, setSourceTypes] = useState([]);
  const [filters, setFilters] = useState({ q: '', hierarchy: 'all', type: 'all' });
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [uploadMode, setUploadMode] = useState('file');
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  const deferredQuery = useDeferredValue(filters.q);

  useEffect(() => {
    loadCorpus();
  }, []);

  async function loadCorpus() {
    try {
      setLoading(true);
      setError('');

      const [documentsResponse, summaryResponse, typesResponse] = await Promise.all([
        listDocuments({ per_page: 100, document_scope: 'corpus' }),
        getHierarchySummary(),
        getSourceTypes(),
      ]);

      setDocuments(documentsResponse.documents || []);
      setSummary(summaryResponse);
      setSourceTypes(typesResponse.source_types || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSemanticSearch() {
    if (!semanticQuery.trim()) return;

    try {
      setSearching(true);
      setError('');
      const response = await searchHybrid({ query: semanticQuery, top_k: 6 });
      setSemanticResults(response.results || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    try {
      setUploadResult(null);
      setError('');

      let response;
      if (uploadMode === 'file') {
        if (!uploadFile) {
          setError('Selecciona un archivo para incorporarlo al corpus.');
          return;
        }

        response = await uploadFileDocument({
          file: uploadFile,
          source_type: uploadForm.source_type,
          jurisdiction: uploadForm.jurisdiction,
          legal_area: uploadForm.legal_area,
          description: uploadForm.description,
          tags: uploadForm.tags,
          scope: 'corpus',
        });
      } else {
        if (!uploadForm.text.trim()) {
          setError('Pega texto para incorporarlo al corpus.');
          return;
        }

        response = await uploadTextDocument({
          text: uploadForm.text,
          source_type: uploadForm.source_type,
          jurisdiction: uploadForm.jurisdiction,
          legal_area: uploadForm.legal_area,
          description: uploadForm.description,
          tags: uploadForm.tags,
          scope: 'corpus',
        });
      }

      setUploadResult({
        title: response.title,
        type: formatDetectedUploadType(response),
        jurisdiction: response.jurisdiction || 'Sin detectar',
        chunkCount: response.chunk_count || 0,
        extractionMode: formatExtractionMode(response.extraction_mode),
        warning:
          response.extracted_text_length && response.extracted_text_length < 200
            ? 'Texto breve detectado; revisa si conviene complementar el documento.'
            : response.extraction_warning || '',
      });
      setUploadFile(null);
      setUploadForm((current) => ({ ...EMPTY_UPLOAD, source_type: current.source_type }));
      await loadCorpus();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const visibleDocuments = documents.filter((document) => {
    const matchesQuery =
      !deferredQuery ||
      [document.title, document.source_type, document.jurisdiction, document.legal_area, document.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(deferredQuery.toLowerCase());

    const matchesHierarchy =
      filters.hierarchy === 'all' || document.source_hierarchy === filters.hierarchy;

    const matchesType = filters.type === 'all' || document.source_type === filters.type;

    return matchesQuery && matchesHierarchy && matchesType;
  });

  const hierarchyEntries = Object.entries(summary?.by_hierarchy || {});

  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Corpus</span>
          <h1 className="page-title">Gestion documental juridica con lectura, busqueda y estado.</h1>
          <p className="page-description">
            Esta seccion concentra carga, listado, filtros y busqueda semantica sobre documentos juridicos. El chat usa este corpus como soporte, pero la operacion documental vive aqui.
          </p>
        </div>

        <div className="page-actions">
          <Link href="/" className="ghost-button">
            Volver al chat
          </Link>
          <span className="badge badge--law">Subida + busqueda + estado</span>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}
      {uploadResult ? (
        <section className="surface-panel surface-panel--soft">
          <div className="surface-panel__body">
            <h2 className="panel-title">Documento procesado correctamente</h2>
            <p className="panel-copy">
              {uploadResult.title}
              {uploadResult.warning ? ` · ${uploadResult.warning}` : ''}
            </p>
            <div className="tag-row" style={{ marginTop: 12 }}>
              <span className="badge badge--law">Tipo: {uploadResult.type}</span>
              <span className="badge badge--muted">Jurisdiccion: {uploadResult.jurisdiction}</span>
              <span className="badge badge--trust">Chunks: {uploadResult.chunkCount}</span>
              <span className={`badge ${uploadResult.extractionMode === 'OCR' ? 'badge--warning' : 'badge--success'}`}>
                Extraccion: {uploadResult.extractionMode}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Documentos</span>
          <strong className="kpi-value">{summary?.total_documents ?? 0}</strong>
          <p className="kpi-copy">Total de piezas incorporadas al corpus actual.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Chunks</span>
          <strong className="kpi-value">{summary?.total_chunks ?? 0}</strong>
          <p className="kpi-copy">Fragmentos disponibles para busqueda y trazabilidad.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Jerarquias</span>
          <strong className="kpi-value">{hierarchyEntries.length}</strong>
          <p className="kpi-copy">Normativa, jurisprudencia, doctrina e interno.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Tipos</span>
          <strong className="kpi-value">{sourceTypes.length}</strong>
          <p className="kpi-copy">Clasificaciones disponibles para carga documental.</p>
        </article>
      </section>

      <section className="split-shell">
        <article className="surface-panel">
          <div className="surface-panel__body">
            <div className="chip-row">
              <button
                type="button"
                className={uploadMode === 'file' ? 'button' : 'ghost-button'}
                onClick={() => setUploadMode('file')}
              >
                Subir archivo
              </button>
              <button
                type="button"
                className={uploadMode === 'text' ? 'button' : 'ghost-button'}
                onClick={() => setUploadMode('text')}
              >
                Cargar texto
              </button>
            </div>

            <form className="field-group" onSubmit={handleUpload} style={{ marginTop: 18 }}>
              <div className="field">
                <label>Tipo de documento</label>
                <select
                  value={uploadForm.source_type}
                  onChange={(event) => setUploadForm({ ...uploadForm, source_type: event.target.value })}
                >
                  {UPLOAD_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {uploadMode === 'file' ? (
                <div className="field">
                  <label>Upload file</label>
                  <div className="empty-box" style={{ textAlign: 'left' }}>
                    <strong>{uploadFile?.name || 'Arrastra o selecciona un archivo'}</strong>
                    <p className="panel-copy" style={{ marginTop: 6 }}>
                      PDF, DOCX o TXT. Si el PDF esta escaneado, AILEX intentara OCR automaticamente.
                    </p>
                    <input
                      type="file"
                      onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                      style={{ marginTop: 12 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label>Paste text</label>
                  <textarea
                    value={uploadForm.text}
                    onChange={(event) => setUploadForm({ ...uploadForm, text: event.target.value })}
                    placeholder="Pega texto juridico. AILEX inferira tipo, jurisdiccion y metadata automaticamente."
                  />
                </div>
              )}

              <details className="surface-panel surface-panel--soft" style={{ marginTop: 4 }}>
                <summary className="panel-title" style={{ cursor: 'pointer' }}>Advanced options</summary>
                <div className="surface-panel__body" style={{ paddingTop: 16 }}>
                  <div className="field-row">
                    <div className="field">
                      <label>Jurisdiccion</label>
                      <input
                        value={uploadForm.jurisdiction}
                        onChange={(event) => setUploadForm({ ...uploadForm, jurisdiction: event.target.value })}
                        placeholder="Se detecta automaticamente si lo dejas vacio"
                      />
                    </div>

                    <div className="field">
                      <label>Area legal</label>
                      <input
                        value={uploadForm.legal_area}
                        onChange={(event) => setUploadForm({ ...uploadForm, legal_area: event.target.value })}
                        placeholder="Civil, penal, laboral..."
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Etiquetas</label>
                    <input
                      value={uploadForm.tags}
                      onChange={(event) => setUploadForm({ ...uploadForm, tags: event.target.value })}
                      placeholder="Solo si quieres forzarlas manualmente"
                    />
                  </div>

                  <div className="field">
                    <label>Descripcion</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(event) => setUploadForm({ ...uploadForm, description: event.target.value })}
                      placeholder="Contexto adicional opcional"
                    />
                  </div>
                </div>
              </details>

              <button type="submit" className="button">
                Incorporar al corpus
              </button>
            </form>
          </div>
        </article>

        <article className="surface-panel surface-panel--soft">
          <div className="surface-panel__body">
            <h2 className="panel-title">Busqueda semantica</h2>
            <p className="panel-copy">
              Usa el mismo motor de busqueda que el chat para encontrar respaldo documental por consulta natural.
            </p>

            <div className="field-group" style={{ marginTop: 18 }}>
              <div className="field">
                <label>Consulta</label>
                <input
                  value={semanticQuery}
                  onChange={(event) => setSemanticQuery(event.target.value)}
                  placeholder="ej. caducidad de instancia en Jujuy"
                />
              </div>

              <button type="button" className="ghost-button" onClick={handleSemanticSearch} disabled={searching}>
                {searching ? 'Buscando...' : 'Buscar en corpus'}
              </button>
            </div>

            <div className="stack-list" style={{ marginTop: 18 }}>
              {semanticResults.length ? (
                semanticResults.map((result, index) => (
                  <div key={`${result.document_title}-${index}`} className="stack-item">
                    <strong>{result.document_title}</strong>
                    <span className="meta-copy">{result.text}</span>
                    <div className="tag-row">
                      <span className="badge badge--trust">{result.source_hierarchy}</span>
                      <span className="badge badge--muted">
                        {Math.round((result.scores?.final ?? result.scores?.vector ?? 0) * 100)}% relevancia
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-box">
                  <strong>Sin resultados aun.</strong> Ejecuta una busqueda para ver los fragmentos mas relevantes del corpus.
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="surface-panel">
        <div className="surface-panel__body">
          <div className="field-row">
            <div className="field">
              <label>Buscar por titulo, etiquetas o materia</label>
              <input
                value={filters.q}
                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
                placeholder="Filtrar documentos cargados..."
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Jerarquia</label>
                <select
                  value={filters.hierarchy}
                  onChange={(event) => setFilters({ ...filters, hierarchy: event.target.value })}
                >
                  <option value="all">Todas</option>
                  {hierarchyEntries.map(([key]) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Tipo</label>
                <select
                  value={filters.type}
                  onChange={(event) => setFilters({ ...filters, type: event.target.value })}
                >
                  <option value="all">Todos</option>
                  {sourceTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="inline-divider" />

          {loading ? (
            <p className="panel-copy">Cargando corpus...</p>
          ) : visibleDocuments.length ? (
            <div className="table-list">
              {visibleDocuments.map((document) => (
                <article key={document.id} className="table-row">
                  <div className="table-primary">
                    <span className="table-title">{document.title}</span>
                    <span className="table-meta">
                      {document.legal_area || 'Area no informada'} · {document.jurisdiction || 'Sin jurisdiccion'}
                    </span>
                    <span className="table-footnote">Alta: {formatDate(document.created_at)}</span>
                  </div>
                  <div className="chip-row">
                    <span className="badge badge--law">{document.source_hierarchy || 'interno'}</span>
                    <span className="badge badge--muted">{document.source_type}</span>
                  </div>
                  <div className="chip-row">
                    <span className={`badge ${document.status === 'indexed' ? 'badge--success' : 'badge--warning'}`}>
                      {document.status || 'pending'}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="badge badge--trust">{document.chunk_count || 0} chunks</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-box">
              <strong>No hay documentos para esos filtros.</strong> Ajusta la busqueda o incorpora nuevas piezas al corpus.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
