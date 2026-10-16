// Règles reprises de eslint-config-react-app (CRA) et de l'ancien .eslintrc.js.
// Non reprises : les règles de mise en forme dépréciées par ESLint, celles
// propres à webpack, et les plugins react / jsx-a11y / import, qui ne
// supportent pas ESLint 10. ESLint 10 suit lui-même les composants utilisés en
// JSX (no-unused-vars, no-undef).
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// Globales du navigateur qu'on utilise par erreur à la place d'une variable
// locale (`name`, `event`, `location`…) : liste confusing-browser-globals de CRA.
const GLOBALES_TROMPEUSES = [
  'addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus',
  'defaultstatus', 'event', 'external', 'find', 'focus', 'frameElement',
  'frames', 'history', 'innerHeight', 'innerWidth', 'length', 'location',
  'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onerror',
  'onfocus', 'onload', 'onresize', 'onunload', 'open', 'opener', 'opera',
  'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print',
  'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft',
  'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy',
  'scrollTo', 'scrollX', 'scrollY', 'self', 'status', 'statusbar', 'stop',
  'toolbar', 'top',
];

export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    linterOptions: {
      // Comme sous CRA : un eslint-disable devenu inutile n'est pas signalé.
      reportUnusedDisableDirectives: 'off',
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'array-callback-return': 'warn',
      'default-case': ['warn', { commentPattern: '^no default$' }],
      eqeqeq: ['warn', 'always'],
      'getter-return': 'warn',
      'no-array-constructor': 'warn',
      'no-caller': 'warn',
      'no-cond-assign': ['warn', 'except-parens'],
      'no-console': 'warn',
      'no-const-assign': 'warn',
      'no-control-regex': 'warn',
      'no-delete-var': 'warn',
      'no-dupe-args': 'warn',
      'no-dupe-class-members': 'warn',
      'no-dupe-keys': 'warn',
      'no-duplicate-case': 'warn',
      'no-empty-character-class': 'warn',
      'no-empty-pattern': 'warn',
      'no-eval': 'error',
      'no-ex-assign': 'warn',
      'no-extend-native': 'warn',
      'no-extra-bind': 'warn',
      'no-extra-label': 'warn',
      'no-fallthrough': 'warn',
      'no-func-assign': 'warn',
      'no-global-assign': 'warn',
      'no-implied-eval': 'error',
      'no-invalid-regexp': 'warn',
      'no-iterator': 'warn',
      'no-label-var': 'warn',
      'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
      'no-lone-blocks': 'warn',
      'no-loop-func': 'warn',
      'no-multi-str': 'warn',
      'no-new-func': 'warn',
      'no-new-native-nonconstructor': 'warn',
      'no-new-wrappers': 'warn',
      'no-obj-calls': 'warn',
      'no-object-constructor': 'warn',
      'no-octal': 'warn',
      'no-octal-escape': 'warn',
      'no-redeclare': 'warn',
      'no-regex-spaces': 'warn',
      'no-restricted-globals': ['error', ...GLOBALES_TROMPEUSES],
      'no-restricted-syntax': ['warn', 'WithStatement'],
      'no-script-url': 'warn',
      'no-self-assign': 'warn',
      'no-self-compare': 'warn',
      'no-sequences': 'warn',
      'no-shadow-restricted-names': 'warn',
      'no-sparse-arrays': 'warn',
      'no-template-curly-in-string': 'warn',
      'no-this-before-super': 'warn',
      'no-throw-literal': 'warn',
      'no-undef': 'error',
      'no-unreachable': 'warn',
      'no-unsafe-negation': 'warn',
      'no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      }],
      'no-unused-labels': 'warn',
      'no-unused-vars': ['warn', {
        args: 'none',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
        // Runtime JSX automatique : `import React` n'est plus utilisé par le JSX.
        varsIgnorePattern: '^React$',
      }],
      'no-use-before-define': ['warn', { functions: false, classes: false, variables: false }],
      'no-useless-computed-key': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-constructor': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-rename': 'warn',
      'no-var': 'error',
      'no-with': 'warn',
      'prefer-const': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'require-yield': 'warn',
      strict: ['warn', 'never'],
      'unicode-bom': ['warn', 'never'],
      'use-isnan': 'warn',
      'valid-typeof': 'warn',
    },
  },
  {
    // Le logger est le seul module autorisé à appeler console directement.
    files: ['src/utils/logger.js'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['src/**/__tests__/**', 'src/**/*.test.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    files: ['*.config.js', '*.config.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
];
