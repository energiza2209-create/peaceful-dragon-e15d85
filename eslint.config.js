import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '**/*.min.js',
      'nfe-tab-system.html',
      'nfe-dashboard.html',
      'supabase-functions/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // App globals — defined in app.js and data.js
        '$': 'readonly',
        '$$': 'readonly',
        'el': 'readonly',
        'BRL': 'readonly',
        'fmtDate': 'readonly',
        'escapeHtml': 'readonly',
        'toast': 'readonly',
        'successBurst': 'readonly',
        'Modal': 'readonly',
        'VIEWS': 'readonly',
        'State': 'readonly',
        'navigate': 'readonly',
        'refreshAll': 'readonly',
        'DB': 'readonly',
        'Auth': 'readonly',
        'Audit': 'readonly',
        'QDB': 'readonly',
        'logger': 'readonly',
        'boot': 'readonly',
        'Chart': 'readonly',
        'Proposta': 'readonly',
        'CSS': 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
);
