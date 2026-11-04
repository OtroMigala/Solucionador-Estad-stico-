/**
 * Importación de datos de regresión desde un archivo (.xlsx o .csv) o desde
 * celdas pegadas: encuentra la tabla de números dentro de la hoja, aunque
 * tenga títulos, notas o una fila de totales, y sugiere qué columna es y y
 * cuáles son las x a partir de los encabezados.
 */
import { parseNumero } from '../entrada';
import { type Hoja, type Valor, ErrorLectura, esXlsAntiguo, esZip, leerXlsx } from './xlsx';

export { ErrorLectura, type Hoja, type Valor };

export type Rol = 'y' | 'x' | 'ignorar';

export interface TablaDetectada {
  /** Fila de la hoja (desde 0) de la primera observación; la última es filaFin. */
  filaInicio: number;
  filaFin: number;
  /** Columnas de la hoja (desde 0) que forman la tabla. */
  columnas: number[];
  encabezados: string[];
  /** valores[i][j]: observación i, columna j; null si la celda está vacía o no es un número. */
  valores: (number | null)[][];
  /** Contenido original de cada celda, para mostrarlo al revisar. */
  crudos: Valor[][];
}

export interface HojaLeida {
  nombre: string;
  tabla: TablaDetectada | null;
  /** La hoja es el resumen que genera la herramienta de regresión de Excel, no los datos. */
  esResumen: boolean;
}

/* ───────────── texto y CSV ───────────── */

function valorNumero(v: Valor): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = parseNumero(v);
  return Number.isFinite(n) ? n : null;
}

const esNumero = (v: Valor) => valorNumero(v) !== null;

function dividir(linea: string, sep: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (comillas) {
      if (ch === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else actual += ch;
    } else if (ch === '"' && actual.trim() === '') {
      comillas = true;
      actual = '';
    } else if (ch === sep) {
      campos.push(actual);
      actual = '';
    } else actual += ch;
  }
  campos.push(actual);
  return campos;
}

/**
 * Divide un texto en celdas. En un archivo CSV el separador puede ser
 * tabulador, punto y coma o coma; en celdas pegadas, tabulador, punto y coma
 * o espacios (la coma puede ser el separador decimal).
 */
export function parseCsv(texto: string, comoArchivo = true): Valor[][] {
  const lineas = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const muestra = lineas.filter((l) => l.trim() !== '').slice(0, 30);
  const sep = (comoArchivo ? ['\t', ';', ','] : ['\t', ';']).find((c) => muestra.some((l) => l.includes(c)));
  return lineas.map((l) =>
    (sep ? dividir(l, sep) : l.trim().split(/\s+/)).map((c) => {
      const t = c.trim();
      return t === '' ? null : t;
    }),
  );
}

/** Decodifica un CSV en UTF-8 o, si no lo es, en Windows-1252 (el que usa Excel en español al guardar como CSV). */
export function decodificarTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/* ───────────── detección de la tabla ───────────── */

const RESUMEN = /^\s*(total(es)?|sumas?|σ|Σ|promedios?|media)\b/i;
const filaDeResumen = (f: Valor[] | undefined) => (f ?? []).some((c) => typeof c === 'string' && RESUMEN.test(c));

const minimoPorFila = (ancho: number) => Math.max(2, Math.ceil(ancho / 2));
const cuenta = (f: Valor[] | undefined, cols: number[]) => cols.filter((j) => esNumero(f?.[j] ?? null)).length;

function numericas(f: Valor[] | undefined): number[] {
  return (f ?? []).flatMap((c, j) => (esNumero(c) ? [j] : []));
}

function tramosContiguos(cols: number[]): number[][] {
  const orden = [...new Set(cols)].sort((a, b) => a - b);
  const tramos: number[][] = [];
  for (const c of orden) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && c === ultimo[ultimo.length - 1] + 1) ultimo.push(c);
    else tramos.push([c]);
  }
  return tramos;
}

/** true si la fila son las sumas de las filas anteriores (una fila de totales sin etiqueta). */
function esFilaDeSumas(valores: (number | null)[][]): boolean {
  if (valores.length < 3) return false;
  const ultima = valores[valores.length - 1];
  let comparadas = 0;
  for (let j = 0; j < ultima.length; j++) {
    const v = ultima[j];
    if (v === null) continue;
    const suma = valores.slice(0, -1).reduce((s, f) => s + (f[j] ?? 0), 0);
    if (Math.abs(v - suma) > 1e-9 * Math.max(1, Math.abs(suma))) return false;
    comparadas++;
  }
  return comparadas >= 2;
}

function encabezadosDe(celdas: Valor[][], fila: number, columnas: number[]): string[] {
  for (let r = fila - 1; r >= Math.max(0, fila - 3); r--) {
    const f = celdas[r] ?? [];
    if (columnas.some((j) => typeof f[j] === 'string' && !esNumero(f[j]))) {
      return columnas.map((j) => (f[j] === null || f[j] === undefined ? '' : String(f[j]).trim()));
    }
  }
  return columnas.map(() => '');
}

/**
 * Busca el bloque rectangular de números con más filas: las observaciones.
 * Se detiene en filas de totales (con etiqueta o que son las sumas de las
 * anteriores) y toma como encabezados la fila de texto que hay encima.
 */
export function detectarTabla(celdas: Valor[][]): TablaDetectada | null {
  let mejor: { inicio: number; fin: number; columnas: number[] } | null = null;
  for (let r = 0; r < celdas.length; r++) {
    if (filaDeResumen(celdas[r])) continue;
    // Columnas numéricas de esta fila y de la siguiente, para tolerar alguna celda vacía.
    const cols = [...numericas(celdas[r]), ...numericas(celdas[r + 1]).filter(() => !filaDeResumen(celdas[r + 1]))];
    for (const tramo of tramosContiguos(cols)) {
      if (tramo.length < 2 || cuenta(celdas[r], tramo) < minimoPorFila(tramo.length)) continue;
      const pertenece = (i: number) => !filaDeResumen(celdas[i]) && cuenta(celdas[i], tramo) >= minimoPorFila(tramo.length);
      if (r > 0 && pertenece(r - 1)) continue; // el bloque empezó antes
      let fin = r;
      while (fin + 1 < celdas.length && pertenece(fin + 1)) fin++;
      const filas = fin - r + 1;
      const mejores = mejor ? mejor.fin - mejor.inicio + 1 : 0;
      if (!mejor || filas > mejores || (filas === mejores && tramo.length > mejor.columnas.length)) {
        mejor = { inicio: r, fin, columnas: tramo };
      }
    }
  }
  if (!mejor || mejor.fin - mejor.inicio + 1 < 2) return null;

  let { inicio, fin, columnas } = mejor;
  const leer = (a: number, b: number, cols: number[]) =>
    Array.from({ length: b - a + 1 }, (_, i) => cols.map((j) => valorNumero(celdas[a + i]?.[j] ?? null)));
  if (esFilaDeSumas(leer(inicio, fin, columnas))) fin--;
  // Columnas casi vacías (por ejemplo, una nota al lado de los datos) no forman parte de la tabla.
  const filas = fin - inicio + 1;
  const llenas = columnas.filter((j) => {
    let n = 0;
    for (let i = inicio; i <= fin; i++) if ((celdas[i]?.[j] ?? null) !== null) n++;
    return n * 2 >= filas;
  });
  if (llenas.length >= 2) columnas = llenas;

  return {
    filaInicio: inicio,
    filaFin: fin,
    columnas,
    encabezados: encabezadosDe(celdas, inicio, columnas),
    valores: leer(inicio, fin, columnas),
    crudos: Array.from({ length: fin - inicio + 1 }, (_, i) => columnas.map((j) => celdas[inicio + i]?.[j] ?? null)),
  };
}

/* ───────────── papel de cada columna ───────────── */

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const normalizar = (h: string) =>
  h
    .toLowerCase()
    .replace(/[₀-₉]/g, (d) => String(SUB.indexOf(d)))
    .replace(/[\s_]+/g, ' ')
    .trim();

const INDICE = /^(i|n|no\.?|n[°º.]|#|obs\.?|observaci[oó]n(es)?|id|fila|[ií]tem|dato|caso|mes|a[ñn]o|per[ií]odo)$/;

/** Símbolo de la variable en el encabezado: «y», «x1 (Temperatura)», «x₂: Días», «Temperatura (x1)». */
function simbolo(h: string): { tipo: 'y' | 'x'; n: number | null } | null {
  const c = normalizar(h).replace(/\s/g, '');
  const m = /^(y|x(\d*))(?![a-z0-9])/.exec(c) ?? /\((y|x(\d*))\)$/.exec(c);
  if (!m) return null;
  return m[1] === 'y' ? { tipo: 'y', n: null } : { tipo: 'x', n: m[2] ? Number(m[2]) : null };
}

function rolPorEncabezado(h: string): Rol | null {
  const n = normalizar(h);
  const c = n.replace(/\s/g, '');
  if (c === '') return null;
  if (INDICE.test(n)) return 'ignorar';
  if (/ŷ|y\^|yhat|ajustad|estimad|residu|predic|error/.test(c)) return 'ignorar';
  if (/[\^²³*·×]/.test(c) || /^x\d*(x\d*|y)/.test(c) || /^y[xy]/.test(c)) return 'ignorar';
  const s = simbolo(h);
  if (s) return s.tipo;
  if (/respuesta|dependiente/.test(n)) return 'y';
  if (/regresora|independiente/.test(n)) return 'x';
  return null;
}

const esSecuencia = (v: (number | null)[]) => v.length >= 3 && v.every((x, i) => x === v[0]! + i) && (v[0] === 0 || v[0] === 1);

/**
 * Sugiere el papel de cada columna: por el encabezado (y, x1, x₂…; los
 * números de observación y las columnas de productos como x1², x1·y se
 * ignoran). Si ninguna se llama y, la primera columna sin nombre reconocible
 * es y.
 */
export function sugerirRoles(t: TablaDetectada): Rol[] {
  const roles: (Rol | null)[] = t.encabezados.map(rolPorEncabezado);
  t.columnas.forEach((_, j) => {
    if (roles[j] === null && esSecuencia(t.valores.map((f) => f[j]))) roles[j] = 'ignorar';
  });
  let hayY = false;
  roles.forEach((r, j) => {
    if (r === 'y') {
      if (hayY) roles[j] = 'ignorar';
      hayY = true;
    }
  });
  if (!hayY) {
    const j = roles.indexOf(null);
    if (j >= 0) roles[j] = 'y';
  }
  return roles.map((r) => r ?? 'x');
}

/** Texto que parece solo una unidad de medida: «kcal/kg», «%», «°F». */
const esUnidad = (s: string) => !/\s/.test(s) && (s.includes('/') || s.replace(/[^a-záéíóúñ]/gi, '').length <= 2);

/**
 * Nombre descriptivo de la variable: «x1 (Temperatura)» → «Temperatura»;
 * «x1» o «y» solos → ''. Si el paréntesis solo trae la unidad, como en
 * «y (kcal/kg)», se deja el encabezado completo.
 */
export function nombreVariable(encabezado: string): string {
  const h = encabezado.trim();
  const sim = '(?:y|x\\s*_?\\d*|x[₀-₉]+)';
  const delante = new RegExp(`^${sim}\\s*[:=\\-–(]\\s*(.+?)\\)?$`, 'i').exec(h);
  if (delante) return esUnidad(delante[1].trim()) ? h : delante[1].trim();
  const detras = new RegExp(`^(.+?)\\s*\\(${sim}\\)$`, 'i').exec(h);
  if (detras) return detras[1].trim();
  return new RegExp(`^${sim}$`, 'i').test(h) ? '' : h;
}

/** Número de la variable en el encabezado («x3», «x₃», «Días (x2)»), o null. */
const numeroX = (encabezado: string): number | null => simbolo(encabezado)?.n ?? null;

export const letraColumna = (j: number): string => (j >= 26 ? letraColumna(Math.floor(j / 26) - 1) : '') + String.fromCharCode(65 + (j % 26));

export interface DatosImportados {
  nombreY: string;
  nombresX: string[];
  /** filas[i] = [y, x₁, …, xₖ]; null en celdas vacías o no numéricas. */
  filas: (number | null)[][];
  /** Celdas que faltan o no son números, con su ubicación en la hoja. */
  problemas: string[];
}

/** Arma los datos con los papeles elegidos. Si las x se llaman x1, x2…, se ordenan por su número. */
export function construirDatos(t: TablaDetectada, roles: Rol[]): DatosImportados | { error: string } {
  const jy = roles.indexOf('y');
  if (jy < 0) return { error: 'Elige qué columna es la variable de respuesta y.' };
  let jx = roles.flatMap((r, j) => (r === 'x' ? [j] : []));
  if (jx.length === 0) return { error: 'Elige al menos una columna como variable regresora x.' };
  const numeros = jx.map((j) => numeroX(t.encabezados[j]));
  if (numeros.every((n) => n !== null) && new Set(numeros).size === numeros.length) {
    jx = jx.map((j, i) => ({ j, n: numeros[i]! })).sort((a, b) => a.n - b.n).map((o) => o.j);
  }
  const usadas = [jy, ...jx];
  const problemas: string[] = [];
  t.valores.forEach((fila, i) =>
    usadas.forEach((j) => {
      if (fila[j] === null) {
        const crudo = t.crudos[i][j];
        const celda = `${letraColumna(t.columnas[j])}${t.filaInicio + i + 1}`;
        problemas.push(crudo === null ? `${celda} está vacía` : `${celda} no es un número («${crudo}»)`);
      }
    }),
  );
  return {
    nombreY: nombreVariable(t.encabezados[jy]),
    nombresX: jx.map((j) => nombreVariable(t.encabezados[j])),
    filas: t.valores.map((f) => usadas.map((j) => f[j])),
    problemas,
  };
}

/* ───────────── archivos ───────────── */

const SENAL_RESUMEN = /estad[ií]sticas de la regresi[oó]n|regression statistics|coeficiente de correlaci[oó]n m[uú]ltiple|multiple r\b/i;

export function analizarHoja(h: Hoja): HojaLeida {
  const esResumen = h.celdas.some((f) => f.some((c) => typeof c === 'string' && SENAL_RESUMEN.test(c)));
  return { nombre: h.nombre, tabla: detectarTabla(h.celdas), esResumen };
}

/** Lee un .xlsx o un .csv y analiza cada hoja. */
export function leerArchivo(nombre: string, bytes: Uint8Array): HojaLeida[] {
  if (esXlsAntiguo(bytes)) {
    throw new ErrorLectura(
      'Este archivo es .xls, el formato antiguo de Excel. Ábrelo en Excel y usa «Guardar como» → «Libro de Excel (.xlsx)», o guárdalo como CSV.',
    );
  }
  const hojas = esZip(bytes) ? leerXlsx(bytes) : [{ nombre: nombre.replace(/\.[^.]+$/, ''), celdas: parseCsv(decodificarTexto(bytes)) }];
  return hojas.map(analizarHoja);
}

/** Hoja que conviene mostrar primero: la de la tabla con más filas que no sea un resumen de Excel. */
export function hojaSugerida(hojas: HojaLeida[]): number {
  let mejor = -1;
  hojas.forEach((h, i) => {
    if (!h.tabla || h.esResumen) return;
    const filas = (t: TablaDetectada) => t.filaFin - t.filaInicio + 1;
    if (mejor < 0 || filas(h.tabla) > filas(hojas[mejor].tabla!)) mejor = i;
  });
  return mejor >= 0 ? mejor : Math.max(0, hojas.findIndex((h) => h.tabla));
}
