module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    // 如果是 React
    // 'plugin:react/recommended',
    // 如果是 Vue
    // 'plugin:vue/vue3-recommended',
    // 如果用 TypeScript
    // 'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // 确保放在最后
  ],
  rules: {
    // 可以自定义或覆盖规则
    'no-console': 'warn',
    'no-debugger': 'warn',
    'prettier/prettier': 'error',
  },
};
