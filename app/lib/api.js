import { clearAuthSession, getStoredAccessToken } from './authSession';

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

class AuthExpiredError extends Error {
  constructor(message = 'Sesion expirada o invalida.') {
    super(message);
    this.name = 'AuthExpiredError';
    this.status = 401;
  }
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const { body, headers, auth = false, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const token = auth ? getStoredAccessToken() : '';
  const authHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const finalHeaders = isFormData
    ? { ...authHeaders, ...headers }
    : { 'Content-Type': 'application/json', ...authHeaders, ...headers };

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body,
  });

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearAuthSession();
      throw new AuthExpiredError();
    }

    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }
    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function inferTextTitle(text = '') {
  const firstMeaningfulLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8);

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.slice(0, 120);
  }

  return 'Documento sin titulo';
}

function mapUploadDocumentType(value) {
  if (['codigo', 'ley', 'reglamento', 'acordada', 'jurisprudencia', 'doctrina', 'escrito', 'modelo', 'estrategia'].includes(value)) {
    return value;
  }

  switch (value) {
    case 'norma':
      return 'norma';
    case 'interno':
      return 'interno';
    default:
      return value || 'automatico';
  }
}

export function workflowNotification(payload) {
  return request('/api/workflow/notification-response', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function legalQuery(payload) {
  return request('/api/legal-query', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function registerAuth(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginAuth(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request('/api/auth/me', {
    auth: true,
  });
}

export function listExpedientes(filters = {}) {
  return request(`/api/expedientes${buildQuery(filters)}`, {
    auth: true,
  });
}

export function createRemoteExpediente(payload) {
  return request('/api/expedientes', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateRemoteExpediente(expedienteId, payload) {
  return request(`/api/expedientes/${expedienteId}`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function deleteRemoteExpediente(expedienteId) {
  return request(`/api/expedientes/${expedienteId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export function listConsultas(filters = {}) {
  return request(`/api/consultas${buildQuery(filters)}`, {
    auth: true,
  });
}

export function getConsulta(consultaId) {
  return request(`/api/consultas/${consultaId}`, {
    auth: true,
  });
}

export function saveConsulta(payload) {
  return request('/api/consultas', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function assignConsultaExpediente(consultaId, expedienteId) {
  return request(`/api/consultas/${consultaId}/expediente`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ expediente_id: expedienteId }),
  });
}

export async function exportLegalQueryDocx(payload) {
  const token = getStoredAccessToken();
  const authHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const response = await fetch(`${BASE}/api/legal-query/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthSession();
      throw new AuthExpiredError();
    }

    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  const filename = filenameMatch?.[1] || 'ailex_resultado_juridico.docx';

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function auditReview(payload) {
  return request('/api/audit/review', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function strategyAnalyze(payload) {
  return request('/api/strategy/analyze', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function searchHybrid(payload) {
  return request('/api/search/hybrid', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function listDocuments(filters = {}) {
  return request(`/api/documents/${buildQuery(filters)}`);
}

export function uploadTextDocument(payload) {
  const formData = new FormData();
  formData.append('text', payload.text);
  formData.append('title', payload.title || inferTextTitle(payload.text));
  formData.append('source_type', mapUploadDocumentType(payload.source_type));
  formData.append('jurisdiction', payload.jurisdiction || '');
  formData.append('legal_area', payload.legal_area || '');
  formData.append('fuero', payload.fuero || '');
  formData.append('court', payload.court || '');
  formData.append('description', payload.description || '');
  formData.append('tags', payload.tags || '');
  formData.append('scope', payload.scope || 'corpus');

  return request('/api/documents/upload/text', {
    method: 'POST',
    body: formData,
  });
}

export function uploadFileDocument(payload) {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('title', payload.title || payload.file.name);
  formData.append('source_type', mapUploadDocumentType(payload.source_type));
  formData.append('jurisdiction', payload.jurisdiction || '');
  formData.append('legal_area', payload.legal_area || '');
  formData.append('fuero', payload.fuero || '');
  formData.append('court', payload.court || '');
  formData.append('description', payload.description || '');
  formData.append('tags', payload.tags || '');
  formData.append('scope', payload.scope || 'corpus');

  return request('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export function uploadCorpusDocument(payload) {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("title", payload.title || payload.file.name);

  const sourceType = mapUploadDocumentType(payload.sourceType || payload.source_type);
  const jurisdiction = payload.jurisdiction || "";
  const legalArea = payload.legalArea || payload.legal_area || "";
  const description = payload.description || "";
  const tags = payload.tags || "";

  formData.append("source_type", sourceType);
  formData.append("jurisdiction", jurisdiction);
  formData.append("legal_area", legalArea);
  formData.append("description", description);
  formData.append("tags", tags);
  formData.append("scope", payload.scope || "corpus");

  return request("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export function updateDocumentScope(documentId, documentScope) {
  return request(`/api/documents/${documentId}/scope`, {
    method: 'POST',
    body: JSON.stringify({ document_scope: documentScope }),
  });
}

export function getHierarchySummary() {
  return request('/api/sources/hierarchy-summary');
}

export function getSourceTypes() {
  return request('/api/sources/types');
}

export function listTemplates(filters = {}) {
  return request(`/api/generation/templates${buildQuery(filters)}`);
}

export function getTemplateMetadata(templateId) {
  return request(`/api/generation/templates/${templateId}`);
}

export function getTemplateDraft(templateId, filters = {}) {
  return request(`/api/generation/templates/${templateId}/draft${buildQuery(filters)}`);
}

export function listVariantes() {
  return request('/api/generation/variantes');
}

export function getJurisdictionProfile() {
  return request('/api/config/jurisdiction');
}

export function getPolicies() {
  return request('/api/config/policies');
}

export function detectIntent(text, options = {}) {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const { hasAttachments = false } = options;
  const has = (terms) => terms.some((term) => normalized.includes(term));
  const asksForAnalysis = has([
    'analiza',
    'analiz',
    'decime',
    'decir',
    'que plazo',
    'que tengo que contestar',
    'que actuacion',
    'que actuacion es esta',
  ]);
  const mentionsNotification = has([
    'notificacion',
    'cedula',
    'providencia',
    'traslado',
    'plazo',
    'vencimiento',
    'contestar',
    'resolucion',
  ]);

  if (has(['revisar', 'corregir', 'hallazgo', 'ambig', 'escrito a revisar'])) {
    return 'audit';
  }

  if (has(['buscar', 'jurisprudencia', 'normativa', 'corpus', 'fuente'])) {
    return 'search';
  }

  if (has(['estrategia', 'tactica', 'alternativa', 'defensa', 'recurso'])) {
    return 'strategy';
  }

  if (mentionsNotification || (hasAttachments && asksForAnalysis)) {
    return 'notification';
  }

  return 'workflow';
}

export async function callByIntent(text, intent) {
  switch (intent) {
    case 'audit':
      return { type: 'audit', data: await auditReview({ text }) };
    case 'strategy':
      return { type: 'strategy', data: await strategyAnalyze({ text }) };
    case 'search':
      return { type: 'search', data: await searchHybrid({ query: text, top_k: 5 }) };
    case 'notification':
      return {
        type: 'notification',
        data: await workflowNotification({ texto: text, generar_borrador: false }),
      };
    default:
      return {
        type: 'workflow',
        data: await workflowNotification({ texto: text, generar_borrador: true }),
      };
  }
}
