/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: la página funciona en GitHub Pages (/Solucionador-Estad-stico-/) y en cualquier carpeta.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
