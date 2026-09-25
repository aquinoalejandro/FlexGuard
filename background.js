/**
 * FlexGuard - Background Service Worker (Manifest V3)
 * 
 * Gestiona la comprobación periódica de actualizaciones en GitHub,
 * el estado del badge en la barra de herramientas y la comunicación
 * con el popup y los content scripts.
 */

try {
  importScripts('version.js');
} catch (e) {
  console.error('[FlexGuard Background] Error importando version.js:', e);
}

// Configuración predeterminada si version.js no cargara
const CONFIG = (typeof FLEXGUARD_CONFIG !== 'undefined') ? FLEXGUARD_CONFIG : {
  version: '1.0.0',
  commitSha: '69f9a2269d3a92e2d931aa003075f1806f929468',
  commitShort: '69f9a22',
  apiUrl: 'https://api.github.com/repos/aquinoalejandro/FlexGuard/commits/main',
  rawManifestUrl: 'https://raw.githubusercontent.com/aquinoalejandro/FlexGuard/main/manifest.json',
  repoUrl: 'https://github.com/aquinoalejandro/FlexGuard',
  commitsUrl: 'https://github.com/aquinoalejandro/FlexGuard/commits/main',
  zipDownloadUrl: 'https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip'
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de caché para no saturar rate limit
const ALARM_NAME = 'flexguard_periodic_update_check';

/**
 * Compara dos versiones semver (p. ej. '1.1.0' > '1.0.0')
 */
function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const r = remote.split('.').map(n => parseInt(n, 10) || 0);
  const l = local.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const numR = r[i] || 0;
    const numL = l[i] || 0;
    if (numR > numL) return true;
    if (numR < numL) return false;
  }
  return false;
}

/**
 * Consulta la API de GitHub o el manifest raw para verificar actualizaciones.
 */
async function checkForUpdates(force = false) {
  try {
    // 1. Verificar caché si no es forzado
    const stored = await chrome.storage.local.get(['flexguard_update', 'flexguard_dismissed_commit']);
    const cached = stored.flexguard_update;
    const dismissedSha = stored.flexguard_dismissed_commit;

    if (!force && cached && cached.lastCheck && (Date.now() - cached.lastCheck < CACHE_TTL_MS)) {
      console.log('[FlexGuard] Retornando estado de actualización desde caché.');
      applyBadgeState(cached, dismissedSha);
      return { success: true, ...cached, fromCache: true };
    }

    let hasUpdate = false;
    let remoteSha = '';
    let remoteShort = '';
    let commitMsg = '';
    let author = '';
    let date = null;
    let commitUrl = CONFIG.commitsUrl;
    let remoteVersion = CONFIG.version;

    // 2. Intentar obtener el commit más reciente de GitHub
    try {
      const response = await fetch(CONFIG.apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FlexGuard-AutoUpdater'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        remoteSha = data.sha || '';
        remoteShort = remoteSha ? remoteSha.substring(0, 7) : '';
        commitMsg = (data.commit && data.commit.message) ? data.commit.message.split('\n')[0] : 'Actualización de código';
        author = (data.commit && data.commit.author && data.commit.author.name) ? data.commit.author.name : 'aquinoalejandro';
        date = (data.commit && data.commit.author && data.commit.author.date) ? data.commit.author.date : new Date().toISOString();
        commitUrl = data.html_url || `${CONFIG.commitsUrl}`;

        // Comparar SHA: si el commit remoto es distinto a nuestro commit local
        if (remoteSha && remoteSha !== CONFIG.commitSha && !remoteSha.startsWith(CONFIG.commitShort)) {
          hasUpdate = true;
        }
      } else {
        console.warn(`[FlexGuard] GitHub API respondió ${response.status}. Intentando fallback raw...`);
        throw new Error(`GitHub API ${response.status}`);
      }
    } catch (apiErr) {
      console.warn('[FlexGuard] Fallback a manifest.json raw de GitHub:', apiErr.message);
      // Fallback: verificar manifest.json remoto por si hay rate limit en la API de commits
      try {
        const rawRes = await fetch(CONFIG.rawManifestUrl, { cache: 'no-store' });
        if (rawRes.ok) {
          const rawManifest = await rawRes.json();
          remoteVersion = rawManifest.version || CONFIG.version;
          if (isNewerVersion(remoteVersion, CONFIG.version)) {
            hasUpdate = true;
            commitMsg = `Nueva versión disponible: v${remoteVersion}`;
            remoteShort = `v${remoteVersion}`;
          }
        }
      } catch (rawErr) {
        console.error('[FlexGuard] No se pudo conectar con GitHub:', rawErr);
        if (cached) {
          return { success: false, error: 'Sin conexión con GitHub', ...cached, fromCache: true };
        }
        return { success: false, error: 'No se pudo conectar con GitHub' };
      }
    }

    const updateInfo = {
      lastCheck: Date.now(),
      hasUpdate,
      remoteSha,
      remoteShort,
      commitMsg,
      author,
      date,
      commitUrl,
      repoUrl: CONFIG.repoUrl,
      zipDownloadUrl: CONFIG.zipDownloadUrl,
      localVersion: CONFIG.version,
      localCommit: CONFIG.commitShort
    };

    // Guardar en chrome.storage
    await chrome.storage.local.set({ flexguard_update: updateInfo });
    applyBadgeState(updateInfo, dismissedSha);

    return { success: true, ...updateInfo, fromCache: false };

  } catch (err) {
    console.error('[FlexGuard] Error comprobando actualizaciones:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza el badge del icono de la extensión en el navegador
 */
function applyBadgeState(updateInfo, dismissedSha) {
  if (updateInfo && updateInfo.hasUpdate) {
    const isDismissed = (dismissedSha && dismissedSha === updateInfo.remoteSha);
    if (!isDismissed) {
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#f39c12' }); // Naranja ámbar vibrante
      chrome.action.setTitle({
        title: `FlexGuard: ¡Actualización disponible en GitHub! (${updateInfo.remoteShort || 'Nuevo código'})`
      });
      return;
    }
  }

  // Sin actualización o descartada
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setTitle({ title: `FlexGuard (v${CONFIG.version})` });
}

/**
 * Marcar una actualización como descartada/oculta temporalmente
 */
async function dismissUpdate(sha) {
  if (sha) {
    await chrome.storage.local.set({ flexguard_dismissed_commit: sha });
    chrome.action.setBadgeText({ text: '' });
    return { success: true };
  }
  return { success: false };
}

/**
 * Modo simulación para probar el aspecto visual de la actualización
 */
async function simulateUpdate(enable = true) {
  if (enable) {
    const simInfo = {
      lastCheck: Date.now(),
      hasUpdate: true,
      remoteSha: 'simulated999999999999999999999999999999',
      remoteShort: 'sim88f2',
      commitMsg: 'Mejora en extractor de Monaco y nuevo buscador rápido',
      author: 'Alejandro Aquino',
      date: new Date().toISOString(),
      commitUrl: CONFIG.commitsUrl,
      repoUrl: CONFIG.repoUrl,
      zipDownloadUrl: CONFIG.zipDownloadUrl,
      localVersion: CONFIG.version,
      localCommit: CONFIG.commitShort,
      isSimulated: true
    };
    await chrome.storage.local.set({ flexguard_update: simInfo, flexguard_dismissed_commit: null });
    applyBadgeState(simInfo, null);
    return { success: true, ...simInfo };
  } else {
    // Restaurar chequeo real
    return await checkForUpdates(true);
  }
}

// ── Inicialización y Eventos ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[FlexGuard Background] Extensión instalada/actualizada:', details.reason);
  // Crear alarma periódica cada 60 minutos
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
  // Verificar de inmediato con un leve retardo para no saturar
  setTimeout(() => checkForUpdates(false), 3000);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[FlexGuard Background] Navegador iniciado. Verificando actualizaciones...');
  checkForUpdates(false);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[FlexGuard Background] Alarma de verificación disparada.');
    checkForUpdates(false);
  }
});

// Mensajería entre popup / content scripts y background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_FOR_UPDATES') {
    checkForUpdates(!!request.force).then(sendResponse);
    return true; // async
  }

  if (request.action === 'GET_UPDATE_INFO') {
    chrome.storage.local.get(['flexguard_update', 'flexguard_dismissed_commit']).then((data) => {
      const info = data.flexguard_update || null;
      const dismissed = data.flexguard_dismissed_commit || null;
      sendResponse({ info, dismissed });
    });
    return true; // async
  }

  if (request.action === 'DISMISS_UPDATE') {
    dismissUpdate(request.sha).then(sendResponse);
    return true;
  }

  if (request.action === 'SIMULATE_UPDATE') {
    simulateUpdate(request.enable).then(sendResponse);
    return true;
  }
});
