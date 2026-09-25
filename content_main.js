/**
 * FlexGuard – Page Context Bridge (MAIN world)
 * 
 * Este script corre en el contexto de la PÁGINA (no aislado),
 * por lo que tiene acceso directo a las variables JS del IDE:
 * Monaco, CodeMirror (v5 y v6), Ace, y variables globales del sistema.
 * 
 * Se comunica con content.js vía CustomEvents en el DOM.
 */

(function () {
  'use strict';

  console.log('[FlexGuard] Bridge de contexto de página (MAIN) inicializado.');

  /**
   * Intenta extraer el contenido del editor activo usando múltiples estrategias.
   */
  function extractActiveContent(fileId, fileName) {
    console.log('[FlexGuard] Buscando contenido para:', { fileId, fileName });

    // ─────────────────────────────────────────────────────────────
    // 1. MONACO EDITOR (muy común en IDEs estilo VS Code como UPSTI)
    // ─────────────────────────────────────────────────────────────
    if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
      console.log('[FlexGuard] Detectado window.monaco');

      // 1a. Buscar en todos los modelos abiertos
      if (typeof window.monaco.editor.getModels === 'function') {
        const models = window.monaco.editor.getModels();
        console.log('[FlexGuard] Monaco models encontrados:', models.length);

        // Si tenemos fileName, buscar el modelo correspondiente
        if (fileName && models.length > 0) {
          for (const m of models) {
            const uriStr = (m.uri && (m.uri.path || m.uri.fsPath || m.uri.toString())) || '';
            if (uriStr.toLowerCase().endsWith(fileName.toLowerCase()) || uriStr.includes(fileName)) {
              const val = m.getValue();
              if (val) {
                console.log('[FlexGuard] Contenido obtenido de Monaco model por fileName:', fileName);
                return val;
              }
            }
          }
        }

        // Si no se encontró por nombre, tomar el modelo con contenido más reciente o el primero con contenido
        for (let i = models.length - 1; i >= 0; i--) {
          const val = models[i].getValue();
          if (val && val.length > 0) {
            console.log('[FlexGuard] Contenido obtenido de Monaco model [' + i + ']');
            return val;
          }
        }
      }

      // 1b. Buscar en los editores de Monaco activos
      if (typeof window.monaco.editor.getEditors === 'function') {
        const editors = window.monaco.editor.getEditors();
        console.log('[FlexGuard] Monaco editors encontrados:', editors.length);
        for (const ed of editors) {
          if (ed && typeof ed.getValue === 'function') {
            const val = ed.getValue();
            if (val && val.length > 0) {
              console.log('[FlexGuard] Contenido obtenido de Monaco editor.getValue()');
              return val;
            }
          }
        }
      }

      // 1c. Focused editor
      if (typeof window.monaco.editor.getFocusedCodeEditor === 'function') {
        const focused = window.monaco.editor.getFocusedCodeEditor();
        if (focused && focused.getValue) {
          const val = focused.getValue();
          if (val) return val;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. VARIABLE GLOBAL "editor" (FlexMind y derivados)
    // ─────────────────────────────────────────────────────────────
    if (typeof window.editor !== 'undefined' && window.editor) {
      const ed = window.editor;

      // 2a. Si "editor" es directamente una instancia de CodeMirror
      if (typeof ed.getValue === 'function') {
        console.log('[FlexGuard] Contenido obtenido de window.editor.getValue()');
        return ed.getValue();
      }

      // 2b. Si "editor" tiene .mirror
      if (ed.mirror && typeof ed.mirror.getValue === 'function') {
        console.log('[FlexGuard] Contenido obtenido de window.editor.mirror.getValue()');
        return ed.mirror.getValue();
      }

      // 2c. Si "editor" es un diccionario { [fileId]: { mirror, ... } }
      if (typeof ed === 'object') {
        if (fileId && ed[fileId] && ed[fileId].mirror && typeof ed[fileId].mirror.getValue === 'function') {
          console.log('[FlexGuard] Contenido obtenido de window.editor[fileId].mirror');
          return ed[fileId].mirror.getValue();
        }

        // Probar todas las claves
        const keys = Object.keys(ed);
        for (let i = keys.length - 1; i >= 0; i--) {
          const item = ed[keys[i]];
          if (item) {
            if (item.mirror && typeof item.mirror.getValue === 'function') {
              console.log('[FlexGuard] Contenido obtenido de window.editor[' + keys[i] + '].mirror');
              return item.mirror.getValue();
            }
            if (typeof item.getValue === 'function') {
              return item.getValue();
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CODEMIRROR 5 EN EL DOM (.CodeMirror property)
    // ─────────────────────────────────────────────────────────────
    const cmElements = document.querySelectorAll('.CodeMirror');
    if (cmElements.length > 0) {
      console.log('[FlexGuard] Elementos .CodeMirror encontrados:', cmElements.length);
      for (let i = cmElements.length - 1; i >= 0; i--) {
        const el = cmElements[i];
        if (el.CodeMirror && typeof el.CodeMirror.getValue === 'function') {
          const val = el.CodeMirror.getValue();
          if (val) {
            console.log('[FlexGuard] Contenido obtenido de DOM .CodeMirror.getValue()');
            return val;
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. CODEMIRROR 6 (.cm-editor)
    // ─────────────────────────────────────────────────────────────
    const cm6Editors = document.querySelectorAll('.cm-editor');
    if (cm6Editors.length > 0) {
      console.log('[FlexGuard] Elementos CodeMirror 6 (.cm-editor) encontrados:', cm6Editors.length);
      for (const el of cm6Editors) {
        try {
          if (el.cmView && el.cmView.view && el.cmView.view.state && el.cmView.view.state.doc) {
            const val = el.cmView.view.state.doc.toString();
            if (val) {
              console.log('[FlexGuard] Contenido obtenido de CM6 cmView.view.state.doc');
              return val;
            }
          }
        } catch (e) {}
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ACE EDITOR (.ace_editor / window.ace)
    // ─────────────────────────────────────────────────────────────
    if (typeof window.ace !== 'undefined' && typeof window.ace.edit === 'function') {
      const aceEls = document.querySelectorAll('.ace_editor');
      for (const el of aceEls) {
        try {
          const aEd = window.ace.edit(el);
          if (aEd && typeof aEd.getValue === 'function') {
            const val = aEd.getValue();
            if (val) {
              console.log('[FlexGuard] Contenido obtenido de Ace Editor');
              return val;
            }
          }
        } catch (e) {}
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 6. VARIABLES GLOBALES HABITUALES (cm, cmEditor, activeEditor, etc.)
    // ─────────────────────────────────────────────────────────────
    const candidateGlobals = [
      'activeEditor', 'currentEditor', 'mainEditor', 'cm', 'cmEditor',
      'currentCodeMirror', 'activeCodeMirror', 'myCodeMirror',
      'codeEditor', 'ideEditor', 'appEditor'
    ];

    for (const g of candidateGlobals) {
      if (typeof window[g] !== 'undefined' && window[g]) {
        const obj = window[g];
        if (typeof obj.getValue === 'function') {
          console.log('[FlexGuard] Contenido obtenido de window.' + g + '.getValue()');
          return obj.getValue();
        }
        if (obj.mirror && typeof obj.mirror.getValue === 'function') {
          console.log('[FlexGuard] Contenido obtenido de window.' + g + '.mirror.getValue()');
          return obj.mirror.getValue();
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 7. OBJETOS DE APLICACIÓN (app, ide, tabs, etc.)
    // ─────────────────────────────────────────────────────────────
    const appGlobals = ['app', 'ide', 'IDE', 'tabManager', 'editorManager', 'workspace', 'fileManager'];
    for (const ag of appGlobals) {
      if (typeof window[ag] !== 'undefined' && window[ag] && typeof window[ag] === 'object') {
        const obj = window[ag];
        // obj.editor o obj.activeEditor
        const sub = obj.editor || obj.activeEditor || obj.currentEditor || obj.activeTab;
        if (sub) {
          if (typeof sub.getValue === 'function') {
            console.log('[FlexGuard] Contenido obtenido de window.' + ag + '.*.getValue()');
            return sub.getValue();
          }
          if (sub.editor && typeof sub.editor.getValue === 'function') {
            return sub.editor.getValue();
          }
          if (sub.mirror && typeof sub.mirror.getValue === 'function') {
            return sub.mirror.getValue();
          }
        }
        // obj.getContent o obj.getValue
        if (typeof obj.getValue === 'function') return obj.getValue();
        if (typeof obj.getContent === 'function') return obj.getContent();
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 8. ESCANEO AMPLIO DE TODAS LAS VARIABLES EN WINDOW
    // ─────────────────────────────────────────────────────────────
    try {
      const keys = Object.keys(window);
      for (const k of keys) {
        if (/^(webkit|chrome|navigator|document|window|location|top|parent|frames|self)/i.test(k)) continue;
        try {
          const val = window[k];
          if (!val || typeof val !== 'object') continue;

          // Si el objeto tiene getValue()
          if (typeof val.getValue === 'function' && typeof val.setValue === 'function') {
            const content = val.getValue();
            if (typeof content === 'string' && content.length > 0) {
              console.log('[FlexGuard] Contenido encontrado en window.' + k);
              return content;
            }
          }

          // Si es un objeto tipo diccionario con mirrors
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const subkeys = Object.keys(val);
            if (subkeys.length > 0 && subkeys.length < 50) {
              for (const sk of subkeys) {
                const sub = val[sk];
                if (sub && sub.mirror && typeof sub.mirror.getValue === 'function') {
                  const content = sub.mirror.getValue();
                  if (typeof content === 'string' && content.length > 0) {
                    console.log('[FlexGuard] Contenido encontrado en window.' + k + '[' + sk + '].mirror');
                    return content;
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // ─────────────────────────────────────────────────────────────
    // 9. TEXTAREAS Y ELEMENTOS DEL DOM
    // ─────────────────────────────────────────────────────────────
    if (fileId) {
      const ta = document.getElementById('code_' + fileId);
      if (ta && ta.value) {
        console.log('[FlexGuard] Contenido obtenido de textarea #code_' + fileId);
        return ta.value;
      }
    }

    const allTa = document.querySelectorAll('textarea[id^="code_"], textarea.code, textarea.editor');
    for (let i = allTa.length - 1; i >= 0; i--) {
      if (allTa[i].value && allTa[i].value.trim().length > 0) {
        console.log('[FlexGuard] Contenido obtenido de textarea:', allTa[i].id || allTa[i].className);
        return allTa[i].value;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 10. FALLBACK DE TEXTO EN EL DOM DEL EDITOR
    // ─────────────────────────────────────────────────────────────
    // Monaco view-lines
    const monacoLines = document.querySelector('.monaco-editor .view-lines');
    if (monacoLines && monacoLines.innerText && monacoLines.innerText.trim().length > 0) {
      console.log('[FlexGuard] Aviso: Contenido extraído como fallback visual de .monaco-editor .view-lines');
      return monacoLines.innerText;
    }

    // CodeMirror lines
    const cmCode = document.querySelector('.CodeMirror-code');
    if (cmCode && cmCode.innerText && cmCode.innerText.trim().length > 0) {
      console.log('[FlexGuard] Aviso: Contenido extraído como fallback visual de .CodeMirror-code');
      return cmCode.innerText;
    }

    // CodeMirror 6 content
    const cm6Content = document.querySelector('.cm-content');
    if (cm6Content && cm6Content.innerText && cm6Content.innerText.trim().length > 0) {
      console.log('[FlexGuard] Aviso: Contenido extraído como fallback visual de .cm-content');
      return cm6Content.innerText;
    }

    console.warn('[FlexGuard] No se pudo encontrar el contenido del editor con ninguna estrategia.');
    return null;
  }

  /**
   * Extrae el mejor nombre de archivo para un modelo de Monaco.
   */
  function resolveMonacoFileName(m, idx, totalModels, activeFileName) {
    // 1. Si es el único modelo o el primero y tenemos activeFileName, usar activeFileName
    if (totalModels === 1 && activeFileName) {
      return activeFileName;
    }

    // 2. Propiedades directas que los IDEs suelen inyectar en el model
    const props = ['fileName', 'filename', 'name', 'title', 'filePath', 'path', 'label'];
    for (const p of props) {
      if (m[p] && typeof m[p] === 'string' && m[p].trim()) {
        const parts = m[p].split(/[/\\]/);
        const name = parts[parts.length - 1];
        if (name && name.includes('.')) return name;
      }
    }

    // 3. URI del modelo (Monaco)
    if (m.uri) {
      const candidates = [m.uri.path, m.uri.fsPath, m.uri._formatted, m.uri.toString()];
      for (const c of candidates) {
        if (!c) continue;
        const decoded = decodeURIComponent(c);
        const match = decoded.match(/[^/\\?#\s]+\.[a-zA-Z0-9_-]+$/);
        if (match && match[0] && !match[0].startsWith('model')) {
          return match[0];
        }
      }

      // Si la URI tiene segmentos significativos
      const parts = (m.uri.path || '').split(/[/\\]/).filter(Boolean);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        if (last && !/^\d+$/.test(last) && last !== 'model') {
          return last.includes('.') ? last : (last + '.php');
        }
      }
    }

    // 4. Si es el primer modelo y tenemos activeFileName
    if (idx === 0 && activeFileName) {
      return activeFileName;
    }

    // 5. Pestañas en el DOM
    const domTabs = document.querySelectorAll(
      '.tab, .editor-tab, .tab-item, [class*="tab-item"], ' +
      '.workbench-tab, [class*="editorTab"], .nav-tabs li'
    );
    if (domTabs.length > idx) {
      const tab = domTabs[idx];
      const title = tab.getAttribute('title') || tab.getAttribute('data-title') || '';
      const text = tab.textContent.replace(/×|\u00d7/g, '').trim();
      const cand = title || text;
      const match = cand.match(/[^/\\?#\s]+\.[a-zA-Z0-9_-]+/);
      if (match && match[0]) return match[0];
    }

    // 6. Extensión según lenguaje de Monaco
    const lang = (m.getLanguageId && m.getLanguageId()) || (m.getModeId && m.getModeId()) || '';
    const extMap = {
      php: '.php', javascript: '.js', js: '.js', css: '.css',
      html: '.html', json: '.json', sql: '.sql', xml: '.xml'
    };
    const ext = extMap[lang.toLowerCase()] || '.php';

    return `archivo_${idx + 1}${ext}`;
  }

  /**
   * Extrae todos los contenidos abiertos con nombres reales.
   */
  function extractAllContents(activeFileName) {
    const files = [];

    // 1. Monaco models
    if (typeof window.monaco !== 'undefined' && window.monaco.editor && typeof window.monaco.editor.getModels === 'function') {
      const models = window.monaco.editor.getModels();
      console.log('[FlexGuard] extractAllContents: Monaco models encontrados:', models.length);

      models.forEach((m, idx) => {
        const content = m.getValue();
        if (content) {
          const fileName = resolveMonacoFileName(m, idx, models.length, activeFileName);
          console.log(`[FlexGuard] Monaco model [${idx}] resuelto como:`, fileName);
          files.push({ fileId: 'monaco_' + idx, fileName: fileName, content: content });
        }
      });
      if (files.length > 0) return files;
    }

    // 2. Variable global editor (FlexMind Clásico)
    if (typeof window.editor !== 'undefined' && window.editor) {
      const ed = window.editor;
      const keys = Object.keys(ed);
      keys.forEach((key, idx) => {
        const item = ed[key];
        if (item && item.mirror && typeof item.mirror.getValue === 'function') {
          const content = item.mirror.getValue();
          if (content) {
            const fileName = (keys.length === 1 && activeFileName) ? activeFileName : null;
            files.push({ fileId: key, fileName: fileName, content: content });
          }
        }
      });
      if (files.length > 0) return files;
    }

    // 3. Textareas
    const textareas = document.querySelectorAll('textarea[id^="code_"]');
    textareas.forEach((ta, idx) => {
      if (ta.value) {
        const key = ta.id.replace('code_', '');
        const fileName = (textareas.length === 1 && activeFileName) ? activeFileName : null;
        files.push({
          fileId: key,
          fileName: fileName,
          content: ta.value
        });
      }
    });

    return files;
  }

  // Escuchar pedidos del content script
  window.addEventListener('flexguard-request', function (e) {
    const action = e.detail && e.detail.action;

    if (action === 'getContent') {
      const fileId = e.detail.fileId;
      const fileName = e.detail.fileName;
      const content = extractActiveContent(fileId, fileName);

      window.dispatchEvent(new CustomEvent('flexguard-response', {
        detail: { action: 'content', content: content, fileId: fileId, fileName: fileName }
      }));
    }

    if (action === 'getAllContents') {
      const activeFileName = e.detail && e.detail.activeFileName;
      const files = extractAllContents(activeFileName);
      window.dispatchEvent(new CustomEvent('flexguard-response', {
        detail: { action: 'allContents', files: files }
      }));
    }

    // Diagnóstico solicitado por el usuario o content script
    if (action === 'diagnose') {
      const diag = {
        hasMonaco: typeof window.monaco !== 'undefined',
        monacoModels: (typeof window.monaco !== 'undefined' && window.monaco.editor && window.monaco.editor.getModels) ? window.monaco.editor.getModels().length : 0,
        hasCodeMirrorGlobal: typeof window.CodeMirror !== 'undefined',
        hasEditorGlobal: typeof window.editor !== 'undefined',
        editorType: typeof window.editor,
        hasAceGlobal: typeof window.ace !== 'undefined',
        domCodeMirrorCount: document.querySelectorAll('.CodeMirror').length,
        domMonacoCount: document.querySelectorAll('.monaco-editor').length,
        domCm6Count: document.querySelectorAll('.cm-editor').length,
        domAceCount: document.querySelectorAll('.ace_editor').length,
        domTextareaCodeCount: document.querySelectorAll('textarea[id^="code_"]').length,
        candidateWindowKeys: Object.keys(window).filter(k => /editor|ide|app|tab|cm|code/i.test(k))
      };
      console.log('[FlexGuard Diagnóstico]', diag);
      window.dispatchEvent(new CustomEvent('flexguard-response', {
        detail: { action: 'diagnoseResponse', data: diag }
      }));
    }
  });

})();
