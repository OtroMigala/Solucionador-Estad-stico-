/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { soloWoff2, versionDelPrograma } from './vite.plugins';

export default defineConfig({
  plugins: [react(), soloWoff2()],
  define: { __VERSION__: JSON.stringify(versionDelPrograma()) },
  // Rutas relativas: la página funciona en GitHub Pages (/Solucionador-Estad-stico-/) y en cualquier carpeta.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
