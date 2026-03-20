const AUTH_STORAGE_KEY = 'ailex:auth-session:v1';

function browserWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeUser(user = {}) {
  const source = asObject(user);
  const id = String(source.id || '').trim();

  if (!id) {
    return null;
  }

  return {
    id,
    email: String(source.email || '').trim(),
    nombre: String(source.nombre || '').trim(),
    is_active: Boolean(source.is_active),
    created_at: String(source.created_at || ''),
  };
}

export function normalizeAuthSession(value = {}) {
  const source = asObject(value);
  const accessToken = String(
    source.access_token || source.token || source.accessToken || '',
  ).trim();
  const user = normalizeUser(source.user);

  return {
    access_token: accessToken,
    token_type: String(source.token_type || 'bearer'),
    user,
    is_authenticated: Boolean(accessToken && user?.id),
  };
}

export function readAuthSession() {
  const browser = browserWindow();
  if (!browser) {
    return normalizeAuthSession();
  }

  try {
    const raw = browser.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return normalizeAuthSession();
    }

    return normalizeAuthSession(JSON.parse(raw));
  } catch {
    return normalizeAuthSession();
  }
}

export function writeAuthSession(value = {}) {
  const browser = browserWindow();
  const normalized = normalizeAuthSession(value);

  if (browser) {
    browser.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function clearAuthSession() {
  const browser = browserWindow();
  if (browser) {
    browser.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return normalizeAuthSession();
}

export function getStoredAccessToken() {
  return readAuthSession().access_token;
}
