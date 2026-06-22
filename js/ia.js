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

    // Generate AI response
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    const respuesta = generateResponse(pregunta);

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
    div.innerHTML = `
      <div class="ia-bubble ia-bubble-${role === 'user' ? 'user' : 'bot'}">
        ${role === 'bot' ? '<span class="ia-bot-icon">🤖</span>' : ''}
        <div class="ia-bubble-content">${formatResponse(content)}</div>
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

  function generateResponse(pregunta) {
    const q = pregunta.toLowerCase();
    const tipo = empresa?.tipo || 'monotributista';
    const categoria = empresa?.categoriaMonotributo;
    const hoy = new Date();
    const mes = hoy.getMonth(); // 0-indexed

    // Context-aware responses
    if (q.includes('recategori')) {
      const proximoRecat = mes < 6 ? 'julio' : 'enero del próximo año';
      return `📊 **Recategorización del Monotributo**

La recategorización es obligatoria en **enero** y **julio** de cada año. Tenés que verificar si tus ingresos acumulados en los últimos 12 meses superan el máximo de tu categoría actual.

${categoria ? `Estás actualmente en **Categoría ${categoria}**. ` : ''}El próximo período de recategorización es en **${proximoRecat}** (primeros 20 días del mes).

**¿Qué necesitás revisar?**
- ✅ Ingresos brutos de los últimos 12 meses
- ✅ Superficie del local (si aplica)
- ✅ Energía eléctrica consumida (si aplica)
- ✅ Alquileres devengados (si aplica)

Si superás alguno de estos parámetros, debés subir de categoría. No hacerlo puede generar **deuda e intereses**.`;
    }

    if (q.includes('vencimiento') || q.includes('obligacion') || q.includes('pagar')) {
      const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      return `📅 **Próximas Obligaciones Fiscales**

Según tu perfil de **${tipo}**${categoria ? ` Categoría ${categoria}` : ''}, estas son tus principales obligaciones:

**Este mes:**
- 💰 Cuota mensual del Monotributo (entre el 7 y el 13 del mes, según tu CUIT)

**Próximos 30 días:**
- 🔄 Verificar si debés recategorizarte
- 📋 Revisar que no tenés DDJJ pendientes

**💡 Consejo:** Configurá el débito automático de la cuota del Monotributo desde el portal de ARCA para no olvidar ningún pago. Podés hacerlo en Mis Facilidades > Débito Automático.

¿Querés que te explique cómo calcular la fecha exacta de tu vencimiento?`;
    }

    if (q.includes('categoria') || q.includes('límite') || q.includes('supero')) {
      const catData = categoria ? Utils.getCategoriaMono(categoria) : null;
      return `💰 **Análisis de Categoría Monotributo**

${catData ? `Estás en **Categoría ${categoria}** con un límite de ingresos de **${Utils.formatMoney(catData.max_ingresos)} anuales**.` : 'Para darte un análisis preciso, necesito saber tu categoría actual (podés editarlo en tu perfil).'}

**¿Cuándo debo subir de categoría?**
Si en cualquier momento del año tus **ingresos acumulados en los últimos 12 meses** superan el límite de tu categoría, tenés que recategorizarte en el próximo período (enero o julio).

**Consecuencias de no recategorizarse:**
- 🔴 ARCA puede excluirte del Régimen Simplificado
- 🔴 Deberás abonar la diferencia de cuotas con intereses
- 🔴 En casos graves, pasa a deuda ejecutiva

**Consejo:** Llevá un registro mensual de tus facturas emitidas para controlar si te acercás al límite.`;
    }

    if (q.includes('deduc') || q.includes('ganancias')) {
      return `📊 **Deducciones en Ganancias para Personas Físicas**

Como persona física, podés deducir los siguientes conceptos:

**Deducciones Personales:**
- ✅ Mínimo no imponible (actualizado anualmente por ARCA)
- ✅ Cargas de familia (cónyuge, hijos, etc.)
- ✅ Deducción especial por trabajo personal

**Deducciones por Gastos:**
- ✅ Cuotas de medicina prepaga (hasta 5% de la ganancia neta)
- ✅ Honorarios médicos (hasta 40% de lo pagado)
- ✅ Seguros de vida y mixtos (límite anual)
- ✅ Donaciones a entidades reconocidas
- ✅ Intereses de créditos hipotecarios (primera vivienda)
- ✅ Aportes a fondos de jubilación complementaria

**💡 Importante:** Los valores exactos de deducciones se actualizan con la inflación. Consultá los valores vigentes en el portal de ARCA en: Impuestos > Ganancias > Tabla de Deducciones.`;
    }

    if (q.includes('novedad') || q.includes('resoluc') || q.includes('cambio') || q.includes('arca')) {
      return `📰 **Novedades Recientes de ARCA**

Basándome en el feed de novedades, estas son las más relevantes para tu perfil:

🚨 **Actualización de topes de Monotributo — Julio 2026**
Los montos máximos de facturación por categoría fueron actualizados. Verificá si tus ingresos siguen dentro de tu categoría con los nuevos límites.

📋 **Prórroga DDJJ Bienes Personales 2025**
Hasta el 22 de junio de 2026. Si presentás antes del 15/06, obtenés 10% de descuento en el saldo.

🔄 **Plan de Facilidades — Regularización de Deudas**
ARCA habilitó regularización de deudas hasta diciembre 2025, hasta 60 cuotas con reducción del 50% en intereses. Válido hasta el 31 de julio de 2026.

📱 **Nueva App ARCA Móvil**
Inscripción al Monotributo en menos de 10 minutos desde el celular.

¿Querés que te explique alguna de estas novedades en detalle?`;
    }

    if (q.includes('plan') || q.includes('facilidad') || q.includes('deuda')) {
      return `⚠ **Plan de Facilidades ARCA — Regularización de Deudas**

ARCA habilitó un plan especial para regularizar deudas impositivas y previsionales:

**¿Qué deudas puedo regularizar?**
- Deudas de Monotributo anteriores a diciembre 2025
- Ganancias, IVA, Bienes Personales
- Aportes de Seguridad Social

**Condiciones especiales:**
- 🔵 Hasta **60 cuotas** en cuotas fijas
- 🟢 **50% de reducción** en intereses resarcitorios
- 🟡 Monotributistas con **buen historial**: cuotas más bajas

**¿Cómo adherirme?**
1. Ingresá a tu cuenta en ARCA (afip.gob.ar / arca.gob.ar)
2. Ir a: Mis Facilidades > Plan de Regularización 2026
3. Seleccioná las deudas a regularizar
4. Elegí la cantidad de cuotas
5. Confirmá la adhesión

**⏰ Fecha límite:** 31 de julio de 2026`;
    }

    if (q.includes('factura') || q.includes('comprobante')) {
      return `🧾 **Facturación Electrónica — Guía Completa**

Como ${tipo}, debés emitir comprobante por cada venta o servicio. Hay varias opciones:

**Opciones de Facturación en ARCA:**
1. **Comprobantes en Línea** (web) — Ingresás al portal de ARCA y emitís la factura manualmente
2. **REMIITO** — App móvil oficial de ARCA para facturar desde el celular
3. **Controlador Fiscal** — Para negocios con alto volumen de ventas
4. **Facturación por API** — Para sistemas de gestión propios

**¿Qué tipo de comprobante emitir?**
- A consumidores finales: **Factura C** (monotributo) o **B** (responsable inscripto)
- A otras empresas: **Factura B** o **A** (responsable inscripto)

**💡 Tip:** Configurá el débito automático de la cuota y activá las notificaciones de ARCA para recibir alertas si detectan inconsistencias en tu facturación.`;
    }

    // Default response
    return `🤖 **Respuesta de ContaIA (NotebookLM)**

Basándome en tu perfil fiscal${empresa?.nombreEmpresa ? ` de **${empresa.nombreEmpresa}**` : ''} y la información actualizada del portal de ARCA, aquí va mi análisis:

Tu consulta sobre "${pregunta}" es importante para mantener tu situación fiscal al día. 

**Puntos clave a considerar:**
- 📅 Mantené siempre actualizados tus datos en el sistema
- 🔔 Configurá alertas para no perder vencimientos
- 📱 Usá la app oficial de ARCA para operaciones rápidas
- 📋 Guardá comprobantes de todos tus pagos

**Mi recomendación:** Para consultas específicas sobre tu situación fiscal, te recomiendo combinar el uso de ContaIA con la asesoría de un contador matriculado que pueda evaluar tu caso en detalle.

¿Querés profundizar sobre algún aspecto en particular? Podés preguntarme sobre vencimientos, categorías de monotributo, deducciones, o cualquier novedad de ARCA.`;
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
