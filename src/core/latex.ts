/** Constructores de fórmulas LaTeX usados por el núcleo. */
import { type Formato, fmtTex } from './formato';

export const frac = (a: string | number, b: string | number) => `\\frac{${a}}{${b}}`;

const ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '^': '\\textasciicircum{}',
  _: '\\_',
  '%': '\\%',
  '~': '\\textasciitilde{}',
};

/** Escapa texto libre (nombres de variables, eventos) para usarlo dentro de \text{}. */
export function escaparTexto(s: string): string {
  return s.replace(/[\\{}$&#^_%~]/g, (c) => ESCAPES[c]);
}

export const texto = (s: string) => `\\text{${escaparTexto(s)}}`;

/**
 * Símbolo de un evento escrito por el usuario. «A», «B1», «H'» van tal cual
 * (con subíndice numérico); cualquier otra cosa va como texto.
 */
export function simTex(s: string): string {
  const t = s.trim().replace(/[′’]/g, "'");
  if (t === '') return 'A';
  const partes = t.split(/([∩∪|∣])/);
  if (partes.length > 1) {
    return partes.map((p) => OPERADORES[p] ?? (p.trim() ? simTex(p) : '')).join('');
  }
  const m = /^([A-Za-z])(\d*)('*)$/.exec(t);
  if (m) return `${m[1]}${m[2] ? `_{${m[2]}}` : ''}${m[3]}`;
  return texto(t);
}

const OPERADORES: Record<string, string> = { '∩': '\\cap ', '∪': '\\cup ', '|': '\\mid ', '∣': '\\mid ' };

/** Matriz con corchetes a partir de celdas ya escritas en LaTeX. */
export function matriz(filas: string[][]): string {
  return `\\begin{bmatrix} ${filas.map((f) => f.join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
}

export function matrizNum(M: number[][], f: Formato): string {
  return matriz(M.map((fila) => fila.map((v) => fmtTex(v, f))));
}

export function vectorNum(v: number[], f: Formato): string {
  return matriz(v.map((x) => [fmtTex(x, f)]));
}

/** Matriz aumentada [A | B]. */
export function aumentada(A: number[][], B: number[][], f: Formato): string {
  const cols = 'r'.repeat(A[0].length) + '|' + 'r'.repeat(B[0].length);
  const filas = A.map((fila, i) => [...fila, ...B[i]].map((v) => fmtTex(v, f)).join(' & '));
  return `\\left[\\begin{array}{${cols}} ${filas.join(' \\\\ ')} \\end{array}\\right]`;
}

/** Sistema de ecuaciones alineado en el signo igual. */
export function sistema(lineas: [string, string][]): string {
  return `\\begin{aligned} ${lineas.map(([izq, der]) => `${izq} &= ${der}`).join(' \\\\ ')} \\end{aligned}`;
}

/** Sumatoria abreviada: \sum x_i */
export const suma = (expr: string) => `\\sum ${expr}`;
