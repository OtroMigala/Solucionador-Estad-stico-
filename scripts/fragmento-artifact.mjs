/**
 * Convierte dist-artifact/index.html (documento completo) en un fragmento para
 * publicar como página: título, fuentes, estilos, raíz y script, sin las
 * etiquetas <html>, <head> ni <body>, que la plataforma agrega al publicar.
 *
 *   node scripts/fragmento-artifact.mjs [destino.html]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const uno = (re, nombre) => {
  const m = html.match(re);
  if (!m) throw new Error(`No se encontró ${nombre} en dist-artifact/index.html`);
  return m[0];
};

const titulo = uno(/<title>[\s\S]*?<\/title>/, 'el título');
const fuentes = html.match(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g) ?? [];
// (?=[\s>]) evita confundir <style> con etiquetas como <styleSheet> que aparecen dentro del JavaScript
// (el XML de estilos del exportador a Excel).
const estilos = html.match(/<style(?=[\s>])[^>]*>[\s\S]*?<\/style>/g) ?? [];
const scripts = html.match(/<script(?=[\s>])[^>]*>[\s\S]*?<\/script>/g) ?? [];
if (!estilos.length || !scripts.length) throw new Error('Faltan estilos o scripts en línea');

const fragmento = [
  titulo,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...fuentes,
  ...estilos,
  '<div id="root"></div>',
  ...scripts,
].join('\n');

const destino = process.argv[2] ?? 'dist-artifact/solucionador.html';
writeFileSync(destino, fragmento + '\n');
console.log(`${destino}: ${(fragmento.length / 1024).toFixed(0)} KB`);
