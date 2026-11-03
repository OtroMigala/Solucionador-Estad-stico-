/** Constructores de fórmulas LaTeX usados por el núcleo. */

export const frac = (a: string, b: string) => `\\frac{${a}}{${b}}`;
export const sum = (expr: string, i = 'i', n = 'n') => `\\sum_{${i}=1}^{${n}} ${expr}`;

/** Formatea un número para LaTeX con `dec` decimales, sin ceros sobrantes. */
export function num(x: number, dec = 4): string {
  if (!Number.isFinite(x)) return x > 0 ? '\\infty' : x < 0 ? '-\\infty' : '\\text{indef.}';
  const s = Number(x.toFixed(dec)).toString();
  return x < 0 ? `(${s})` : s;
}
