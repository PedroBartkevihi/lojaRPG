import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['coverage'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      // Parametros e erros ignorados de proposito comecam com _ (ex.: o
      // errorHandler do Express precisa dos quatro parametros).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  }
];
