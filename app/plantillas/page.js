'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getTemplateDraft,
  getTemplateMetadata,
  listTemplates,
  listVariantes,
} from '../lib/api';

export default function PlantillasPage() {
  const [templates, setTemplates] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('estandar');
  const [metadata, setMetadata] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const [templatesResponse, variantsResponse] = await Promise.all([
          listTemplates(),
          listVariantes(),
        ]);

        const availableTemplates = templatesResponse.templates || [];
        setTemplates(availableTemplates);
        setVariantes(variantsResponse.variantes || []);

        if (availableTemplates.length) {
          setSelectedTemplate(availableTemplates[0].tipo_escrito);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  useEffect(() => {
    async function loadSelectedTemplate() {
      if (!selectedTemplate) return;

      try {
        setError('');
        const [metadataResponse, draftResponse] = await Promise.all([
          getTemplateMetadata(selectedTemplate),
          getTemplateDraft(selectedTemplate, {
            fuero: 'civil',
            materia: 'general',
            variante: selectedVariant,
          }),
        ]);

        setMetadata(metadataResponse);
        setDraft(draftResponse.draft || '');
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    loadSelectedTemplate();
  }, [selectedTemplate, selectedVariant]);

  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Plantillas</span>
          <h1 className="page-title">Tipos de escritos, variantes y acceso a borradores.</h1>
          <p className="page-description">
            Esta vista reemplaza la vieja idea de modelos sueltos por una biblioteca de plantillas juridicas versionadas, con preview de borrador y lectura de requisitos antes de entrar al chat.
          </p>
        </div>

        <div className="page-actions">
          <Link href="/?action=generar" className="ghost-button">
            Generar desde chat
          </Link>
          <span className="badge badge--law">{templates.length} plantillas</span>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="split-shell">
        <article className="surface-panel">
          <div className="surface-panel__body">
            <h2 className="panel-title">Biblioteca disponible</h2>
            <p className="panel-copy">
              Selecciona una plantilla para revisar su estructura, placeholders requeridos y borrador base.
            </p>

            {loading ? (
              <p className="panel-copy" style={{ marginTop: 18 }}>
                Cargando plantillas...
              </p>
            ) : templates.length ? (
              <div className="template-list" style={{ marginTop: 18 }}>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`template-item ${selectedTemplate === template.tipo_escrito ? 'template-item--active' : ''}`}
                    onClick={() => setSelectedTemplate(template.tipo_escrito)}
                  >
                    <span className="template-item__name">{template.nombre}</span>
                    <div className="chip-row" style={{ marginTop: 10 }}>
                      <span className="badge badge--law">{template.fuero}</span>
                      <span className="badge badge--muted">{template.materia}</span>
                      <span className="badge badge--trust">v{template.version}</span>
                    </div>
                    <p className="template-item__copy">
                      {template.placeholders_requeridos_count} campos requeridos · {template.placeholders_opcionales_count} opcionales
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <strong>No hay plantillas disponibles.</strong> Verifica el backend de generacion o incorpora plantillas nuevas.
              </div>
            )}
          </div>
        </article>

        <article className="surface-panel surface-panel--soft">
          <div className="surface-panel__body">
            <div className="field">
              <label>Variante de redaccion</label>
              <select value={selectedVariant} onChange={(event) => setSelectedVariant(event.target.value)}>
                {variantes.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.nombre}
                  </option>
                ))}
              </select>
            </div>

            {metadata ? (
              <div className="stack-list" style={{ marginTop: 18 }}>
                <div className="stack-item">
                  <strong>Estructura base</strong>
                  <div className="tag-row">
                    {(metadata.estructura_base || []).map((item) => (
                      <span key={item} className="badge badge--muted">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="stack-item">
                  <strong>Placeholders requeridos</strong>
                  <div className="tag-row">
                    {(metadata.placeholders_requeridos || []).map((item) => (
                      <span key={item} className="badge badge--warning">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="stack-item">
                  <strong>Checklist previo</strong>
                  <ul>
                    {(metadata.checklist_previo || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="stack-item">
                  <strong>Riesgos habituales</strong>
                  <ul>
                    {(metadata.riesgos_habituales || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="stack-item">
                  <strong>Borrador base</strong>
                  <div className="draft-box">
                    <pre>{draft || 'Sin borrador disponible.'}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-box" style={{ marginTop: 18 }}>
                <strong>Selecciona una plantilla.</strong> Aqui vas a ver sus datos operativos y un borrador de referencia.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
