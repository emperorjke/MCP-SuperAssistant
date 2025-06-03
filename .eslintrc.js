module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    webextensions: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime'
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.iife.js',
    'public/manifest.json'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    'react-refresh',
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  rules: {
    // General ESLint rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'warn',
    'no-unused-vars': 'off', // Use TypeScript version instead
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript instead
    'react/display-name': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-unknown-property': 'error',
    'react/require-render-return': 'error',

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Refresh rules (for development)
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],

    // Chrome Extension specific rules
    'no-undef': 'off', // Chrome APIs are global
    
    // Code style preferences
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-trailing': 'off',
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'max-len': ['warn', { code: 120, ignoreStrings: true, ignoreComments: true }],

    // Error prevention
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-alert': 'warn',
    'no-confirm': 'warn',

    // Import/Export rules
    'no-duplicate-imports': 'error',
    'import/no-default-export': 'off',
    'import/prefer-default-export': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-function': 'warn'
      }
    },
    
    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/test-*.ts', 'src/test-setup.ts'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off'
      }
    },
    
    // Background script
    {
      files: ['src/background.ts'],
      env: {
        browser: false,
        webextensions: true
      },
      rules: {
        'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }]
      }
    },
    
    // Content scripts
    {
      files: ['src/content-*.ts', 'src/**/content*.ts'],
      env: {
        browser: true,
        webextensions: true
      },
      rules: {
        'no-console': ['warn', { allow: ['log', 'warn', 'error', 'info'] }]
      }
    },
    
    // Configuration files
    {
      files: [
        'vite.config.ts',
        'jest.config.js',
        'scripts/**/*.js',
        '.eslintrc.js'
      ],
      env: {
        node: true,
        browser: false
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off'
      }
    }
  ]
};