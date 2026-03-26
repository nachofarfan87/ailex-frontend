'use client';

import styles from './LegalQuery.module.css';
import LegalQueryExportActions from './LegalQueryExportActions';
import LegalStrategy from './LegalStrategy';
import LegalWarnings from './LegalWarnings';
import NormativeFoundations from './NormativeFoundations';
import ProceduralStrategy from './ProceduralStrategy';
import { adaptLegalResultForDisplay } from '@/app/lib/legalResultAdapter';
import {
  collectLegalWarnings,
  formatConfidence,
  humanizeLabel,
  normalizeLegalQueryResponse,
} from '@/app/lib/legalQuery';

function ConfidencePanel({ response, display }) {
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
        {display.confidenceExplained ||
          `Confianza estimada del sistema: ${formatConfidence(response.confidence)}.`}
      </p>
    </div>
  );
}

function ListPanel({ title, items = [], emptyMessage }) {
  return (
    <div className={styles.panel}>
      <h4 className={styles.panelTitle}>{title}</h4>
      {items.length ? (
        <ul className={styles.strategyList}>
          {items.map((item, index) => (
            <li key={`${title}-${item}-${index}`} className={styles.strategyItem}>
              <p className={styles.panelText}>{item}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyNote}>{emptyMessage}</p>
      )}
    </div>
  );
}

export default function LegalQueryResults({ response, requestContext = {} }) {
  const normalized = normalizeLegalQueryResponse(response);
  const display = adaptLegalResultForDisplay(normalized);
  const warnings = collectLegalWarnings(normalized);
  const professionalMode = display.professionalMode;
  const hasProfessionalMode = Boolean(
    professionalMode.summary ||
      professionalMode.strategic_narrative ||
      professionalMode.recommended_actions.length ||
      professionalMode.risk_analysis.length ||
      professionalMode.conflict_summary.length ||
      professionalMode.procedural_focus.length ||
      professionalMode.critical_missing_information.length ||
      professionalMode.ordinary_missing_information.length ||
      professionalMode.normative_focus.length,
  );

  return (
    <article className={styles.assistantCard}>
      <header className={styles.assistantHeader}>
        <div className={styles.assistantLead}>
          <p className={styles.eyebrow}>Resultado juridico</p>
          <h3 className={styles.assistantTitle}>
            {display.title || normalized.query || 'Resultado juridico'}
          </h3>
          <p className={styles.summary}>{display.summary}</p>
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
          <h4 className={styles.panelTitle}>Que significa esto</h4>
          <p className={styles.panelText}>{display.whatThisMeans || display.summary}</p>
          {display.quickStart ? (
            <div className={styles.strategyBlock}>
              <h5 className={styles.foundationTitle}>Primer paso recomendado</h5>
              <p className={styles.panelText}>{display.quickStart}</p>
            </div>
          ) : null}
        </section>

        <section className={`${styles.panel} ${styles.panelSignal}`}>
          <h4 className={styles.panelTitle}>Confianza del sistema</h4>
          <ConfidencePanel response={normalized} display={display} />
        </section>
      </section>

      <div className={styles.resultsStack}>
        <section className={styles.resultsGrid}>
          <ListPanel
            title="Proximos pasos"
            items={display.nextSteps}
            emptyMessage="No se informaron pasos concretos adicionales."
          />
          <ListPanel
            title="Riesgos a tener en cuenta"
            items={display.keyRisks}
            emptyMessage="No se reportaron riesgos relevantes para esta orientacion inicial."
          />
        </section>

        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>Informacion que ayudaria a afinar la respuesta</h4>
          {display.missingInformation.length ? (
            <ul className={styles.strategyList}>
              {display.missingInformation.map((item, index) => (
                <li key={`${item}-${index}`} className={styles.strategyItem}>
                  <p className={styles.panelText}>{item}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>
              No se reporto informacion faltante adicional para esta orientacion inicial.
            </p>
          )}
        </section>

        <section className={`${styles.panel} ${styles.resultsSection}`}>
          <h4 className={styles.panelTitle}>Advertencias</h4>
          <LegalWarnings items={warnings} guard={normalized.hallucination_guard} />
        </section>

        {hasProfessionalMode ? (
          <details className={styles.disclosure}>
            <summary className={styles.disclosureSummary}>Ver detalle profesional</summary>
            <div className={styles.disclosureBody}>
              <div className={styles.resultsStack}>
                <section className={`${styles.panel} ${styles.resultsSection}`}>
                  <h4 className={styles.panelTitle}>Resumen profesional</h4>
                  <p className={styles.panelText}>
                    {professionalMode.summary || 'No se devolvio resumen profesional adicional.'}
                  </p>
                </section>

                <section className={`${styles.panel} ${styles.resultsSection}`}>
                  <h4 className={styles.panelTitle}>Estrategia juridica</h4>
                  <LegalStrategy
                    strategy={{
                      strategic_narrative:
                        professionalMode.strategic_narrative ||
                        normalized.case_strategy.strategic_narrative,
                      conflict_summary:
                        professionalMode.conflict_summary.length
                          ? professionalMode.conflict_summary
                          : normalized.case_strategy.conflict_summary,
                      recommended_actions:
                        professionalMode.recommended_actions.length
                          ? professionalMode.recommended_actions
                          : normalized.case_strategy.recommended_actions,
                      risk_analysis:
                        professionalMode.risk_analysis.length
                          ? professionalMode.risk_analysis
                          : normalized.case_strategy.risk_analysis,
                      procedural_focus:
                        professionalMode.procedural_focus.length
                          ? professionalMode.procedural_focus
                          : normalized.case_strategy.procedural_focus,
                      secondary_domain_notes:
                        normalized.case_strategy.secondary_domain_notes,
                      critical_questions: normalized.case_strategy.critical_questions,
                    }}
                    caseDomain={normalized.case_domain}
                    caseDomains={normalized.case_domains}
                  />
                </section>

                <section className={`${styles.panel} ${styles.resultsSection}`}>
                  <h4 className={styles.panelTitle}>Faltantes y foco procesal</h4>
                  <ProceduralStrategy
                    nextSteps={
                      professionalMode.recommended_actions.length
                        ? professionalMode.recommended_actions
                        : normalized.procedural_strategy.next_steps
                    }
                    risks={
                      professionalMode.risk_analysis.length
                        ? professionalMode.risk_analysis
                        : normalized.procedural_strategy.risks
                    }
                    missingInformation={[
                      ...professionalMode.critical_missing_information,
                      ...professionalMode.ordinary_missing_information,
                    ]}
                  />
                </section>

                <section className={`${styles.panel} ${styles.resultsSection}`}>
                  <h4 className={styles.panelTitle}>Normativa relevante</h4>
                  <NormativeFoundations
                    items={
                      professionalMode.normative_focus.length
                        ? professionalMode.normative_focus
                        : normalized.normative_reasoning.applied_rules
                    }
                  />
                </section>
              </div>
            </div>
          </details>
        ) : null}

        {display.rawResponseText ? (
          <details className={styles.disclosure}>
            <summary className={styles.disclosureSummary}>Ver respuesta completa original</summary>
            <div className={styles.disclosureBody}>
              <p className={styles.panelText}>{display.rawResponseText}</p>
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
}
