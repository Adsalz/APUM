module.exports = {
  extends: ['react-app'],
  rules: {
    // Sécurité
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Qualité du code
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'always'],

    // console.* est réservé à src/utils/logger.js (voir override ci-dessous)
    'no-console': 'warn',

    // React
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      // Le logger est le seul module autorisé à appeler console directement
      files: ['src/utils/logger.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
