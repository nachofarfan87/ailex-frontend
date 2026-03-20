'use client';

import { useState } from 'react';
import styles from './LegalQuery.module.css';

const INITIAL_LOGIN = {
  email: '',
  password: '',
};

const INITIAL_REGISTER = {
  nombre: '',
  email: '',
  password: '',
};

export default function AuthPanel({
  session,
  loading = false,
  authBusy = false,
  onLogin,
  onRegister,
  onLogout,
}) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN);
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER);
  const [error, setError] = useState('');

  const isAuthenticated = Boolean(session?.is_authenticated);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');

    try {
      await onLogin?.(loginForm);
      setLoginForm(INITIAL_LOGIN);
    } catch (nextError) {
      setError(nextError.message || 'No se pudo iniciar sesion.');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError('');

    try {
      await onRegister?.(registerForm);
      setRegisterForm(INITIAL_REGISTER);
    } catch (nextError) {
      setError(nextError.message || 'No se pudo crear la cuenta.');
    }
  }

  if (isAuthenticated) {
    return (
      <section className={styles.authPanel}>
        <div className={styles.authHeader}>
          <div>
            <span className={styles.eyebrow}>Sesion</span>
            <h3 className={styles.authTitle}>Persistencia conectada</h3>
          </div>
          <span className={`${styles.pill} ${styles.pillStrong}`}>JWT activa</span>
        </div>

        <div className={styles.authIdentity}>
          <strong>{session.user?.nombre || 'Usuario AILEX'}</strong>
          <span>{session.user?.email || 'Sin email'}</span>
        </div>

        <div className={styles.authActions}>
          <span className={styles.authHint}>
            Expedientes e historial usan backend como fuente de verdad.
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onLogout}
            disabled={loading || authBusy}
          >
            Cerrar sesion
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.authPanel}>
      <div className={styles.authHeader}>
        <div>
          <span className={styles.eyebrow}>Sesion</span>
          <h3 className={styles.authTitle}>Cuenta AILEX</h3>
        </div>
        <div className={styles.authTabs}>
          <button
            type="button"
            className={`${styles.authTab} ${mode === 'login' ? styles.authTabActive : ''}`}
            onClick={() => setMode('login')}
            disabled={loading || authBusy}
          >
            Ingresar
          </button>
          <button
            type="button"
            className={`${styles.authTab} ${mode === 'register' ? styles.authTabActive : ''}`}
            onClick={() => setMode('register')}
            disabled={loading || authBusy}
          >
            Registrarse
          </button>
        </div>
      </div>

      <p className={styles.authHint}>
        Sin sesion iniciada, AILEX sigue funcionando con persistencia local.
      </p>

      {error ? <div className={styles.authError}>{error}</div> : null}

      {mode === 'login' ? (
        <form className={styles.authForm} onSubmit={handleLogin}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              className={styles.control}
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((previous) => ({ ...previous, email: event.target.value }))
              }
              placeholder="abogado@ailex.ar"
              disabled={loading || authBusy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Contrasena</span>
            <input
              className={styles.control}
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((previous) => ({ ...previous, password: event.target.value }))
              }
              placeholder="Minimo 8 caracteres"
              disabled={loading || authBusy}
            />
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={
              loading ||
              authBusy ||
              !loginForm.email.trim() ||
              !loginForm.password.trim()
            }
          >
            {authBusy ? 'Conectando...' : 'Ingresar'}
          </button>
        </form>
      ) : (
        <form className={styles.authForm} onSubmit={handleRegister}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nombre</span>
            <input
              className={styles.control}
              type="text"
              value={registerForm.nombre}
              onChange={(event) =>
                setRegisterForm((previous) => ({ ...previous, nombre: event.target.value }))
              }
              placeholder="Nombre y apellido"
              disabled={loading || authBusy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              className={styles.control}
              type="email"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((previous) => ({ ...previous, email: event.target.value }))
              }
              placeholder="abogado@ailex.ar"
              disabled={loading || authBusy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Contrasena</span>
            <input
              className={styles.control}
              type="password"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((previous) => ({ ...previous, password: event.target.value }))
              }
              placeholder="Minimo 8 caracteres"
              disabled={loading || authBusy}
            />
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={
              loading ||
              authBusy ||
              !registerForm.nombre.trim() ||
              !registerForm.email.trim() ||
              registerForm.password.trim().length < 8
            }
          >
            {authBusy ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      )}
    </section>
  );
}
