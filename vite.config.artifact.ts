/**
 * Compilación en un solo archivo HTML (JS, CSS y todas las fuentes en línea),
 * que se abre con doble clic desde cualquier carpeta, sin servidor ni conexión.
 * Es la que va en la USB:
 *
 *   npm run build:usb        (carpeta usb/)
 *   npm run build:artifact   (fragmento para publicar como página)
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { soloWoff2, versionDelPrograma } from './vite.plugins';

export default defineConfig({
  plugins: [react(), soloWoff2(), viteSingleFile()],
  define: { __VERSION__: JSON.stringify(versionDelPrograma()) },
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
  },
});
