/**
 * Compilación en un solo archivo HTML (JS, CSS y fuentes de KaTeX en línea),
 * para publicar una vista previa que se abre desde cualquier navegador.
 *
 *   npm run build:artifact
 */
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Deja solo las fuentes woff2 de KaTeX (todos los navegadores actuales las leen). */
function katexSoloWoff2(): Plugin {
  return {
    name: 'katex-solo-woff2',
    enforce: 'pre',
    transform(code, id) {
      if (!/katex.*\.css/.test(id)) return null;
      return code
        .replace(/,\s*url\([^)]+\.woff\)\s*format\("woff"\)/g, '')
        .replace(/,\s*url\([^)]+\.ttf\)\s*format\("truetype"\)/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), katexSoloWoff2(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
  },
});
