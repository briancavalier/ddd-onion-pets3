module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  plugins: ['unused-imports'],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  env: {
    node: true
  },
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/naming-convention': 'error',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: false
        }
      },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        basePath: './src',
        zones: [
          { target: 'domain', from: 'application' },
          { target: 'domain', from: 'infrastructure' },
          { target: 'domain', from: 'composition' },
          { target: 'application', from: 'infrastructure' },
          { target: 'application', from: 'composition' },
          { target: 'infrastructure', from: 'composition' },
          { target: 'lib', from: 'domain' },
          { target: 'lib', from: 'application' },
          { target: 'lib', from: 'infrastructure' },
          { target: 'lib', from: 'composition' }
        ]
      }
    ],
    // Enable sort-imports to sort named imports within a single import
    // statement, but *disable* its declaration sort, and let
    // import/order's alphabetize feature handle sorting declarations
    // based on import path.
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true
      }
    ],
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
    ]
  }
}
