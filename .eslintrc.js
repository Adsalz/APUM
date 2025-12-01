module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Sécurité
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Qualité du code
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': ['error', {
      'varsIgnorePattern': '^_',
      'argsIgnorePattern': '^_'
    }],
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',

    // React spécifique
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // Disabled temporarily due to TypeScript migration
    'react/no-unused-prop-types': 'off',
    'react/jsx-no-bind': 'off', // Disabled temporarily for development

    // Bonnes pratiques
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-magic-numbers': 'off', // Disabled temporarily
    'complexity': 'off', // Disabled temporarily
    'max-params': 'off', // Disabled temporarily

    // Style de code
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': 'off', // Disabled temporarily
    'max-lines': 'off', // Disabled temporarily

    // Import/export rules
    'import/no-anonymous-default-export': 'off' // Disabled temporarily
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-magic-numbers': 'off'
      }
    }
  ]
};