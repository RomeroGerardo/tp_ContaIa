/**
 * ContaIA — Onboarding Module
 * Flujo de primer ingreso con datos de empresa
 */

const Onboarding = (() => {

  let currentStep = 1;
  const TOTAL_STEPS = 3;
  let formData = {};
  let email = '';

  function init(userEmail) {
    email = userEmail;
    currentStep = 1;
    formData = {};
    render();
  }

  function render() {
    renderProgress();
    showStep(currentStep);
  }

  function renderProgress() {
    const el = document.getElementById('onboarding-progress');
    if (!el) return;

    el.innerHTML = `
      <div class="onb-steps">
        ${[1, 2, 3].map(i => `
          <div class="onb-step ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}">
            <div class="onb-step-circle">${i < currentStep ? '✓' : i}</div>
            <div class="onb-step-label">${['Tu perfil', 'Tu negocio', 'Estado fiscal'][i - 1]}</div>
          </div>
          ${i < 3 ? '<div class="onb-step-line ' + (i < currentStep ? 'done' : '') + '"></div>' : ''}
        `).join('')}
      </div>
    `;

    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    const bar = document.getElementById('onboarding-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  function showStep(step) {
    document.querySelectorAll('.onb-step-content').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(`onb-step-${step}`);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('animate-fade-in');
    }
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    saveStepData(currentStep);
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      render();
    } else {
      complete();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      render();
    }
  }

  function validateStep(step) {
    const errorEl = document.getElementById(`onb-error-${step}`);
    if (errorEl) errorEl.classList.add('hidden');

    if (step === 1) {
      const nombre = document.getElementById('onb-nombre-duenio')?.value?.trim();
      if (!nombre || nombre.length < 2) {
        showError(step, 'Por favor ingresá tu nombre completo.');
        return false;
      }
    }

    if (step === 2) {
      const negocio = document.getElementById('onb-nombre-empresa')?.value?.trim();
      const tipo = document.getElementById('onb-tipo')?.value;
      if (!negocio || negocio.length < 2) {
        showError(step, 'Por favor ingresá el nombre de tu negocio.');
        return false;
      }
      if (!tipo) {
        showError(step, 'Por favor seleccioná el tipo de contribuyente.');
        return false;
      }
    }

    return true;
  }

  function showError(step, msg) {
    const errorEl = document.getElementById(`onb-error-${step}`);
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    }
  }

  function saveStepData(step) {
    if (step === 1) {
      formData.nombreDuenio = document.getElementById('onb-nombre-duenio')?.value?.trim();
      formData.cuit = document.getElementById('onb-cuit')?.value?.trim();
      formData.rubro = document.getElementById('onb-rubro')?.value?.trim();
    }
    if (step === 2) {
      formData.nombreEmpresa = document.getElementById('onb-nombre-empresa')?.value?.trim();
      formData.tipo = document.getElementById('onb-tipo')?.value;
      formData.categoriaMonotributo = document.getElementById('onb-categoria')?.value;
      formData.actividad = document.getElementById('onb-actividad')?.value?.trim();
    }
    if (step === 3) {
      formData.estadoPagos = document.getElementById('onb-estado-pagos')?.value;
      formData.deudas = document.getElementById('onb-deudas')?.value;
      formData.declaracionesPendientes = document.getElementById('onb-decl-pendientes')?.value;
      formData.tareasPendientes = document.getElementById('onb-tareas-pendientes')?.value?.trim();
      formData.notas = document.getElementById('onb-notas')?.value?.trim();
    }
  }

  function complete() {
    saveStepData(3);

    // Save empresa data
    Storage.saveEmpresa(email, {
      ...formData,
      completadoEn: new Date().toISOString(),
    });

    // Add initial tasks if any
    if (formData.tareasPendientes) {
      formData.tareasPendientes.split('\n').forEach(t => {
        const texto = t.trim();
        if (texto) Storage.addTarea(email, { texto, completada: false });
      });
    }

    // Mark onboarding done
    Storage.markOnboardingDone(email);

    // Show success and redirect
    const container = document.getElementById('view-onboarding');
    if (container) {
      container.innerHTML = `
        <div class="onb-success animate-fade-in" style="text-align:center;padding:80px 40px">
          <div style="font-size:4rem;margin-bottom:24px;animation:float 2s ease-in-out infinite">🎉</div>
          <h2 style="font-size:2rem;margin-bottom:12px">¡Todo listo, ${formData.nombreDuenio}!</h2>
          <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 32px">
            Tu perfil de <strong>${formData.nombreEmpresa}</strong> está configurado.
            ContaIA ya está trabajando para mantenerte al día.
          </p>
          <button class="btn btn-primary btn-lg" onclick="App.navigate('dashboard')">
            🚀 Ir al Dashboard
          </button>
        </div>
      `;
    }

    Utils.toast(`¡Bienvenido/a, ${formData.nombreDuenio}! Tu perfil fue creado.`, 'success', 5000);
  }

  // Handle tipo change to show/hide categoria
  function onTipoChange() {
    const tipo = document.getElementById('onb-tipo')?.value;
    const catGroup = document.getElementById('cat-mono-group');
    if (catGroup) {
      catGroup.classList.toggle('hidden', tipo !== 'monotributista');
    }
  }

  return { init, render, nextStep, prevStep, onTipoChange };
})();
