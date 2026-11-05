/**
 * Arma la carpeta usb/ con el programa en un solo archivo HTML, que se abre
 * con doble clic sin servidor ni conexión, y un LEEME con la versión y la
 * huella SHA-256 del archivo para verificar la copia.
 *
 *   npm run build:usb
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const NOMBRE = 'Calculadora de regresion lineal.html';
const html = readFileSync('dist-artifact/index.html', 'utf8');

// El archivo debe funcionar sin conexión: ninguna hoja de estilos, script, fuente o imagen externa.
const externos = [...html.matchAll(/<(?:link|script|img|source)\b[^>]*\b(?:href|src)="(https?:)?\/\/[^"]*"/g)].map((m) => m[0]);
const fuentesExternas = [...html.matchAll(/url\(\s*["']?(https?:)?\/\/[^)]*\)/g)].map((m) => m[0]);
if (externos.length || fuentesExternas.length) {
  console.error('El archivo depende de recursos en internet; no funcionaría sin conexión:');
  for (const e of [...externos, ...fuentesExternas]) console.error('  ' + e.slice(0, 120));
  process.exit(1);
}

// La misma versión que muestra el pie de la página (vite.plugins.ts la escribe en el código compilado).
const version = (() => {
  const enHtml = html.match(/"([0-9a-f]{7,}(?:\+cambios)? \(\d{4}-\d{2}-\d{2}\))"/)?.[1];
  if (enHtml) return enHtml;
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'desconocida';
  }
})();
const huella = createHash('sha256').update(html).digest('hex');

rmSync('usb', { recursive: true, force: true });
mkdirSync('usb');
writeFileSync(`usb/${NOMBRE}`, html);
writeFileSync(
  'usb/LEEME.txt',
  [
    'Calculadora de regresión lineal, ¡con pasos!',
    '',
    `Para usarla, abre «${NOMBRE}» con doble clic.`,
    'Funciona sin internet y sin instalar nada. Probado en Chrome y Edge actualizados.',
    'Es el mismo programa que la página web; la versión aparece al final de la página.',
    '',
    `Versión: ${version}`,
    `SHA-256 del archivo: ${huella}`,
    '',
    'Para comprobar que la copia no se dañó, en PowerShell:',
    `  Get-FileHash "${NOMBRE}" -Algorithm SHA256`,
    '',
  ].join('\r\n'),
);
console.log(`usb/${NOMBRE}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB · versión ${version}`);
console.log(`SHA-256 ${huella}`);
