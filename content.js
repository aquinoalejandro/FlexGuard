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

  /** Badge indicador de FlexGuard activo con soporte para avisos de actualización */
  function injectBadge() {
    let badge = document.getElementById('flexguard-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'flexguard-badge';
      badge.className = 'flexguard-badge';
      badge.innerHTML = `
        <span class="flexguard-badge__dot"></span>
        <span class="flexguard-badge__text">FlexGuard</span>
      `;
      badge.title = 'FlexGuard está activo';
      document.body.appendChild(badge);
    }

    // Comprobar si hay una actualización de GitHub disponible
    checkUpdateNotification(badge);
  }

  /** Consulta al background si hay actualizaciones de GitHub disponibles */
  function checkUpdateNotification(badge) {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;

    try {
      chrome.runtime.sendMessage({ action: 'GET_UPDATE_INFO' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.info) return;

        const info = response.info;
        const isDismissed = (response.dismissed && response.dismissed === info.remoteSha);

        if (info.hasUpdate && !isDismissed) {
          applyBadgeUpdateUI(badge, info);
          showUpdateBannerOnce(info);
        }
      });
    } catch (e) {
      // Ignorar si el contexto de la extensión se reinició
    }
  }

  /** Aplica el estilo y popover interactivo al badge del IDE */
  function applyBadgeUpdateUI(badge, info) {
    if (!badge) return;
    badge.classList.add('flexguard-badge--has-update');
    badge.innerHTML = `
      <span class="flexguard-badge__dot flexguard-badge__dot--pulse"></span>
      <span class="flexguard-badge__text">FlexGuard</span>
      <span class="flexguard-badge__pill">Actualización</span>
    `;
    badge.title = `Actualización de FlexGuard en GitHub: "${info.commitMsg || ''}" (Clic para ver)`;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      const existing = document.getElementById('flexguard-update-popover');
      if (existing) {
        existing.remove();
        return;
      }

      const popover = document.createElement('div');
      popover.id = 'flexguard-update-popover';
      popover.className = 'flexguard-update-popover';
      popover.innerHTML = `
        <div class="flexguard-update-popover__header">
          <div class="flexguard-update-popover__title">
            <span>⚡ Nueva versión en GitHub</span>
          </div>
          <button class="flexguard-update-popover__close" id="fgPopoverClose" title="Cerrar">✕</button>
        </div>
        <div class="flexguard-update-popover__body">
          <span>Hay una nueva versión de FlexGuard con mejoras de código:</span>
          <div class="flexguard-update-popover__commit">
            "${escapeText(info.commitMsg || 'Mejoras en el código')}"
          </div>
          <span style="font-size: 10px; color: #94a3b8;">Commit #${escapeText(info.remoteShort || '')} • ${escapeText(info.author || 'aquinoalejandro')}</span>
        </div>
        <div class="flexguard-update-popover__actions">
          <a href="${info.zipDownloadUrl || 'https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip'}" target="_blank" class="flexguard-update-popover__btn flexguard-update-popover__btn--primary">
            Descargar .ZIP
          </a>
          <a href="${info.commitUrl || 'https://github.com/aquinoalejandro/FlexGuard/commits/main'}" target="_blank" class="flexguard-update-popover__btn flexguard-update-popover__btn--secondary">
            Ver cambios ↗
          </a>
        </div>
      `;

      document.body.appendChild(popover);

      const btnClose = popover.querySelector('#fgPopoverClose');
      if (btnClose) {
        btnClose.addEventListener('click', (ev) => {
          ev.stopPropagation();
          popover.remove();
        });
      }
    });

    // Cerrar popover al hacer clic fuera
    document.addEventListener('click', (e) => {
      const popover = document.getElementById('flexguard-update-popover');
      if (popover && !popover.contains(e.target) && !badge.contains(e.target)) {
        popover.remove();
      }
    });
  }

  /** Muestra banner deslizable 1 sola vez por pestaña/sesión para no ser invasivo */
  function showUpdateBannerOnce(info) {
    if (sessionStorage.getItem('flexguard_update_banner_shown') === info.remoteSha) return;

    const banner = document.createElement('div');
    banner.className = 'flexguard-update-banner';
    banner.innerHTML = `
      <div class="flexguard-update-banner__icon">⚡</div>
      <div class="flexguard-update-banner__text">
        <span class="flexguard-update-banner__title">FlexGuard: Actualización disponible en GitHub</span>
        <span class="flexguard-update-banner__desc">${escapeText(info.commitMsg || 'Nuevas mejoras de código disponibles')}</span>
      </div>
      <div class="flexguard-update-banner__actions">
        <a href="${info.commitUrl || 'https://github.com/aquinoalejandro/FlexGuard/commits/main'}" target="_blank" class="flexguard-update-banner__btn">
          Ver cambios
        </a>
        <button class="flexguard-update-banner__close" title="Cerrar">✕</button>
      </div>
    `;

    document.body.appendChild(banner);
    sessionStorage.setItem('flexguard_update_banner_shown', info.remoteSha || '1');

    const closeBtn = banner.querySelector('.flexguard-update-banner__close');
    const dismiss = () => {
      banner.classList.add('hiding');
      setTimeout(() => banner.remove(), 250);
    };

    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 12000);
  }

  function escapeText(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

    /** Botón "Buscar Módulo" en panel lateral */
    injectSearchButton() {
      const btnPanel = document.querySelector('.btnPanelsWrap');
      if (!btnPanel || btnPanel.querySelector('.flexguard-search-btn')) return;

      const btn = document.createElement('a');
      btn.className = 'tooltip ne flexguard-search-btn';
      btn.href = 'javascript:;';
      btn.title = 'Buscar módulo o archivo (Ctrl+P / Alt+M)';
      btn.setAttribute('original-title', 'Buscar módulo o archivo (Ctrl+P / Alt+M)');
      btn.innerHTML = '<span class="icomoon-icon-search-2 blue icon24" style="color:#1e60d5;"></span>';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        moduleFinder.toggle();
      });

      const downloadAll = btnPanel.querySelector('.flexguard-download-all');
      if (downloadAll && downloadAll.nextSibling) {
        btnPanel.insertBefore(btn, downloadAll.nextSibling);
      } else {
        btnPanel.appendChild(btn);
      }
    },

    /** Botón de pegar y buscar directamente en el árbol de archivos */
    injectTreePasteButton() {
      const centerTree = document.querySelector('#treeWraper_sourceDirectory .centerTree');
      if (!centerTree || centerTree.querySelector('.flexguard-tree-paste')) return;

      const pasteBtn = document.createElement('a');
      pasteBtn.className = 'actionsTree flexguard-tree-paste';
      pasteBtn.href = 'javascript:;';
      pasteBtn.title = 'Pegar módulo desde portapapeles (FlexGuard)';
      pasteBtn.setAttribute('original-title', 'Pegar módulo desde portapapeles (FlexGuard)');
      pasteBtn.innerHTML = '<span class="icomoon-icon-paste blue" style="color:#1e60d5;"></span>';

      pasteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const applyQuery = (text) => {
          const raw = (text || '').trim();
          if (raw) {
            const clean = raw.replace(/^modulos\//i, '').replace(/^\/+|\/+$/g, '');
            const parts = clean.split('/');
            const query = parts[0] || raw;
            const input = document.getElementById('fieldSearchTree_sourceDirectory');
            if (input) {
              input.value = query;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13, which: 13 }));
              input.focus();
              showToast(`Filtrando módulo: ${query}`);
            }
          } else {
            moduleFinder.open();
          }
        };

        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(applyQuery).catch(() => moduleFinder.open());
        } else {
          moduleFinder.open();
        }
      });

      centerTree.appendChild(pasteBtn);
    },

    /** Observer para nuevos archivos */
    observe() {
      const filesContent = document.getElementById('files_content');
      if (!filesContent) return;
      const self = this;
      const observer = new MutationObserver(() => {
        self.injectButtons();
        self.injectDownloadAllButton();
        self.injectSearchButton();
        self.injectTreePasteButton();
      });
      observer.observe(filesContent, { childList: true, subtree: true });

      // También observar el árbol de directorios para asegurar el botón de pegado
      const treeWrap = document.getElementById('treeWraper_sourceDirectory');
      if (treeWrap) {
        const treeObserver = new MutationObserver(() => self.injectTreePasteButton());
        treeObserver.observe(treeWrap, { childList: true, subtree: true });
      }
    },

    init() {
      console.log('[FlexGuard] FlexMind Clásico detectado.');
      this.injectButtons();
      this.injectDownloadAllButton();
      this.injectSearchButton();
      this.injectTreePasteButton();
      this.observe();
    }
  };

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  VARIANTE 2 – UPSTI IDE (nuevo, body.enable-motion)            ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const upstiIDE = {

    detect() {
      const url = window.location.href;
      return url.includes('/ideFlex/upsti') ||
             url.includes('/upsti/') ||
             (document.body.classList.contains('enable-motion') &&
             !!document.querySelector('.titlebar'));
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

    /** Botón de búsqueda de módulo estilo UPSTI */
    createSearchButton() {
      const btn = document.createElement('button');
      btn.id = 'btn-flexguard-search';
      btn.className = 'flexguard-upsti-btn flexguard-search-btn';
      btn.title = 'Buscar módulo o archivo (Ctrl+P / Alt+M)';
      btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        moduleFinder.toggle();
      });

      return btn;
    },

    /** Inyectar botones en la titlebar */
    injectButtons() {
      const actions = document.querySelector('.titlebar-actions');
      if (!actions || actions.querySelector('#btn-flexguard-download')) return;

      const sep = document.createElement('span');
      sep.className = 'flexguard-upsti-sep';

      const searchBtn = this.createSearchButton();
      const downloadBtn = this.createDownloadButton();
      const downloadAllBtn = this.createDownloadAllButton();

      actions.appendChild(sep);
      actions.appendChild(searchBtn);
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
  // ║  BUSCADOR DE MÓDULOS (Quick Open / Command Palette)              ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const moduleFinder = {
    overlayEl: null,
    inputEl: null,
    resultsEl: null,
    pasteChipEl: null,
    items: [],
    filteredItems: [],
    selectedIndex: 0,
    isOpen: false,

    /** Determina si el entorno actual debe usar tema oscuro (ej: UPSTI IDE) */
    isDarkTheme() {
      const url = window.location.href;
      return url.includes('/ideFlex/upsti') ||
             url.includes('/upsti/') ||
             document.body.classList.contains('enable-motion') ||
             document.querySelector('.titlebar') !== null;
    },

    /** Actualiza la clase de tema en el modal */
    updateTheme() {
      if (!this.overlayEl) return;
      if (this.isDarkTheme()) {
        this.overlayEl.classList.add('fg-theme-dark');
      } else {
        this.overlayEl.classList.remove('fg-theme-dark');
      }
    },

    createUI() {
      if (this.overlayEl) return;

      const overlay = document.createElement('div');
      overlay.id = 'flexguard-modal-overlay';
      overlay.className = 'fg-modal-overlay';
      overlay.innerHTML = `
        <div class="fg-modal-box">
          <div class="fg-modal-header">
            <div class="fg-modal-title">
              <svg width="14" height="14" fill="none" stroke="#1e60d5" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Buscador de Módulos</span>
              <span class="fg-modal-subtitle">FlexGuard</span>
            </div>
            <button type="button" class="fg-modal-close-btn" title="Cerrar (Esc)">✕</button>
          </div>
          <div class="fg-modal-searchbar">
            <svg width="15" height="15" fill="none" stroke="#1e60d5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="fg-modal-input" placeholder="Buscar módulo o archivo (ej: atp_acta_05 o modulos/...)" autocomplete="off" spellcheck="false">
            <span class="fg-modal-paste-chip" style="display:none;" title="Pegar ruta del portapapeles">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              <span>Pegar</span>
            </span>
            <button type="button" class="fg-modal-clear" title="Limpiar">✕</button>
          </div>
          <div class="fg-modal-results"></div>
          <div class="fg-modal-footer">
            <div>
              <kbd>↑</kbd> <kbd>↓</kbd> navegar &nbsp;•&nbsp; <kbd>Enter</kbd> abrir &nbsp;•&nbsp; <kbd>Esc</kbd> cerrar
            </div>
            <div>
              Atajo: <kbd>Ctrl+P</kbd> o <kbd>Alt+M</kbd>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.overlayEl = overlay;
      this.inputEl = overlay.querySelector('.fg-modal-input');
      this.resultsEl = overlay.querySelector('.fg-modal-results');
      this.pasteChipEl = overlay.querySelector('.fg-modal-paste-chip');
      const clearBtn = overlay.querySelector('.fg-modal-clear');
      const closeBtn = overlay.querySelector('.fg-modal-close-btn');

      // Cerrar al hacer clic en overlay fuera del box
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.close();
      });

      // Botón cerrar en encabezado
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      this.updateTheme();

      // Botón limpiar
      clearBtn.addEventListener('click', () => {
        this.inputEl.value = '';
        this.inputEl.focus();
        this.filter('');
      });

      // Chip pegar del portapapeles
      this.pasteChipEl.addEventListener('click', () => {
        const text = this.pasteChipEl.getAttribute('data-clipboard-text');
        if (text) {
          this.inputEl.value = text;
          this.inputEl.focus();
          this.inputEl.select();
          this.filter(text);
        }
      });

      // Eventos de teclado en el input
      this.inputEl.addEventListener('input', () => {
        this.filter(this.inputEl.value);
      });

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.activateSelected();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        }
      });
    },

    /** Recolecta archivos y módulos del IDE activo */
    collectItems() {
      const items = [];
      const seen = new Set();

      // 1. Archivos recientes en FlexMind Clásico (#wrapHomeDevIdeFlex)
      const recentLinks = document.querySelectorAll('#wrapHomeDevIdeFlex .lastOpenedFiles a.openLastOpenedFile');
      recentLinks.forEach(a => {
        const nameEl = a.querySelector('.fileName');
        const name = nameEl ? nameEl.textContent.trim() : '';
        let path = '';
        a.querySelectorAll('small').forEach(sm => {
          const t = sm.textContent.trim();
          if (t.includes('modulos/')) path = t;
        });
        if (name) {
          const fullPath = path || name;
          if (!seen.has(fullPath)) {
            seen.add(fullPath);
            items.push({
              name: name,
              path: fullPath,
              type: 'recent',
              element: a,
              badge: 'Reciente',
              score: 0
            });
          }
        }
      });

      // 2. Nodos del árbol en FlexMind Clásico (#sourceDirectory)
      const sourceDir = document.getElementById('sourceDirectory');
      if (sourceDir) {
        sourceDir.querySelectorAll('li').forEach(li => {
          const titleEl = li.querySelector(':scope > span > a.flextree-title');
          if (!titleEl) return;
          const name = titleEl.textContent.trim();
          if (!name || name === 'sigapp.v2' || name === 'modulos' || name === 'controls') return;

          const span = titleEl.closest('.flextree-node');
          const isFolder = span ? span.classList.contains('flextree-folder') : false;

          // Reconstruir ruta relativa hacia arriba
          const pathParts = [name];
          let cur = li.parentElement ? li.parentElement.closest('li') : null;
          while (cur && cur.id !== 'sourceDirectory') {
            const pTitle = cur.querySelector(':scope > span > a.flextree-title');
            if (pTitle) {
              const pName = pTitle.textContent.trim();
              if (pName && pName !== 'sigapp.v2') {
                pathParts.unshift(pName);
              }
            }
            cur = cur.parentElement ? cur.parentElement.closest('li') : null;
          }
          const fullPath = pathParts.join('/');

          if (!seen.has(fullPath)) {
            seen.add(fullPath);
            items.push({
              name: name,
              path: fullPath,
              type: isFolder ? 'folder' : 'tree-file',
              element: titleEl,
              liElement: li,
              badge: isFolder ? 'Módulo' : 'Árbol',
              score: 0
            });
          }
        });
      }

      // 3. Nodos en UPSTI IDE (.tree .tnode)
      const upstiNodes = document.querySelectorAll('#tree-body .tnode, .tree .tnode');
      upstiNodes.forEach(node => {
        const fnameEl = node.querySelector('.fname');
        if (!fnameEl) return;
        const name = fnameEl.textContent.trim();
        let fullPath = fnameEl.getAttribute('title') || name;
        if (fullPath.startsWith('/')) fullPath = fullPath.substring(1);
        const isFolder = node.classList.contains('folder') || node.classList.contains('is-dir');

        if (!seen.has(fullPath)) {
          seen.add(fullPath);
          items.push({
            name: name,
            path: fullPath,
            type: isFolder ? 'folder' : 'tree-file',
            element: node,
            badge: isFolder ? 'Módulo' : 'Árbol',
            score: 0
          });
        }
      });

      this.items = items;
    },

    /** Filtra los elementos según la consulta */
    filter(rawQuery) {
      const q = (rawQuery || '').trim();
      if (!q) {
        // Mostrar recientes y primeros módulos por defecto
        this.filteredItems = this.items.slice(0, 15);
        this.selectedIndex = 0;
        this.renderResults(q);
        return;
      }

      // Parsear query inteligente:
      // ej: "modulos/atp_acta_05/php/ver_atp_acta_05.php"
      // extrae: fileName = "ver_atp_acta_05.php", moduleName = "atp_acta_05"
      const clean = q.replace(/^modulos\//i, '').replace(/^\/+|\/+$/g, '');
      const parts = clean.split('/');
      let targetFile = '';
      let targetModule = '';

      if (parts.length > 1) {
        targetModule = parts[0];
        targetFile = parts[parts.length - 1];
      } else {
        targetModule = clean;
        targetFile = clean;
      }

      const qLower = q.toLowerCase();
      const targetFileLower = targetFile.toLowerCase();
      const targetModuleLower = targetModule.toLowerCase();

      const matched = [];

      for (const item of this.items) {
        const nameLower = item.name.toLowerCase();
        const pathLower = item.path.toLowerCase();
        let score = 0;

        // 1. Coincidencia exacta de nombre de archivo
        if (nameLower === targetFileLower) {
          score += 150;
        } else if (nameLower.startsWith(targetFileLower)) {
          score += 100;
        } else if (nameLower.includes(targetFileLower)) {
          score += 80;
        }

        // 2. Coincidencia de módulo en la ruta
        if (targetModuleLower && pathLower.includes(targetModuleLower)) {
          score += 70;
        }

        // 3. Coincidencia de ruta completa
        if (pathLower.includes(qLower)) {
          score += 60;
        }

        // 4. Bonificación para archivos recientes
        if (item.type === 'recent') {
          score += 20;
        }

        if (score > 0) {
          item.score = score;
          matched.push(item);
        }
      }

      // Ordenar por score descendente
      matched.sort((a, b) => b.score - a.score);

      // Limitar a los mejores 25
      const results = matched.slice(0, 25);

      // Agregar siempre acción de búsqueda en el árbol nativo al final
      results.push({
        name: `Buscar "${targetModule || q}" en el árbol del IDE`,
        path: 'Filtra y expande automáticamente en el panel de navegación',
        type: 'native-search',
        query: targetModule || q,
        badge: 'Buscar'
      });

      this.filteredItems = results;
      this.selectedIndex = 0;
      this.renderResults(q);
    },

    /** Renderiza la lista de resultados */
    renderResults(query) {
      if (this.filteredItems.length === 0) {
        this.resultsEl.innerHTML = `
          <div class="fg-modal-empty">
            No se encontraron módulos con "${query}".<br>
            <small style="color:#64748b;margin-top:6px;display:block;">Presiona Enter para buscar en el árbol del IDE.</small>
          </div>
        `;
        return;
      }

      let html = '';
      this.filteredItems.forEach((item, index) => {
        const isSelected = index === this.selectedIndex;
        let iconSvg = '';

        if (item.type === 'folder') {
          iconSvg = `<svg width="15" height="15" fill="none" stroke="#c084fc" stroke-width="1.8" viewBox="0 0 24 24"><path d="M4 7c0-1.1.9-2 2-2h4l2 2h6c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V7z"></path></svg>`;
        } else if (item.type === 'native-search') {
          iconSvg = `<svg width="15" height="15" fill="none" stroke="#fbbf24" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
        } else {
          iconSvg = `<svg width="15" height="15" fill="none" stroke="${item.type === 'recent' ? '#2ecc71' : '#38bdf8'}" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
        }

        let badgeClass = 'fg-badge-tree';
        if (item.badge === 'Reciente') badgeClass = 'fg-badge-recent';
        else if (item.badge === 'Módulo') badgeClass = 'fg-badge-module';
        else if (item.badge === 'Buscar') badgeClass = 'fg-badge-search';

        html += `
          <div class="fg-modal-item ${isSelected ? 'selected' : ''}" data-index="${index}">
            <div class="fg-modal-item-icon">${iconSvg}</div>
            <div class="fg-modal-item-info">
              <span class="fg-modal-item-name">${item.name}</span>
              <span class="fg-modal-item-path">${item.path}</span>
            </div>
            <span class="fg-modal-item-badge ${badgeClass}">${item.badge}</span>
          </div>
        `;
      });

      this.resultsEl.innerHTML = html;

      // Eventos de clic en items
      const itemEls = this.resultsEl.querySelectorAll('.fg-modal-item');
      itemEls.forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.getAttribute('data-index'), 10);
          this.selectedIndex = idx;
          this.activateSelected();
        });
      });

      this.ensureVisibleSelection();
    },

    /** Mover selección con flechas */
    moveSelection(delta) {
      if (this.filteredItems.length === 0) return;
      this.selectedIndex = (this.selectedIndex + delta + this.filteredItems.length) % this.filteredItems.length;

      const items = this.resultsEl.querySelectorAll('.fg-modal-item');
      items.forEach((item, idx) => {
        item.classList.toggle('selected', idx === this.selectedIndex);
      });

      this.ensureVisibleSelection();
    },

    ensureVisibleSelection() {
      const selectedEl = this.resultsEl.querySelector('.fg-modal-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    },

    /** Activar/abrir el elemento seleccionado */
    activateSelected() {
      if (this.filteredItems.length === 0) return;
      const item = this.filteredItems[this.selectedIndex];
      if (!item) return;

      this.close();

      if (item.type === 'recent') {
        if (item.element) {
          item.element.click();
          showToast(`Abriendo reciente: ${item.name}`);
        }
      } else if (item.type === 'tree-file') {
        this.openTreeFile(item);
      } else if (item.type === 'folder') {
        this.openTreeFolder(item);
      } else if (item.type === 'native-search') {
        this.triggerNativeTreeSearch(item.query);
      }
    },

    /** Abrir archivo del árbol */
    openTreeFile(item) {
      if (item.liElement) {
        let parentLi = item.liElement.parentElement ? item.liElement.parentElement.closest('li') : null;
        while (parentLi) {
          const expander = parentLi.querySelector(':scope > span > .flextree-expander');
          const span = parentLi.querySelector(':scope > span');
          if (span && !span.classList.contains('flextree-expanded') && expander) {
            expander.click();
          }
          parentLi = parentLi.parentElement ? parentLi.parentElement.closest('li') : null;
        }
      }

      if (item.element) {
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.element.click();
        item.element.classList.add('flexguard-highlight-pulse');
        setTimeout(() => item.element.classList.remove('flexguard-highlight-pulse'), 2500);
        showToast(`Abierto: ${item.name}`);
      }
    },

    /** Abrir carpeta de módulo en el árbol */
    openTreeFolder(item) {
      if (item.liElement) {
        const expander = item.liElement.querySelector(':scope > span > .flextree-expander');
        const span = item.liElement.querySelector(':scope > span');
        if (expander && span && !span.classList.contains('flextree-expanded')) {
          expander.click();
        }

        setTimeout(() => {
          const phpLi = item.liElement.querySelector('ul > li');
          if (phpLi) {
            const phpExp = phpLi.querySelector(':scope > span > .flextree-expander');
            const phpSpan = phpLi.querySelector(':scope > span');
            if (phpExp && phpSpan && !phpSpan.classList.contains('flextree-expanded')) {
              phpExp.click();
            }
          }
        }, 300);
      }

      if (item.element) {
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.element.classList.add('flexguard-highlight-pulse');
        setTimeout(() => item.element.classList.remove('flexguard-highlight-pulse'), 2500);
        showToast(`Módulo: ${item.name}`);
      }
    },

    /** Disparar búsqueda nativa en el árbol de archivos */
    triggerNativeTreeSearch(query) {
      // 1. FlexMind Clásico
      const classicTreeInput = document.getElementById('fieldSearchTree_sourceDirectory');
      if (classicTreeInput) {
        const filesAccordionHeader = document.querySelector('#panel_ide .group:first-child h3');
        if (filesAccordionHeader && !filesAccordionHeader.classList.contains('ui-state-active')) {
          filesAccordionHeader.click();
        }

        classicTreeInput.value = query;
        classicTreeInput.dispatchEvent(new Event('input', { bubbles: true }));
        classicTreeInput.dispatchEvent(new Event('change', { bubbles: true }));
        classicTreeInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13, which: 13 }));
        classicTreeInput.focus();
        showToast(`Filtrando árbol: ${query}`);
        return;
      }

      // 2. UPSTI IDE
      const upstiTreeInput = document.getElementById('tree-search');
      if (upstiTreeInput) {
        upstiTreeInput.value = query;
        upstiTreeInput.dispatchEvent(new Event('input', { bubbles: true }));
        upstiTreeInput.dispatchEvent(new Event('change', { bubbles: true }));
        upstiTreeInput.focus();
        showToast(`Filtrando árbol: ${query}`);
      }
    },

    /** Abrir el modal */
    open(initialQuery = '') {
      this.createUI();
      this.updateTheme();
      this.collectItems();
      this.isOpen = true;
      this.overlayEl.classList.add('visible');

      // Comprobar si el portapapeles tiene una ruta de módulo
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
          const trimmed = (text || '').trim();
          if (trimmed && (trimmed.includes('modulos/') || trimmed.includes('.php') || trimmed.includes('atp_') || trimmed.includes('dgr_'))) {
            if (this.pasteChipEl) {
              this.pasteChipEl.setAttribute('data-clipboard-text', trimmed);
              const preview = trimmed.split('/').pop() || trimmed;
              this.pasteChipEl.querySelector('span').textContent = `Pegar: ${preview}`;
              this.pasteChipEl.style.display = 'inline-flex';
            }
          }
        }).catch(() => {});
      }

      if (initialQuery) {
        this.inputEl.value = initialQuery;
        this.filter(initialQuery);
        this.inputEl.select();
      } else {
        this.inputEl.value = '';
        this.filter('');
      }

      setTimeout(() => this.inputEl.focus(), 60);
    },

    /** Cerrar el modal */
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      if (this.overlayEl) {
        this.overlayEl.classList.remove('visible');
      }
    },

    /** Alternar apertura/cierre */
    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    /** Inicializar escuchador global de atajos de teclado */
    init() {
      this.createUI();

      // Atajo global Ctrl+P / Cmd+P o Alt+M
      window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl+P o Cmd+P -> Quick Open
        if (cmdOrCtrl && e.key.toLowerCase() === 'p') {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
          return;
        }

        // Alt+M -> Buscar Módulo
        if (e.altKey && e.key.toLowerCase() === 'm') {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
          return;
        }
      }, true);

      console.log('[FlexGuard] Buscador de módulos listo (Ctrl+P / Alt+M).');
    }
  };

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  VARIANTE 3 – SIGAPP (Visualizador de módulos y vistas)          ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const sigappApp = {
    tooltipEl: null,
    hideTimer: null,

    detect() {
      return !!document.querySelector('.openSys[data-url]') ||
             !!document.getElementById('browser') ||
             !!document.getElementById('wrapSearchMods') ||
             document.body.classList.contains('sidebar-on') ||
             window.location.hostname.includes('sigapp');
    },

    getOrCreateTooltip() {
      if (!this.tooltipEl) {
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.id = 'flexguard-module-tooltip';
        document.body.appendChild(this.tooltipEl);
      }
      return this.tooltipEl;
    },

    showTooltip(targetEl, dataUrl) {
      if (!dataUrl) return;
      clearTimeout(this.hideTimer);

      const tooltip = this.getOrCreateTooltip();
      const modId = targetEl.id || targetEl.getAttribute('data-id') || '';

      // Separar directorio y archivo
      const slashIdx = dataUrl.lastIndexOf('/');
      let dir = '';
      let file = dataUrl;
      if (slashIdx !== -1) {
        dir = dataUrl.substring(0, slashIdx + 1);
        file = dataUrl.substring(slashIdx + 1);
      }

      tooltip.innerHTML = `
        <div class="fg-tooltip-header">
          <span class="fg-tooltip-badge">
            <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 7c0-1.1.9-2 2-2h4l2 2h6c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V7z"></path></svg>
            MÓDULO PHP
          </span>
          ${modId ? `<span class="fg-tooltip-id">#${modId}</span>` : ''}
        </div>
        <div class="fg-tooltip-body" title="${dataUrl}">
          <span class="fg-tooltip-dir">${dir}</span><span class="fg-tooltip-file">${file}</span>
        </div>
        <div class="fg-tooltip-footer">
          <span><kbd>Alt</kbd> + Clic para copiar ruta</span>
        </div>
      `;

      // Posicionamiento dinámico
      const rect = targetEl.getBoundingClientRect();
      const tooltipW = 390;
      const tooltipH = 75;

      let left = rect.right + 12;
      let top = rect.top + (rect.height / 2) - (tooltipH / 2);

      // Si sobrepasa el borde derecho
      if (left + tooltipW > window.innerWidth - 10) {
        left = Math.max(10, rect.left - tooltipW - 12);
      }

      // Restricción vertical
      if (top < 10) top = 10;
      if (top + tooltipH > window.innerHeight - 10) {
        top = window.innerHeight - tooltipH - 10;
      }

      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.classList.add('visible');
    },

    hideTooltip() {
      if (!this.tooltipEl) return;
      this.hideTimer = setTimeout(() => {
        if (this.tooltipEl) {
          this.tooltipEl.classList.remove('visible');
        }
      }, 70);
    },

    init() {
      console.log('[FlexGuard] SIGAPP detectado – Tooltips de módulos activos.');
      const self = this;

      // Delegación de eventos para mouseover / mouseout (soporta elementos dinámicos)
      document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('.openSys[data-url]');
        if (!link) return;
        const dataUrl = link.getAttribute('data-url');
        if (dataUrl) {
          self.showTooltip(link, dataUrl);
        }
      }, true);

      document.addEventListener('mouseout', (e) => {
        const link = e.target.closest('.openSys[data-url]');
        if (!link) return;
        self.hideTooltip();
      }, true);

      // Alt + Clic para copiar ruta al portapapeles
      document.addEventListener('click', (e) => {
        const link = e.target.closest('.openSys[data-url]');
        if (!link) return;

        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const dataUrl = link.getAttribute('data-url');
          if (dataUrl) {
            navigator.clipboard.writeText(dataUrl).then(() => {
              showToast(`Ruta copiada: ${dataUrl}`);
            }).catch(() => {
              showToast(`Módulo: ${dataUrl}`);
            });
          }
        }
      }, true);
    }
  };

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  INICIALIZACIÓN                                                 ║
  // ╚══════════════════════════════════════════════════════════════════╝

  function init() {
    let detected = false;

    if (classicIDE.detect()) {
      classicIDE.init();
      moduleFinder.init();
      detected = true;
    } else if (upstiIDE.detect()) {
      upstiIDE.init();
      moduleFinder.init();
      detected = true;
    }

    if (sigappApp.detect()) {
      sigappApp.init();
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
