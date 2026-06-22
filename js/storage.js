/**
 * ContaIA — Storage Module
 * Capa de persistencia usando localStorage
 */

const Storage = (() => {
  const PREFIX = 'contaia_';

  const keys = {
    USERS: 'users',
    CURRENT_USER: 'current_user',
    SESSION: 'session',
    EMPRESA: 'empresa',
    ONBOARDING_DONE: 'onboarding_done',
    VENCIMIENTOS_PAGADOS: 'vencimientos_pagados',
    NOVEDADES_LEIDAS: 'novedades_leidas',
    SUGERENCIAS_IA: 'sugerencias_ia',
    TAREAS: 'tareas',
    CONFIG: 'config',
  };

  /** Get raw value from localStorage */
  function get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[Storage] Error al leer:', key, e);
      return null;
    }
  }

  /** Set value in localStorage */
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] Error al guardar:', key, e);
      return false;
    }
  }

  /** Remove a key */
  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /** Clear all ContaIA data */
  function clearAll() {
    Object.values(keys).forEach(k => remove(k));
  }

  // ── User Management ───────────────────────────────────────

  function getUsers() {
    return get(keys.USERS) || {};
  }

  function saveUser(email, userData) {
    const users = getUsers();
    users[email.toLowerCase()] = userData;
    set(keys.USERS, users);
  }

  function getUser(email) {
    const users = getUsers();
    return users[email.toLowerCase()] || null;
  }

  function userExists(email) {
    return !!getUser(email);
  }

  // ── Session Management ────────────────────────────────────

  function setSession(email) {
    set(keys.SESSION, { email: email.toLowerCase(), loginAt: new Date().toISOString() });
    set(keys.CURRENT_USER, email.toLowerCase());
  }

  function getSession() {
    return get(keys.SESSION);
  }

  function getCurrentUser() {
    const email = get(keys.CURRENT_USER);
    if (!email) return null;
    return getUser(email);
  }

  function getCurrentEmail() {
    return get(keys.CURRENT_USER);
  }

  function clearSession() {
    remove(keys.SESSION);
    remove(keys.CURRENT_USER);
  }

  function isLoggedIn() {
    const session = getSession();
    return !!session;
  }

  // ── Empresa / Perfil ─────────────────────────────────────

  function getEmpresa(email) {
    const data = get(keys.EMPRESA) || {};
    return data[email.toLowerCase()] || null;
  }

  function saveEmpresa(email, empresaData) {
    const data = get(keys.EMPRESA) || {};
    data[email.toLowerCase()] = { ...empresaData, updatedAt: new Date().toISOString() };
    set(keys.EMPRESA, data);
  }

  // ── Onboarding ────────────────────────────────────────────

  function isOnboardingDone(email) {
    const data = get(keys.ONBOARDING_DONE) || {};
    return !!data[email.toLowerCase()];
  }

  function markOnboardingDone(email) {
    const data = get(keys.ONBOARDING_DONE) || {};
    data[email.toLowerCase()] = new Date().toISOString();
    set(keys.ONBOARDING_DONE, data);
  }

  // ── Vencimientos Pagados ──────────────────────────────────

  function getVencimientosPagados(email) {
    const data = get(keys.VENCIMIENTOS_PAGADOS) || {};
    return data[email.toLowerCase()] || [];
  }

  function marcarVencimientoPagado(email, vencimientoId) {
    const data = get(keys.VENCIMIENTOS_PAGADOS) || {};
    const k = email.toLowerCase();
    if (!data[k]) data[k] = [];
    if (!data[k].includes(vencimientoId)) {
      data[k].push(vencimientoId);
    }
    set(keys.VENCIMIENTOS_PAGADOS, data);
  }

  function desmarcarVencimiento(email, vencimientoId) {
    const data = get(keys.VENCIMIENTOS_PAGADOS) || {};
    const k = email.toLowerCase();
    if (data[k]) {
      data[k] = data[k].filter(id => id !== vencimientoId);
    }
    set(keys.VENCIMIENTOS_PAGADOS, data);
  }

  // ── Novedades Leídas ──────────────────────────────────────

  function getNovedadesLeidas(email) {
    const data = get(keys.NOVEDADES_LEIDAS) || {};
    return data[email.toLowerCase()] || [];
  }

  function marcarNovedadLeida(email, novedadId) {
    const data = get(keys.NOVEDADES_LEIDAS) || {};
    const k = email.toLowerCase();
    if (!data[k]) data[k] = [];
    if (!data[k].includes(novedadId)) {
      data[k].push(novedadId);
    }
    set(keys.NOVEDADES_LEIDAS, data);
  }

  // ── Sugerencias IA ────────────────────────────────────────

  function getSugerenciasIA(email) {
    const data = get(keys.SUGERENCIAS_IA) || {};
    return data[email.toLowerCase()] || [];
  }

  function addSugerenciaIA(email, sugerencia) {
    const data = get(keys.SUGERENCIAS_IA) || {};
    const k = email.toLowerCase();
    if (!data[k]) data[k] = [];
    data[k].unshift({ ...sugerencia, id: Date.now(), fecha: new Date().toISOString() });
    // Keep max 20 suggestions
    if (data[k].length > 20) data[k] = data[k].slice(0, 20);
    set(keys.SUGERENCIAS_IA, data);
  }

  // ── Tareas personales ─────────────────────────────────────

  function getTareas(email) {
    const data = get(keys.TAREAS) || {};
    return data[email.toLowerCase()] || [];
  }

  function saveTareas(email, tareas) {
    const data = get(keys.TAREAS) || {};
    data[email.toLowerCase()] = tareas;
    set(keys.TAREAS, data);
  }

  function addTarea(email, tarea) {
    const tareas = getTareas(email);
    tareas.push({ ...tarea, id: Date.now().toString(), creadaEn: new Date().toISOString() });
    saveTareas(email, tareas);
  }

  function toggleTarea(email, tareaId) {
    const tareas = getTareas(email);
    const idx = tareas.findIndex(t => t.id === tareaId);
    if (idx !== -1) tareas[idx].completada = !tareas[idx].completada;
    saveTareas(email, tareas);
  }

  function deleteTarea(email, tareaId) {
    const tareas = getTareas(email).filter(t => t.id !== tareaId);
    saveTareas(email, tareas);
  }

  // ── Config ────────────────────────────────────────────────

  function getConfig(email) {
    const data = get(keys.CONFIG) || {};
    return data[email.toLowerCase()] || {
      diasAlertaAnticipacion: 7,
      notificacionesActivas: true,
    };
  }

  function saveConfig(email, config) {
    const data = get(keys.CONFIG) || {};
    data[email.toLowerCase()] = config;
    set(keys.CONFIG, data);
  }

  return {
    // User
    saveUser, getUser, userExists,
    // Session
    setSession, getSession, getCurrentUser, getCurrentEmail, clearSession, isLoggedIn,
    // Empresa
    getEmpresa, saveEmpresa,
    // Onboarding
    isOnboardingDone, markOnboardingDone,
    // Vencimientos
    getVencimientosPagados, marcarVencimientoPagado, desmarcarVencimiento,
    // Novedades
    getNovedadesLeidas, marcarNovedadLeida,
    // IA
    getSugerenciasIA, addSugerenciaIA,
    // Tareas
    getTareas, addTarea, toggleTarea, deleteTarea,
    // Config
    getConfig, saveConfig,
    // Utils
    clearAll,
  };
})();
