/**
 * FlexGuard – Popup Script
 * 
 * Consulta la pestaña activa para determinar si el content script
 * de FlexGuard está activo y gestiona el estado del autoactualizador.
 */

(function () {
  'use strict';

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const updateCard = document.getElementById('updateCard');
  const updateCardBody = document.getElementById('updateCardBody');
  const btnCheckUpdates = document.getElementById('btnCheckUpdates');
  const versionBadge = document.getElementById('versionBadge');
  const commitBadge = document.getElementById('commitBadge');

  const CONFIG = (typeof FLEXGUARD_CONFIG !== 'undefined') ? FLEXGUARD_CONFIG : {
    version: '1.0.0',
    commitShort: '69f9a22',
    repoUrl: 'https://github.com/aquinoalejandro/FlexGuard',
    commitsUrl: 'https://github.com/aquinoalejandro/FlexGuard/commits/main',
    zipDownloadUrl: 'https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip'
  };

  // Inicializar badges de cabecera
  if (versionBadge) versionBadge.textContent = `v${CONFIG.version}`;
  if (commitBadge) {
    commitBadge.textContent = `#${CONFIG.commitShort}`;
    commitBadge.title = `Commit actual en tu equipo: ${CONFIG.commitShort}`;
  }

  function setStatus(active, ideName) {
    if (active) {
      statusDot.className = 'status-dot active';
      statusText.textContent = `Activo — ${ideName}`;
      statusText.style.color = '#2ecc71';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'No se detectó ningún IDE';
      statusText.style.color = '#e74c3c';
    }
  }

  // 1. Detectar IDE en pestaña activa
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0]) {
      setStatus(false);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => {
          // FlexMind Clásico
          const body = document.getElementById('layout100');
          if (body && body.classList.contains('ondevelope')) return 'FlexMind IDE';
          // UPSTI IDE
          if ((document.body.classList.contains('enable-motion') && document.querySelector('.titlebar')) ||
              window.location.href.includes('/ideFlex/upsti') ||
              window.location.pathname.includes('/upsti')) return 'UPSTI IDE';
          // SIGAPP
          if (document.querySelector('.openSys[data-url]') || document.getElementById('browser') || window.location.hostname.includes('sigapp')) return 'SIGAPP (Vistas)';
          return null;
        }
      },
      (results) => {
        if (chrome.runtime.lastError) {
          setStatus(false);
          return;
        }
        const ideName = results && results[0] && results[0].result;
        setStatus(!!ideName, ideName || '');
      }
    );
  });

  // 2. Formateador de tiempo relativo
  function timeAgo(dateString) {
    if (!dateString) return 'hace un momento';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'hace segundos';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'ayer';
    if (diffDays < 30) return `hace ${diffDays} días`;
    return date.toLocaleDateString();
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'recién';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // 3. Renderizar tarjeta de actualización
  function renderUpdateState(data, dismissedSha = null) {
    if (!data) {
      updateCardBody.innerHTML = `
        <div class="update-box-uptodate">
          <div class="uptodate-badge-row">
            <span class="uptodate-check-icon">✓</span>
            <span>Comprobación pendiente</span>
          </div>
          <span class="uptodate-subtext">Haz clic en Buscar para consultar GitHub.</span>
        </div>
      `;
      return;
    }

    const isDismissed = (dismissedSha && dismissedSha === data.remoteSha);

    if (data.hasUpdate && !isDismissed) {
      updateCard.classList.add('update-card--has-update');

      const commitMsg = data.commitMsg || 'Nuevas mejoras en el código';
      const remoteShort = data.remoteShort || 'nuevo';
      const when = timeAgo(data.date);
      const author = data.author || 'aquinoalejandro';
      const isSimulated = !!data.isSimulated;

      updateCardBody.innerHTML = `
        <div class="update-box-available">
          <div class="update-alert-badge">
            <span>⚡ ¡NUEVA ACTUALIZACIÓN DISPONIBLE!</span>
          </div>

          <div class="commit-card">
            <span class="commit-card-message">"${escapeHtml(commitMsg)}"</span>
            <div class="commit-card-meta">
              <span class="commit-hash-tag">#${escapeHtml(remoteShort)}</span>
              <span>•</span>
              <span>${when}</span>
              <span>•</span>
              <span>por ${escapeHtml(author)}</span>
            </div>
          </div>

          <div class="update-actions-grid">
            <a href="${data.zipDownloadUrl || CONFIG.zipDownloadUrl}" target="_blank" class="btn-action-primary" id="btnDownloadZip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Descargar .ZIP</span>
            </a>
            <button class="btn-action-secondary" id="btnCopyGitPull" title="Copiar comando git pull al portapapeles">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="copyGitText">Copiar 'git pull'</span>
            </button>
          </div>

          <details class="update-guide-details">
            <summary class="update-guide-summary">¿Cómo aplicar la actualización?</summary>
            <div class="update-guide-content">
              <ol>
                <li>Si usas Git: abre terminal en la carpeta y haz <code>git pull</code>.</li>
                <li>Si descargaste el ZIP: descomprime y reemplaza los archivos en la carpeta.</li>
                <li>Ve a <code>chrome://extensions/</code> y haz clic en 🔄 Recargar en la tarjeta de FlexGuard.</li>
              </ol>
            </div>
          </details>

          <div class="update-secondary-row">
            <a href="${data.commitUrl || CONFIG.commitsUrl}" target="_blank" class="link-subtle">
              Ver cambios en GitHub ↗
            </a>
            <span class="link-dismiss" id="btnDismissUpdate" title="Ocultar aviso de este commit">
              ${isSimulated ? 'Salir de demo' : 'Descartar'}
            </span>
          </div>
        </div>
      `;

      // Evento para copiar git pull
      const btnCopy = document.getElementById('btnCopyGitPull');
      const copyText = document.getElementById('copyGitText');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText('git pull origin main').then(() => {
            btnCopy.classList.add('copied');
            copyText.textContent = '¡Copiado!';
            setTimeout(() => {
              btnCopy.classList.remove('copied');
              copyText.textContent = "Copiar 'git pull'";
            }, 2000);
          });
        });
      }

      // Evento descartar
      const btnDismiss = document.getElementById('btnDismissUpdate');
      if (btnDismiss) {
        btnDismiss.addEventListener('click', () => {
          if (isSimulated) {
            chrome.runtime.sendMessage({ action: 'SIMULATE_UPDATE', enable: false }, (res) => {
              renderUpdateState(res);
            });
          } else {
            chrome.runtime.sendMessage({ action: 'DISMISS_UPDATE', sha: data.remoteSha }, () => {
              renderUpdateState(data, data.remoteSha);
            });
          }
        });
      }

    } else {
      // Estado: Al día
      updateCard.classList.remove('update-card--has-update');
      const lastCheckTime = formatTime(data.lastCheck);

      updateCardBody.innerHTML = `
        <div class="update-box-uptodate">
          <div class="uptodate-badge-row">
            <span class="uptodate-check-icon">✓</span>
            <span>FlexGuard está al día</span>
          </div>
          <span class="uptodate-subtext">
            Sincronizado con GitHub (commit <code>#${CONFIG.commitShort}</code>) • Comprobado a las ${lastCheckTime}.
          </span>
          <div>
            <a class="demo-test-link" id="btnDemoMode" title="Ver cómo se visualiza la notificación cuando hay una actualización">
              ⚡ Probar vista de actualización (demo)
            </a>
          </div>
        </div>
      `;

      const btnDemo = document.getElementById('btnDemoMode');
      if (btnDemo) {
        btnDemo.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'SIMULATE_UPDATE', enable: true }, (res) => {
            renderUpdateState(res);
          });
        });
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return m;
      }
    });
  }

  // 4. Cargar estado inicial desde background
  chrome.runtime.sendMessage({ action: 'GET_UPDATE_INFO' }, (response) => {
    if (response && response.info) {
      renderUpdateState(response.info, response.dismissed);
    } else {
      // Si no hay datos cacheados, comprobar
      triggerUpdateCheck(false);
    }
  });

  // 5. Botón manual "Buscar"
  function triggerUpdateCheck(force = true) {
    btnCheckUpdates.classList.add('loading');
    updateCardBody.innerHTML = `
      <div class="update-status-loading">
        <span class="spinner-dot"></span>
        <span>Consultando GitHub (aquinoalejandro/FlexGuard)...</span>
      </div>
    `;

    chrome.runtime.sendMessage({ action: 'CHECK_FOR_UPDATES', force: force }, (res) => {
      btnCheckUpdates.classList.remove('loading');
      if (res && res.success) {
        renderUpdateState(res);
      } else {
        updateCard.classList.remove('update-card--has-update');
        updateCardBody.innerHTML = `
          <div class="update-box-uptodate">
            <span style="color: #e74c3c; font-weight: 600;">⚠ Error de conexión</span>
            <span class="uptodate-subtext">${(res && res.error) || 'No se pudo conectar con GitHub.'}</span>
          </div>
        `;
      }
    });
  }

  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', () => triggerUpdateCheck(true));
  }

  // 6. Recordar estado de apertura del desplegable de funcionalidades
  const collapsible = document.querySelector('.popup-collapsible');
  if (collapsible) {
    const savedState = localStorage.getItem('flexguard_popup_features');
    if (savedState === 'open') {
      collapsible.open = true;
    }
    collapsible.addEventListener('toggle', () => {
      localStorage.setItem('flexguard_popup_features', collapsible.open ? 'open' : 'closed');
    });
  }
})();
