import Link from 'next/link';

const CASE_QUEUE = [
  {
    name: 'Caso activo',
    status: 'Con notificacion reciente',
    note: 'Agrupa contexto, borradores y alertas operativas en una sola vista.',
  },
  {
    name: 'Caso en revision',
    status: 'Con escrito pendiente',
    note: 'Mantiene hallazgos del revisor y documentos relacionados.',
  },
  {
    name: 'Caso archivado',
    status: 'Listo para consulta',
    note: 'Conserva trazabilidad y antecedentes para reutilizacion futura.',
  },
];

const WORKSPACE_BLOCKS = [
  {
    title: 'Contexto consolidado',
    items: [
      'Partes, fuero, tribunal y objetivo actual del asunto.',
      'Resumen ejecutivo reutilizable por el chat.',
      'Documentos vinculados desde el corpus.',
    ],
  },
  {
    title: 'Borradores y revisiones',
    items: [
      'Escritos generados desde Plantillas.',
      'Versiones observadas por el modulo de revision.',
      'Notas internas con criterio del abogado.',
    ],
  },
  {
    title: 'Plazos y riesgos',
    items: [
      'Hitos procesales detectados desde notificaciones.',
      'Alertas por vencimiento, ambiguedad o falta de respaldo.',
      'Acciones pendientes priorizadas.',
    ],
  },
];

export default function CasosPage() {
  return (
    <div className="workspace page-shell">
      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Casos</span>
          <h1 className="page-title">Workspace por asunto, no dashboard de estudio.</h1>
          <p className="page-description">
            Esta vista reencuadra AILEX como herramienta juridica profesional: cada caso concentra contexto, notificaciones, borradores, revisiones y documentos relacionados alrededor del trabajo del abogado.
          </p>
        </div>

        <div className="page-actions">
          <Link href="/?action=notificacion" className="ghost-button">
            Analizar nueva actuacion
          </Link>
          <Link href="/plantillas" className="ghost-button">
            Abrir Plantillas
          </Link>
        </div>
      </header>

      <section className="case-layout">
        <div className="case-column">
          {CASE_QUEUE.map((caseItem) => (
            <article key={caseItem.name} className="case-card">
              <div className="chip-row">
                <span className="badge badge--law">{caseItem.name}</span>
                <span className="badge badge--muted">{caseItem.status}</span>
              </div>
              <p>{caseItem.note}</p>
            </article>
          ))}
        </div>

        <div className="case-column">
          <article className="surface-panel">
            <div className="surface-panel__body">
              <span className="eyebrow">Vista unificada</span>
              <h2 className="panel-title">Lo que debe vivir dentro de cada caso.</h2>
              <p className="panel-copy">
                No hay backend de casos todavia, asi que esta pagina deja montado el workspace operacional desde frontend para cuando se conecte la entidad real.
              </p>

              <div className="stack-list" style={{ marginTop: 18 }}>
                {WORKSPACE_BLOCKS.map((block) => (
                  <div key={block.title} className="stack-item">
                    <strong>{block.title}</strong>
                    <ul>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="case-column">
          <article className="case-card">
            <span className="eyebrow">Priorizacion</span>
            <h3>Jerarquia visual para riesgo, plazo y accion.</h3>
            <ul>
              <li>Riesgos procesales primero.</li>
              <li>Plazos visibles con trazabilidad de origen.</li>
              <li>Borradores y revisiones como piezas del mismo asunto.</li>
            </ul>
          </article>

          <article className="case-card">
            <span className="eyebrow">Siguiente integracion</span>
            <p>
              Cuando exista backend de casos, esta vista ya tiene el encuadre correcto para conectar bandeja, timeline, documentos y notas sin volver al concepto de estudio academico.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
