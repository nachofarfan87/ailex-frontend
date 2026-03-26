'use client';

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import AuthPanel from './components/legal-query/AuthPanel';
import LegalQueryContext from './components/legal-query/LegalQueryContext';
import LegalQueryForm from './components/legal-query/LegalQueryForm';
import LegalQueryHistory from './components/legal-query/LegalQueryHistory';
import LegalQueryResults from './components/legal-query/LegalQueryResults';
import styles from './components/legal-query/LegalQuery.module.css';
import {
  assignConsultaExpediente,
  createRemoteExpediente,
  deleteRemoteExpediente,
  getConsulta,
  getCurrentUser,
  legalQuery,
  listConsultas,
  listExpedientes,
  loginAuth,
  registerAuth,
  updateRemoteExpediente,
} from './lib/api';
import { clearAuthSession, readAuthSession, writeAuthSession } from './lib/authSession';
import {
  collectLegalWarnings,
  compactText,
  formatConfidence,
  normalizeLegalQueryResponse,
} from './lib/legalQuery';
import { adaptLegalResultForDisplay } from './lib/legalResultAdapter';
import {
  buildRemoteWorkspace,
  createRemoteDefaultExpediente,
  normalizeRemoteConsultaDetail,
  REMOTE_DEFAULT_EXPEDIENTE_ID,
  resolveRemoteExpedienteId,
} from './lib/legalPersistence';
import {
  DEFAULT_LEGAL_QUERY_CONTEXT,
  readLegalQueryContext,
  writeLegalQueryContext,
} from './lib/legalQueryPreferences';

const USE_EXPEDIENT_CONTEXT = false;

const GUEST_QUERY_LIMIT = 5;
const GUEST_QUERY_STORAGE_KEY = 'ailex_guest_query_count';

function getGuestQueryCount() {
  try {
    return Number(localStorage.getItem(GUEST_QUERY_STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function incrementGuestQueryCount() {
  try {
    const next = getGuestQueryCount() + 1;
    localStorage.setItem(GUEST_QUERY_STORAGE_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

const SUGGESTIONS = [
  'plazo para contestar demanda',
  'art 34 cpcc jujuy',
  'garantia de defensa en juicio',
  'buena fe contractual',
  'despido indemnizacion trabajador',
];

const EMPTY_SESSION = {
  access_token: '',
  token_type: 'bearer',
  user: null,
  is_authenticated: false,
};

const EMPTY_WORKSPACE = {
  expedientes: [],
  active_expediente_id: '',
  entries: [],
};

function safeParseExpedientePartes(partesJson) {
  const raw = String(partesJson || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0) {
      return null;
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function pruneEmptyValues(value) {
  if (Array.isArray(value)) {
    const nextItems = value
      .map((item) => pruneEmptyValues(item))
      .filter((item) => item !== null && item !== undefined);
    return nextItems.length ? nextItems : null;
  }

  if (value && typeof value === 'object') {
    const nextObject = Object.entries(value).reduce((accumulator, [key, current]) => {
      const normalized = pruneEmptyValues(current);
      if (
        normalized === null ||
        normalized === undefined ||
        normalized === '' ||
        (Array.isArray(normalized) && normalized.length === 0)
      ) {
        return accumulator;
      }

      if (
        normalized &&
        typeof normalized === 'object' &&
        !Array.isArray(normalized) &&
        Object.keys(normalized).length === 0
      ) {
        return accumulator;
      }

      accumulator[key] = normalized;
      return accumulator;
    }, {});

    return Object.keys(nextObject).length ? nextObject : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return value ?? null;
}

function buildExpedienteContextPayload(expediente) {
  if (!expediente || expediente.is_default) {
    return { facts: {}, metadata: {} };
  }

  const partes = safeParseExpedientePartes(expediente.partes_json);

  const facts = pruneEmptyValues({
    expediente: {
      caratula: expediente.caratula,
      numero: expediente.numero,
      partes,
      hechos_relevantes: expediente.hechos_relevantes,
      pretension_principal: expediente.pretension_principal,
    },
  });

  const metadata = pruneEmptyValues({
    expediente_context: {
      expediente_id: expediente.id,
      titulo: expediente.name,
      jurisdiccion: expediente.jurisdiction,
      materia: expediente.materia || expediente.forum,
      juzgado: expediente.juzgado,
      tipo_caso: expediente.tipo_caso,
      subtipo_caso: expediente.subtipo_caso,
      estado_procesal: expediente.estado_procesal,
      riesgos_clave: expediente.riesgos_clave,
      estrategia_base: expediente.estrategia_base,
      proxima_accion_sugerida: expediente.proxima_accion_sugerida,
    },
  });

  return {
    facts: facts || {},
    metadata: metadata || {},
  };
}

function UserMessage({ query, metadata }) {
  return (
    <div className="message message--user">
      <div className="message__bubble">
        <div className={styles.messageBody}>
          <span className={styles.messageLabel}>Consulta</span>
          <p className={styles.messageQuery}>{query}</p>
          <div className={styles.assistantMeta}>
            <span className={styles.pill}>{metadata.jurisdiction}</span>
            <span className={styles.pill}>{metadata.forum}</span>
            <span className={styles.pill}>{metadata.document_mode || 'estrategia'}</span>
            <span className={styles.pill}>Top {metadata.top_k}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantErrorMessage({ error }) {
  return (
    <div className="message message--assistant">
      <div className="message__avatar">AI</div>
      <div className="message__bubble">
        <div className={styles.errorBox}>
          <strong>Error de red o backend</strong>
          <span>{error || 'No se pudo obtener respuesta del motor juridico real.'}</span>
        </div>
      </div>
    </div>
  );
}

function AssistantResponseMessage({ response, requestContext }) {
  return (
    <div className="message message--assistant">
      <div className="message__avatar">AI</div>
      <div className="message__bubble">
        <LegalQueryResults response={response} requestContext={requestContext} />
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="message message--assistant">
      <div className="message__avatar">AI</div>
      <div className="message__bubble">
        <div className={styles.threadLoading} role="status" aria-live="polite">
          Analizando la consulta contra `/api/legal-query`...
        </div>
      </div>
    </div>
  );
}

function WorkspaceCard({ response, index }) {
  const warnings = collectLegalWarnings(response);
  const display = adaptLegalResultForDisplay(response);
  const topFoundation = response.reasoning.normative_foundations[0];

  return (
    <article className={styles.workspaceCard}>
      <div className={styles.workspaceHead}>
        <div>
          <span className={styles.eyebrow}>Consulta {index + 1}</span>
          <h3 className={styles.workspaceTitle}>{response.query || 'Consulta juridica'}</h3>
        </div>
        <span className={`${styles.pill} ${styles.pillStrong}`}>
          {formatConfidence(response.confidence)}
        </span>
      </div>

      <ul className={styles.workspaceList}>
        <li className={styles.strategyItem}>
          <p className={styles.panelText}>
            {compactText(
              display.quickStart ||
                display.summary ||
                response.reasoning.short_answer ||
                response.reasoning.case_analysis ||
                'Respuesta breve no informada.',
              160,
            )}
          </p>
        </li>

        <li className={styles.strategyItem}>
          <p className={styles.panelText}>
            Fundamento principal:{' '}
            {topFoundation
              ? compactText(
                  typeof topFoundation === 'string'
                    ? topFoundation
                    : topFoundation.label ||
                        topFoundation.title ||
                        topFoundation.titulo ||
                        topFoundation.article ||
                        topFoundation.source_id,
                  96,
                )
              : 'No informado.'}
          </p>
        </li>

        <li className={styles.strategyItem}>
          <p className={styles.panelText}>
            Advertencias: {warnings.length ? warnings.length : 'sin alertas'}.
          </p>
        </li>
      </ul>
    </article>
  );
}

function AuthDrawer({
  session,
  loading,
  authBusy,
  visible,
  onClose,
  onLogin,
  onRegister,
  onLogout,
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className={styles.drawerOverlay} onClick={onClose} role="presentation">
      <aside
        className={styles.authDrawer}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Acceso a AILEX"
      >
        <div className={styles.authDrawerHeader}>
          <div>
            <span className={styles.eyebrow}>Cuenta</span>
            <h3 className={styles.utilityDrawerTitle}>
              {session.is_authenticated ? 'Sesion activa' : 'Acceso a AILEX'}
            </h3>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className={styles.authDrawerBody}>
          <AuthPanel
            session={session}
            loading={loading}
            authBusy={authBusy}
            onLogin={onLogin}
            onRegister={onRegister}
            onLogout={onLogout}
          />
        </div>
      </aside>
    </div>
  );
}

function UtilityPanel({
  title,
  eyebrow,
  description,
  children,
  onClose,
}) {
  return (
    <aside className={styles.utilityDrawer}>
      <div className={styles.utilityDrawerHeader}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h3 className={styles.utilityDrawerTitle}>{title}</h3>
          {description ? <p className={styles.utilityDrawerText}>{description}</p> : null}
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className={styles.utilityDrawerBody}>{children}</div>
    </aside>
  );
}

function upsertWorkspaceEntry(previousState, nextEntry) {
  return {
    ...previousState,
    entries: [nextEntry, ...previousState.entries.filter((item) => item.id !== nextEntry.id)],
  };
}

export default function ChatPage() {
  const bottomRef = useRef(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [status, setStatus] = useState('Motor juridico real conectado.');
  const [session, setSession] = useState(EMPTY_SESSION);
  const [workspaceState, setWorkspaceState] = useState(EMPTY_WORKSPACE);
  const [activeHistoryId, setActiveHistoryId] = useState('');
  const [workContext, setWorkContext] = useState(DEFAULT_LEGAL_QUERY_CONTEXT);
  const [activeUtility, setActiveUtility] = useState('');

  const deferredTurns = useDeferredValue(turns);
  const hasConversation = turns.length > 0;
  const isAuthenticated = Boolean(session.is_authenticated && session.user?.id);
  const activeExpediente = useMemo(
    () =>
      workspaceState.expedientes.find(
        (item) => item.id === workspaceState.active_expediente_id,
      ) ||
      workspaceState.expedientes[0] ||
      createRemoteDefaultExpediente(),
    [workspaceState],
  );
  const activeHistoryItems = useMemo(
    () =>
      workspaceState.entries.filter((item) => item.expediente_id === activeExpediente.id),
    [workspaceState.entries, activeExpediente.id],
  );
  const entryCounts = useMemo(
    () =>
      workspaceState.entries.reduce((accumulator, item) => {
        const next = { ...accumulator };
        next[item.expediente_id] = (next[item.expediente_id] || 0) + 1;
        return next;
      }, {}),
    [workspaceState.entries],
  );
  const workspaceResponses = useMemo(
    () =>
      deferredTurns
        .filter((turn) => turn.role === 'assistant' && turn.response)
        .map((turn) => turn.response)
        .slice(-3)
        .reverse(),
    [deferredTurns],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  async function syncRemoteWorkspace(preferredActiveExpedienteId = '') {
    const [expedientesResponse, consultasResponse] = await Promise.all([
      listExpedientes({ limit: 100 }),
      listConsultas({ limit: 100 }),
    ]);

    const nextWorkspace = buildRemoteWorkspace({
      expedientes: expedientesResponse.items,
      consultas: consultasResponse.items,
      activeExpedienteId: preferredActiveExpedienteId,
    });

    setWorkspaceState(nextWorkspace);
    return nextWorkspace;
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const storedSession = readAuthSession();

      if (!mounted) return;

      setWorkContext(readLegalQueryContext());

      if (!storedSession.is_authenticated) {
        setStatus('Puedes probar AILEX sin iniciar sesion. El acceso libre esta limitado para la beta.');
        return;
      }

      setAuthBusy(true);

      try {
        const user = await getCurrentUser();
        if (!mounted) return;

        const nextSession = writeAuthSession({
          ...storedSession,
          user,
        });

        setSession(nextSession);
        await syncRemoteWorkspace();
        if (mounted) {
          setStatus('Sesion restaurada. Historial y expedientes cargados desde backend.');
        }
      } catch {
        if (!mounted) return;
        clearAuthSession();
        setSession(EMPTY_SESSION);
        setStatus('No se pudo restaurar la sesion. Inicia sesion nuevamente.');
      } finally {
        if (mounted) {
          setAuthBusy(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  function handleContextChange(nextContext) {
    const persisted = writeLegalQueryContext(nextContext);
    setWorkContext(persisted);
    setStatus('Contexto de trabajo guardado localmente.');
  }

  async function handleLogin(credentials) {
    setAuthBusy(true);

    try {
      const payload = await loginAuth(credentials);
      const nextSession = writeAuthSession(payload);
      setSession(nextSession);
      await syncRemoteWorkspace();
      setActiveHistoryId('');
      setStatus('Sesion iniciada. La persistencia real ahora usa backend.');
      setActiveUtility('');
    } catch (error) {
      setStatus(error.message || 'No se pudo iniciar sesion.');
      throw error;
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(credentials) {
    setAuthBusy(true);

    try {
      const payload = await registerAuth(credentials);
      const nextSession = writeAuthSession(payload);
      setSession(nextSession);
      await syncRemoteWorkspace();
      setActiveHistoryId('');
      setStatus('Cuenta creada. La persistencia real ahora usa backend.');
      setActiveUtility('');
    } catch (error) {
      setStatus(error.message || 'No se pudo crear la cuenta.');
      throw error;
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    setSession(EMPTY_SESSION);
    setWorkspaceState(EMPTY_WORKSPACE);
    setActiveHistoryId('');
    startTransition(() => {
      setTurns([]);
    });
    setStatus('Sesion cerrada. Puedes seguir consultando como invitado.');
    setActiveUtility('account');
  }

  async function handleCreateExpediente(name) {
    if (!isAuthenticated) return;

    setWorkspaceBusy(true);

    try {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) {
        return;
      }

      const created = await createRemoteExpediente({
        titulo: normalizedName,
        jurisdiccion: workContext.jurisdiction,
        materia: workContext.forum,
        partes_json: '[]',
      });
      await syncRemoteWorkspace(created.id);
      setStatus('Expediente creado en backend.');
    } catch (error) {
      setStatus(error.message || 'No se pudo crear el expediente.');
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleSelectExpediente(expedienteId) {
    setActiveHistoryId('');

    if (!isAuthenticated) return;

    setWorkspaceState((previous) => ({
      ...previous,
      active_expediente_id: expedienteId,
    }));
    setStatus('Expediente activo actualizado.');
  }

  async function handleRenameExpediente(expedienteId, name) {
    const cleanName = String(name || '').trim();
    if (!cleanName || !isAuthenticated) return;

    setWorkspaceBusy(true);

    try {
      await updateRemoteExpediente(expedienteId, { titulo: cleanName });
      await syncRemoteWorkspace(
        activeExpediente.id === expedienteId
          ? expedienteId
          : workspaceState.active_expediente_id,
      );
      setStatus('Expediente renombrado.');
    } catch (error) {
      setStatus(error.message || 'No se pudo renombrar el expediente.');
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleUpdateExpediente(expedienteId, fields) {
    if (!isAuthenticated || !expedienteId) return;

    setWorkspaceBusy(true);

    try {
      await updateRemoteExpediente(expedienteId, fields);
      await syncRemoteWorkspace(expedienteId);
      setStatus('Contexto del expediente actualizado.');
    } catch (error) {
      setStatus(error.message || 'No se pudo actualizar el expediente.');
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleDeleteExpediente(expedienteId) {
    if (!isAuthenticated) return;

    setWorkspaceBusy(true);

    try {
      const affectedEntries = workspaceState.entries.filter(
        (item) => item.expediente_id === expedienteId,
      );

      await Promise.all(
        affectedEntries.map((item) => assignConsultaExpediente(item.id, null)),
      );
      await deleteRemoteExpediente(expedienteId);
      await syncRemoteWorkspace(REMOTE_DEFAULT_EXPEDIENTE_ID);
      setActiveHistoryId('');
      setStatus('Expediente archivado. Sus consultas quedaron en General.');
    } catch (error) {
      setStatus(error.message || 'No se pudo eliminar el expediente.');
    } finally {
      setWorkspaceBusy(false);
    }
  }

  async function handleSubmit(payload) {
    if (loading) return false;

    if (!isAuthenticated && getGuestQueryCount() >= GUEST_QUERY_LIMIT) {
      setStatus('Has alcanzado el limite de consultas de prueba. Inicia sesion para seguir usando AILEX.');
      setActiveUtility('account');
      return false;
    }

    const expedienteContext = buildExpedienteContextPayload(activeExpediente);
    const effectivePayload = {
      ...payload,
      jurisdiction: workContext.jurisdiction,
      forum: workContext.forum,
      document_mode: workContext.document_mode,
      top_k: workContext.top_k,
      facts: USE_EXPEDIENT_CONTEXT
        ? {
            ...(payload.facts || {}),
            ...(expedienteContext.facts || {}),
          }
        : {
            ...(payload.facts || {}),
          },
      metadata: USE_EXPEDIENT_CONTEXT
        ? {
            ...(payload.metadata || {}),
            ...(expedienteContext.metadata || {}),
          }
        : {
            ...(payload.metadata || {}),
          },
    };

    const userTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      query: effectivePayload.query,
      metadata: {
        jurisdiction: effectivePayload.jurisdiction,
        forum: effectivePayload.forum,
        document_mode: effectivePayload.document_mode,
        top_k: effectivePayload.top_k,
      },
    };

    startTransition(() => {
      setTurns((previous) => [...previous, userTurn]);
    });

    setLoading(true);
    setStatus('Consultando el backend juridico...');

    try {
      const rawResponse = await legalQuery(effectivePayload);
      const response = normalizeLegalQueryResponse(rawResponse);
      const savedConsultaId = rawResponse.saved_consulta_id || '';

      startTransition(() => {
        setTurns((previous) => [
          ...previous,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            response,
            requestContext: effectivePayload,
          },
        ]);
      });

      if (!isAuthenticated) {
        incrementGuestQueryCount();
      }

      if (savedConsultaId) {
        setWorkspaceBusy(true);

        try {
          const targetExpedienteId = resolveRemoteExpedienteId(activeExpediente.id);

          if (targetExpedienteId) {
            await assignConsultaExpediente(savedConsultaId, targetExpedienteId);
          }

          await syncRemoteWorkspace(workspaceState.active_expediente_id);
          setActiveHistoryId(savedConsultaId);
        } catch {
          setStatus('Respuesta recibida, pero no se pudo sincronizar el historial.');
        } finally {
          setWorkspaceBusy(false);
        }
      }

      if (response.is_empty) {
        setStatus('Respuesta vacia del backend. Revisar consulta o disponibilidad de datos.');
      } else if (response.is_partial) {
        setStatus('Respuesta parcial recibida. Se mostraron solo los campos disponibles.');
      } else {
        setStatus(`Consulta guardada en backend dentro de ${activeExpediente.name}.`);
      }

      return true;
    } catch (error) {
      startTransition(() => {
        setTurns((previous) => [
          ...previous,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            error: error.message || 'Error al consultar el backend.',
          },
        ]);
      });
      setStatus('No se pudo completar la consulta juridica.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    startTransition(() => {
      setTurns([]);
    });
    setActiveHistoryId('');
    setStatus('Conversacion reiniciada.');
  }

  async function restoreHistoryItem(item) {
    if (!item || !isAuthenticated) return;

    setWorkspaceBusy(true);

    try {
      const detail = await getConsulta(item.id);
      const nextItem = normalizeRemoteConsultaDetail(detail);
      setWorkspaceState((previous) => ({
        ...upsertWorkspaceEntry(previous, nextItem),
        active_expediente_id: nextItem.expediente_id || REMOTE_DEFAULT_EXPEDIENTE_ID,
      }));

      const restoredResponse = normalizeLegalQueryResponse(nextItem.response);

      startTransition(() => {
        setTurns([
          {
            id: `history-user-${nextItem.id}`,
            role: 'user',
            query: nextItem.request.query,
            metadata: {
              jurisdiction: nextItem.request.jurisdiction,
              forum: nextItem.request.forum,
              document_mode: nextItem.request.document_mode,
              top_k: nextItem.request.top_k,
            },
          },
          {
            id: `history-assistant-${nextItem.id}`,
            role: 'assistant',
            response: restoredResponse,
            requestContext: nextItem.request,
          },
        ]);
      });

      setActiveHistoryId(nextItem.id);
      setStatus('Consulta restaurada desde backend.');
    } catch (error) {
      setStatus(error.message || 'No se pudo reabrir la consulta guardada.');
    } finally {
      setWorkspaceBusy(false);
    }
  }

  const combinedBusy = loading || workspaceBusy || authBusy;
  const isAuthDrawerOpen = activeUtility === 'account';
  const sessionButtonLabel = isAuthenticated ? 'Sesion activa' : 'Ingresar';

  const guestQueryCount = !isAuthenticated ? getGuestQueryCount() : 0;
  const guestLimitReached = !isAuthenticated && guestQueryCount >= GUEST_QUERY_LIMIT;
  const formStatus = guestLimitReached
    ? 'Has alcanzado el limite de consultas de prueba. Inicia sesion para seguir usando AILEX.'
    : !isAuthenticated && !authBusy
      ? `Beta abierta — ${GUEST_QUERY_LIMIT - guestQueryCount} consultas restantes. Inicia sesion para acceso completo.`
      : '';

  function toggleUtility(panel) {
    setActiveUtility((previous) => (previous === panel ? '' : panel));
  }

  function renderUtilityContent() {
    if (activeUtility === 'history') {
      return (
        <UtilityPanel
          eyebrow="Expedientes"
          title={activeExpediente.name || 'Carpetas de trabajo'}
          description="Las consultas previas quedan agrupadas por expediente y pueden reabrirse desde aqui."
          onClose={() => setActiveUtility('')}
        >
          <LegalQueryHistory
            expedientes={workspaceState.expedientes}
            activeExpedienteId={activeExpediente.id}
            items={activeHistoryItems}
            entryCounts={entryCounts}
            activeEntryId={activeHistoryId}
            busy={combinedBusy}
            onSelectEntry={restoreHistoryItem}
            onSelectExpediente={handleSelectExpediente}
            onCreateExpediente={handleCreateExpediente}
            onRenameExpediente={handleRenameExpediente}
            onDeleteExpediente={handleDeleteExpediente}
            onSaveExpediente={handleUpdateExpediente}
            emptyLabel="Las consultas del expediente activo se cargan desde backend."
          />
        </UtilityPanel>
      );
    }

    if (activeUtility === 'context') {
      return (
        <UtilityPanel
          eyebrow="Contexto"
          title="Preferencias de trabajo"
          description="Jurisdiccion, fuero, modo documental y recuperacion para nuevas consultas."
          onClose={() => setActiveUtility('')}
        >
          <div className={styles.secondarySurface}>
            <LegalQueryContext
              context={workContext}
              onChange={handleContextChange}
              disabled={combinedBusy}
            />
          </div>
        </UtilityPanel>
      );
    }

    if (activeUtility === 'workspace') {
      return (
        <UtilityPanel
          eyebrow="Resumen"
          title="Superficie auxiliar"
          description="Vista compacta de las ultimas respuestas para seguir trabajando sin saturar la pantalla."
          onClose={() => setActiveUtility('')}
        >
          <div className={styles.workspace}>
            {workspaceResponses.length ? (
              workspaceResponses.map((response, index) => (
                <WorkspaceCard
                  key={`${response.query || 'workspace'}-${index}`}
                  response={response}
                  index={index}
                />
              ))
            ) : (
              <div className={styles.secondarySurface}>
                <p className={styles.emptyNote}>Todavia no hay resultados juridicos disponibles.</p>
              </div>
            )}
          </div>
        </UtilityPanel>
      );
    }

    return null;
  }

  return (
    <div className="workspace chat-page">
      <div className={styles.chatShell}>
        <section className={`surface-panel chat-stage ${styles.chatPrimary}`}>
          <div className={styles.topAccessBar}>
            <button
              type="button"
              className={styles.accessButton}
              onClick={() => toggleUtility('account')}
            >
              <span className={styles.accessButtonLabel}>{sessionButtonLabel}</span>
            </button>
          </div>

          {!hasConversation ? (
            <div className={styles.heroStage}>
              <div className={styles.heroCopyCompact}>
                <h1 className={styles.heroTitle}>AILEX</h1>
                <p className={styles.heroText}>Asistente Juridico Avanzado</p>
              </div>

              <LegalQueryForm
                onSubmit={handleSubmit}
                context={workContext}
                onContextChange={handleContextChange}
                loading={loading}
                disabled={guestLimitReached}
                centered
                status={formStatus}
                suggestions={SUGGESTIONS}
                showContext={false}
              />
            </div>
          ) : (
            <div className={styles.threadStage}>
              <div className={styles.threadHeader}>
                <div className={styles.threadHeaderCopy}>
                  <h2 className={styles.threadTitle}>AILEX</h2>
                  <p className={styles.threadSummary}>Asistente Juridico Avanzado</p>
                </div>
              </div>

              <div className={styles.threadViewport}>
                <div className="chat-thread">
                  {turns.map((turn) =>
                    turn.role === 'user' ? (
                      <UserMessage key={turn.id} query={turn.query} metadata={turn.metadata} />
                    ) : turn.error ? (
                      <AssistantErrorMessage key={turn.id} error={turn.error} />
                    ) : (
                      <AssistantResponseMessage
                        key={turn.id}
                        response={turn.response}
                        requestContext={turn.requestContext}
                      />
                    ),
                  )}

                  {loading ? <LoadingMessage /> : null}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className={styles.threadComposer}>
                <LegalQueryForm
                  onSubmit={handleSubmit}
                  context={workContext}
                  onContextChange={handleContextChange}
                  loading={loading}
                  disabled={guestLimitReached}
                  status={formStatus}
                  suggestions={[]}
                  onResetConversation={resetConversation}
                  showReset
                  showContext={false}
                />
              </div>
            </div>
          )}
        </section>

        {renderUtilityContent()}
      </div>

      <AuthDrawer
        session={session}
        loading={loading}
        authBusy={authBusy}
        visible={isAuthDrawerOpen}
        onClose={() => setActiveUtility('')}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
      />
    </div>
  );
}
