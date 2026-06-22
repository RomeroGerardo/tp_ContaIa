/**
 * ContaIA — App Controller
 * Router principal y coordinador de módulos
 */

const App = (() => {

  let currentView = null;
  let email = '';
  let empresa = null;
  let alertasChecker = null;

  // ── Bootstrap ─────────────────────────────────────────────

  async function boot() {
    // Check authentication
    if (!Storage.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }

    email = Storage.getCurrentEmail();
    empresa = Storage.getEmpresa(email);

    // Render sidebar user info
    renderSidebarUser();
    renderNotificationBadge();

    // Check if onboarding needed
    if (!Storage.isOnboardingDone(email)) {
      navigate('onboarding');
    } else {
      navigate('dashboard');
    }

    // Start background tasks
    startAlertasChecker();
  }

  // ── Navigation ─────────────────────────────────────────────

  function navigate(view, extraContext = {}) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
    });

    // Show target view
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) {
      viewEl.classList.remove('hidden');
      viewEl.classList.add('animate-fade-in');
      setTimeout(() => viewEl.classList.remove('animate-fade-in'), 500);
    }

    // Update page title
    const titles = {
      onboarding: 'Configuración Inicial',
      dashboard: 'Panel Principal',
      calendario: 'Calendario Fiscal',
      novedades: 'Novedades ARCA',
      ia: 'Asistente IA',
      perfil: 'Mi Perfil',
    };
    const headerTitle = document.getElementById('header-page-title');
    if (headerTitle) headerTitle.textContent = titles[view] || 'ContaIA';

    currentView = view;

    // Initialize view module
    switch (view) {
      case 'onboarding':
        Onboarding.init(email);
        break;
      case 'dashboard':
        empresa = Storage.getEmpresa(email);
        Dashboard.init(email);
        break;
      case 'calendario':
        CalendarioView.init(email);
        break;
      case 'novedades':
        NovedadesView.init(email);
        break;
      case 'ia':
        IAView.init(email, extraContext);
        setTimeout(() => IAView.renderSugerenciasCards(), 200);
        break;
      case 'perfil':
        renderPerfilView();
        break;
    }

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar')?.classList.remove('open');
    }

    // Scroll to top
    document.getElementById('main-content')?.scrollTo(0, 0);
  }

  // ── Sidebar User ──────────────────────────────────────────

  function renderSidebarUser() {
    const user = Storage.getCurrentUser();
    empresa = Storage.getEmpresa(email);

    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const subEl = document.getElementById('sidebar-user-sub');

    if (avatarEl) {
      const inicial = (empresa?.nombreDuenio || user?.nombre || 'U')[0].toUpperCase();
      avatarEl.textContent = inicial;
    }
    if (nameEl) nameEl.textContent = empresa?.nombreDuenio || user?.nombre || email;
    if (subEl) subEl.textContent = empresa?.nombreEmpresa || 'Configurar empresa →';
  }

  // ── Notifications Badge ────────────────────────────────────

  function renderNotificationBadge() {
    const leidas = Storage.getNovedadesLeidas(email);
    const pagados = Storage.getVencimientosPagados(email);

    // Will be updated when data loads
    fetch('data/novedades_arca.json')
      .then(r => r.json())
      .then(novedades => {
        const noLeidas = novedades.filter(n => !leidas.includes(n.id)).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
          if (noLeidas > 0) {
            badge.textContent = noLeidas;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      })
      .catch(() => {});
  }

  // ── Alertas Automáticas ───────────────────────────────────

  function startAlertasChecker() {
    checkAlertas(); // Run immediately
    alertasChecker = setInterval(checkAlertas, 60 * 60 * 1000); // Every hour
  }

  async function checkAlertas() {
    try {
      const res = await fetch('data/calendario_arca.json');
      const calendar = await res.json();
      const pagados = Storage.getVencimientosPagados(email);
      const config = Storage.getConfig(email);
      const diasAlerta = config.diasAlertaAnticipacion || 7;

      let alertas = [];
      calendar.forEach(v => {
        if (pagados.includes(v.id)) return;
        const dias = Utils.diasHasta(v.fecha);
        if (dias >= 0 && dias <= diasAlerta) {
          alertas.push({ ...v, dias });
        } else if (dias < 0 && dias >= -3) {
          alertas.push({ ...v, dias, vencido: true });
        }
      });

      // Show up to 2 alert toasts (not too spammy)
      alertas.slice(0, 2).forEach((a, i) => {
        setTimeout(() => {
          const tipo = a.vencido ? 'danger' : a.dias <= 2 ? 'warning' : 'info';
          const msg = a.vencido
            ? `⚠ Vencimiento vencido: ${a.titulo}`
            : `🔔 Vence en ${a.dias} días: ${a.titulo}`;
          Utils.toast(msg, tipo, 6000);
        }, i * 2000);
      });

      // Update alert banner
      renderAlertBanner(alertas);
    } catch (e) {}
  }

  function renderAlertBanner(alertas) {
    const banner = document.getElementById('alert-banner');
    if (!banner) return;

    const vencidos = alertas.filter(a => a.vencido);
    const proximos = alertas.filter(a => !a.vencido);

    if (vencidos.length > 0) {
      banner.className = 'alert-banner alert-danger';
      banner.innerHTML = `
        <span>🚨</span>
        <span>Tenés <strong>${vencidos.length}</strong> vencimiento${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} sin pagar.</span>
        <button class="btn btn-danger btn-sm" onclick="App.navigate('calendario')">Ver ahora</button>
        <button class="btn-close" onclick="this.parentElement.classList.add('hidden')">✕</button>
      `;
      banner.classList.remove('hidden');
    } else if (proximos.length > 0) {
      banner.className = 'alert-banner alert-warning';
      banner.innerHTML = `
        <span>⏰</span>
        <span>Tenés <strong>${proximos.length}</strong> vencimiento${proximos.length > 1 ? 's' : ''} próximo${proximos.length > 1 ? 's' : ''} en los próximos días.</span>
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('calendario')">Ver calendario</button>
        <button class="btn-close" onclick="this.parentElement.classList.add('hidden')">✕</button>
      `;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  // ── Perfil View ───────────────────────────────────────────

  function renderPerfilView() {
    const user = Storage.getCurrentUser();
    empresa = Storage.getEmpresa(email) || {};
    const config = Storage.getConfig(email);

    const container = document.getElementById('view-perfil');
    if (!container) return;

    const RUBROS = ['Comercio', 'Servicios Profesionales', 'Gastronomía', 'Tecnología', 'Salud', 'Educación', 'Construcción', 'Transporte', 'Arte y Diseño', 'Otro'];
    const TIPOS = [
      { value: 'monotributista', label: 'Monotributista' },
      { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
      { value: 'empleado_relacion_dependencia', label: 'Empleado en Relación de Dependencia' },
      { value: 'otro', label: 'Otro' },
    ];

    container.querySelector('#perfil-content').innerHTML = `
      <div class="perfil-section animate-fade-in">
        <h3 class="section-title">👤 Datos Personales</h3>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="text" class="form-control" value="${email}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre del Dueño/a</label>
            <input type="text" id="pf-nombre-duenio" class="form-control" value="${empresa.nombreDuenio || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">CUIT/CUIL</label>
            <input type="text" id="pf-cuit" class="form-control" value="${empresa.cuit || ''}" placeholder="XX-XXXXXXXX-X">
          </div>
          <div class="form-group">
            <label class="form-label">Rubro / Actividad</label>
            <input type="text" id="pf-rubro" class="form-control" value="${empresa.rubro || ''}" placeholder="Ej: Diseño gráfico">
          </div>
        </div>
      </div>

      <div class="perfil-section mt-24 animate-fade-in delay-100">
        <h3 class="section-title">🏢 Datos del Negocio</h3>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Nombre del Negocio / Empresa</label>
            <input type="text" id="pf-nombre-empresa" class="form-control" value="${empresa.nombreEmpresa || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Contribuyente</label>
            <select id="pf-tipo" class="form-control" onchange="App.onTipoChange()">
              <option value="">Seleccioná...</option>
              ${TIPOS.map(t => `<option value="${t.value}" ${empresa.tipo === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group ${empresa.tipo !== 'monotributista' ? 'hidden' : ''}" id="pf-cat-group">
            <label class="form-label">Categoría Monotributo</label>
            <select id="pf-categoria" class="form-control">
              <option value="">Seleccioná...</option>
              ${Object.keys(Utils.CATEGORIAS_MONO).map(k => `
                <option value="${k}" ${empresa.categoriaMonotributo === k ? 'selected' : ''}>${k} — ${Utils.formatMoney(Utils.CATEGORIAS_MONO[k].max_ingresos)} max</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Actividad Principal</label>
            <input type="text" id="pf-actividad" class="form-control" value="${empresa.actividad || ''}" placeholder="Ej: Venta de indumentaria">
          </div>
        </div>
      </div>

      <div class="perfil-section mt-24 animate-fade-in delay-200">
        <h3 class="section-title">📊 Estado Fiscal</h3>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Estado de Pagos</label>
            <select id="pf-estado-pagos" class="form-control">
              <option value="al_dia" ${empresa.estadoPagos === 'al_dia' ? 'selected' : ''}>Al día</option>
              <option value="algunos_pendientes" ${empresa.estadoPagos === 'algunos_pendientes' ? 'selected' : ''}>Algunos pendientes</option>
              <option value="atrasado" ${empresa.estadoPagos === 'atrasado' ? 'selected' : ''}>Atrasado</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">¿Tenés deudas con ARCA?</label>
            <select id="pf-deudas" class="form-control">
              <option value="no" ${empresa.deudas === 'no' ? 'selected' : ''}>No</option>
              <option value="si" ${empresa.deudas === 'si' ? 'selected' : ''}>Sí</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">¿Declaraciones Juradas Pendientes?</label>
            <select id="pf-decl-pendientes" class="form-control">
              <option value="no" ${empresa.declaracionesPendientes === 'no' ? 'selected' : ''}>No</option>
              <option value="si" ${empresa.declaracionesPendientes === 'si' ? 'selected' : ''}>Sí</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Notas adicionales</label>
            <textarea id="pf-notas" class="form-control" placeholder="Información adicional...">${empresa.notas || ''}</textarea>
          </div>
        </div>
      </div>

      <div class="perfil-section mt-24 animate-fade-in delay-300">
        <h3 class="section-title">⚙ Configuración</h3>
        <div class="form-group" style="max-width:300px">
          <label class="form-label">Días de anticipación para alertas</label>
          <select id="pf-dias-alerta" class="form-control">
            <option value="3" ${config.diasAlertaAnticipacion === 3 ? 'selected' : ''}>3 días</option>
            <option value="7" ${config.diasAlertaAnticipacion === 7 ? 'selected' : ''}>7 días (recomendado)</option>
            <option value="14" ${config.diasAlertaAnticipacion === 14 ? 'selected' : ''}>14 días</option>
            <option value="30" ${config.diasAlertaAnticipacion === 30 ? 'selected' : ''}>30 días</option>
          </select>
        </div>
      </div>

      <div class="flex gap-12 mt-32">
        <button class="btn btn-primary btn-lg" onclick="App.guardarPerfil()">💾 Guardar Cambios</button>
        <button class="btn btn-danger btn-sm" onclick="Auth.logout()">🚪 Cerrar Sesión</button>
      </div>
    `;
  }

  function onTipoChange() {
    const tipo = document.getElementById('pf-tipo')?.value;
    const catGroup = document.getElementById('pf-cat-group') || document.getElementById('cat-mono-group');
    if (catGroup) catGroup.classList.toggle('hidden', tipo !== 'monotributista');
  }

  function guardarPerfil() {
    const updatedEmpresa = {
      ...empresa,
      nombreDuenio: document.getElementById('pf-nombre-duenio')?.value?.trim(),
      cuit: document.getElementById('pf-cuit')?.value?.trim(),
      rubro: document.getElementById('pf-rubro')?.value?.trim(),
      nombreEmpresa: document.getElementById('pf-nombre-empresa')?.value?.trim(),
      tipo: document.getElementById('pf-tipo')?.value,
      categoriaMonotributo: document.getElementById('pf-categoria')?.value,
      actividad: document.getElementById('pf-actividad')?.value?.trim(),
      estadoPagos: document.getElementById('pf-estado-pagos')?.value,
      deudas: document.getElementById('pf-deudas')?.value,
      declaracionesPendientes: document.getElementById('pf-decl-pendientes')?.value,
      notas: document.getElementById('pf-notas')?.value?.trim(),
    };

    const config = {
      diasAlertaAnticipacion: parseInt(document.getElementById('pf-dias-alerta')?.value || '7'),
      notificacionesActivas: true,
    };

    Storage.saveEmpresa(email, updatedEmpresa);
    Storage.saveConfig(email, config);

    empresa = updatedEmpresa;
    renderSidebarUser();
    Utils.toast('✓ Perfil guardado correctamente', 'success');
  }

  // ── Mobile Sidebar Toggle ─────────────────────────────────

  function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
  }

  return {
    boot, navigate, renderSidebarUser,
    onTipoChange, guardarPerfil, toggleSidebar,
    get currentView() { return currentView; },
  };
})();

// Bootstrap app on load
document.addEventListener('DOMContentLoaded', () => App.boot());

// Global helper for modal close
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}
