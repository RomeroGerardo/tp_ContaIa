/**
 * ContaIA — Calendar Module
 * Calendario fiscal interactivo con vencimientos ARCA
 */

const CalendarioView = (() => {

  let calendarData = [];
  let currentDate = new Date();
  let email = '';
  let pagados = [];

  async function init(userEmail) {
    email = userEmail;
    pagados = Storage.getVencimientosPagados(email);

    try {
      const res = await fetch('data/calendario_arca.json');
      calendarData = await res.json();
    } catch (e) {
      console.error('[Calendar] Error cargando datos:', e);
      calendarData = [];
    }

    render();
  }

  function render() {
    pagados = Storage.getVencimientosPagados(email);
    renderHeader();
    renderCalendar();
    renderListaVencimientos();
  }

  function renderHeader() {
    const el = document.getElementById('cal-header-title');
    if (el) {
      el.textContent = `${Utils.getMesNombre(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    }
  }

  function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Get events for this month
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const eventsByDay = {};
    calendarData.forEach(v => {
      if (v.fecha && v.fecha.startsWith(monthStr)) {
        const day = parseInt(v.fecha.split('-')[2]);
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(v);
      }
    });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    let html = `
      <div class="cal-day-names">
        ${dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
      </div>
      <div class="cal-days">
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const events = eventsByDay[day] || [];
      const hasVencido = events.some(v => !pagados.includes(v.id) && Utils.diasHasta(v.fecha) < 0);
      const hasProximo = events.some(v => !pagados.includes(v.id) && Utils.diasHasta(v.fecha) >= 0 && Utils.diasHasta(v.fecha) <= 7);
      const hasPagado = events.length > 0 && events.every(v => pagados.includes(v.id));

      let dayClass = 'cal-day';
      if (isToday) dayClass += ' today';
      if (hasVencido) dayClass += ' has-vencido';
      else if (hasProximo) dayClass += ' has-proximo';
      else if (hasPagado) dayClass += ' has-pagado';
      else if (events.length > 0) dayClass += ' has-event';

      html += `
        <div class="${dayClass}" onclick="CalendarioView.showDayDetail(${year}, ${month}, ${day})">
          <span class="cal-day-num">${day}</span>
          ${events.length > 0 ? `
            <div class="cal-day-dots">
              ${events.map(v => {
                const pg = pagados.includes(v.id);
                const dias = Utils.diasHasta(v.fecha);
                const color = pg ? 'var(--success)' : dias < 0 ? 'var(--danger)' : dias <= 7 ? 'var(--warning)' : 'var(--info)';
                return `<span class="cal-dot" style="background:${color}"></span>`;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    html += `</div>`;
    grid.innerHTML = html;
  }

  function renderListaVencimientos() {
    const container = document.getElementById('cal-lista');
    if (!container) return;

    const empresa = Storage.getEmpresa(email);
    const activeFilter = document.querySelector('.cal-filter-btn.active')?.dataset.filter || 'todos';

    let items = calendarData
      .filter(v => {
        if (activeFilter !== 'todos' && v.tipo !== activeFilter) return false;
        return true;
      })
      .map(v => ({
        ...v,
        pagado: pagados.includes(v.id),
        estado: Utils.getEstadoVencimiento(v.fecha, pagados.includes(v.id)),
        dias: Utils.diasHasta(v.fecha),
      }))
      .sort((a, b) => {
        // Sort: vencidos first, then by date
        if (a.estado === 'vencido' && b.estado !== 'vencido') return -1;
        if (b.estado === 'vencido' && a.estado !== 'vencido') return 1;
        return new Date(a.fecha) - new Date(b.fecha);
      })
      .filter(v => v.dias >= -60); // Show last 60 days and future

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><span>📅</span><p>No hay vencimientos en este período</p></div>`;
      return;
    }

    const tipoIcon = { monotributo: '💰', recategorizacion: '🔄', ganancias: '📊', bienes_personales: '🏠', iva: '📋', deudas: '⚠', seguridad_social: '🏥' };
    const tipoLabel = { monotributo: 'Monotributo', recategorizacion: 'Recategorización', ganancias: 'Ganancias', bienes_personales: 'Bienes Personales', iva: 'IVA', deudas: 'Deudas', seguridad_social: 'Seg. Social' };

    container.innerHTML = items.map(v => {
      const color = Utils.getColorEstado(v.estado);
      const label = Utils.getLabelEstado(v.estado);

      return `
        <div class="cal-venc-item ${v.estado}" data-animate>
          <div class="cal-venc-left">
            <div class="cal-venc-icon" style="background:rgba(var(--${color}-rgb,99,102,241),0.1)">
              ${tipoIcon[v.tipo] || '📅'}
            </div>
            <div>
              <div class="cal-venc-titulo">${v.titulo}</div>
              <div class="cal-venc-meta">
                <span class="badge badge-primary" style="font-size:0.65rem">${tipoLabel[v.tipo] || v.tipo}</span>
                <span class="text-xs text-muted">${Utils.formatFechaLarga(v.fecha)}</span>
              </div>
              ${v.descripcion ? `<div class="cal-venc-desc">${v.descripcion}</div>` : ''}
            </div>
          </div>
          <div class="cal-venc-right">
            <span class="badge badge-${color}">${label}</span>
            <div class="cal-dias-badge" style="color:var(--${color === 'success' ? 'success' : color === 'danger' ? 'danger' : color === 'warning' ? 'warning' : 'info'})">
              ${v.dias === 0 ? 'HOY' : v.dias < 0 ? `${Math.abs(v.dias)}d atrás` : `en ${v.dias}d`}
            </div>
            ${!v.pagado ? `
              <button class="btn btn-success btn-sm" onclick="CalendarioView.marcarPagado('${v.id}')">
                ✓ Marcar pagado
              </button>
            ` : `
              <button class="btn btn-ghost btn-sm" onclick="CalendarioView.desmarcarPagado('${v.id}')">
                ↩ Desmarcar
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  function showDayDetail(year, month, day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = calendarData.filter(v => v.fecha === dateStr);
    if (events.length === 0) return;

    const tipoIcon = { monotributo: '💰', recategorizacion: '🔄', ganancias: '📊', bienes_personales: '🏠', iva: '📋', deudas: '⚠' };

    const modal = document.getElementById('modal-day-detail');
    const content = document.getElementById('modal-day-content');
    const title = document.getElementById('modal-day-title');

    if (!modal || !content) return;

    title.textContent = Utils.formatFechaLarga(dateStr);
    content.innerHTML = events.map(v => {
      const pagado = pagados.includes(v.id);
      const estado = Utils.getEstadoVencimiento(v.fecha, pagado);
      const color = Utils.getColorEstado(estado);

      return `
        <div class="glass-card-static p-16 mb-16">
          <div class="flex items-center gap-12 mb-8">
            <span style="font-size:1.5rem">${tipoIcon[v.tipo] || '📅'}</span>
            <div class="flex-1">
              <div class="font-semibold">${v.titulo}</div>
              <span class="badge badge-${color}" style="margin-top:4px">${Utils.getLabelEstado(estado)}</span>
            </div>
          </div>
          ${v.descripcion ? `<p class="text-sm text-secondary">${v.descripcion}</p>` : ''}
          <div class="flex gap-8 mt-16">
            ${!pagado ? `
              <button class="btn btn-success btn-sm" onclick="CalendarioView.marcarPagado('${v.id}');closeModal('modal-day-detail')">
                ✓ Marcar como pagado
              </button>
            ` : `
              <button class="btn btn-ghost btn-sm" onclick="CalendarioView.desmarcarPagado('${v.id}');closeModal('modal-day-detail')">
                ↩ Desmarcar
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    modal.classList.remove('hidden');
  }

  function prevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    render();
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    render();
  }

  function marcarPagado(id) {
    Storage.marcarVencimientoPagado(email, id);
    pagados = Storage.getVencimientosPagados(email);
    render();
    Utils.toast('Vencimiento marcado como pagado ✓', 'success');
  }

  function desmarcarPagado(id) {
    Storage.desmarcarVencimiento(email, id);
    pagados = Storage.getVencimientosPagados(email);
    render();
    Utils.toast('Vencimiento desmarcado', 'info');
  }

  function setFilter(filter) {
    document.querySelectorAll('.cal-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderListaVencimientos();
  }

  return { init, render, prevMonth, nextMonth, showDayDetail, marcarPagado, desmarcarPagado, setFilter };
})();
