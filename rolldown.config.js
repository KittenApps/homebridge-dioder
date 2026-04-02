import { defineConfig } from 'rolldown';

export default defineConfig({
  input: { index: 'src/index.ts', matter: 'src/matter/index.ts' },
  external: /^[^./]/,
  platform: 'node',
  output: { dir: 'dist', format: 'esm', sourcemap: true, cleanDir: true },
  transform: { target: 'node24', define: { DEV: `${!!process.env.DEV}` } },
});
