'use client';

import { useState } from 'react';

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
  onSubmitAnswer,
  activeQuickReply = '',
  quickReplyDisabled = false,
  hint = '',
  followupType = '',
  eyebrow = '',
}) {
  if (!question) return null;

  const eyebrowText = eyebrow ||
    followupType === 'critical_data'
      ? 'Dato clave para afinar'
      : followupType === 'confirmation'
        ? 'Confirmacion para ajustar'
        : 'Dato para afinar';
  const [answer, setAnswer] = useState('');
  const canSubmit = Boolean(onSubmitAnswer) && !quickReplyDisabled && answer.trim();

  function handleSubmit() {
    const nextAnswer = answer.trim();
    if (!nextAnswer || !onSubmitAnswer) return;
    onSubmitAnswer(nextAnswer);
    setAnswer('');
  }

  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!canSubmit) return;
    handleSubmit();
  }

  return (
    <section className={readingStyles.followupCard}>
      <div className={readingStyles.followupHead}>
        <span className={readingStyles.followupEyebrow}>{eyebrowText}</span>
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
      {onSubmitAnswer ? (
        <div className={styles.followupAnswerBox}>
          <p className={styles.followupAnswerLabel}>Tu respuesta</p>
          <div className={styles.followupAnswerRow}>
            <input
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.followupAnswerInput}
              placeholder="Escribi tu respuesta..."
              aria-label="Respuesta a la aclaracion de AILEX"
              disabled={quickReplyDisabled}
            />
            <button
              type="button"
              className={styles.followupAnswerButton}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Responder
            </button>
          </div>
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

function buildNaturalTitle({ display, normalized }) {
  const caseDomain = String(normalized.case_domain || '').trim().toLowerCase();
  const focus = String(
    normalized.core_legal_response?.focus_trace?.primary_focus ||
      display.rawResponse?.core_legal_response?.focus_trace?.primary_focus ||
      '',
  ).trim().toLowerCase();

  if (caseDomain === 'divorcio') {
    if (focus === 'protection_urgency') return 'Divorcio: que conviene resolver urgente';
    if (focus === 'children') return 'Divorcio: que tenes que resolver primero por tus hijos';
    if (focus === 'housing') return 'Divorcio: como ordenar el tema de la vivienda';
    if (focus === 'property') return 'Divorcio: como ordenar bienes y vivienda';
    return 'Divorcio: que tenes que hacer ahora';
  }
  if (caseDomain === 'alimentos') return 'Alimentos: que conviene hacer ahora';
  if (caseDomain === 'sucesion') return 'Sucesion: por donde conviene empezar';
  if (display.title) return display.title;
  return 'Que conviene hacer ahora';
}

function CoreLegalResponseSection({ title, eyebrow = '', items = [], text = '' }) {
  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const normalizedText = String(text || '').trim();
  if (!normalizedItems.length && !normalizedText) return null;

  return (
    <section className={readingStyles.nextBestStepCard}>
      <div className={readingStyles.nextBestStepHead}>
        <span className={readingStyles.nextBestStepEyebrow}>{eyebrow || title}</span>
      </div>
      <h4 className={readingStyles.primaryReadingTitle}>{title}</h4>
      {normalizedText ? (
        <p className={readingStyles.nextBestStepReason}>{normalizedText}</p>
      ) : null}
      {normalizedItems.length ? (
        <CompactList
          items={normalizedItems}
          className={readingStyles.nextBestStepList}
        />
      ) : null}
    </section>
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
  const snapshot = display.conversational.caseProgressSnapshot;
  const hasCoreLegalResponse = Boolean(display.hasCoreLegalResponse);
  const hasCoreActionSteps = display.coreActionSteps?.length > 0;
  const hasCoreRequiredDocuments = display.coreRequiredDocuments?.length > 0;
  const hasCoreLocalPracticeNotes = display.coreLocalPracticeNotes?.length > 0;
  const hasCoreOptionalClarification = Boolean(display.coreOptionalClarification);

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
  const showNextBestStepCard =
    !hasCoreActionSteps &&
    display.showNextBestStepCard !== false &&
    Boolean(nextBestStep);
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
  const primaryReadingSupport =
    display.primaryReadingSupport || snapshot?.caseDirection || display.modeDescription;
  const decisionTransparencySummary = display.decisionTransparencySummary || {};
  const userLimitHint =
    (display.decisionStrength === 'soft' ||
      display.isBlockingFollowup ||
      decisionTransparencySummary.shouldSurfacePrudence) &&
    decisionTransparencySummary.userLimit &&
    decisionTransparencySummary.userLimit !== primaryReadingSupport
      ? decisionTransparencySummary.userLimit
      : '';
  const prudenceBridge =
    display.decisionStrength !== 'strong' &&
    display.decisionStrength !== 'urgent' &&
    !display.isBlockingFollowup &&
    decisionTransparencySummary.shouldSurfacePrudence &&
    decisionTransparencySummary.userLimit
      ? `Podes avanzar, pero ojo con esto: ${decisionTransparencySummary.userLimit}`
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
  const shouldRenderLegacyFollowup = !hasConversationalChat && !hasCoreOptionalClarification;
  const naturalTitle = buildNaturalTitle({ display, normalized });
  const visibleDirectAnswer =
    display.coreDirectAnswer || display.primaryReadingText || display.summary;
  const visibleActionSteps = hasCoreActionSteps
    ? display.coreActionSteps
    : [
        nextBestStep && !String(nextBestStep).startsWith('Lo mas conveniente ahora es')
          ? safeText(nextBestStep)
          : safeText(nextBestStep).replace(/^Lo mas conveniente ahora es\s*/i, ''),
        ...display.supportingNextSteps,
      ].filter(Boolean);

  return (
    <article className={styles.assistantCard}>
      <header className={styles.assistantHeader}>
        <div className={styles.assistantLead}>
          <h3 className={styles.assistantTitle}>{naturalTitle}</h3>
        </div>
      </header>

      <div className={readingStyles.readingFlow}>
        <section
          className={`${readingStyles.primaryReadingCard} ${
            isClarificationMode && !hasCoreLegalResponse
              ? readingStyles.primaryReadingCardClarification
              : ''
          }`}
        >
          <p className={readingStyles.primaryReadingText}>{visibleDirectAnswer}</p>
          {display.advanceBasis ? (
            <p className={styles.subtleHintStrong}>{display.advanceBasis}</p>
          ) : null}
          {primaryReadingSupport && !hasCoreLegalResponse ? (
            <p className={readingStyles.primaryReadingSupport}>{primaryReadingSupport}</p>
          ) : null}
          {userLimitHint && !hasCoreLegalResponse ? (
            <p className={styles.subtleHint}>{userLimitHint}</p>
          ) : null}
        </section>

        {visibleActionSteps.length ? (
          <CoreLegalResponseSection
            title="Que tenes que hacer ahora"
            items={visibleActionSteps}
          />
        ) : null}

        {hasConversationalChat ? (
          <section className={readingStyles.primaryConversationSection}>
            <div className={readingStyles.primaryConversationHead}>
              <p className={readingStyles.primaryConversationText}>
                Si queres afinar mejor la orientacion, contame esto:
              </p>
            </div>
            <ConversationalChat
              conversationalResponse={display.conversationalResponse}
              onSubmitAnswer={onSubmitAnswer || onQuickReply}
            />
          </section>
        ) : null}
        {hasCoreOptionalClarification ? (
          <FollowupCard
            question={display.coreOptionalClarification}
            options={display.conversational.options}
            onQuickReply={onQuickReply}
            onSubmitAnswer={onSubmitAnswer || onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
            hint="Esto ayuda a ajustar mejor el siguiente paso, pero no cambia lo principal."
            followupType={display.followupType}
            eyebrow="Si queres, contame esto"
          />
        ) : null}
        {shouldRenderLegacyFollowup ? (
          <FollowupCard
            question={display.primaryReadingQuestion}
            options={display.conversational.options}
            onQuickReply={onQuickReply}
            onSubmitAnswer={onSubmitAnswer || onQuickReply}
            activeQuickReply={activeQuickReply}
            quickReplyDisabled={quickReplyDisabled}
            hint={display.followupWhy || display.followupPurpose || snapshot?.followupDirectionHint || ''}
            followupType={display.followupType}
            eyebrow="Si queres, contame esto"
          />
        ) : null}
      </div>

      {hasCoreRequiredDocuments ? (
        <ResultDisclosure
          title="Si queres ver mas detalle"
          subtitle="Documentos y contexto practico"
        >
          <div className={styles.secondaryGrid}>
            <section className={styles.secondaryCard}>
              <h4 className={styles.secondaryCardTitle}>Que conviene reunir</h4>
              <CompactList items={display.coreRequiredDocuments} />
            </section>
            {hasCoreLocalPracticeNotes ? (
              <section className={styles.secondaryCard}>
                <h4 className={styles.secondaryCardTitle}>En Jujuy</h4>
                <CompactList items={display.coreLocalPracticeNotes} />
              </section>
            ) : null}
          </div>
        </ResultDisclosure>
      ) : hasCoreLocalPracticeNotes ? (
        <ResultDisclosure
          title="Si queres ver mas detalle"
          subtitle="Contexto practico"
        >
          <section className={styles.secondaryCard}>
            <h4 className={styles.secondaryCardTitle}>En Jujuy</h4>
            <CompactList items={display.coreLocalPracticeNotes} />
          </section>
        </ResultDisclosure>
      ) : null}

      {hasCaseMap ? (
        <ResultDisclosure
          title="Mas detalle del caso"
          subtitle="Faltantes, datos definidos y pasos de apoyo"
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
          title="Herramientas de trabajo"
          subtitle="Checklist, faltantes y plan de accion"
          badge={workspaceCount ? String(workspaceCount) : ''}
        >
          <CaseWorkspacePanel workspace={display.caseWorkspace} />
        </ResultDisclosure>
      ) : null}

      {showCaseProgressSnapshot ? (
        <ResultDisclosure
          title="Seguimiento del caso"
          subtitle="Progreso general"
          badge={snapshot?.percentage ? `${snapshot.percentage}%` : ''}
        >
          <CaseProgressSnapshot snapshot={snapshot} />
        </ResultDisclosure>
      ) : null}

      {hasNormative ? (
        <ResultDisclosure
          title="Normativa"
          subtitle="Fundamentos aplicados"
          badge={String(display.normativeItems.length)}
        >
          <NormativeCompact items={display.normativeItems} />
        </ResultDisclosure>
      ) : null}

      {hasWarnings ? (
        <ResultDisclosure
          title="Advertencias"
          subtitle="Puntos para revisar"
          badge={String(warnings.length)}
          tone="alert"
        >
          <LegalWarnings items={warnings} guard={normalized.hallucination_guard} />
        </ResultDisclosure>
      ) : null}

      {!isClarificationMode && display.confidenceExplained ? (
        <ResultDisclosure
          title="Por que esta orientacion va por aca"
        >
          <p className={styles.panelText}>{display.confidenceExplained}</p>
        </ResultDisclosure>
      ) : null}

      {hasProfessionalMode ? (
        <ResultDisclosure
          title="Detalle profesional"
          subtitle="Estrategia y soporte tecnico"
          tone="accent"
        >
          <div className={styles.resultsStack}>
            <section className={`${styles.panel} ${styles.resultsSection}`}>
              <h4 className={styles.panelTitle}>Resumen profesional</h4>
              <p className={styles.panelText}>
                {professionalMode.summary || 'No se devolvio resumen profesional adicional.'}
              </p>
            </section>

            {display.professionalJudgmentHighlights?.length ? (
              <section className={`${styles.panel} ${styles.resultsSection}`}>
                <h4 className={styles.panelTitle}>Juicio profesional aplicado</h4>
                <CompactList items={display.professionalJudgmentHighlights} />
              </section>
            ) : null}

            {decisionTransparencySummary.applies ? (
              <section className={`${styles.panel} ${styles.resultsSection}`}>
                <h4 className={styles.panelTitle}>Transparencia de decision</h4>
                {decisionTransparencySummary.decisionExplanation ? (
                  <p className={styles.panelText}>
                    {decisionTransparencySummary.decisionExplanation}
                  </p>
                ) : null}
                {decisionTransparencySummary.drivingSignals?.length ? (
                  <>
                    <h5 className={styles.panelSubtitle}>Que sostiene esta orientacion</h5>
                    <CompactList items={decisionTransparencySummary.drivingSignals} />
                  </>
                ) : null}
                {decisionTransparencySummary.limitingSignals?.length ? (
                  <>
                    <h5 className={styles.panelSubtitle}>Que hoy la limita</h5>
                    <CompactList items={decisionTransparencySummary.limitingSignals} />
                  </>
                ) : null}
                {decisionTransparencySummary.confidenceSummary ? (
                  <p className={styles.panelText}>
                    {decisionTransparencySummary.confidenceSummary}
                  </p>
                ) : null}
                {decisionTransparencySummary.visibleAlternatives?.length ? (
                  <>
                    <h5 className={styles.panelSubtitle}>Alternativas no priorizadas</h5>
                    <ul className={styles.compactList}>
                      {decisionTransparencySummary.visibleAlternatives.map((item, index) => (
                        <li
                          key={`${item.option || item.reason}-${index}`}
                          className={styles.compactItem}
                        >
                          <strong>{item.option || 'Alternativa'}:</strong> {item.reason}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            ) : null}

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
          title="Texto completo"
          subtitle="Salida original"
        >
          <p className={styles.panelText}>{display.rawResponseText}</p>
        </ResultDisclosure>
      ) : null}

      <ResultDisclosure title="Exportar o copiar" subtitle="Opciones de salida">
        <LegalQueryExportActions response={normalized} requestContext={requestContext} />
      </ResultDisclosure>
    </article>
  );
}
