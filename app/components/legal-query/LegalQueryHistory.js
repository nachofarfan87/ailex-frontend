'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './LegalQuery.module.css';
import { compactText, formatConfidence } from '@/app/lib/legalQuery';
import { formatHistoryTimestamp } from '@/app/lib/legalQueryHistory';

const EXPEDIENTE_EDITOR_FIELDS = [
  'titulo',
  'caratula',
  'numero',
  'materia',
  'juzgado',
  'jurisdiction',
  'tipo_caso',
  'subtipo_caso',
  'estado_procesal',
  'descripcion',
  'hechos_relevantes',
  'pretension_principal',
  'riesgos_clave',
  'estrategia_base',
  'proxima_accion_sugerida',
  'notas_estrategia',
  'partes_json',
];

function buildEditorState(expediente) {
  return {
    titulo: expediente?.name || '',
    caratula: expediente?.caratula || '',
    numero: expediente?.numero || '',
    materia: expediente?.materia || expediente?.forum || '',
    juzgado: expediente?.juzgado || '',
    jurisdiction: expediente?.jurisdiction || 'jujuy',
    tipo_caso: expediente?.tipo_caso || '',
    subtipo_caso: expediente?.subtipo_caso || '',
    estado_procesal: expediente?.estado_procesal || '',
    descripcion: expediente?.descripcion || '',
    hechos_relevantes: expediente?.hechos_relevantes || '',
    pretension_principal: expediente?.pretension_principal || '',
    riesgos_clave: expediente?.riesgos_clave || '',
    estrategia_base: expediente?.estrategia_base || '',
    proxima_accion_sugerida: expediente?.proxima_accion_sugerida || '',
    notas_estrategia: expediente?.notas_estrategia || '',
    partes_json: expediente?.partes_json || '[]',
  };
}

function serializeEditorState(state) {
  return JSON.stringify(
    EXPEDIENTE_EDITOR_FIELDS.reduce((accumulator, key) => {
      accumulator[key] = String(state?.[key] || '');
      return accumulator;
    }, {}),
  );
}

export default function LegalQueryHistory({
  expedientes = [],
  activeExpedienteId = '',
  items = [],
  entryCounts = {},
  activeEntryId = '',
  busy = false,
  onSelectEntry,
  onSelectExpediente,
  onCreateExpediente,
  onRenameExpediente,
  onDeleteExpediente,
  onSaveExpediente,
  emptyLabel = 'Todavia no hay consultas guardadas en este expediente.',
}) {
  const [draftName, setDraftName] = useState('');
  const activeExpediente = expedientes.find((item) => item.id === activeExpedienteId);
  const [editorState, setEditorState] = useState(() => buildEditorState(activeExpediente));

  useEffect(() => {
    setEditorState(buildEditorState(activeExpediente));
  }, [activeExpediente]);

  const isDefaultExpediente = Boolean(activeExpediente?.is_default);
  const isDirty = useMemo(() => {
    if (!activeExpediente) return false;
    return serializeEditorState(editorState) !== serializeEditorState(buildEditorState(activeExpediente));
  }, [activeExpediente, editorState]);

  function handleCreate() {
    const name = draftName.trim();
    if (!name || busy) return;
    onCreateExpediente?.(name);
    setDraftName('');
  }

  function handleEditorChange(field, value) {
    setEditorState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleSaveExpediente() {
    if (!activeExpediente || isDefaultExpediente || busy || !isDirty) return;

    onSaveExpediente?.(activeExpediente.id, {
      titulo: editorState.titulo.trim(),
      caratula: editorState.caratula.trim(),
      numero: editorState.numero.trim(),
      materia: editorState.materia.trim(),
      juzgado: editorState.juzgado.trim(),
      jurisdiccion: editorState.jurisdiction.trim() || 'jujuy',
      tipo_caso: editorState.tipo_caso.trim(),
      subtipo_caso: editorState.subtipo_caso.trim(),
      estado_procesal: editorState.estado_procesal.trim(),
      descripcion: editorState.descripcion.trim(),
      hechos_relevantes: editorState.hechos_relevantes.trim(),
      pretension_principal: editorState.pretension_principal.trim(),
      riesgos_clave: editorState.riesgos_clave.trim(),
      estrategia_base: editorState.estrategia_base.trim(),
      proxima_accion_sugerida: editorState.proxima_accion_sugerida.trim(),
      notas_estrategia: editorState.notas_estrategia.trim(),
      partes_json: editorState.partes_json.trim() || '[]',
    });
  }

  return (
    <div className={styles.historyPanel}>
      <div className={styles.historyHeader}>
        <div>
          <span className={styles.eyebrow}>Expedientes</span>
          <h3 className={styles.historyTitle}>Carpetas de trabajo</h3>
        </div>
        {expedientes.length ? <span className={styles.pill}>{expedientes.length}</span> : null}
      </div>

      <div className={styles.expedienteComposer}>
        <input
          className={styles.control}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Nuevo expediente, ej. Sucesion Perez"
          disabled={busy}
        />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleCreate}
          disabled={busy || !draftName.trim()}
        >
          Crear
        </button>
      </div>

      <ul className={styles.expedienteList}>
        {expedientes.map((item) => {
          const isActive = item.id === activeExpedienteId;
          const queryCount = entryCounts[item.id] || 0;

          return (
            <li key={item.id} className={styles.expedienteItem}>
              <button
                type="button"
                className={`${styles.expedienteButton} ${isActive ? styles.expedienteButtonActive : ''}`}
                onClick={() => onSelectExpediente?.(item.id)}
                disabled={busy}
              >
                <span className={styles.expedienteName}>{item.name}</span>
                <span className={styles.expedienteMeta}>
                  {item.is_default ? 'Por defecto' : 'Expediente'} | {queryCount}
                </span>
              </button>

              <div className={styles.expedienteActions}>
                {!item.is_default ? (
                  <button
                    type="button"
                    className={styles.expedienteAction}
                    onClick={() => {
                      const nextName = window.prompt('Renombrar expediente', item.name);
                      if (nextName !== null) {
                        onRenameExpediente?.(item.id, nextName);
                      }
                    }}
                    disabled={busy}
                  >
                    Renombrar
                  </button>
                ) : null}
                {!item.is_default ? (
                  <button
                    type="button"
                    className={styles.expedienteAction}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Eliminar "${item.name}" movera sus consultas al expediente general. Continuar?`,
                      );
                      if (confirmed) {
                        onDeleteExpediente?.(item.id);
                      }
                    }}
                    disabled={busy}
                  >
                    Eliminar
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.historySubheader}>
        <div>
          <span className={styles.eyebrow}>Contexto juridico</span>
          <h4 className={styles.historySectionTitle}>
            {activeExpediente ? activeExpediente.name : 'Expediente activo'}
          </h4>
        </div>
        {!isDefaultExpediente && activeExpediente ? (
          <span className={styles.pill}>Caso vivo</span>
        ) : null}
      </div>

      {isDefaultExpediente ? (
        <div className={styles.expedienteContextNote}>
          <p className={styles.emptyNote}>
            El expediente General sigue funcionando como carpeta transversal. Para guardar
            contexto juridico estructurado, crea o selecciona un expediente especifico.
          </p>
        </div>
      ) : activeExpediente ? (
        <div className={styles.expedienteContextCard}>
          <div className={styles.expedienteContextGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Titulo</span>
              <input
                className={styles.control}
                value={editorState.titulo}
                onChange={(event) => handleEditorChange('titulo', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Caratula</span>
              <input
                className={styles.control}
                value={editorState.caratula}
                onChange={(event) => handleEditorChange('caratula', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Numero</span>
              <input
                className={styles.control}
                value={editorState.numero}
                onChange={(event) => handleEditorChange('numero', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Materia</span>
              <input
                className={styles.control}
                value={editorState.materia}
                onChange={(event) => handleEditorChange('materia', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Juzgado</span>
              <input
                className={styles.control}
                value={editorState.juzgado}
                onChange={(event) => handleEditorChange('juzgado', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Jurisdiccion</span>
              <input
                className={styles.control}
                value={editorState.jurisdiction}
                onChange={(event) => handleEditorChange('jurisdiction', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tipo de caso</span>
              <input
                className={styles.control}
                value={editorState.tipo_caso}
                onChange={(event) => handleEditorChange('tipo_caso', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Subtipo</span>
              <input
                className={styles.control}
                value={editorState.subtipo_caso}
                onChange={(event) => handleEditorChange('subtipo_caso', event.target.value)}
                disabled={busy}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Estado procesal</span>
              <input
                className={styles.control}
                value={editorState.estado_procesal}
                onChange={(event) => handleEditorChange('estado_procesal', event.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Partes del caso (JSON)</span>
            <textarea
              className={styles.textarea}
              value={editorState.partes_json}
              onChange={(event) => handleEditorChange('partes_json', event.target.value)}
              disabled={busy}
              rows={6}
              placeholder='[{"rol":"actor","nombre":"Juan Perez"},{"rol":"demandado","nombre":"Empresa SA"}]'
            />
          </label>

          <div className={styles.expedienteContextStack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Descripcion</span>
              <textarea
                className={styles.textarea}
                value={editorState.descripcion}
                onChange={(event) => handleEditorChange('descripcion', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Hechos relevantes</span>
              <textarea
                className={styles.textarea}
                value={editorState.hechos_relevantes}
                onChange={(event) => handleEditorChange('hechos_relevantes', event.target.value)}
                disabled={busy}
                rows={5}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Pretension principal</span>
              <textarea
                className={styles.textarea}
                value={editorState.pretension_principal}
                onChange={(event) => handleEditorChange('pretension_principal', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Riesgos clave</span>
              <textarea
                className={styles.textarea}
                value={editorState.riesgos_clave}
                onChange={(event) => handleEditorChange('riesgos_clave', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Estrategia base</span>
              <textarea
                className={styles.textarea}
                value={editorState.estrategia_base}
                onChange={(event) => handleEditorChange('estrategia_base', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Proxima accion sugerida</span>
              <textarea
                className={styles.textarea}
                value={editorState.proxima_accion_sugerida}
                onChange={(event) => handleEditorChange('proxima_accion_sugerida', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Notas estrategicas</span>
              <textarea
                className={styles.textarea}
                value={editorState.notas_estrategia}
                onChange={(event) => handleEditorChange('notas_estrategia', event.target.value)}
                disabled={busy}
                rows={4}
              />
            </label>
          </div>

          <div className={styles.expedienteContextActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setEditorState(buildEditorState(activeExpediente))}
              disabled={busy || !isDirty}
            >
              Descartar
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveExpediente}
              disabled={busy || !isDirty || !editorState.titulo.trim()}
            >
              Guardar contexto
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.historySubheader}>
        <div>
          <span className={styles.eyebrow}>Historial</span>
          <h4 className={styles.historySectionTitle}>
            {activeExpediente ? activeExpediente.name : 'Consultas del expediente'}
          </h4>
        </div>
        {items.length ? <span className={styles.pill}>{items.length}</span> : null}
      </div>

      {items.length ? (
        <ul className={styles.historyList}>
          {items.map((item) => {
            const isActive = item.id === activeEntryId;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.historyItem} ${isActive ? styles.historyItemActive : ''}`}
                  onClick={() => onSelectEntry?.(item)}
                  disabled={busy}
                >
                  <div className={styles.historyItemTop}>
                    <span className={styles.historyTimestamp}>
                      {formatHistoryTimestamp(item.created_at)}
                    </span>
                    <span className={`${styles.pill} ${isActive ? styles.pillStrong : ''}`}>
                      {formatConfidence(item.response?.confidence)}
                    </span>
                  </div>

                  <p className={styles.historyQuery}>
                    {compactText(item.request?.query || item.response?.query || '', 96)}
                  </p>

                  <div className={styles.historyMeta}>
                    <span>{item.request?.jurisdiction || item.response?.jurisdiction || 'jujuy'}</span>
                    <span>{item.request?.forum || item.response?.forum || 'civil'}</span>
                    <span>{item.request?.document_mode || 'estrategia'}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.emptyNote}>{emptyLabel}</p>
      )}
    </div>
  );
}
