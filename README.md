# FlexGuard

Una extensión de navegador que se encarga de respaldar automáticamente proyectos hechos en el framework formoseño Flexmind.

## ✨ Funcionalidades

- **📥 Descarga individual**: Botón de descarga integrado en la toolbar de CodeMirror de cada archivo abierto
- **📦 Descarga masiva**: Botón en el panel lateral para descargar todos los archivos abiertos de una vez
- **🔄 Detección automática**: Detecta cuando se abren nuevos archivos y agrega el botón automáticamente
- **🔔 Notificaciones**: Toast visual al descargar archivos
- **🛡️ Indicador de estado**: Badge en la esquina inferior derecha que muestra que FlexGuard está activo

## 🚀 Instalación

1. Abrí Chrome/Edge y andá a `chrome://extensions/`
2. Activá el **Modo desarrollador** (esquina superior derecha)
3. Hacé clic en **Cargar extensión sin empaquetar**
4. Seleccioná la carpeta `FlexGuard/`
5. ¡Listo! Abrí FlexMind IDE y vas a ver el botón de descarga verde en la barra de herramientas

## 📁 Estructura del proyecto

```
FlexGuard/
├── manifest.json       # Configuración de la extensión (Manifest V3)
├── content.js          # Script que se inyecta en las páginas del IDE
├── content.css         # Estilos para los elementos inyectados
├── popup/
│   ├── popup.html      # Popup de la extensión
│   ├── popup.css       # Estilos del popup
│   └── popup.js        # Lógica del popup
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🔧 ¿Cómo funciona?

1. El `content.js` se inyecta en todas las páginas
2. Detecta si la página es FlexMind IDE (buscando `body#layout100.ondevelope`)
3. Encuentra las toolbars de CodeMirror (`.codemirror-ui-button-frame`)
4. Agrega un botón de descarga verde junto a los botones existentes
5. Al hacer clic, toma el contenido del `<textarea>` del editor y lo descarga como archivo
6. Un `MutationObserver` vigila por nuevos archivos abiertos
