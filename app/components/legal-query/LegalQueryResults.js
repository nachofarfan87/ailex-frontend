'use client';

import styles from './LegalQuery.module.css';
import LegalQueryExportActions from './LegalQueryExportActions';
import LegalStrategy from './LegalStrategy';
import LegalWarnings from './LegalWarnings';
import NormativeFoundations from './NormativeFoundations';
import ProceduralStrategy from './ProceduralStrategy';
import {
  collectLegalWarnings,
  compactText,
  formatConfidence,
  humanizeLabel,
  normalizeLegalQueryResponse,
} from '@/app/lib/legalQuery';

function ConfidencePanel({ response }) {
  const confidence = typeof response.confidence === 'number' ? response.confidence : 0;
  const width = `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;

  return (
    <div className={styles.confidenceBlock}>
      <div className={styles.assistantMeta}>
        <span className={`${styles.pill} ${styles.pillStrong}`}>
          Confianza {formatConfidence(response.confidence)}
        </span>
        {response.hallucination_guard.severity ? (
          <span
            className={`${styles.pill} ${
              response.hallucination_guard.is_safe === false
                ? styles.pillDanger
                : styles.pillAlert
            }`}
          >
            Guardia {humanizeLabel(response.hallucination_guard.severity)}
          </span>
        ) : null}
      </div>
      <div className={styles.meter} aria-hidden="true">
        <span style={{ width }} />
      </div>
      <p className={styles.panelText}>
        Ajuste de seguridad:{' '}
        {response.hallucination_guard.confidence_adjustment ?? 'no informado'}.
      </p>
    </div>
  );
}

function RetrievedContext({ items = [], citations = [] }) {
  const visibleItems = items.slice(0, 4);
  const visibleCitations = citations.slice(0, 4);

  if (!visibleItems.length && !visibleCitations.length) {
    return <p className={styles.emptyNote}>No se informaron piezas de contexto recuperadas.</p>;
  }

  return (
    <div className={styles.shell}>
      {visibleItems.length ? (
        <ul className={styles.foundationList}>
          {visibleItems.map((item, index) => (
            <li
              key={`${item.source_id || item.label || 'item'}-${index}`}
              className={styles.foundationItem}
            >
              <div className={styles.foundationHead}>
                <h4 className={styles.foundationTitle}>
                  {item.label || item.titulo || item.title || `Articulo ${item.article || '-'}`}
                </h4>
                <div className={styles.foundationMeta}>
                  {item.source_id ? (
                    <span className={styles.pill}>{humanizeLabel(item.source_id)}</span>
                  ) : null}
                  {item.match_type ? (
                    <span className={styles.pill}>{humanizeLabel(item.match_type)}</span>
                  ) : null}
                </div>
              </div>
              <p className={styles.panelText}>
                {compactText(item.texto || item.text || '', 220) || 'Sin extracto disponible.'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {visibleCitations.length ? (
        <div className={styles.assistantMeta}>
          {visibleCitations.map((citation, index) => (
            <span key={`${citation}-${index}`} className={styles.pill}>
              {typeof citation === 'string'
                ? citation
                : humanizeLabel(citation?.label || citation?.source_id || 'Cita')}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function LegalQueryResults({ response, requestContext = {} }) {
  const normalized = normalizeLegalQueryResponse(response);
  const warnings = collectLegalWarnings(normalized);
  const shortAnswer =
    normalized.visible_summary ||
    'El backend respondio sin resumen breve. Revisar fundamentos y estrategia.';
  const hasSpecificStrategy =
    Boolean(normalized.case_strategy.strategic_narrative) ||
    normalized.case_strategy.recommended_actions.length > 0 ||
    normalized.case_strategy.conflict_summary.length > 0;
  const showNormativeFirst =
    normalized.normative_reasoning.applied_rules.length > 0 && !hasSpecificStrategy;

  return (
    <article className={styles.assistantCard}>
      <header className={styles.assistantHeader}>
        <div className={styles.assistantLead}>
          <p className={styles.eyebrow}>Resultado juridico</p>
          <h3 className={styles.assistantTitle}>
            {normalized.query || 'Consulta juridica procesada'}
          </h3>
          <p className={styles.summary}>{shortAnswer}</p>
        </div>

        <div className={styles.assistantMeta}>
          {normalized.jurisdiction ? (
            <span className={styles.pill}>{humanizeLabel(normalized.jurisdiction)}</span>
          ) : null}
          {normalized.forum ? (
            <span className={styles.pill}>{humanizeLabel(normalized.forum)}</span>
          ) : null}
          {normalized.case_domain ? (
            <span className={styles.pillStrong}>{humanizeLabel(normalized.case_domain)}</span>
          ) : null}
          {normalized.is_partial ? (
            <span className={styles.pillAlert}>Respuesta parcial</span>
          ) : null}
          {normalized.is_empty ? <span className={styles.pillAlert}>Respuesta vacia</span> : null}
        </div>
      </header>

      <LegalQueryExportActions response={normalized} requestContext={requestContext} />

      <section className={styles.primaryResultGrid}>
        <section className={`${styles.panel} ${styles.panelEditorial}`}>
          <h4 className={styles.panelTitle}>Respuesta breve</h4>
          <p className={styles.panelText}>{shortAnswer}</p>
          {normalized.case_domains.length ? (
            <p className={styles.panelText}>
              Dominios detectados: {normalized.case_domains.map(humanizeLabel).join(', ')}
            </p>
          ) : null}
        </section>

        <section className={`${styles.panel} ${styles.panelSignal}`}>
          <h4 className={styles.panelTitle}>Confianza del sistema</h4>
          <ConfidencePanel response={normalized} />
        </section>
      </section>

      <div className={styles.resultsStack}>
        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>Estrategia juridica</h4>
          <LegalStrategy
            strategy={normalized.case_strategy}
            caseDomain={normalized.case_domain}
            caseDomains={normalized.case_domains}
          />
        </section>

        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>
            {showNormativeFirst ? 'Fundamentos normativos' : 'Normativa relevante o secundaria'}
          </h4>
          <NormativeFoundations
            items={
              showNormativeFirst
                ? normalized.reasoning.normative_foundations
                : normalized.normative_reasoning.applied_rules
            }
          />
        </section>

        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>Estrategia procesal complementaria</h4>
          <ProceduralStrategy
            nextSteps={normalized.procedural_strategy.next_steps}
            risks={normalized.procedural_strategy.risks}
            missingInformation={normalized.procedural_strategy.missing_information}
          />
        </section>

        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>Advertencias</h4>
          <LegalWarnings items={warnings} guard={normalized.hallucination_guard} />
        </section>

        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>Contexto y citas utilizadas</summary>
          <div className={styles.disclosureBody}>
            <RetrievedContext
              items={normalized.retrieved_items}
              citations={normalized.reasoning.citations_used}
            />
          </div>
        </details>
      </div>
    </article>
  );
}
