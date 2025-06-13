// backend/eslint.config.js

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import complexityPlugin from 'eslint-plugin-complexity'
import sonarjsPlugin from 'eslint-plugin-sonarjs'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        jest: true,
        test: true,
        expect: true,
        describe: true,
        beforeEach: true,
        it: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'complexity': complexityPlugin,
      'sonarjs': sonarjsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // em vez de erro (vermelho), virar só warning
      'complexity': ['warn', 20],
      // já é warn, mas aqui reforça
      'sonarjs/cognitive-complexity': ['warn', 2],

      // desabilita completamente o exhaustive-deps (se preferir)
      'react-hooks/exhaustive-deps': 'off',

      // suas outras regras…
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
