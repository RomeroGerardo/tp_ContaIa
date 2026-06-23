/**
 * ContaIA — IA Module
 * Integración con NotebookLM (notebook real) y motor de sugerencias inteligentes
 *
 * Notebook NotebookLM: ContaIA — Base de Conocimiento ARCA & Fiscalidad Argentina
 * URL: https://notebooklm.google.com/notebook/f61ac173-b64f-4b14-b87b-343638438875
 * Fuentes cargadas: Monotributo 2025-2026, ARCA institucional, Ganancias/BP, Sistema ContaIA
 */

const IAView = (() => {

  // ID del notebook real en NotebookLM
  const NOTEBOOK_ID = 'f61ac173-b64f-4b14-b87b-343638438875';
  const NOTEBOOK_URL = 'https://notebooklm.google.com/notebook/f61ac173-b64f-4b14-b87b-343638438875';

  let email = '';
  let empresa = null;
  let isLoading = false;
  let notebookContext = NOTEBOOK_ID;

  // ── Preguntas sugeridas por perfil ────────────────────────
  const PREGUNTAS_RAPIDAS = [
    '¿Cuáles son mis próximas obligaciones fiscales?',
    '¿Debo recategorizarme en este semestre?',
    '¿Hay novedades de ARCA que me afecten?',
    '¿Cómo optimizo mi situación fiscal como monotributista?',
    '¿Qué deducciones puedo aplicar en Ganancias?',
    '¿Cómo funciona el plan de facilidades de ARCA?',
    '¿Cuándo es el próximo período de recategorización?',
    '¿Qué pasa si supero el límite de mi categoría?',
  ];

  // ── Motor de sugerencias IA ────────────────────────────────
  const SUGERENCIAS_BASE = {
    monotributista: [
      {
        tipo: 'alerta',
        titulo: '📅 Recategorización Semestral',
        contenido: 'Los monotributistas deben recategorizarse en enero y julio de cada año. Si tus ingresos acumulados en los últimos 12 meses superan el máximo de tu categoría actual, deberás subir de categoría. No hacerlo puede generar deuda e intereses.',
        accion: 'Ver calendario',
        accionLink: 'calendario',
      },
      {
        tipo: 'consejo',
        titulo: '💡 Optimización de Categoría',
        contenido: 'Asegurate de que tus ingresos declarados correspondan solo a tu actividad principal. Si tenés ingresos de múltiples fuentes, revisá con un contador si podés segregar actividades.',
        accion: null,
      },
      {
        tipo: 'info',
        titulo: '🏥 Obra Social del Monotributo',
        contenido: 'Como monotributista tenés derecho a obra social. Podés elegir una de las obras sociales sindicales disponibles. Recordá que la cuota de SSSS ya está incluida en tu pago mensual.',
        accion: null,
      },
      {
        tipo: 'urgente',
        titulo: '⚠ Control de Facturación',
        contenido: 'ARCA cruza tu facturación mensual con tus declaraciones. Es fundamental emitir comprobante por cada venta o servicio. Usá el sistema de facturación online de ARCA (Comprobantes en línea o Remiito).',
        accion: null,
      },
    ],
    responsable_inscripto: [
      {
        tipo: 'alerta',
        titulo: '📋 IVA Mensual',
        contenido: 'Como Responsable Inscripto debés presentar la declaración jurada de IVA mensualmente. Los vencimientos varían según tu CUIT. No olvides descartar correctamente el IVA crédito fiscal de tus compras.',
        accion: 'Ver calendario',
        accionLink: 'calendario',
      },
      {
        tipo: 'consejo',
        titulo: '📊 Anticipos de Ganancias',
        contenido: 'Si pagaste Ganancias el año anterior, ARCA te puede exigir anticipos durante el año. Revisá si corresponde ingresarlos y si podés reducirlos si tu situación cambió.',
        accion: null,
      },
    ],
    general: [
      {
        tipo: 'info',
        titulo: '🔔 Configurá tus Alertas',
        contenido: 'ContaIA te avisa antes de cada vencimiento. Podés configurar con cuántos días de anticipación querés recibir las alertas desde tu perfil.',
        accion: 'Ir a perfil',
        accionLink: 'perfil',
      },
      {
        tipo: 'consejo',
        titulo: '📱 App ARCA Móvil',
        contenido: 'ARCA tiene una app oficial para celulares donde podés ver tu deuda, pagar, y consultar tu situación fiscal en tiempo real. Descargala y vinculala con tu CUIT.',
        accion: null,
      },
    ],
  };

  function init(userEmail, extraContext = {}) {
    email = userEmail;
    empresa = Storage.getEmpresa(email) || {};
    render(extraContext);
  }

  function render(extraContext = {}) {
    renderChatArea();
    renderSugerencias();
    renderHistorial();

    if (extraContext.novedadConsulta) {
      setTimeout(() => {
        const input = document.getElementById('ia-input');
        if (input) {
          input.value = `Explicame en términos simples esta novedad de ARCA: "${extraContext.novedadConsulta.titulo}"`;
          input.focus();
        }
      }, 300);
    }
  }

  function renderChatArea() {
    const container = document.getElementById('ia-chat');
    if (!container) return;

    const tipo = empresa?.tipo || 'monotributista';
    const nombre = empresa?.nombreEmpresa || empresa?.nombreDuenio || 'tu negocio';

    container.innerHTML = `
      <div class="ia-bienvenida animate-fade-in">
        <div class="ia-avatar">🤖</div>
        <div class="ia-bubble ia-bubble-bot">
          <p>¡Hola! Soy tu asistente ContaIA, potenciado por <strong>NotebookLM</strong> de Google. 🧠</p>
          <p style="margin-top:8px">Tengo cargada la base de conocimiento de <strong>ARCA 2025-2026</strong>: Monotributo, Ganancias, Bienes Personales, Facturación y más. Perfil activo: <strong>${nombre}</strong>.</p>
          <p style="margin-top:8px">
            <a href="${NOTEBOOK_URL}" target="_blank" style="color:var(--primary-light);font-size:0.8rem">
              📓 Ver notebook en NotebookLM →
            </a>
          </p>
          <p style="margin-top:8px">¿En qué te puedo ayudar hoy?</p>
        </div>
      </div>
    `;
  }

  function renderSugerencias() {
    const container = document.getElementById('ia-preguntas-rapidas');
    if (!container) return;

    const tipo = empresa?.tipo || 'monotributista';
    const categoria = empresa?.categoriaMonotributo;

    // Personalize questions based on profile
    let preguntas = [...PREGUNTAS_RAPIDAS];
    if (tipo === 'monotributista' && categoria) {
      preguntas.unshift(`¿Estoy correctamente en categoría ${categoria} del monotributo?`);
    }

    container.innerHTML = preguntas.slice(0, 6).map(p => `
      <button class="pregunta-rapida" onclick="IAView.enviarPregunta(this.textContent)">
        ${p}
      </button>
    `).join('');
  }

  function renderHistorial() {
    const container = document.getElementById('ia-historial');
    if (!container) return;

    const sugerencias = Storage.getSugerenciasIA(email);
    if (sugerencias.length === 0) {
      container.innerHTML = `<div class="text-xs text-muted text-center p-16">Sin conversaciones anteriores</div>`;
      return;
    }

    container.innerHTML = sugerencias.slice(0, 5).map(s => `
      <div class="historial-item" onclick="IAView.cargarConversacion('${s.id}')">
        <div class="historial-pregunta truncate">${s.pregunta}</div>
        <div class="historial-fecha">${Utils.formatFechaRelativa(s.fecha)}</div>
      </div>
    `).join('');
  }

  async function enviarPregunta(pregunta) {
    if (!pregunta?.trim() || isLoading) return;
    isLoading = true;

    const input = document.getElementById('ia-input');
    const chat = document.getElementById('ia-chat');
    const btn = document.getElementById('ia-send-btn');

    if (input) input.value = '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span>'; }

    // Add user message
    appendMessage('user', pregunta);

    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    appendLoading(loadingId);

    let respuesta = '';
    try {
      respuesta = await callBackendAPI(pregunta);
    } catch (e) {
      console.error(e);
      respuesta = "❌ Ocurrió un error al consultar al servidor local. Verificá que el servidor backend (`node server.js`) esté corriendo en tu computadora.";
    }

    // Remove loading, add response
    document.getElementById(loadingId)?.remove();
    appendMessage('bot', respuesta);

    // Save to history
    Storage.addSugerenciaIA(email, { pregunta, respuesta });
    renderHistorial();

    isLoading = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '📤 Enviar'; }

    // Scroll to bottom
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function appendMessage(role, content) {
    const chat = document.getElementById('ia-chat');
    if (!chat) return;

    const div = document.createElement('div');
    div.className = `ia-message ia-message-${role} animate-fade-in`;
    
    // Make links clickable dynamically for markdown links
    let formattedContent = formatResponse(content);
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary-light);text-decoration:underline">$1</a>');

    div.innerHTML = `
      <div class="ia-bubble ia-bubble-${role === 'user' ? 'user' : 'bot'}">
        ${role === 'bot' ? '<span class="ia-bot-icon">🤖</span>' : ''}
        <div class="ia-bubble-content">${formattedContent}</div>
      </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function appendLoading(id) {
    const chat = document.getElementById('ia-chat');
    if (!chat) return;

    const div = document.createElement('div');
    div.id = id;
    div.className = 'ia-message ia-message-bot animate-fade-in';
    div.innerHTML = `
      <div class="ia-bubble ia-bubble-bot">
        <span class="ia-bot-icon">🤖</span>
        <div class="ia-loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function formatResponse(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  async function callBackendAPI(pregunta) {
    const url = `http://localhost:3000/api/chat`;

    const tipo = empresa?.tipo || 'monotributista';
    const categoria = empresa?.categoriaMonotributo || 'no especificada';
    const nombre = empresa?.nombreEmpresa || empresa?.nombreDuenio || 'usuario';
    const deudas = empresa?.deudas === 'si' ? 'Tiene deudas pendientes' : 'Al día';

    const preguntaContextualizada = `Actuá como ContaIA, asesor fiscal de Argentina. Usuario: ${nombre} (${tipo}, Categoría: ${categoria}, Deudas: ${deudas}). Responde la siguiente pregunta de forma MUY BREVE (máximo 2 párrafos) y con un lenguaje natural, directo y amigable, basándote en tu conocimiento de ARCA: ${pregunta}`;

    const payload = {
      pregunta: preguntaContextualizada
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();
    return data.respuesta;
  }

  function enviarDesdeInput() {
    const input = document.getElementById('ia-input');
    if (input && input.value.trim()) {
      enviarPregunta(input.value.trim());
    }
  }

  function renderSugerenciasCards() {
    const container = document.getElementById('ia-sugerencias-cards');
    if (!container) return;

    const tipo = empresa?.tipo || 'monotributista';
    const sugerencias = [
      ...(SUGERENCIAS_BASE[tipo] || []),
      ...SUGERENCIAS_BASE.general,
    ];

    container.innerHTML = sugerencias.map(s => {
      const colors = { alerta: 'warning', consejo: 'info', info: 'primary', urgente: 'danger' };
      const color = colors[s.tipo] || 'info';

      return `
        <div class="sugerencia-card glass-card animate-fade-in" data-animate>
          <div class="sugerencia-header">
            <h4 class="sugerencia-titulo">${s.titulo}</h4>
            <span class="badge badge-${color}">${s.tipo}</span>
          </div>
          <p class="sugerencia-contenido">${s.contenido}</p>
          ${s.accion ? `
            <button class="btn btn-secondary btn-sm mt-8" onclick="App.navigate('${s.accionLink}')">
              ${s.accion} →
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function cargarConversacion(id) {
    Utils.toast('Conversación cargada', 'info');
  }

  return {
    init, render, enviarPregunta, enviarDesdeInput,
    renderSugerenciasCards, cargarConversacion
  };
})();

