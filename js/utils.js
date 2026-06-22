/**
 * ContaIA — Utilities Module
 * Funciones de utilidad comunes
 */

const Utils = (() => {

  // ── Fechas ────────────────────────────────────────────────

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  function hoy() {
    return new Date();
  }

  function fechaHoy() {
    const d = new Date();
    return toISO(d);
  }

  /** Convierte Date a string YYYY-MM-DD */
  function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Parsea YYYY-MM-DD como fecha local (sin UTC offset) */
  function parseDate(isoStr) {
    if (!isoStr) return null;
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** Días entre hoy y una fecha futura (negativo si ya pasó) */
  function diasHasta(isoFecha) {
    const target = parseDate(isoFecha);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = target - now;
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  /** Formatea fecha: "15 de Junio de 2026" */
  function formatFechaLarga(isoStr) {
    const d = parseDate(isoStr);
    if (!d) return '';
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }

  /** Formatea fecha: "15/06/2026" */
  function formatFechaCorta(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  /** "hace 2 días", "en 3 días", "hoy" */
  function formatFechaRelativa(isoStr) {
    const dias = diasHasta(isoStr);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    if (dias === -1) return 'Ayer';
    if (dias > 0) return `En ${dias} días`;
    return `Hace ${Math.abs(dias)} días`;
  }

  function getMesNombre(mes0indexed) {
    return MESES[mes0indexed];
  }

  // ── Validaciones ──────────────────────────────────────────

  function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validarPassword(pass) {
    return pass && pass.length >= 6;
  }

  function validarCUIT(cuit) {
    // Remove hyphens
    const c = cuit.replace(/-/g, '');
    if (!/^\d{11}$/.test(c)) return false;
    const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * mult[i];
    const resto = sum % 11;
    const verificador = resto === 0 ? 0 : 11 - resto;
    return verificador === parseInt(c[10]);
  }

  function formatCUIT(cuit) {
    const c = cuit.replace(/\D/g, '');
    if (c.length <= 2) return c;
    if (c.length <= 10) return `${c.slice(0, 2)}-${c.slice(2)}`;
    return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10, 11)}`;
  }

  /** Último dígito del CUIT para calcular vencimientos */
  function ultimoDigitoCUIT(cuit) {
    const c = cuit.replace(/\D/g, '');
    return c.length >= 11 ? parseInt(c[10]) : null;
  }

  // ── Categorías Monotributo ────────────────────────────────

  const CATEGORIAS_MONO = {
    A: { max_ingresos: 2000000, descripcion: 'Categoría A — Ingresos hasta $2.000.000' },
    B: { max_ingresos: 2900000, descripcion: 'Categoría B — Ingresos hasta $2.900.000' },
    C: { max_ingresos: 4100000, descripcion: 'Categoría C — Ingresos hasta $4.100.000' },
    D: { max_ingresos: 6400000, descripcion: 'Categoría D — Ingresos hasta $6.400.000' },
    E: { max_ingresos: 8700000, descripcion: 'Categoría E — Ingresos hasta $8.700.000' },
    F: { max_ingresos: 11400000, descripcion: 'Categoría F — Ingresos hasta $11.400.000' },
    G: { max_ingresos: 14900000, descripcion: 'Categoría G — Ingresos hasta $14.900.000' },
    H: { max_ingresos: 20500000, descripcion: 'Categoría H — Ingresos hasta $20.500.000' },
    I: { max_ingresos: 25700000, descripcion: 'Categoría I — Ingresos hasta $25.700.000' },
    J: { max_ingresos: 31900000, descripcion: 'Categoría J — Ingresos hasta $31.900.000' },
    K: { max_ingresos: 40700000, descripcion: 'Categoría K — Ingresos hasta $40.700.000' },
  };

  function getCategoriaMono(cat) {
    return CATEGORIAS_MONO[cat?.toUpperCase()] || null;
  }

  // ── Estado / Colores ──────────────────────────────────────

  /**
   * Devuelve el estado de un vencimiento
   * @returns 'pagado' | 'vencido' | 'proximo' | 'futuro'
   */
  function getEstadoVencimiento(isoFecha, pagado) {
    if (pagado) return 'pagado';
    const dias = diasHasta(isoFecha);
    if (dias < 0) return 'vencido';
    if (dias <= 7) return 'proximo';
    return 'futuro';
  }

  function getColorEstado(estado) {
    const map = {
      pagado: 'success',
      vencido: 'danger',
      proximo: 'warning',
      futuro: 'info',
    };
    return map[estado] || 'info';
  }

  function getLabelEstado(estado) {
    const map = {
      pagado: '✓ Pagado',
      vencido: '⚠ Vencido',
      proximo: '⏰ Próximo',
      futuro: '📅 Programado',
    };
    return map[estado] || estado;
  }

  // ── Números ───────────────────────────────────────────────

  function formatMoney(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  }

  function formatNumber(n) {
    return new Intl.NumberFormat('es-AR').format(n);
  }

  // ── DOM Helpers ───────────────────────────────────────────

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  }

  /** Show toast notification */
  function toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✓', warning: '⚠', danger: '✕', info: 'ℹ' };
    const colors = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#6366f1' };

    const el = document.createElement('div');
    el.className = 'toast';
    el.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
    el.innerHTML = `
      <span style="font-size:1.1rem; color:${colors[type] || colors.info}">${icons[type] || 'ℹ'}</span>
      <span style="flex:1; color:#e2e8f0">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1rem;padding:0;line-height:1">✕</button>
    `;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  /** Animate elements on scroll */
  function observeAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
  }

  /** Debounce function */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  return {
    hoy, fechaHoy, toISO, parseDate, diasHasta,
    formatFechaLarga, formatFechaCorta, formatFechaRelativa,
    getMesNombre, MESES,
    validarEmail, validarPassword, validarCUIT, formatCUIT, ultimoDigitoCUIT,
    getCategoriaMono, CATEGORIAS_MONO,
    getEstadoVencimiento, getColorEstado, getLabelEstado,
    formatMoney, formatNumber,
    qs, qsa, createElement, toast, observeAnimations, debounce,
  };
})();
