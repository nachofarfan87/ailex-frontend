function normalizeAilexEnv(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || ['dev', 'development', 'local', 'test', 'testing'].includes(normalized)) {
    return 'dev';
  }
  if (['beta', 'staging', 'stage'].includes(normalized)) {
    return 'beta';
  }
  if (['prod', 'production'].includes(normalized)) {
    return 'prod';
  }
  return 'dev';
}

function parseGuestQueryLimit(rawValue, ailexEnv) {
  const normalized = String(rawValue ?? '').trim();
  if (normalized !== '') {
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return ailexEnv === 'dev' ? 0 : 5;
}

const AILEX_ENV = normalizeAilexEnv(process.env.NEXT_PUBLIC_AILEX_ENV);
const GUEST_QUERY_LIMIT = parseGuestQueryLimit(process.env.NEXT_PUBLIC_GUEST_QUERY_LIMIT, AILEX_ENV);

function isGuestQueryLimitEnabled() {
  return GUEST_QUERY_LIMIT > 0;
}

function buildGuestAccessMessage(guestQueryCount = 0) {
  if (!isGuestQueryLimitEnabled()) {
    return 'Modo interno activo. Puedes probar AILEX sin limite de consultas.';
  }

  const remaining = Math.max(GUEST_QUERY_LIMIT - Number(guestQueryCount || 0), 0);
  return `Beta abierta - ${remaining} consultas restantes. Inicia sesion para acceso completo.`;
}

function buildGuestLimitReachedMessage() {
  if (!isGuestQueryLimitEnabled()) {
    return 'Modo interno activo. No hay limite de consultas para esta etapa.';
  }
  return 'Has alcanzado el limite de consultas de prueba. Inicia sesion para seguir usando AILEX.';
}

export {
  AILEX_ENV,
  GUEST_QUERY_LIMIT,
  buildGuestAccessMessage,
  buildGuestLimitReachedMessage,
  isGuestQueryLimitEnabled,
};
