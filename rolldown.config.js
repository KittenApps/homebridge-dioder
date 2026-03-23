import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  external: /^[^./]/,
  platform: 'node',
  output: { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
});
