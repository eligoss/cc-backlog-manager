import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      'framework/**',
      'scripts/**',
      // Test files are excluded from tsconfig.json, so exclude from lint too
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Custom configuration
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2023,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript-specific rules
      // Unused vars as warnings for now - allows gradual cleanup
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': 'off', // CLI tool needs console output
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      // Allow control characters in regex (for ANSI stripping)
      'no-control-regex': 'off',
      // Allow constant conditions (for intentional infinite loops)
      'no-constant-condition': 'warn',
      // Allow unnecessary escapes in regex (flexibility)
      'no-useless-escape': 'warn',
    },
  }
);
