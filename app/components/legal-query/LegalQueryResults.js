// frontend/app/components/legal-query/LegalQueryResults.js
'use client';

import styles from './LegalQuery.module.css';
import ConversationalChat from './ConversationalChat';
import ConversationalStateBlock from './ConversationalStateBlock';
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

function CompactList({ items = [], className }) {
  if (!items.length) return null;
  return (
    <ul className={`${styles.compactList} ${className || ''}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={styles.compactItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function OverflowToggle({ items = [], label }) {
  if (!items.length) return null;
  return (
    <details className={styles.inlineDisclosure}>
      <summary className={styles.inlineDisclosureSummary}>
        {label || `Ver ${items.length} mas`}
      </summary>
      <CompactList items={items} />
    </details>
  );
}

function NormativeCompact({ items = [] }) {
  if (!items.length) return null;

  const display = items.slice(0, 6).map((item, index) => {
    if (typeof item === 'string') return item;
    const source = item?.source_id || item?.source || item?.norma || '';
    const article = item?.article || item?.articulo || '';
    const label = item?.label || item?.title || item?.titulo || '';
    const parts = [label, source, article ? `Art. ${article}` : ''].filter(Boolean);
    return parts.join(' - ') || `Norma ${index + 1}`;
  });

  return (
    <ul className={styles.normativeCompactList}>
      {display.map((text, index) => (
        <li key={`norm-${index}`} className={styles.normativeCompactItem}>
          {text}
        </li>
      ))}
      {items.length > 6 ? (
        <li className={styles.normativeCompactMore}>
          +{items.length - 6} normas adicionales en el detalle profesional
        </li>
      ) : null}
    </ul>
  );
}

export default function LegalQueryResults({
  response,
  requestContext = {},
  onQuickReply,
  onSubmitAnswer,
  activeQuickReply = '',
  quickReplyDisabled = false,
}) {
  const normalized = normalizeLegalQueryResponse(response);
  const display = adaptLegalResultForDisplay(normalized);
  const warnings = collectLegalWarnings(normalized);
  const professionalMode = display.professionalMode;
  const isClarificationMode = display.mode === 'clarification';
  const hasConversationalChat = display.conversationalResponse.messages.length > 0;

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

  const hasNormative = display.normativeItems.length > 0;
  const hasWarnings = warnings.length > 0 || normalized.hallucination_guard?.is_safe === false;

  return (
    <article className={styles.assistantCard}>
      <header className={styles.assistantHeader}>
        <div className={styles.assistantLead}>
          <p className={styles.eyebrow}>Orientacion juridica</p>
          <h3 className={styles.assistantTitle}>
            {display.title || normalized.query || 'Resultado juridico'}
          </h3>
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
          <span className={isClarificationMode ? styles.pillAlert : styles.pill}>
            {display.modeLabel}
          </span>
          {typeof normalized.confidence === 'number' ? (
            <span className={styles.pill}>
              Confianza {formatConfidence(normalized.confidence)}
            </span>
          ) : null}
          {normalized.is_partial ? (
            <span className={styles.pillAlert}>Respuesta parcial</span>
          ) : null}
          {normalized.is_empty ? (
            <span className={styles.pillAlert}>Respuesta vacia</span>
          ) : null}
        </div>
      </header>

      <LegalQueryExportActions response={normalized} requestContext={requestContext} />

      {hasConversationalChat ? (
        <ConversationalChat
          conversationalResponse={display.conversationalResponse}
          onSubmitAnswer={onSubmitAnswer || onQuickReply}
        />
      ) : (
        <>
          <ConversationalStateBlock
            display={display}
            onQuickReply={onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
          />

          <section
            className={`${styles.heroAnswer} ${
              isClarificationMode ? styles.heroAnswerSecondary : ''
            }`}
          >
            <div className={styles.heroAnswerHead}>
              <span className={styles.heroAnswerEyebrow}>
                {isClarificationMode ? 'Contexto util mientras aclaramos' : 'Analisis disponible'}
              </span>
            </div>
            <p className={styles.heroAnswerText}>
              {isClarificationMode
                ? display.summary || display.whatThisMeans
                : display.whatThisMeans || display.summary}
            </p>
            {display.quickStart && !isClarificationMode ? (
              <div className={styles.heroQuickStart}>
                <span className={styles.heroQuickStartLabel}>Primer paso recomendado</span>
                <p className={styles.heroQuickStartText}>{display.quickStart}</p>
              </div>
            ) : null}
          </section>

          <div className={styles.secondaryGrid}>
            {display.primaryClarifications.length > 0 ? (
              <section className={styles.secondaryCard}>
                <h4 className={styles.secondaryCardTitle}>
                  {isClarificationMode ? 'Despues conviene aclarar tambien' : 'Que falta definir'}
                </h4>
                <CompactList items={display.primaryClarifications} />
                <OverflowToggle
                  items={display.overflowClarifications}
                  label={`Ver ${display.overflowClarifications.length} mas`}
                />
              </section>
            ) : null}

            {display.primaryNextSteps.length > 0 ? (
              <section className={styles.secondaryCard}>
                <h4 className={styles.secondaryCardTitle}>Proximos pasos</h4>
                <CompactList items={display.primaryNextSteps} />
                <OverflowToggle
                  items={display.overflowNextSteps}
                  label={`Ver ${display.overflowNextSteps.length} mas`}
                />
              </section>
            ) : null}

            {!isClarificationMode && display.primaryKeyRisks.length > 0 ? (
              <section className={`${styles.secondaryCard} ${styles.secondaryCardRisk}`}>
                <h4 className={styles.secondaryCardTitle}>Riesgos clave</h4>
                <CompactList items={display.primaryKeyRisks} />
                <OverflowToggle
                  items={display.overflowKeyRisks}
                  label={`Ver ${display.overflowKeyRisks.length} mas`}
                />
              </section>
            ) : null}
          </div>
        </>
      )}

      {hasNormative ? (
        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>
            Normativa relevante ({display.normativeItems.length})
          </summary>
          <div className={styles.disclosureBody}>
            <NormativeCompact items={display.normativeItems} />
          </div>
        </details>
      ) : null}

      {hasWarnings ? (
        <details
          className={styles.disclosure}
          open={normalized.hallucination_guard?.is_safe === false}
        >
          <summary className={styles.disclosureSummary}>
            Advertencias ({warnings.length})
          </summary>
          <div className={styles.disclosureBody}>
            <LegalWarnings items={warnings} guard={normalized.hallucination_guard} />
          </div>
        </details>
      ) : null}

      {!isClarificationMode && display.confidenceExplained ? (
        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>Detalle de confianza</summary>
          <div className={styles.disclosureBody}>
            <p className={styles.panelText}>{display.confidenceExplained}</p>
          </div>
        </details>
      ) : null}

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
                <h4 className={styles.panelTitle}>Normativa relevante (detalle)</h4>
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
    </article>
  );
}
