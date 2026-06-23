/**
 * ContaIA — Dashboard Module
 * Panel principal con KPIs, vencimientos y novedades
 */

const Dashboard = (() => {

  let calendarData = [];
  let novedadesData = [];
  let email = '';
  let empresa = null;

  async function init(userEmail) {
    email = userEmail;
    empresa = Storage.getEmpresa(email) || {};

    // Load external data
    try {
      const [calRes, novRes] = await Promise.all([
        fetch('data/calendario_arca.json'),
        fetch('data/novedades_arca.json')
      ]);
      calendarData = await calRes.json();
      novedadesData = await novRes.json();
    } catch (e) {
      console.error('[Dashboard] Error cargando datos:', e);
    }

    render();
    startAutoRefresh();
  }

  function render() {
    renderBienvenida();
    renderKPIs();
    renderVencimientosProximos();
    renderNovedadesRecientes();
    renderTareasPendientes();
    renderEstadoFiscal();
    Utils.observeAnimations();
  }

  function renderBienvenida() {
    const el = document.getElementById('dash-bienvenida');
    if (!el) return;
    const user = Storage.getCurrentUser();
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '¡Buenos días' : hora < 19 ? '¡Buenas tardes' : '¡Buenas noches';
    const nombre = empresa?.nombreDuenio || user?.nombre || 'Usuario';
    const negocio = empresa?.nombreEmpresa ? `<span style="color:var(--primary-light)">${empresa.nombreEmpresa}</span>` : '';

    el.innerHTML = `
      <div>
        <h2 style="font-size:1.6rem;margin-bottom:4px">${saludo}, ${nombre}! 👋</h2>
        <p style="color:var(--text-secondary)">${negocio ? `Gestionando ${negocio} · ` : ''}${Utils.formatFechaLarga(Utils.fechaHoy())}</p>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('novedades')">📰 Novedades</button>
        <button class="btn btn-primary btn-sm" onclick="App.navigate('ia')">🤖 Consultar IA</button>
      </div>
    `;
  }

  function renderKPIs() {
    const container = document.getElementById('dash-kpis');
    if (!container) return;

    const pagados = Storage.getVencimientosPagados(email);
    const novedadesLeidas = Storage.getNovedadesLeidas(email);
    const tareas = Storage.getTareas(email);

    // Count upcoming/overdue
    const hoy = Utils.fechaHoy();
    let proximos = 0, vencidos = 0;
    calendarData.forEach(v => {
      if (pagados.includes(v.id)) return;
      const dias = Utils.diasHasta(v.fecha);
      if (dias < 0) vencidos++;
      else if (dias <= 14) proximos++;
    });

    const noLeidas = novedadesData.filter(n => !novedadesLeidas.includes(n.id)).length;
    const tareasCompletas = tareas.filter(t => t.completada).length;
    const totalTareas = tareas.length;

    const kpis = [
      {
        icon: '⚠',
        label: 'Vencimientos Vencidos',
        value: vencidos,
        color: vencidos > 0 ? 'danger' : 'success',
        sub: vencidos > 0 ? 'Requieren atención' : 'Todo al día ✓',
        onclick: "App.navigate('calendario')",
      },
      {
        icon: '📅',
        label: 'Vencimientos Próximos',
        value: proximos,
        color: proximos > 0 ? 'warning' : 'success',
        sub: proximos > 0 ? 'En los próximos 14 días' : 'Sin vencimientos cercanos',
        onclick: "App.navigate('calendario')",
      },
      {
        icon: '📰',
        label: 'Novedades Sin Leer',
        value: noLeidas,
        color: noLeidas > 0 ? 'info' : 'success',
        sub: `${novedadesData.length} total de ARCA`,
        onclick: "App.navigate('novedades')",
      },
      {
        icon: '✅',
        label: 'Tareas Completadas',
        value: totalTareas > 0 ? `${tareasCompletas}/${totalTareas}` : '0',
        color: totalTareas > 0 && tareasCompletas === totalTareas ? 'success' : 'primary',
        sub: totalTareas === 0 ? 'Sin tareas cargadas' : `${totalTareas - tareasCompletas} pendientes`,
        onclick: "document.getElementById('dash-tareas-section')?.scrollIntoView({behavior:'smooth'})",
      },
    ];

    container.innerHTML = kpis.map((k, i) => `
      <div class="glass-card kpi-card delay-${(i + 1) * 100} animate-fade-in" 
           onclick="${k.onclick}" style="cursor:pointer" data-animate>
        <div class="kpi-icon badge-${k.color}">${k.icon}</div>
        <div class="kpi-value text-${k.color === 'primary' ? 'primary-c' : k.color}">${k.value}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>
    `).join('');
  }

  function renderVencimientosProximos() {
    const container = document.getElementById('dash-vencimientos');
    if (!container) return;

    const pagados = Storage.getVencimientosPagados(email);
    const proximos = calendarData
      .filter(v => {
        const dias = Utils.diasHasta(v.fecha);
        return dias >= -30 && dias <= 45;
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 5);

    if (proximos.length === 0) {
      container.innerHTML = `<div class="empty-state"><span>📅</span><p>No hay vencimientos próximos</p></div>`;
      return;
    }

    container.innerHTML = proximos.map(v => {
      const pagado = pagados.includes(v.id);
      const estado = Utils.getEstadoVencimiento(v.fecha, pagado);
      const color = Utils.getColorEstado(estado);
      const label = Utils.getLabelEstado(estado);
      const dias = Utils.diasHasta(v.fecha);
      const tipoIcon = { monotributo: '💰', recategorizacion: '🔄', ganancias: '📊', bienes_personales: '🏠', iva: '📋', deudas: '⚠' };

      return `
        <div class="venc-item animate-fade-in" data-animate>
          <div class="venc-icon">${tipoIcon[v.tipo] || '📅'}</div>
          <div class="venc-info">
            <div class="venc-titulo">${v.titulo}</div>
            <div class="venc-fecha">${Utils.formatFechaLarga(v.fecha)}</div>
          </div>
          <div class="venc-status">
            <span class="badge badge-${color}">${label}</span>
            <div class="venc-dias" style="color:var(--${color === 'success' ? 'success' : color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'info'})">
              ${dias === 0 ? 'HOY' : dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
            </div>
          </div>
          ${!pagado ? `
            <button class="btn btn-success btn-sm btn-icon" 
                    onclick="Dashboard.marcarPagado('${v.id}')"
                    title="Marcar como pagado">✓</button>
          ` : `
            <button class="btn btn-ghost btn-sm btn-icon" 
                    onclick="Dashboard.desmarcarPagado('${v.id}')"
                    title="Desmarcar">↩</button>
          `}
        </div>
      `;
    }).join('');
  }

  function renderNovedadesRecientes() {
    const container = document.getElementById('dash-novedades');
    if (!container) return;

    const leidas = Storage.getNovedadesLeidas(email);
    const recent = novedadesData.slice(0, 3);

    container.innerHTML = recent.map(n => {
      const leida = leidas.includes(n.id);
      const catIcon = { monotributo: '💰', iva: '📋', ganancias: '📊', facturacion: '🧾', bienes_personales: '🏠', deudas: '⚠', seguridad_social: '🏥', aduanas: '🚢' };

      return `
        <div class="novedad-card ${leida ? 'leida' : ''} animate-fade-in" 
             onclick="App.navigate('novedades')" data-animate style="cursor:pointer">
          <div class="novedad-top">
            <span class="novedad-cat-icon">${catIcon[n.categoria] || '📄'}</span>
            <div class="novedad-meta">
              <span class="novedad-fuente">${n.fuente}</span>
              <span class="novedad-fecha">${Utils.formatFechaRelativa(n.fecha)}</span>
            </div>
            ${!leida && n.importante ? '<span class="badge badge-danger" style="font-size:0.65rem">IMPORTANTE</span>' : ''}
            ${!leida ? '<span class="novedad-dot"></span>' : ''}
          </div>
          <h4 class="novedad-titulo">${n.titulo}</h4>
          <p class="novedad-resumen">${n.resumen.substring(0, 120)}...</p>
        </div>
      `;
    }).join('');
  }

  function renderTareasPendientes() {
    const container = document.getElementById('dash-tareas');
    if (!container) return;

    const tareas = Storage.getTareas(email);
    const pendientes = tareas.filter(t => !t.completada);

    if (tareas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span>📝</span>
          <p>No hay tareas cargadas</p>
          <button class="btn btn-primary btn-sm" onclick="Dashboard.showAddTarea()">+ Agregar tarea</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${tareas.slice(0, 5).map(t => `
        <div class="tarea-item ${t.completada ? 'completada' : ''}">
          <button class="tarea-check ${t.completada ? 'checked' : ''}" 
                  onclick="Dashboard.toggleTarea('${t.id}')">
            ${t.completada ? '✓' : ''}
          </button>
          <span class="tarea-texto">${t.texto}</span>
          <button class="btn btn-ghost btn-icon btn-sm" 
                  onclick="Dashboard.deleteTarea('${t.id}')"
                  style="color:var(--text-muted);font-size:0.8rem">✕</button>
        </div>
      `).join('')}
      <div class="tarea-add-row">
        <input type="text" id="nueva-tarea-input" class="form-control" 
               placeholder="Nueva tarea..." 
               onkeydown="if(event.key==='Enter')Dashboard.addTarea()"
               style="font-size:0.85rem;padding:8px 12px">
        <button class="btn btn-primary btn-sm" onclick="Dashboard.addTarea()">+ Agregar</button>
      </div>
    `;
  }

  function renderEstadoFiscal() {
    const container = document.getElementById('dash-estado-fiscal');
    if (!container || !empresa?.tipo) return;

    const tipo = empresa.tipo;
    const categoria = empresa.categoriaMonotributo;
    const catData = categoria ? Utils.getCategoriaMono(categoria) : null;

    let estado = 'Al día ✓';
    let color = 'success';
    let consejos = [];

    if (empresa.deudas === 'si') {
      estado = 'Deudas pendientes ⚠';
      color = 'danger';
      consejos.push('Regularizá tus deudas a través del Plan de Facilidades ARCA');
    }
    if (empresa.declaracionesPendientes === 'si') {
      consejos.push('Tenés declaraciones juradas pendientes de presentación');
    }
    if (tipo === 'monotributista' && categoria) {
      consejos.push(`Revisá tu facturación para verificar si seguís en categoría ${categoria}`);
    }

    container.innerHTML = `
      <div class="estado-fiscal-header">
        <div>
          <div class="text-sm text-secondary mb-4">Estado Fiscal Actual</div>
          <div class="flex items-center gap-8">
            <span class="text-${color} font-bold" style="font-size:1.1rem">${estado}</span>
            ${catData ? `<span class="badge badge-primary">Monotributo Cat. ${categoria}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="App.navigate('perfil')">Editar perfil</button>
      </div>
      ${consejos.length > 0 ? `
        <div class="estado-consejos">
          ${consejos.map(c => `
            <div class="consejo-item">
              <span>💡</span>
              <span>${c}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${catData ? `
        <div class="categoria-info">
          <span class="text-xs text-muted">Límite de ingresos anuales:</span>
          <span class="font-semibold text-primary-c">${Utils.formatMoney(catData.max_ingresos)}</span>
        </div>
      ` : ''}
    `;
  }

  function marcarPagado(id) {
    Storage.marcarVencimientoPagado(email, id);
    render();
    Utils.toast('Vencimiento marcado como pagado ✓', 'success');
  }

  function desmarcarPagado(id) {
    Storage.desmarcarVencimiento(email, id);
    render();
    Utils.toast('Vencimiento desmarcado', 'info');
  }

  function addTarea() {
    const input = document.getElementById('nueva-tarea-input');
    if (!input || !input.value.trim()) return;
    Storage.addTarea(email, { texto: input.value.trim(), completada: false });
    input.value = '';
    renderTareasPendientes();
    Utils.toast('Tarea agregada', 'success');
  }

  function toggleTarea(id) {
    Storage.toggleTarea(email, id);
    renderTareasPendientes();
    renderKPIs();
  }

  function deleteTarea(id) {
    Storage.deleteTarea(email, id);
    renderTareasPendientes();
    renderKPIs();
  }

  function showAddTarea() {
    const container = document.getElementById('dash-tareas');
    if (!container) return;
    container.innerHTML = `
      <div class="tarea-add-row" style="display:flex; gap:10px; margin-top:15px; width:100%">
        <input type="text" id="nueva-tarea-input" class="form-control" 
               placeholder="Escribe una tarea..." 
               onkeydown="if(event.key==='Enter')Dashboard.addTarea()"
               style="flex:1; font-size:0.85rem; padding:8px 12px;">
        <button class="btn btn-primary btn-sm" onclick="Dashboard.addTarea()">+ Agregar</button>
        <button class="btn btn-ghost btn-sm" onclick="Dashboard.renderTareasPendientes()">✕</button>
      </div>
    `;
    setTimeout(() => document.getElementById('nueva-tarea-input')?.focus(), 100);
  }

  function startAutoRefresh() {
    // Refresh every 5 minutes to update relative dates
    setInterval(() => {
      renderVencimientosProximos();
      renderKPIs();
    }, 5 * 60 * 1000);
  }

  return { init, render, marcarPagado, desmarcarPagado, addTarea, toggleTarea, deleteTarea, showAddTarea, renderTareasPendientes };
})();
