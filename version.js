/**
 * FlexGuard - Configuración y Metadatos de Versión
 * 
 * Este archivo centraliza la información de versión y repositorio
 * utilizada por el sistema de auto-actualización.
 */

const FLEXGUARD_CONFIG = {
  version: '1.0.0',
  commitSha: '69f9a2269d3a92e2d931aa003075f1806f929468',
  commitShort: '69f9a22',
  releaseDate: '2026-09-25',
  repoOwner: 'aquinoalejandro',
  repoName: 'FlexGuard',
  branch: 'main',
  repoUrl: 'https://github.com/aquinoalejandro/FlexGuard',
  commitsUrl: 'https://github.com/aquinoalejandro/FlexGuard/commits/main',
  apiUrl: 'https://api.github.com/repos/aquinoalejandro/FlexGuard/commits/main',
  rawManifestUrl: 'https://raw.githubusercontent.com/aquinoalejandro/FlexGuard/main/manifest.json',
  zipDownloadUrl: 'https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip'
};

// Compatibilidad para módulos CommonJS o scripts estándar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FLEXGUARD_CONFIG;
}
