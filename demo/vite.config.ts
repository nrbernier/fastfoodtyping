import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// Builds demo/index.html into ONE self-contained HTML file (JS, CSS, and the
// already base64-inlined art/fonts all folded in) so it works from file:// and
// can be shared as a single attachment. No PWA / service worker here.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: fileURLToPath(new URL('../dist-demo', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
});
