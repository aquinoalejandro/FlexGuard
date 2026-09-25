# FlexGuard

FlexGuard es una extension de navegador pensada para facilitar el trabajo diario en el ecosistema de desarrollo de la UPSTI y SIGAPP (Formosa). Su objetivo principal es permitirte respaldar tus archivos de codigo en tu computadora con un solo clic y ayudarte a ubicar rapidamente que archivo PHP corresponde a cada pantalla del sistema.

---

## Que problemas resuelve

1. **Respaldos locales rapidos:** Los entornos de programacion web internos no siempre ofrecen una opcion directa para descargar una copia local de lo que estas editando. FlexGuard agrega botones de descarga directamente en las barras de herramientas de los editores.
2. **Inspeccion de vistas en SIGAPP:** Al navegar por los menus de SIGAPP, muchas veces necesitas saber que script PHP se encarga de esa pantalla. FlexGuard te muestra la ruta exacta del modulo con solo apoyar el cursor sobre la opcion del menu.

---

## Que podes hacer con la extension

### 1. En FlexMind IDE (IDE clasico)
* **Buscador rapido de modulos (Ctrl+P / Alt+M):** Abre una ventana de busqueda tipo Spotlight. Podes pegar la ruta copiada desde SIGAPP o escribir el nombre de un archivo o modulo. Busca entre tus archivos recientes y el arbol del sistema, expande las carpetas automaticamente y abre el archivo con un solo Enter. Tambien cuenta con un boton de lupa en la barra lateral.
* **Descarga individual:** Agrega un boton verde de descarga en la barra de herramientas de cada archivo abierto en el editor. Al presionarlo, guarda el archivo con su nombre real.
* **Descarga masiva:** En el panel lateral tenes un boton para descargar de una sola vez todos los archivos que tengas abiertos en pestañas.
* **Deteccion continua:** Si abris archivos nuevos, la extension los detecta solos y les agrega su boton correspondiente sin que tengas que recargar la pagina.

### 2. En UPSTI IDE (nuevo IDE moderno)
* **Buscador rapido de modulos (Ctrl+P / Alt+M):** Permite buscar y saltar a cualquier archivo del arbol o modulo mediante teclado o a traves del boton de busqueda en la barra superior.
* **Integracion nativa en la barra superior:** Se incorporan botones en la barra de acciones:
  * Buscar modulo o archivo.
  * Descargar archivo activo.
  * Descargar todos los archivos abiertos.
* **Extraccion universal de codigo:** Obtiene el contenido directamente del editor Monaco (el mismo motor de VS Code), CodeMirror o cualquier variable interna del entorno.
* **Nombres reales:** Respeta el nombre original de cada archivo (por ejemplo, `ver_atp_caja_01f_abm.php`), evitando identificadores genericos del editor.

### 3. En SIGAPP (entorno de pruebas y produccion)
* **Inspector de modulos en tiempo real:** Al pasar el cursor sobre cualquier opcion del menu lateral izquierdo o del buscador de modulos, aparece un panel flotante que indica la ruta completa del archivo PHP (por ejemplo: `modulos/atp_acta_05/php/ver_atp_acta_05.php`) y su identificador.
* **Atajo para copiar la ruta:** Manteniendo presionada la tecla Alt y haciendo clic sobre cualquier opcion del menu, la extension copia la ruta del archivo al portapapeles y te avisa mediante una notificacion en pantalla. Al pasar a la pestaña del IDE, podes presionar Ctrl+P o hacer clic en el boton de pegar del buscador para abrirlo al instante.

### 4. Auto-actualizador desde GitHub
* **Monitoreo automático:** La extensión comprueba periódicamente el repositorio [aquinoalejandro/FlexGuard](https://github.com/aquinoalejandro/FlexGuard) para detectar nuevos commits y versiones publicadas.
* **Avisos integrados:**
  * **Insignia en el navegador:** Muestra una etiqueta `NEW` sobre el icono de la extensión en la barra de Chrome cuando hay novedades.
  * **Tarjeta en el Popup:** Te indica si estás al día o si hay una actualización disponible, detallando el mensaje del commit, autor, fecha, botón de descarga directa de ZIP y botón para copiar `git pull`.
  * **Notificación en el IDE:** En la esquina inferior derecha de FlexMind / UPSTI IDE, el indicador de FlexGuard muestra una etiqueta interactiva de actualización y un aviso flotante.
* **Actualización en un clic en Windows:** Incluye el archivo `actualizar.bat` para actualizar el código automáticamente con doble clic.

---

## Cómo instalarla en Chrome o Edge

1. Abrí tu navegador e ingresá a `chrome://extensions/`.
2. Activá el **Modo de desarrollador** (suele estar arriba a la derecha).
3. Hacé clic en el botón **Cargar extensión sin empaquetar**.
4. Seleccioná la carpeta `FlexGuard/`.
5. Listo. La extensión ya estará activa en tus pestañas de trabajo.

---

## Cómo actualizar la extensión

Cuando FlexGuard te avise que hay cambios nuevos en GitHub:
1. **Opción A (Recomendada si tenés Git):** Hacé doble clic en `actualizar.bat` o ejecutá `git pull origin main` en la terminal.
2. **Opción B (Sin Git):** Descargá el archivo `.ZIP` desde el aviso del popup o GitHub y reemplazá los archivos en la carpeta de la extensión.
3. **Paso final:** Ingresá a `chrome://extensions/`, hacé clic en el botón de **Recargar** (la flecha circular) en la tarjeta de FlexGuard y refrescá tus pestañas del IDE.

---

## Estructura de archivos

* `manifest.json`: Archivo de configuración de la extensión (Manifest V3 con permisos para background y almacenamiento).
* `version.js`: Metadatos centrales de versión, commit y enlaces del repositorio GitHub.
* `background.js`: Service worker en segundo plano que consulta la API de GitHub y administra las alarmas y badges.
* `actualizar.bat`: Script rápido para actualizar el código localmente en Windows con un clic.
* `content.js`: Script principal inyectado en las páginas. Gestiona interfaz visual, atajos, descargas y el aviso de actualización en el IDE.
* `content_main.js`: Script puente que corre en el contexto de la página web para acceder a Monaco Editor y variables del sistema.
* `content.css`: Estilos visuales de los botones inyectados, modales, toasts y la tarjeta flotante de actualización.
* `popup/`: Ventana emergente con el estado de detección del IDE, centro de actualizaciones con GitHub y resumen de funciones.
* `icons/`: Íconos de la extensión en formato PNG transparente de 16, 48 y 128 píxeles.
