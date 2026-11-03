/**
 * Lectura de datos escritos o pegados por el usuario.
 * Acepta coma o punto decimal, separadores de miles, porcentajes y fracciones.
 */
import { Racional } from './racional';

/** Convierte «1.072,5», «1,072.5», «25,00», «-3.5», «1e-3» a número. NaN si no es válido. */
export function parseNumero(texto: string): number {
  let s = texto.trim().replace(/[\s  ]/g, '').replace(/[−–]/g, '-');
  if (s === '' || s === '-' || s === '+') return NaN;
  if (/e/i.test(s)) {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }
  const comas = (s.match(/,/g) ?? []).length;
  const puntos = (s.match(/\./g) ?? []).length;
  if (comas > 0 && puntos > 0) {
    // El último separador que aparece es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (comas > 1) {
    s = s.replace(/,/g, '');
  } else if (comas === 1) {
    s = s.replace(',', '.');
  } else if (puntos > 1) {
    s = s.replace(/\./g, '');
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

function decimalExacto(s: string): Racional | null {
  const t = s.replace(',', '.');
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(t);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const signo = m[1] === '-' ? -1n : 1n;
  const ent = m[2] === '' ? '0' : m[2];
  const fr = m[3] ?? '';
  return new Racional(signo * BigInt(ent + fr), 10n ** BigInt(fr.length));
}

export type Lectura<T> = { ok: true; valor: T } | { ok: false; error: string };

/**
 * Lee una cantidad exacta: «0,83», «0.83», «1/3», «30%», «30/80», «7».
 * Devuelve una fracción exacta (0,83 → 83/100).
 */
export function parseRacional(texto: string): Lectura<Racional> {
  const s = texto.trim().replace(/[\s  ]/g, '').replace(/[−–]/g, '-');
  if (s === '') return { ok: false, error: 'Falta el valor.' };
  if (s.endsWith('%')) {
    const r = parseRacional(s.slice(0, -1));
    return r.ok ? { ok: true, valor: r.valor.entre(Racional.entero(100)) } : r;
  }
  const barra = s.indexOf('/');
  if (barra >= 0) {
    const a = decimalExacto(s.slice(0, barra));
    const c = decimalExacto(s.slice(barra + 1));
    if (!a || !c) return { ok: false, error: `«${texto}» no es una fracción válida.` };
    if (c.esCero()) return { ok: false, error: 'El denominador no puede ser cero.' };
    return { ok: true, valor: a.entre(c) };
  }
  const d = decimalExacto(s);
  return d ? { ok: true, valor: d } : { ok: false, error: `«${texto}» no es un número.` };
}

/** Lee una probabilidad y exige que esté entre 0 y 1. */
export function parseProbabilidad(texto: string, nombre: string): Lectura<Racional> {
  const r = parseRacional(texto);
  if (!r.ok) return { ok: false, error: `${nombre}: ${r.error}` };
  if (!r.valor.enRango01()) {
    return { ok: false, error: `${nombre} debe estar entre 0 y 1 (axioma 0 ≤ P ≤ 1).` };
  }
  return r;
}

/** Lee un entero no negativo. */
export function parseEntero(texto: string, nombre: string, max = 500): Lectura<number> {
  const s = texto.trim();
  if (!/^\d+$/.test(s)) return { ok: false, error: `${nombre} debe ser un entero mayor o igual que 0.` };
  const n = Number(s);
  if (n > max) return { ok: false, error: `${nombre} no puede ser mayor que ${max}.` };
  return { ok: true, valor: n };
}

export interface TablaPegada {
  encabezados: string[] | null;
  filas: string[][];
}

/**
 * Interpreta texto pegado desde Excel u hojas de cálculo: columnas separadas por
 * tabuladores (o punto y coma, o espacios). Si la primera fila no es numérica,
 * se toma como encabezados.
 */
export function parseTablaPegada(texto: string): TablaPegada {
  const lineas = texto
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '');
  if (lineas.length === 0) return { encabezados: null, filas: [] };
  const sep = lineas.some((l) => l.includes('\t')) ? /\t/ : lineas.some((l) => l.includes(';')) ? /;/ : /\s+/;
  const filas = lineas.map((l) => l.trim().split(sep).map((c) => c.trim()));
  const primera = filas[0];
  const esEncabezado = primera.some((c) => c !== '' && Number.isNaN(parseNumero(c)));
  return esEncabezado ? { encabezados: primera, filas: filas.slice(1) } : { encabezados: null, filas };
}
