# FlexGuard

FlexGuard es una extension de navegador pensada para facilitar el trabajo diario en el ecosistema de desarrollo de la UPSTI y SIGAPP (Formosa). Su objetivo principal es permitirte respaldar tus archivos de codigo en tu computadora con un solo clic y ayudarte a ubicar rapidamente que archivo PHP corresponde a cada pantalla del sistema.

---

## Que problemas resuelve

1. **Respaldos locales rapidos:** Los entornos de programacion web internos no siempre ofrecen una opcion directa para descargar una copia local de lo que estas editando. FlexGuard agrega botones de descarga directamente en las barras de herramientas de los editores.
2. **Inspeccion de vistas en SIGAPP:** Al navegar por los menus de SIGAPP, muchas veces necesitas saber que script PHP se encarga de esa pantalla. FlexGuard te muestra la ruta exacta del modulo con solo apoyar el cursor sobre la opcion del menu.

---

## Que podes hacer con la extension

### 1. En FlexMind IDE (IDE clasico)
* **Descarga individual:** Agrega un boton verde de descarga en la barra de herramientas de cada archivo abierto en el editor. Al presionarlo, guarda el archivo con su nombre real.
* **Descarga masiva:** En el panel lateral tenes un boton para descargar de una sola vez todos los archivos que tengas abiertos en pestañas.
* **Deteccion continua:** Si abris archivos nuevos, la extension los detecta solos y les agrega su boton correspondiente sin que tengas que recargar la pagina.

### 2. En UPSTI IDE (nuevo IDE moderno)
* **Integracion nativa en la barra superior:** Se incorporan dos botones en la barra de acciones:
  * Descargar archivo activo.
  * Descargar todos los archivos abiertos.
* **Extraccion universal de codigo:** Obtiene el contenido directamente del editor Monaco (el mismo motor de VS Code), CodeMirror o cualquier variable interna del entorno.
* **Nombres reales:** Respeta el nombre original de cada archivo (por ejemplo, `ver_atp_caja_01f_abm.php`), evitando identificadores genericos del editor.

### 3. En SIGAPP (entorno de pruebas y produccion)
* **Inspector de modulos en tiempo real:** Al pasar el cursor sobre cualquier opcion del menu lateral izquierdo o del buscador de modulos, aparece un panel flotante que indica la ruta completa del archivo PHP (por ejemplo: `modulos/atp_acta_05/php/ver_atp_acta_05.php`) y su identificador.
* **Atajo para copiar la ruta:** Manteniendo presionada la tecla Alt y haciendo clic sobre cualquier opcion del menu, la extension copia la ruta del archivo al portapapeles y te avisa mediante una notificacion en pantalla. Asi podes ir a tu IDE y abrir el archivo inmediatamente.

---

## Como instalarla en Chrome o Edge

1. Abri tu navegador e ingresa a `chrome://extensions/`.
2. Activa el **Modo de desarrollador** (suele estar arriba a la derecha).
3. Hace clic en el boton **Cargar extension sin empaquetar**.
4. Selecciona la carpeta `FlexGuard/`.
5. Listo. La extension ya estara activa en tus pestañas de trabajo.

*Nota:* Si realizas cambios en el codigo de la extension, solo debes presionar el boton de recarga (la flecha circular) en la tarjeta de FlexGuard dentro de `chrome://extensions/` y refrescar la pagina donde estes trabajando.

---

## Estructura de archivos

* `manifest.json`: Archivo de configuracion de la extension (Manifest V3).
* `content.js`: Script principal inyectado en las paginas. Se encarga de la interfaz visual, eventos del raton, atajos de teclado y gestion de descargas.
* `content_main.js`: Script puente que corre en el contexto de la pagina web para acceder directamente a las instancias de Monaco Editor y variables globales del IDE.
* `content.css`: Estilos visuales de los botones inyectados, notificaciones toast y el panel flotante de modulos.
* `popup/`: Ventana que se abre al hacer clic sobre el icono de la extension en la barra del navegador, mostrando el estado de deteccion del sistema activo.
* `icons/`: Iconos de la extension en formato PNG transparente de 16, 48 y 128 pixeles.
