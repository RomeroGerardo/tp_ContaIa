/**
 * ContaIA — Auth Module
 * Gestión de registro, login y sesión
 */

const Auth = (() => {

  /** Hash simple para contraseñas (en producción usar bcrypt en servidor) */
  function hashPassword(pass) {
    let hash = 0;
    for (let i = 0; i < pass.length; i++) {
      const char = pass.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36) + '_' + pass.length;
  }

  /**
   * Registrar un nuevo usuario
   * @returns { ok: boolean, error?: string }
   */
  function registrar(email, password, nombre) {
    if (!Utils.validarEmail(email)) {
      return { ok: false, error: 'El correo electrónico no es válido.' };
    }
    if (!Utils.validarPassword(password)) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }
    if (!nombre || nombre.trim().length < 2) {
      return { ok: false, error: 'El nombre debe tener al menos 2 caracteres.' };
    }
    if (Storage.userExists(email)) {
      return { ok: false, error: 'Ya existe una cuenta con ese correo electrónico.' };
    }

    const userData = {
      email: email.toLowerCase(),
      password: hashPassword(password),
      nombre: nombre.trim(),
      creadoEn: new Date().toISOString(),
    };

    Storage.saveUser(email, userData);
    Storage.setSession(email);

    return { ok: true };
  }

  /**
   * Iniciar sesión
   * @returns { ok: boolean, error?: string }
   */
  function login(email, password) {
    if (!Utils.validarEmail(email)) {
      return { ok: false, error: 'El correo electrónico no es válido.' };
    }
    if (!password) {
      return { ok: false, error: 'Ingresá tu contraseña.' };
    }

    const user = Storage.getUser(email);
    if (!user) {
      return { ok: false, error: 'No existe una cuenta con ese correo electrónico.' };
    }

    if (user.password !== hashPassword(password)) {
      return { ok: false, error: 'La contraseña es incorrecta.' };
    }

    Storage.setSession(email);
    return { ok: true };
  }

  /** Cerrar sesión */
  function logout() {
    Storage.clearSession();
    window.location.href = 'index.html';
  }

  /** Verificar si hay sesión activa */
  function checkSession() {
    return Storage.isLoggedIn();
  }

  /** Obtener usuario actual */
  function getCurrentUser() {
    return Storage.getCurrentUser();
  }

  return { registrar, login, logout, checkSession, getCurrentUser };
})();


// ── Login Page Logic ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay sesión, redirigir a app
  if (Auth.checkSession() && window.location.pathname.includes('index')) {
    window.location.href = 'app.html';
    return;
  }

  // Tab switching
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById('form-' + target)?.classList.remove('hidden');
    });
  });

  // ── Login Form ─────────────────────────────────────────────
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value?.trim();
      const password = document.getElementById('login-password')?.value;
      const btn = loginForm.querySelector('[type="submit"]');
      const errorEl = document.getElementById('login-error');

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> Ingresando...';
      if (errorEl) errorEl.classList.add('hidden');

      // Simulate async for UX
      setTimeout(() => {
        const result = Auth.login(email, password);
        if (result.ok) {
          btn.innerHTML = '✓ ¡Bienvenido!';
          setTimeout(() => { window.location.href = 'app.html'; }, 500);
        } else {
          if (errorEl) {
            errorEl.textContent = result.error;
            errorEl.classList.remove('hidden');
          }
          btn.disabled = false;
          btn.innerHTML = 'Iniciar Sesión';
        }
      }, 600);
    });
  }

  // ── Register Form ──────────────────────────────────────────
  const registerForm = document.getElementById('form-register');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = document.getElementById('reg-nombre')?.value?.trim();
      const email = document.getElementById('reg-email')?.value?.trim();
      const password = document.getElementById('reg-password')?.value;
      const password2 = document.getElementById('reg-password2')?.value;
      const btn = registerForm.querySelector('[type="submit"]');
      const errorEl = document.getElementById('register-error');

      if (errorEl) errorEl.classList.add('hidden');

      if (password !== password2) {
        if (errorEl) { errorEl.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.remove('hidden'); }
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> Creando cuenta...';

      setTimeout(() => {
        const result = Auth.registrar(email, password, nombre);
        if (result.ok) {
          btn.innerHTML = '✓ ¡Cuenta creada!';
          setTimeout(() => { window.location.href = 'app.html'; }, 500);
        } else {
          if (errorEl) {
            errorEl.textContent = result.error;
            errorEl.classList.remove('hidden');
          }
          btn.disabled = false;
          btn.innerHTML = 'Crear Cuenta';
        }
      }, 700);
    });
  }

  // ── Password visibility toggle ─────────────────────────────
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });
});
