/**
 * Utilitaire de logging conditionnel
 * Les logs ne s'affichent qu'en développement
 */

// Même sens que l'ancien NODE_ENV : 'development' sous `npm start`,
// 'production' au build, 'test' sous Vitest.
const isDevelopment = import.meta.env.MODE === 'development';

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
    const debugMode = import.meta.env.REACT_APP_DEBUG === 'true';

    if (isDevelopment && debugMode) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  }
};

export default logger;