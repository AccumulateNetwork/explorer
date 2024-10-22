import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
// import pluginJs from '@eslint/js';
// import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  tseslint.configs.base,

  // pluginJs.configs.recommended,
  // pluginReact.configs.flat.recommended,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
    },
  },
];
