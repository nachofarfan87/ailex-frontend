import { normalizeLegalQueryResponse } from './legalQuery';

const STORAGE_KEY = 'ailex:legal-query-workspace:v1';
const LEGACY_STORAGE_KEY = 'ailex:legal-query-history:v1';
const MAX_ITEMS = 50;
const DEFAULT_EXPEDIENTE_ID = 'expediente-default';

function browserWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function createDefaultExpediente() {
  return {
    id: DEFAULT_EXPEDIENTE_ID,
    name: 'Expediente general',
    created_at: new Date().toISOString(),
    is_default: true,
  };
}

function createEmptyWorkspace() {
  const defaultExpediente = createDefaultExpediente();
  return {
    expedientes: [defaultExpediente],
    active_expediente_id: defaultExpediente.id,
    entries: [],
  };
}

export function createHistoryEntry(requestPayload = {}, responsePayload = {}, expedienteId = DEFAULT_EXPEDIENTE_ID) {
  const request = asObject(requestPayload);
  const response = normalizeLegalQueryResponse(responsePayload);

  return {
    id: `legal-query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expediente_id: expedienteId,
    created_at: new Date().toISOString(),
    request: {
      query: String(request.query || response.query || ''),
      jurisdiction: String(request.jurisdiction || response.jurisdiction || 'jujuy'),
      forum: String(request.forum || response.forum || 'civil'),
      top_k:
        typeof request.top_k === 'number'
          ? request.top_k
          : Number.parseInt(request.top_k, 10) || 5,
      document_mode: String(request.document_mode || 'estrategia'),
      facts: asObject(request.facts),
    },
    response,
  };
}

export function normalizeHistoryEntry(value, fallbackExpedienteId = DEFAULT_EXPEDIENTE_ID) {
  const item = asObject(value);
  const request = asObject(item.request);
  const response = normalizeLegalQueryResponse(asObject(item.response));
  const query = String(request.query || response.query || '').trim();

  if (!query) return null;

  return {
    id: String(item.id || `history-${query.slice(0, 12)}`),
    expediente_id: String(item.expediente_id || fallbackExpedienteId),
    created_at: String(item.created_at || new Date().toISOString()),
    request: {
      query,
      jurisdiction: String(request.jurisdiction || response.jurisdiction || 'jujuy'),
      forum: String(request.forum || response.forum || 'civil'),
      top_k:
        typeof request.top_k === 'number'
          ? request.top_k
          : Number.parseInt(request.top_k, 10) || 5,
      document_mode: String(request.document_mode || 'estrategia'),
      facts: asObject(request.facts),
    },
    response,
  };
}

function normalizeExpediente(value) {
  const item = asObject(value);
  return {
    id: String(item.id || `expediente-${Date.now()}`),
    name: String(item.name || 'Expediente sin nombre').trim() || 'Expediente sin nombre',
    created_at: String(item.created_at || new Date().toISOString()),
    is_default: Boolean(item.is_default),
  };
}

function normalizeWorkspaceState(value) {
  const raw = asObject(value);
  const fallback = createEmptyWorkspace();

  const expedientes = asArray(raw.expedientes)
    .map((item) => normalizeExpediente(item))
    .filter(Boolean);

  const hasDefault = expedientes.some((item) => item.id === DEFAULT_EXPEDIENTE_ID);
  const nextExpedientes = hasDefault
    ? expedientes
    : [createDefaultExpediente(), ...expedientes.filter((item) => item.id !== DEFAULT_EXPEDIENTE_ID)];

  const entries = asArray(raw.entries)
    .map((item) => normalizeHistoryEntry(item))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  const activeExpedienteId = nextExpedientes.some((item) => item.id === raw.active_expediente_id)
    ? raw.active_expediente_id
    : fallback.active_expediente_id;

  return {
    expedientes: nextExpedientes,
    active_expediente_id: activeExpedienteId,
    entries,
  };
}

function migrateLegacyHistory(browser) {
  const legacyRaw = browser.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) return createEmptyWorkspace();

  const base = createEmptyWorkspace();
  const migratedEntries = asArray(JSON.parse(legacyRaw))
    .map((item) => normalizeHistoryEntry(item, DEFAULT_EXPEDIENTE_ID))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);

  const next = {
    ...base,
    entries: migratedEntries,
  };

  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  browser.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return next;
}

export function readLegalQueryWorkspace() {
  const browser = browserWindow();
  if (!browser) return createEmptyWorkspace();

  try {
    const raw = browser.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return migrateLegacyHistory(browser);
    }

    return normalizeWorkspaceState(JSON.parse(raw));
  } catch {
    return createEmptyWorkspace();
  }
}

export function readLegalQueryHistory() {
  return readLegalQueryWorkspace().entries;
}

export function writeLegalQueryWorkspace(state) {
  const browser = browserWindow();
  if (!browser) return createEmptyWorkspace();

  const normalized = normalizeWorkspaceState(state);
  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function listEntriesForExpediente(state, expedienteId) {
  return normalizeWorkspaceState(state).entries.filter((item) => item.expediente_id === expedienteId);
}

export function pushLegalQueryHistory(entry, expedienteId) {
  const workspace = readLegalQueryWorkspace();
  const normalizedEntry = normalizeHistoryEntry(
    {
      ...entry,
      expediente_id: expedienteId || entry?.expediente_id || workspace.active_expediente_id,
    },
    workspace.active_expediente_id,
  );
  if (!normalizedEntry) return workspace;

  const next = {
    ...workspace,
    entries: [
      normalizedEntry,
      ...workspace.entries.filter((item) => item.id !== normalizedEntry.id),
    ].slice(0, MAX_ITEMS),
  };

  return writeLegalQueryWorkspace(next);
}

export function createExpediente(name) {
  const workspace = readLegalQueryWorkspace();
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    return workspace;
  }

  const expediente = {
    id: `expediente-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    created_at: new Date().toISOString(),
    is_default: false,
  };

  return writeLegalQueryWorkspace({
    ...workspace,
    expedientes: [expediente, ...workspace.expedientes],
    active_expediente_id: expediente.id,
  });
}

export function renameExpediente(expedienteId, name) {
  const workspace = readLegalQueryWorkspace();
  const cleanName = String(name || '').trim();
  if (!cleanName) return workspace;

  return writeLegalQueryWorkspace({
    ...workspace,
    expedientes: workspace.expedientes.map((item) =>
      item.id === expedienteId ? { ...item, name: cleanName } : item,
    ),
  });
}

export function setActiveExpediente(expedienteId) {
  const workspace = readLegalQueryWorkspace();
  if (!workspace.expedientes.some((item) => item.id === expedienteId)) {
    return workspace;
  }

  return writeLegalQueryWorkspace({
    ...workspace,
    active_expediente_id: expedienteId,
  });
}

export function deleteExpediente(expedienteId) {
  const workspace = readLegalQueryWorkspace();
  if (expedienteId === DEFAULT_EXPEDIENTE_ID) {
    return workspace;
  }

  const exists = workspace.expedientes.some((item) => item.id === expedienteId);
  if (!exists) {
    return workspace;
  }

  return writeLegalQueryWorkspace({
    expedientes: workspace.expedientes.filter((item) => item.id !== expedienteId),
    active_expediente_id:
      workspace.active_expediente_id === expedienteId
        ? DEFAULT_EXPEDIENTE_ID
        : workspace.active_expediente_id,
    entries: workspace.entries.map((item) =>
      item.expediente_id === expedienteId
        ? { ...item, expediente_id: DEFAULT_EXPEDIENTE_ID }
        : item,
    ),
  });
}

export function getActiveExpediente(state) {
  const workspace = normalizeWorkspaceState(state);
  return (
    workspace.expedientes.find((item) => item.id === workspace.active_expediente_id) ||
    workspace.expedientes[0] ||
    createDefaultExpediente()
  );
}

export function formatHistoryTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
