'use client';

import styles from './LegalQuery.module.css';
import readingStyles from './LegalQueryReading.module.css';
import CaseWorkspacePanel from '../case-workspace/CaseWorkspacePanel';
import CaseProgressSnapshot from './CaseProgressSnapshot';
import ConversationalChat from './ConversationalChat';
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

function CompactList({ items = [], className = '' }) {
  if (!items.length) return null;
  return (
    <ul className={`${styles.compactList} ${className}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={styles.compactItem}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function OverflowToggle({ items = [], label = '' }) {
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

function safeText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? '').trim();
  return (
    value.description ||
    value.label ||
    value.title ||
    value.text ||
    value.action ||
    ''
  );
}

function ResultDisclosure({
  title,
  subtitle = '',
  badge = '',
  tone = 'default',
  children,
}) {
  if (!children) return null;

  const toneClass =
    tone === 'alert'
      ? readingStyles.disclosureAlert
      : tone === 'accent'
        ? readingStyles.disclosureAccent
        : '';

  return (
    <details className={`${styles.disclosure} ${readingStyles.readingDisclosure} ${toneClass}`}>
      <summary className={readingStyles.readingDisclosureSummary}>
        <div className={readingStyles.readingDisclosureLead}>
          <span className={readingStyles.readingDisclosureTitle}>{title}</span>
          {subtitle ? <span className={readingStyles.readingDisclosureSubtitle}>{subtitle}</span> : null}
        </div>
        {badge ? <span className={readingStyles.readingDisclosureBadge}>{badge}</span> : null}
      </summary>
      <div className={styles.disclosureBody}>{children}</div>
    </details>
  );
}

function FollowupCard({
  question = '',
  options = [],
  onQuickReply,
  activeQuickReply = '',
  quickReplyDisabled = false,
  hint = '',
  followupType = '',
}) {
  if (!question) return null;

  const eyebrow =
    followupType === 'critical_data'
      ? 'Dato critico para seguir'
      : followupType === 'confirmation'
        ? 'Confirmacion necesaria'
        : 'Dato para afinar';

  return (
    <section className={readingStyles.followupCard}>
      <div className={readingStyles.followupHead}>
        <span className={readingStyles.followupEyebrow}>{eyebrow}</span>
        <h4 className={readingStyles.followupTitle}>{question}</h4>
      </div>
      {hint ? <p className={readingStyles.followupHint}>{hint}</p> : null}
      {options.length ? (
        <div className={styles.conversationOptionRow}>
          {options.map((option, index) => {
            const isActive = activeQuickReply === option;
            return (
              <button
                key={`${option}-${index}`}
                type="button"
                className={`${styles.conversationOptionChip} ${
                  isActive ? styles.conversationOptionChipActive : ''
                }`}
                onClick={() => onQuickReply?.(option)}
                disabled={quickReplyDisabled}
                aria-pressed={isActive}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function sumCounts(values = []) {
  return values
    .filter((value) => typeof value === 'number' && value > 0)
    .reduce((total, value) => total + value, 0);
}

function nextStepPriorityLabel(priority) {
  if (priority === 'high_priority_action') return 'Prioridad alta';
  if (priority === 'optional_next_step') return 'Paso orientativo';
  return 'Contexto util';
}

function decisionStrengthLabel(strength) {
  if (strength === 'urgent') return 'Urgente';
  if (strength === 'strong') return 'Recomendacion firme';
  if (strength === 'recommended') return 'Recomendado';
  return 'Orientacion prudente';
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
  const snapshot = display.conversational.caseProgressSnapshot;

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
  const showCaseProgressSnapshot = Boolean(snapshot);
  const showCaseWorkspace = Boolean(
    display.caseWorkspace?.available && display.caseWorkspace?.shouldRenderPanel,
  );
  const hasCaseMap =
    display.primaryClarifications.length > 0 ||
    display.primaryNextSteps.length > 0 ||
    display.primaryKeyRisks.length > 0 ||
    display.conversational.knownFactPills?.length > 0 ||
    display.conversational.missingCriticalItems?.length > 0 ||
    display.conversational.missingOptionalItems?.length > 0 ||
    display.conversational.secondaryMissingFacts?.length > 0 ||
    display.conversational.asked_questions?.length > 0;
  const nextBestStep = display.nextBestStep || display.quickStart || display.summary;
  const nextBestStepReason =
    display.nextStepWhy ||
    display.followupPurpose ||
    (isClarificationMode
      ? 'Responder este punto ayuda a destrabar la orientacion del caso.'
      : 'Es el movimiento mas util para avanzar sin dispersarse.');
  const nextBestStepHint = snapshot?.questionTargetHint
    ? snapshot.questionTargetHint
    : snapshot?.primaryGap
      ? `Esto apunta a definir ${snapshot.primaryGap.label}.`
      : '';
  const caseMapCount = sumCounts([
    display.primaryClarifications.length,
    display.primaryNextSteps.length,
    display.primaryKeyRisks.length,
  ]);
  const workspaceCount = sumCounts([
    display.caseWorkspace.actionPlan.length,
    display.caseWorkspace.primaryMissingFacts.length,
  ]);

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

      <div className={readingStyles.readingFlow}>
        <section
          className={`${readingStyles.primaryReadingCard} ${
            isClarificationMode ? readingStyles.primaryReadingCardClarification : ''
          }`}
        >
          <div className={readingStyles.primaryReadingHead}>
            <span className={readingStyles.primaryReadingEyebrow}>{display.primaryReadingEyebrow}</span>
            <h4 className={readingStyles.primaryReadingTitle}>{display.primaryReadingTitle}</h4>
          </div>
          <p className={readingStyles.primaryReadingText}>{display.primaryReadingText}</p>
          {snapshot?.caseDirection ? (
            <p className={readingStyles.primaryReadingSupport}>{snapshot.caseDirection}</p>
          ) : display.modeDescription ? (
            <p className={readingStyles.primaryReadingSupport}>{display.modeDescription}</p>
          ) : null}
        </section>

        {nextBestStep ? (
          <section className={readingStyles.nextBestStepCard}>
            <div className={readingStyles.nextBestStepHead}>
              <span className={readingStyles.nextBestStepEyebrow}>Proximo mejor paso</span>
              <div className={styles.assistantMeta}>
                {display.nextStepPriority ? (
                  <span className={readingStyles.nextBestStepTag}>
                    {nextStepPriorityLabel(display.nextStepPriority)}
                  </span>
                ) : null}
                {display.decisionStrength ? (
                  <span className={readingStyles.nextBestStepTag}>
                    {decisionStrengthLabel(display.decisionStrength)}
                  </span>
                ) : null}
              </div>
            </div>
            <p className={readingStyles.nextBestStepText}>{safeText(nextBestStep)}</p>
            {nextBestStepReason ? (
              <p className={readingStyles.nextBestStepReason}>{nextBestStepReason}</p>
            ) : null}
            {nextBestStepHint ? (
              <p className={readingStyles.nextBestStepHint}>{nextBestStepHint}</p>
            ) : null}
            {display.supportingNextSteps?.length ? (
              <div className={readingStyles.nextBestStepSupport}>
                <span className={readingStyles.nextBestStepSupportLabel}>
                  Despues de eso, puede seguir con:
                </span>
                <CompactList
                  items={display.supportingNextSteps}
                  className={readingStyles.nextBestStepList}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {hasConversationalChat ? (
          <section className={readingStyles.primaryConversationSection}>
            <div className={readingStyles.primaryConversationHead}>
              <span className={readingStyles.primaryConversationEyebrow}>Aclaracion guiada</span>
              <p className={readingStyles.primaryConversationText}>
                Responde este bloque para seguir afinando la orientacion del caso.
              </p>
            </div>
            <ConversationalChat
              conversationalResponse={display.conversationalResponse}
              onSubmitAnswer={onSubmitAnswer || onQuickReply}
            />
          </section>
        ) : (
          <FollowupCard
            question={display.primaryReadingQuestion}
            options={display.conversational.options}
            onQuickReply={onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
            hint={display.followupWhy || display.followupPurpose || snapshot?.followupDirectionHint || ''}
            followupType={display.followupType}
          />
        )}
      </div>

      {hasCaseMap ? (
        <ResultDisclosure
          title="Ver mapa del caso"
          subtitle="Faltantes, datos ya definidos, riesgos y pasos de apoyo"
          badge={caseMapCount ? String(caseMapCount) : ''}
        >
          <div className={styles.secondaryGrid}>
            {display.primaryClarifications.length > 0 ? (
              <section className={styles.secondaryCard}>
                <h4 className={styles.secondaryCardTitle}>
                  {isClarificationMode ? 'Falta definir ahora' : 'Que conviene terminar de aclarar'}
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
                <h4 className={styles.secondaryCardTitle}>Pasos de apoyo</h4>
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

            {display.conversational.knownFactPills?.length ? (
              <section className={styles.secondaryCard}>
                <h4 className={styles.secondaryCardTitle}>Ya aclarado</h4>
                <div className={styles.conversationPillRow}>
                  {display.conversational.knownFactPills.map((item, index) => (
                    <span key={`${item}-${index}`} className={styles.conversationPillAccent}>
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {display.conversational.missingCriticalItems?.length ? (
            <section className={readingStyles.secondaryDetailCard}>
              <h4 className={styles.secondaryCardTitle}>Faltantes criticos</h4>
              <CompactList items={display.conversational.missingCriticalItems} />
            </section>
          ) : null}

          {display.conversational.missingOptionalItems?.length ? (
            <section className={readingStyles.secondaryDetailCard}>
              <h4 className={styles.secondaryCardTitle}>Datos para afinar mejor</h4>
              <CompactList items={display.conversational.missingOptionalItems} />
            </section>
          ) : null}

          {display.conversational.secondaryMissingFacts?.length ? (
            <section className={readingStyles.secondaryDetailCard}>
              <h4 className={styles.secondaryCardTitle}>Despues conviene aclarar tambien</h4>
              <CompactList items={display.conversational.secondaryMissingFacts} />
            </section>
          ) : null}

          {display.conversational.asked_questions?.length ? (
            <section className={readingStyles.secondaryDetailCard}>
              <h4 className={styles.secondaryCardTitle}>Ya preguntado en esta conversacion</h4>
              <CompactList items={display.conversational.asked_questions} />
            </section>
          ) : null}
        </ResultDisclosure>
      ) : null}

      {showCaseWorkspace ? (
        <ResultDisclosure
          title="Workspace del caso"
          subtitle="Checklist, faltantes, plan de accion y handoff profesional"
          badge={workspaceCount ? String(workspaceCount) : ''}
        >
          <CaseWorkspacePanel workspace={display.caseWorkspace} />
        </ResultDisclosure>
      ) : null}

      {showCaseProgressSnapshot ? (
        <ResultDisclosure
          title="Estado del caso"
          subtitle="Readiness, foco operativo y progreso general"
          badge={snapshot?.percentage ? `${snapshot.percentage}%` : ''}
        >
          <CaseProgressSnapshot snapshot={snapshot} />
        </ResultDisclosure>
      ) : null}

      {hasNormative ? (
        <ResultDisclosure
          title="Normativa relevante"
          subtitle="Fundamentos y normas aplicadas"
          badge={String(display.normativeItems.length)}
        >
          <NormativeCompact items={display.normativeItems} />
        </ResultDisclosure>
      ) : null}

      {hasWarnings ? (
        <ResultDisclosure
          title="Advertencias"
          subtitle="Alertas de seguridad, prudencia o consistencia"
          badge={String(warnings.length)}
          tone="alert"
        >
          <LegalWarnings items={warnings} guard={normalized.hallucination_guard} />
        </ResultDisclosure>
      ) : null}

      {!isClarificationMode && display.confidenceExplained ? (
        <ResultDisclosure
          title="Detalle de confianza"
          subtitle="Por que la orientacion es mas o menos solida"
        >
          <p className={styles.panelText}>{display.confidenceExplained}</p>
        </ResultDisclosure>
      ) : null}

      {hasProfessionalMode ? (
        <ResultDisclosure
          title="Vista profesional"
          subtitle="Estrategia, faltantes procesales y normativa en detalle"
          tone="accent"
        >
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
                primaryAction={display.quickStart}
                nextSteps={display.nextSteps}
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
        </ResultDisclosure>
      ) : null}

      {display.rawResponseText ? (
        <ResultDisclosure
          title="Respuesta completa original"
          subtitle="Salida textual sin resumir"
        >
          <p className={styles.panelText}>{display.rawResponseText}</p>
        </ResultDisclosure>
      ) : null}
    </article>
  );
}
