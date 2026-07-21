import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['_legacy/**', 'dist/**', '.astro/**'] },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
];
