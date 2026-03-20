import { normalizeLegalQueryResponse } from './legalQuery';

export const REMOTE_DEFAULT_EXPEDIENTE_ID = 'expediente-remoto-general';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function createRemoteDefaultExpediente() {
  return {
    id: REMOTE_DEFAULT_EXPEDIENTE_ID,
    name: 'General',
    created_at: '',
    is_default: true,
    is_remote_default: true,
    estado: 'activo',
    caratula: '',
    numero: '',
    materia: '',
    juzgado: '',
    jurisdiction: 'jujuy',
    descripcion: '',
    notas_estrategia: '',
    tipo_caso: '',
    subtipo_caso: '',
    partes_json: '[]',
    hechos_relevantes: '',
    pretension_principal: '',
    estado_procesal: '',
    riesgos_clave: '',
    estrategia_base: '',
    proxima_accion_sugerida: '',
    consulta_count: 0,
  };
}

export function resolveRemoteExpedienteId(expedienteId) {
  if (!expedienteId || expedienteId === REMOTE_DEFAULT_EXPEDIENTE_ID) {
    return null;
  }

  return expedienteId;
}

export function normalizeRemoteExpediente(value = {}) {
  const source = asObject(value);

  return {
    id: String(source.id || '').trim(),
    name: String(source.titulo || source.nombre || 'Expediente sin titulo').trim(),
    created_at: String(source.created_at || ''),
    is_default: false,
    is_remote_default: false,
    estado: String(source.estado || 'activo'),
    caratula: String(source.caratula || ''),
    numero: String(source.numero || ''),
    materia: String(source.materia || ''),
    juzgado: String(source.juzgado || ''),
    jurisdiction: String(source.jurisdiccion || 'jujuy'),
    forum: String(source.materia || ''),
    descripcion: String(source.descripcion || ''),
    notas_estrategia: String(source.notas_estrategia || ''),
    tipo_caso: String(source.tipo_caso || ''),
    subtipo_caso: String(source.subtipo_caso || ''),
    partes_json: String(source.partes_json || '[]'),
    hechos_relevantes: String(source.hechos_relevantes || ''),
    pretension_principal: String(source.pretension_principal || ''),
    estado_procesal: String(source.estado_procesal || ''),
    riesgos_clave: String(source.riesgos_clave || ''),
    estrategia_base: String(source.estrategia_base || ''),
    proxima_accion_sugerida: String(source.proxima_accion_sugerida || ''),
    consulta_count:
      typeof source.consulta_count === 'number' ? source.consulta_count : 0,
  };
}

export function normalizeRemoteConsultaSummary(value = {}) {
  const source = asObject(value);
  const response = normalizeLegalQueryResponse({
    query: source.query,
    jurisdiction: source.jurisdiction,
    forum: source.forum,
    confidence: source.confidence,
  });

  return {
    id: String(source.id || '').trim(),
    expediente_id: String(source.expediente_id || REMOTE_DEFAULT_EXPEDIENTE_ID),
    created_at: String(source.created_at || ''),
    request: {
      query: String(source.query || response.query || ''),
      jurisdiction: String(source.jurisdiction || response.jurisdiction || 'jujuy'),
      forum: String(source.forum || response.forum || 'civil'),
      top_k: 5,
      document_mode: String(source.document_mode || 'estrategia'),
      facts: {},
    },
    response,
    notes: String(source.notas || ''),
    title: String(source.titulo || ''),
    is_remote: true,
  };
}

export function normalizeRemoteConsultaDetail(value = {}) {
  const source = asObject(value);
  const rawResult = asObject(source.resultado);
  const response = normalizeLegalQueryResponse({
    ...rawResult,
    query: source.query || rawResult.query,
    jurisdiction: source.jurisdiction || rawResult.jurisdiction,
    forum: source.forum || rawResult.forum,
    generated_document: source.generated_document || rawResult.generated_document,
    warnings: asArray(source.warnings).length ? source.warnings : rawResult.warnings,
    confidence:
      typeof source.confidence === 'number' ? source.confidence : rawResult.confidence,
  });

  return {
    id: String(source.id || '').trim(),
    expediente_id: String(source.expediente_id || REMOTE_DEFAULT_EXPEDIENTE_ID),
    created_at: String(source.created_at || ''),
    request: {
      query: String(source.query || response.query || ''),
      jurisdiction: String(source.jurisdiction || response.jurisdiction || 'jujuy'),
      forum: String(source.forum || response.forum || 'civil'),
      top_k: 5,
      document_mode: String(source.document_mode || 'estrategia'),
      facts: asObject(source.facts),
    },
    response,
    notes: String(source.notas || ''),
    title: String(source.titulo || ''),
    is_remote: true,
  };
}

export function buildRemoteWorkspace({
  expedientes = [],
  consultas = [],
  activeExpedienteId = '',
} = {}) {
  const defaultExpediente = createRemoteDefaultExpediente();
  const visibleExpedientes = asArray(expedientes)
    .map((item) => normalizeRemoteExpediente(item))
    .filter((item) => item.id && item.estado !== 'archivado');
  const entries = asArray(consultas)
    .map((item) => normalizeRemoteConsultaSummary(item))
    .filter((item) => item.id);
  const nextExpedientes = [defaultExpediente, ...visibleExpedientes];
  const safeActiveId = nextExpedientes.some((item) => item.id === activeExpedienteId)
    ? activeExpedienteId
    : defaultExpediente.id;

  return {
    expedientes: nextExpedientes,
    active_expediente_id: safeActiveId,
    entries,
  };
}
