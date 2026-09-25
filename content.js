/**
 * FlexGuard - Content Script
 * 
 * Soporta DOS versiones del IDE:
 *   1. FlexMind Clásico  – body#layout100.ondevelope, CodeMirror toolbar
 *   2. UPSTI IDE (nuevo) – body.enable-motion, .titlebar-actions
 * 
 * Detecta cuál IDE está presente e inyecta botones de descarga
 * integrados con la UI nativa de cada versión.
 */

(function () {
  'use strict';

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  UTILIDADES COMPARTIDAS                                         ║
  // ╚══════════════════════════════════════════════════════════════════╝

  /** Descarga un string como archivo */
  function downloadFile(fileName, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Toast de notificación */
  function showToast(message, type = 'success') {
    const existing = document.getElementById('flexguard-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'flexguard-toast';
    toast.className = `flexguard-toast flexguard-toast--${type}`;
    toast.innerHTML = `
      <span class="flexguard-toast__icon">${type === 'success' ? '✓' : '✗'}</span>
      <span class="flexguard-toast__text">${message}</span>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('flexguard-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('flexguard-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /** Badge indicador de FlexGuard activo */
  function injectBadge() {
    if (document.getElementById('flexguard-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'flexguard-badge';
    badge.className = 'flexguard-badge';
    badge.innerHTML = `
      <span class="flexguard-badge__dot"></span>
      <span class="flexguard-badge__text">FlexGuard</span>
    `;
    badge.title = 'FlexGuard está activo';
    document.body.appendChild(badge);
  }

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  VARIANTE 1 – FlexMind Clásico (ideFlex / layout100)           ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const classicIDE = {

    detect() {
      const body = document.getElementById('layout100');
      return !!(body && body.classList.contains('ondevelope'));
    },

    /** Nombre del archivo desde el tab (#crumbs) */
    getFileName(sectionId) {
      const fileId = sectionId.replace('contentSystem_', '');
      const tab = document.querySelector(`#showSys${fileId}`);
      if (tab) {
        const span = tab.querySelector('span');
        if (span) return span.textContent.trim();
      }
      const table = document.querySelector(`#table_ide_edit_${fileId}`);
      if (table) {
        const modeClass = Array.from(table.classList).find(c => c.startsWith('mode'));
        const ext = modeClass ? modeClass.replace('mode', '') : 'txt';
        return `archivo_${fileId}.${ext}`;
      }
      return `archivo_${fileId}.txt`;
    },

    /** Contenido desde el textarea oculto de CodeMirror */
    getContent(sectionId) {
      const fileId = sectionId.replace('contentSystem_', '');
      const textarea = document.getElementById(`code_${fileId}`);
      return textarea ? textarea.value : null;
    },

    /** Crear botón de descarga estilo CodeMirror */
    createDownloadButton(sectionId) {
      const btn = document.createElement('a');
      btn.className = 'codemirror-ui-button flexguard-download';
      btn.title = 'Descargar archivo (FlexGuard)';
      btn.setAttribute('original-title', 'Descargar archivo (FlexGuard)');
      btn.href = 'javascript:;';
      btn.innerHTML = '<span class="icomoon-icon-download icon16" style="color:#2ecc71;"></span>';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const content = this.getContent(sectionId);
        if (content === null) {
          showToast('No se pudo obtener el contenido del archivo.', 'error');
          return;
        }
        const fileName = this.getFileName(sectionId);
        downloadFile(fileName, content);
        showToast(`Descargado: ${fileName}`);
      });

      return btn;
    },

    /** Inyectar botones en las toolbars de CodeMirror */
    injectButtons() {
      const sections = document.querySelectorAll('section.contentSystem[id^="contentSystem_"]');
      const self = this;

      sections.forEach(section => {
        const sectionId = section.id;
        if (sectionId === 'contentSystemHome') return;

        const toolbar = section.querySelector('.codemirror-ui-clearfix.codemirror-ui-button-frame');
        if (!toolbar || toolbar.querySelector('.flexguard-download')) return;

        const downloadBtn = self.createDownloadButton(sectionId);
        const sep = document.createElement('span');
        sep.className = 'codemirror-ui-sep';

        const findPopup = toolbar.querySelector('.codemirror-ui-popup-find-wrap');
        if (findPopup) {
          toolbar.insertBefore(sep, findPopup);
          toolbar.insertBefore(downloadBtn, findPopup);
        } else {
          toolbar.appendChild(sep);
          toolbar.appendChild(downloadBtn);
        }
      });
    },

    /** Botón "Descargar Todo" en panel lateral */
    injectDownloadAllButton() {
      const btnPanel = document.querySelector('.btnPanelsWrap');
      if (!btnPanel || btnPanel.querySelector('.flexguard-download-all')) return;

      const self = this;
      const btn = document.createElement('a');
      btn.className = 'tooltip ne flexguard-download-all';
      btn.href = 'javascript:;';
      btn.title = 'Descargar todos los archivos abiertos (FlexGuard)';
      btn.setAttribute('original-title', 'Descargar todos los archivos abiertos (FlexGuard)');
      btn.innerHTML = '<span class="icomoon-icon-box-add icon24" style="color:#2ecc71;"></span>';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sections = document.querySelectorAll('section.contentSystem[id^="contentSystem_"]');
        let count = 0;
        sections.forEach(section => {
          if (section.id === 'contentSystemHome') return;
          const content = self.getContent(section.id);
          if (content === null) return;
          const fileName = self.getFileName(section.id);
          setTimeout(() => downloadFile(fileName, content), count * 300);
          count++;
        });
        showToast(`Descargando ${count} archivo(s)...`);
      });

      btnPanel.insertBefore(btn, btnPanel.firstChild);
    },

    /** Observer para nuevos archivos */
    observe() {
      const filesContent = document.getElementById('files_content');
      if (!filesContent) return;
      const self = this;
      const observer = new MutationObserver(() => self.injectButtons());
      observer.observe(filesContent, { childList: true, subtree: true });
    },

    init() {
      console.log('[FlexGuard] FlexMind Clásico detectado.');
      this.injectButtons();
      this.injectDownloadAllButton();
      this.observe();
    }
  };

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  VARIANTE 2 – UPSTI IDE (nuevo, body.enable-motion)            ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const upstiIDE = {

    detect() {
      return document.body.classList.contains('enable-motion') &&
             !!document.querySelector('.titlebar');
    },

    /** Nombre del archivo activo desde el breadcrumb, panel de info o árbol */
    getActiveFileName() {
      // 1. Breadcrumb: .breadcrumb .file
      const fileSpan = document.querySelector('.breadcrumb .file');
      if (fileSpan) {
        const text = fileSpan.textContent.replace(/\s+/g, ' ').trim();
        if (text) return text;
      }
      // 2. Fallback: panel de información lateral (.resume-value.mono)
      const resumeFile = document.querySelector('#side-info .resume-value.mono');
      if (resumeFile && resumeFile.textContent.trim()) {
        return resumeFile.textContent.trim();
      }
      // 3. Fallback: nodo seleccionado en árbol (.tnode.selected .fname)
      const selected = document.querySelector('.tnode.selected .fname');
      if (selected && selected.textContent.trim()) {
        const full = selected.textContent.trim();
        const parts = full.split('/');
        return parts[parts.length - 1];
      }
      return null;
    },

    /** ID del archivo activo desde el nodo seleccionado del árbol */
    getActiveFileId() {
      const selected = document.querySelector('.tnode.selected');
      if (selected) return selected.getAttribute('data-key');
      return null;
    },

    /** Obtener contenido del archivo activo via bridge (content_main.js) */
    requestContent(callback) {
      const fileId = this.getActiveFileId();
      const fileName = this.getActiveFileName();
      let handled = false;

      function onResponse(e) {
        if (handled) return;
        if (e.detail && e.detail.action === 'content') {
          handled = true;
          window.removeEventListener('flexguard-response', onResponse);
          callback(e.detail.content);
        }
      }

      window.addEventListener('flexguard-response', onResponse);

      window.dispatchEvent(new CustomEvent('flexguard-request', {
        detail: { action: 'getContent', fileId: fileId, fileName: fileName }
      }));

      // Timeout con fallback directo del DOM si el bridge no responde
      setTimeout(() => {
        if (!handled) {
          handled = true;
          window.removeEventListener('flexguard-response', onResponse);

          // Fallbacks directos en DOM
          let fallback = null;
          const monacoLines = document.querySelector('.monaco-editor .view-lines');
          if (monacoLines && monacoLines.innerText) fallback = monacoLines.innerText;

          const cmCode = document.querySelector('.CodeMirror-code');
          if (!fallback && cmCode && cmCode.innerText) fallback = cmCode.innerText;

          const cm6Content = document.querySelector('.cm-content');
          if (!fallback && cm6Content && cm6Content.innerText) fallback = cm6Content.innerText;

          callback(fallback);
        }
      }, 1500);
    },

    /** Obtener todos los contenidos via bridge */
    requestAllContents(callback) {
      let handled = false;

      function onResponse(e) {
        if (handled) return;
        if (e.detail && e.detail.action === 'allContents') {
          handled = true;
          window.removeEventListener('flexguard-response', onResponse);
          callback(e.detail.files || []);
        }
      }

      window.addEventListener('flexguard-response', onResponse);

      const activeFileName = this.getActiveFileName();
      window.dispatchEvent(new CustomEvent('flexguard-request', {
        detail: { action: 'getAllContents', activeFileName: activeFileName }
      }));

      setTimeout(() => {
        if (!handled) {
          handled = true;
          window.removeEventListener('flexguard-response', onResponse);
          callback([]);
        }
      }, 1500);
    },

    /** Crear botón de descarga estilo UPSTI */
    createDownloadButton() {
      const btn = document.createElement('button');
      btn.id = 'btn-flexguard-download';
      btn.className = 'flexguard-upsti-btn';
      btn.title = 'Descargar archivo activo (FlexGuard)';
      btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

      const self = this;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const fileName = self.getActiveFileName();
        if (!fileName) {
          showToast('No hay archivo activo para descargar.', 'error');
          return;
        }

        self.requestContent((content) => {
          if (content) {
            downloadFile(fileName, content);
            showToast(`Descargado: ${fileName}`);
          } else {
            showToast('No se pudo obtener el contenido del archivo.', 'error');
          }
        });
      });

      return btn;
    },

    /** Crear botón "Descargar Todo" para UPSTI */
    createDownloadAllButton() {
      const btn = document.createElement('button');
      btn.id = 'btn-flexguard-download-all';
      btn.className = 'flexguard-upsti-btn';
      btn.title = 'Descargar todos los archivos abiertos (FlexGuard)';
      btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><svg width="8" height="8" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-left:-2px"><path d="M12 5v14M5 12h14"></path></svg>`;

      const self = this;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        self.requestAllContents((files) => {
          if (files.length === 0) {
            // Fallback: descargar al menos el archivo activo
            const fileName = self.getActiveFileName();
            if (fileName) {
              self.requestContent((content) => {
                if (content) {
                  downloadFile(fileName, content);
                  showToast(`Descargado: ${fileName}`);
                } else {
                  showToast('No se encontraron archivos para descargar.', 'error');
                }
              });
            } else {
              showToast('No hay archivos abiertos.', 'error');
            }
            return;
          }

          const activeName = self.getActiveFileName();

          files.forEach((file, i) => {
            let fileName = file.fileName;

            // Detectar si el nombre es genérico o no válido
            const isGeneric = !fileName ||
                              fileName.startsWith('archivo_monaco_') ||
                              fileName.startsWith('monaco_') ||
                              /^\d+(\.[a-zA-Z0-9]+)?$/.test(fileName);

            if (isGeneric) {
              // 1. Si es el único archivo o el primero, usar el archivo activo
              if (files.length === 1 && activeName) {
                fileName = activeName;
              } else if (file.fileId) {
                // 2. Buscar por data-key en el árbol si es un ID de archivo
                const tnode = document.querySelector(`.tnode[data-key="${file.fileId}"]`);
                if (tnode) {
                  const fnameEl = tnode.querySelector('.fname');
                  if (fnameEl) {
                    const txt = fnameEl.textContent.trim();
                    const parts = txt.split('/');
                    fileName = parts[parts.length - 1];
                  }
                }
              }
            }

            // Fallback final
            if (!fileName || isGeneric) {
              if (i === 0 && activeName) {
                fileName = activeName;
              } else {
                fileName = `archivo_${i + 1}.php`;
              }
            }

            // Asegurar extensión si no tiene
            if (!fileName.includes('.')) {
              fileName += '.php';
            }

            setTimeout(() => downloadFile(fileName, file.content), i * 300);
          });

          showToast(`Descargando ${files.length} archivo(s)...`);
        });
      });

      return btn;
    },

    /** Inyectar botones en la titlebar */
    injectButtons() {
      const actions = document.querySelector('.titlebar-actions');
      if (!actions || actions.querySelector('#btn-flexguard-download')) return;

      const sep = document.createElement('span');
      sep.className = 'flexguard-upsti-sep';

      const downloadBtn = this.createDownloadButton();
      const downloadAllBtn = this.createDownloadAllButton();

      actions.appendChild(sep);
      actions.appendChild(downloadBtn);
      actions.appendChild(downloadAllBtn);
    },

    /** Observer para cambios de archivo activo */
    observe() {
      const self = this;

      const breadcrumb = document.getElementById('breadcrumb');
      if (breadcrumb) {
        const observer = new MutationObserver(() => self.injectButtons());
        observer.observe(breadcrumb, { childList: true, subtree: true });
      }

      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        const observer = new MutationObserver(() => self.injectButtons());
        observer.observe(sidebar, { childList: true, subtree: true });
      }
    },

    init() {
      console.log('[FlexGuard] UPSTI IDE detectado.');
      this.injectButtons();
      this.observe();
    }
  };

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  INICIALIZACIÓN                                                 ║
  // ╚══════════════════════════════════════════════════════════════════╝

  function init() {
    let detected = false;

    if (classicIDE.detect()) {
      classicIDE.init();
      detected = true;
    } else if (upstiIDE.detect()) {
      upstiIDE.init();
      detected = true;
    }

    if (detected) {
      injectBadge();
      console.log('[FlexGuard] Controles inyectados correctamente.');
    }
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  }

})();
