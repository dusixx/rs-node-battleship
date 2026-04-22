import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from './prettier.config.mjs';

const ECMA_VERSION = 2020;
const MAX_LINES_PER_FUNCTION = 120;

export default defineConfig({
  ignores: ['*.{mjs,js}', '**/dist/**', '**/front/**'],
  languageOptions: {
    sourceType: 'module',
    parser: tsParser,
    ecmaVersion: ECMA_VERSION,
    parserOptions: {
      // projectService: true,
      ecmaVersion: ECMA_VERSION,
      sourceType: 'module',
      project: './tsconfig.json',
      globals: globals.node,
      tsconfigRootDir: import.meta.dirname,
    },
    globals: {
      ...globals.node,
    },
  },
  linterOptions: {
    noInlineConfig: false,
    reportUnusedDisableDirectives: true,
  },
  extends: [
    js.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.strictTypeChecked,
    eslintPluginPrettier,
  ],
  rules: {
    'max-len': [
      'warn',
      {
        code: prettierConfig.printWidth,
        tabWidth: prettierConfig.tabWidth,
      },
    ],
    'max-lines-per-function': [
      'warn',
      {
        max: MAX_LINES_PER_FUNCTION,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_[^_].*$|^_$',
        varsIgnorePattern: '^_[^_].*$|^_$',
        caughtErrorsIgnorePattern: '^_[^_].*$|^_$',
      },
    ],
    '@typescript-eslint/member-ordering': 'error',
    'class-methods-use-this': 'error',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-misused-spread': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { accessibility: 'explicit', overrides: { constructors: 'off' } },
    ],
  },
});
