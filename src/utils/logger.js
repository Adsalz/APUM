/**
 * Utilitaire de logging conditionnel
 * Les logs ne s'affichent qu'en développement
 */

let isDevelopment = true;
try {
  isDevelopment = process.env.NODE_ENV === 'development';
} catch (error) {
  // Fallback si process n'est pas défini
  isDevelopment = true;
}

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },

  info: (...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },

  error: (...args) => {
    // Les erreurs sont toujours logguées mais sans stack trace sensible en prod
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.error(...args);
    } else {
      // eslint-disable-next-line no-console
      console.error('Une erreur est survenue. Consultez les logs serveur pour plus de détails.');
    }
  },

  debug: (...args) => {
    let debugMode = false;
    try {
      debugMode = process.env.REACT_APP_DEBUG === 'true';
    } catch (error) {
      debugMode = false;
    }

    if (isDevelopment && debugMode) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  }
};

export default logger;