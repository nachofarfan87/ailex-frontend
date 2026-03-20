'use client';

import { useEffect, useState } from 'react';
import { getJurisdictionProfile, getPolicies } from '../lib/api';

const WRITING_PREFERENCES = [
  'Tono sobrio y profesional.',
  'Priorizar precision procesal sobre lenguaje promocional.',
  'Marcar inferencias, sugerencias y fuentes de forma diferenciada.',
  'Evitar afirmaciones concluyentes sin respaldo documental.',
];

const TRACEABILITY_RULES = [
  'Toda salida debe exponer nivel de confianza.',
  'Las fuentes recuperadas se muestran como respaldo, no como adorno.',
  'Los datos faltantes se destacan antes de sugerir presentacion.',
];

export default function ConfiguracionPage() {
  const [jurisdiction, setJurisdiction] = useState(null);
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadConfiguration() {
      try {
        const [jurisdictionResponse, policyResponse] = await Promise.all([
          getJurisdictionProfile(),
          getPolicies(),
        ]);

        setJurisdiction(jurisdictionResponse);
        setPolicies(policyResponse);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadConfiguration();
  }, []);

  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Configuracion</span>
          <h1 className="page-title">Jurisdiccion, guardrails y preferencias del sistema.</h1>
          <p className="page-description">
            Esta vista ordena configuracion juridica real del backend junto con preferencias editoriales y criterios de trazabilidad para la experiencia conversacional.
          </p>
        </div>

        <div className="page-actions">
          <span className="badge badge--law">Sistema profesional</span>
          <span className="badge badge--trust">Sin tocar backend</span>
        </div>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">Jurisdiccion</span>
          <strong className="kpi-value">{jurisdiction?.jurisdiction || (loading ? '...' : 'No disponible')}</strong>
          <p className="kpi-copy">Perfil juridico operativo para el asistente.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Fueros</span>
          <strong className="kpi-value">{jurisdiction?.fueros?.length || 0}</strong>
          <p className="kpi-copy">Catalogo base para encuadre y plantillas.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Confianza minima</span>
          <strong className="kpi-value">{policies ? `${Math.round(policies.confidence_threshold * 100)}%` : '...'}</strong>
          <p className="kpi-copy">Umbral declarado por las politicas activas.</p>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Fuentes minimas</span>
          <strong className="kpi-value">{policies?.min_sources_for_assertion ?? '...'}</strong>
          <p className="kpi-copy">Cantidad base para afirmar con respaldo.</p>
        </article>
      </section>

      <section className="dual-grid">
        <article className="surface-panel">
          <div className="surface-panel__body">
            <h2 className="panel-title">Perfil jurisdiccional activo</h2>
            <p className="panel-copy">
              AILEX debe sentirse como herramienta juridica concreta. Por eso la configuracion expone jurisdiccion, estructura judicial y advertencias operativas.
            </p>

            <div className="inline-divider" />

            {loading ? (
              <p className="panel-copy">Cargando configuracion...</p>
            ) : (
              <div className="stack-list">
                <div className="stack-item">
                  <strong>Base territorial</strong>
                  <span className="meta-copy">
                    {jurisdiction?.province}, {jurisdiction?.country} · capital {jurisdiction?.capital}
                  </span>
                </div>
                <div className="stack-item">
                  <strong>Normativa base</strong>
                  <div className="tag-row">
                    {(jurisdiction?.normativa_base || []).slice(0, 6).map((item) => (
                      <span key={item} className="badge badge--muted">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="stack-item">
                  <strong>Fueros disponibles</strong>
                  <div className="tag-row">
                    {(jurisdiction?.fueros || []).map((item) => (
                      <span key={item} className="badge badge--law">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {jurisdiction?.advertencia ? (
                  <div className="stack-item">
                    <strong>Advertencia operativa</strong>
                    <span className="meta-copy">{jurisdiction.advertencia}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>

        <article className="surface-panel surface-panel--soft">
          <div className="surface-panel__body">
            <h2 className="panel-title">Politicas activas del sistema</h2>
            <p className="panel-copy">
              El frontend reordena estas politicas para lectura rapida, pero los valores siguen viniendo del backend actual.
            </p>

            <div className="stack-list" style={{ marginTop: 18 }}>
              <div className="stack-item">
                <strong>Identidad del sistema</strong>
                <span className="meta-copy">
                  {policies?.sistema || 'AILEX'} · v{policies?.version || '...'}
                </span>
              </div>
              <div className="stack-item">
                <strong>Guardrails</strong>
                <span className="meta-copy">
                  {policies?.guardrails_count
                    ? `${policies.guardrails_count.prohibiciones} prohibiciones y ${policies.guardrails_count.obligaciones} obligaciones activas.`
                    : 'Sin datos de guardrails.'}
                </span>
              </div>
              <div className="stack-item">
                <strong>Respuesta y validacion</strong>
                <div className="tag-row">
                  <span className="badge badge--success">Response policy: {policies?.response_policy || 'n/d'}</span>
                  <span className="badge badge--trust">Legal guardrails: {policies?.legal_guardrails || 'n/d'}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="tri-grid">
        <article className="surface-panel">
          <div className="surface-panel__body">
            <h2 className="panel-title">Trazabilidad</h2>
            <div className="stack-list" style={{ marginTop: 18 }}>
              {TRACEABILITY_RULES.map((rule) => (
                <div key={rule} className="stack-item">
                  <strong>{rule}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="surface-panel">
          <div className="surface-panel__body">
            <h2 className="panel-title">Preferencias de redaccion</h2>
            <div className="stack-list" style={{ marginTop: 18 }}>
              {WRITING_PREFERENCES.map((item) => (
                <div key={item} className="stack-item">
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="surface-panel">
          <div className="surface-panel__body">
            <h2 className="panel-title">Parametros visibles</h2>
            <div className="stack-list" style={{ marginTop: 18 }}>
              {(policies?.prohibiciones || []).slice(0, 3).map((item) => (
                <div key={item} className="stack-item">
                  <strong>{item}</strong>
                </div>
              ))}
              {!policies?.prohibiciones?.length ? (
                <div className="stack-item">
                  <strong>Sin detalle adicional disponible.</strong>
                </div>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
