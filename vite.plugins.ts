import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';

/**
 * Versión del programa: commit de git y su fecha, con «+cambios» si se compiló
 * con modificaciones sin guardar en un commit. Se muestra en el pie de página
 * para comprobar que la copia de la USB y la web son la misma.
 */
export function versionDelPrograma(): string {
  try {
    const git = (cmd: string) => execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const commit = git('rev-parse --short HEAD');
    const fecha = git('log -1 --format=%cs');
    const cambios = git('status --porcelain --untracked-files=no') !== '';
    return `${commit}${cambios ? '+cambios' : ''} (${fecha})`;
  } catch {
    return 'desconocida';
  }
}

/**
 * Deja solo las fuentes woff2 de KaTeX y de IBM Plex (todos los navegadores
 * actuales las leen). Se usa en la compilación web y en la de un solo archivo,
 * para que las dos carguen exactamente las mismas fuentes.
 */
export function soloWoff2(): Plugin {
  return {
    name: 'solo-woff2',
    enforce: 'pre',
    transform(code, id) {
      if (!/(katex|@fontsource).*\.css/.test(id)) return null;
      return code
        .replace(/,\s*url\([^)]+\.woff\)\s*format\(["']woff["']\)/g, '')
        .replace(/,\s*url\([^)]+\.ttf\)\s*format\(["']truetype["']\)/g, '');
    },
  };
}
