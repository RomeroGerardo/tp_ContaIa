/**
 * ContaIA — Novedades Module
 * Feed de noticias y resoluciones de ARCA
 */

const NovedadesView = (() => {

  let novedades = [];
  let email = '';
  let filtroActivo = 'todos';
  let busqueda = '';

  async function init(userEmail) {
    email = userEmail;
    try {
      const res = await fetch('data/novedades_arca.json');
      novedades = await res.json();
    } catch (e) {
      novedades = [];
    }
    render();
  }

  function render() {
    renderFiltros();
    renderFeed();
    renderStats();
  }

  function renderStats() {
    const el = document.getElementById('nov-stats');
    if (!el) return;
    const leidas = Storage.getNovedadesLeidas(email);
    const noLeidas = novedades.filter(n => !leidas.includes(n.id)).length;
    const importantes = novedades.filter(n => n.importante).length;

    el.innerHTML = `
      <div class="nov-stat-card">
        <span class="text-2xl">${novedades.length}</span>
        <span class="text-xs text-muted">Total novedades</span>
      </div>
      <div class="nov-stat-card">
        <span class="text-2xl text-warning">${noLeidas}</span>
        <span class="text-xs text-muted">Sin leer</span>
      </div>
      <div class="nov-stat-card">
        <span class="text-2xl text-danger">${importantes}</span>
        <span class="text-xs text-muted">Importantes</span>
      </div>
    `;
  }

  function renderFiltros() {
    const container = document.getElementById('nov-filtros');
    if (!container) return;

    const categorias = [
      { key: 'todos', label: '🗂 Todos', icon: '' },
      { key: 'monotributo', label: '💰 Monotributo', icon: '' },
      { key: 'iva', label: '📋 IVA', icon: '' },
      { key: 'ganancias', label: '📊 Ganancias', icon: '' },
      { key: 'facturacion', label: '🧾 Facturación', icon: '' },
      { key: 'deudas', label: '⚠ Deudas', icon: '' },
    ];

    container.innerHTML = categorias.map(c => `
      <button class="filter-chip ${filtroActivo === c.key ? 'active' : ''}"
              onclick="NovedadesView.setFiltro('${c.key}')">
        ${c.label}
      </button>
    `).join('');
  }

  function renderFeed() {
    const container = document.getElementById('nov-feed');
    if (!container) return;

    const leidas = Storage.getNovedadesLeidas(email);
    let items = novedades;

    if (filtroActivo !== 'todos') {
      items = items.filter(n => n.categoria === filtroActivo);
    }

    if (busqueda) {
      const q = busqueda.toLowerCase();
      items = items.filter(n =>
        n.titulo.toLowerCase().includes(q) ||
        n.resumen.toLowerCase().includes(q) ||
        n.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span>🔍</span>
          <p>No se encontraron novedades para este filtro</p>
          <button class="btn btn-secondary btn-sm" onclick="NovedadesView.setFiltro('todos')">Ver todas</button>
        </div>
      `;
      return;
    }

    const catIcon = {
      monotributo: '💰', iva: '📋', ganancias: '📊', facturacion: '🧾',
      bienes_personales: '🏠', deudas: '⚠', seguridad_social: '🏥', aduanas: '🚢'
    };
    const catLabel = {
      monotributo: 'Monotributo', iva: 'IVA', ganancias: 'Ganancias', facturacion: 'Facturación',
      bienes_personales: 'Bienes Personales', deudas: 'Deudas', seguridad_social: 'Seguridad Social', aduanas: 'Aduanas'
    };

    container.innerHTML = items.map((n, i) => {
      const leida = leidas.includes(n.id);
      return `
        <article class="novedad-full-card ${leida ? 'leida' : 'no-leida'} animate-fade-in delay-${Math.min(i * 100, 400)}"
                 id="novedad-${n.id}" data-animate>
          <div class="novedad-full-header">
            <div class="flex items-center gap-12 flex-1">
              <div class="novedad-cat-badge">
                <span>${catIcon[n.categoria] || '📄'}</span>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-8 flex-wrap">
                  <span class="badge badge-primary" style="font-size:0.65rem">${catLabel[n.categoria] || n.categoria}</span>
                  ${n.importante && !leida ? '<span class="badge badge-danger" style="font-size:0.65rem">🚨 IMPORTANTE</span>' : ''}
                  ${!leida ? '<span class="badge-dot" style="background:var(--primary);display:inline-block;width:8px;height:8px;border-radius:50%"></span>' : ''}
                </div>
                <div class="text-xs text-muted mt-4">${n.fuente} · ${Utils.formatFechaRelativa(n.fecha)}</div>
              </div>
            </div>
            <div class="flex items-center gap-8">
              ${!leida ? `
                <button class="btn btn-ghost btn-sm" onclick="NovedadesView.marcarLeida('${n.id}')">
                  ✓ Marcar leída
                </button>
              ` : `
                <span class="text-xs text-muted">Leída ✓</span>
              `}
            </div>
          </div>

          <h3 class="novedad-full-titulo" onclick="NovedadesView.expandir('${n.id}')">
            ${n.titulo}
          </h3>

          <p class="novedad-full-resumen" id="resumen-${n.id}">
            ${n.resumen}
          </p>

          <div class="novedad-full-footer">
            <div class="flex gap-4 flex-wrap">
              ${(n.tags || []).map(t => `<span class="tag">#${t}</span>`).join('')}
            </div>
            <div class="flex items-center gap-8">
              <span class="text-xs text-muted">📅 ${Utils.formatFechaCorta(n.fecha)}</span>
              <button class="btn btn-ghost btn-sm" onclick="NovedadesView.consultarIA('${n.id}')">
                🤖 Consultar IA
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function marcarLeida(id) {
    Storage.marcarNovedadLeida(email, id);
    const card = document.getElementById(`novedad-${id}`);
    if (card) {
      card.classList.remove('no-leida');
      card.classList.add('leida');
    }
    renderStats();
    Utils.toast('Novedad marcada como leída', 'success');
  }

  function marcarTodasLeidas() {
    novedades.forEach(n => Storage.marcarNovedadLeida(email, n.id));
    render();
    Utils.toast('Todas las novedades marcadas como leídas', 'success');
  }

  function setFiltro(filtro) {
    filtroActivo = filtro;
    renderFiltros();
    renderFeed();
  }

  function setBusqueda(q) {
    busqueda = q;
    renderFeed();
  }

  function expandir(id) {
    const el = document.getElementById(`resumen-${id}`);
    if (el) el.style.webkitLineClamp = 'unset';
    marcarLeida(id);
  }

  function consultarIA(novedadId) {
    const novedad = novedades.find(n => n.id === novedadId);
    if (!novedad) return;
    App.navigate('ia', { novedadConsulta: novedad });
    Utils.toast('Consultando a la IA sobre esta novedad...', 'info');
  }

  return { init, render, marcarLeida, marcarTodasLeidas, setFiltro, setBusqueda, expandir, consultarIA };
})();
