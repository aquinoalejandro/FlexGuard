/**
 * FlexGuard – Popup Script
 * 
 * Consulta la pestaña activa para determinar si el content script
 * de FlexGuard está activo en la página actual.
 */

(function () {
  'use strict';

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

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

  // Verificar si la pestaña actual tiene alguno de los IDEs
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

  // Recordar estado de apertura del desplegable (por defecto cerrado)
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
