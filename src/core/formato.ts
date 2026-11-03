/**
 * Formato de números para texto plano y para LaTeX.
 *
 * Reglas (iguales en todo el programa):
 * - Se redondea a `decimales` cifras decimales y se quitan los ceros sobrantes.
 * - Si el valor es tan pequeño que el redondeo fijo dejaría menos de tres
 *   cifras significativas (p. ej. 0,000136), se usan `decimales` cifras
 *   significativas en su lugar.
 * - Por debajo de 10⁻⁶ o desde 10¹⁵ se usa notación científica.
 * - Los enteros de cinco o más cifras se agrupan de a tres con un espacio fino
 *   (43 245), que no se confunde con el separador decimal.
 */

export interface Formato {
  /** Cifras decimales (o significativas para valores muy pequeños). */
  decimales: number;
  /** true: coma decimal (1,25). false: punto decimal (1.25). */
  coma: boolean;
}

export const FORMATO_BASE: Formato = { decimales: 4, coma: true };

interface Partes {
  negativo: boolean;
  entero: string;
  fraccion: string;
  exponente: number | null;
}

function partesDe(x: number, f: Formato): Partes | null {
  if (!Number.isFinite(x)) return null;
  const d = Math.max(0, Math.min(12, Math.round(f.decimales)));
  const ax = Math.abs(x);
  if (ax === 0) return { negativo: false, entero: '0', fraccion: '', exponente: null };

  if (ax >= 1e15 || ax < 1e-6) {
    const [m, e] = ax.toExponential(Math.max(1, d)).split('e');
    const [ent, fr = ''] = m.split('.');
    return { negativo: x < 0, entero: ent, fraccion: fr.replace(/0+$/, ''), exponente: Number(e) };
  }

  const s = d === 0 || ax >= Math.pow(10, 2 - d) ? ax.toFixed(d) : ax.toPrecision(Math.max(1, d));
  const [ent, frRaw = ''] = s.split('.');
  const fr = frRaw.replace(/0+$/, '');
  const esCero = /^0+$/.test(ent) && fr === '';
  return { negativo: x < 0 && !esCero, entero: ent, fraccion: fr, exponente: null };
}

function agrupar(entero: string, sep: string): string {
  if (entero.length < 5) return entero;
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};
const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

export const superindice = (n: number | string) => String(n).split('').map((c) => SUPER[c] ?? c).join('');
export const subindice = (n: number | string) => String(n).split('').map((c) => SUB[c] ?? c).join('');

/** Número en texto plano: «−1 234,5678», «4,5 × 10⁻⁷». */
export function fmt(x: number, f: Formato = FORMATO_BASE): string {
  const p = partesDe(x, f);
  if (!p) return Number.isNaN(x) ? 'indefinido' : x > 0 ? '∞' : '−∞';
  let s = agrupar(p.entero, ' ') + (p.fraccion ? (f.coma ? ',' : '.') + p.fraccion : '');
  if (p.exponente !== null) s += ' × 10' + superindice(p.exponente);
  return (p.negativo ? '−' : '') + s;
}

/** Número en LaTeX: «-1\,234{,}5678», «4{,}5 \times 10^{-7}». */
export function fmtTex(x: number, f: Formato = FORMATO_BASE): string {
  const p = partesDe(x, f);
  if (!p) return Number.isNaN(x) ? '\\text{indefinido}' : x > 0 ? '\\infty' : '-\\infty';
  let s = agrupar(p.entero, '\\,') + (p.fraccion ? (f.coma ? '{,}' : '.') + p.fraccion : '');
  if (p.exponente !== null) s += ` \\times 10^{${p.exponente}}`;
  return (p.negativo ? '-' : '') + s;
}

/** Como fmtTex, pero entre paréntesis si es negativo o va en notación científica. */
export function fmtTexP(x: number, f: Formato = FORMATO_BASE): string {
  const s = fmtTex(x, f);
  return s.startsWith('-') || s.includes('\\times') ? `\\left(${s}\\right)` : s;
}

/** Número siempre entre paréntesis, para productos: «\left(33{,}45\right)». */
export function par(x: number, f: Formato = FORMATO_BASE): string {
  return `\\left(${fmtTex(x, f)}\\right)`;
}

/** Entero exacto (number o bigint) con agrupación de miles. */
export function fmtEntero(n: number | bigint): string {
  const s = (typeof n === 'bigint' ? n : BigInt(Math.trunc(n))).toString();
  const neg = s.startsWith('-');
  const dig = neg ? s.slice(1) : s;
  return (neg ? '−' : '') + agrupar(dig, ' ');
}

export function fmtEnteroTex(n: number | bigint): string {
  const s = (typeof n === 'bigint' ? n : BigInt(Math.trunc(n))).toString();
  const neg = s.startsWith('-');
  const dig = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + agrupar(dig, '\\,');
}

/** Porcentaje con dos decimales: «74,49 %». */
export function fmtPct(x: number, f: Formato = FORMATO_BASE): string {
  return fmt(x * 100, { ...f, decimales: 2 }) + ' %';
}

export function fmtPctTex(x: number, f: Formato = FORMATO_BASE): string {
  return fmtTex(x * 100, { ...f, decimales: 2 }) + '\\,\\%';
}
