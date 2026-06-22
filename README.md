# ContaIA — Contador Online Inteligente

Sistema de contabilidad online con automatización e IA para monotributistas y empresas argentinas.

## 🚀 Tecnologías
- HTML + CSS + JavaScript (vanilla)
- localStorage para persistencia
- Motor IA contextual (NotebookLM)
- Datos fiscales de ARCA 2025-2026

## 📁 Estructura
```
├── index.html          # Login / Registro
├── app.html            # Aplicación principal (SPA)
├── css/
│   └── main.css        # Design system (dark mode + glassmorphism)
├── js/
│   ├── storage.js      # Persistencia localStorage
│   ├── utils.js        # Utilidades (fechas, CUIT, etc.)
│   ├── auth.js         # Autenticación
│   ├── onboarding.js   # Primer ingreso
│   ├── dashboard.js    # Panel principal
│   ├── calendar.js     # Calendario fiscal
│   ├── novedades.js    # Feed de noticias ARCA
│   ├── ia.js           # Asistente IA (NotebookLM)
│   └── app.js          # Controlador principal / Router
└── data/
    ├── calendario_arca.json   # Vencimientos 2025-2026
    └── novedades_arca.json    # Noticias ARCA
```

## 📖 Cómo usar
1. Abrí `index.html` en tu navegador
2. Registrate con email y contraseña
3. Completá el onboarding con los datos de tu negocio
4. Explorá el dashboard, calendario fiscal y asistente IA

## 🤖 Notebook NotebookLM
Base de conocimiento ARCA integrada:
https://notebooklm.google.com/notebook/f61ac173-b64f-4b14-b87b-343638438875

## 📚 Materia
Ingeniería de Software — TP Automatización
