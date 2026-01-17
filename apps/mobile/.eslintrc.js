module.exports = {
  extends: 'expo',
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: [
        'metro.config.js',
        'babel.config.js',
        'app.config.js',
        'app.config.ts',
      ],
      env: {
        node: true,
      },
    },
  ],
};
