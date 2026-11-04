/**
 * Lectura de libros de Excel (.xlsx) en el navegador, sin servidor (RNF-04).
 *
 * Un .xlsx es un ZIP con XML: xl/workbook.xml lista las hojas, sus
 * relaciones dicen en qué archivo está cada una, y xl/sharedStrings.xml
 * guarda los textos. De cada celda se toma el valor guardado; en las celdas
 * con fórmula, Excel guarda también el último resultado calculado.
 */
import { strFromU8, unzipSync } from 'fflate';

export type Valor = string | number | null;

export interface Hoja {
  nombre: string;
  /** celdas[fila][columna], desde A1. */
  celdas: Valor[][];
}

const MAX_FILAS = 5000;
const MAX_COLUMNAS = 200;

function decodificar(s: string): string {
  return s
    .replace(/_x([0-9a-fA-F]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function atributos(etiqueta: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const m of etiqueta.matchAll(/([\w:]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) r[m[1]] = decodificar(m[2] ?? m[3]);
  return r;
}

/** Texto de un elemento con texto enriquecido: concatena sus <t>, sin la guía fonética <rPh>. */
function textoDe(xml: string): string {
  const limpio = xml.replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
  let s = '';
  for (const m of limpio.matchAll(/<(?:\w+:)?t\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?t>)/g)) s += decodificar(m[1] ?? '');
  return s;
}

/** «AB» → 27 (índice desde 0). */
function columnaDe(ref: string): number {
  let c = 0;
  for (const ch of ref.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') break;
    c = c * 26 + (ch.charCodeAt(0) - 64);
  }
  return c - 1;
}

function resolverRuta(destino: string): string {
  if (destino.startsWith('/')) return destino.slice(1);
  const partes = ['xl'];
  for (const p of destino.split('/')) {
    if (p === '..') partes.pop();
    else if (p !== '.') partes.push(p);
  }
  return partes.join('/');
}

function leerHoja(xml: string, compartidos: string[]): Valor[][] {
  const celdas: Valor[][] = [];
  let filaAuto = -1;
  for (const mf of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
    const af = atributos(mf[1]);
    const fila = af.r ? Number(af.r) - 1 : filaAuto + 1;
    filaAuto = fila;
    if (fila >= MAX_FILAS) break;
    let colAuto = -1;
    for (const mc of (mf[2] ?? '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const ac = atributos(mc[1]);
      const col = ac.r ? columnaDe(ac.r) : colAuto + 1;
      colAuto = col;
      if (col < 0 || col >= MAX_COLUMNAS) continue;
      const interior = mc[2] ?? '';
      const v = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(interior)?.[1];
      let valor: Valor = null;
      switch (ac.t) {
        case 's':
          valor = v === undefined ? null : (compartidos[Number(v)] ?? null);
          break;
        case 'inlineStr':
          valor = textoDe(interior);
          break;
        case 'str':
        case 'e':
        case 'd':
          valor = v === undefined ? null : decodificar(v);
          break;
        case 'b':
          valor = v === '1' ? 'VERDADERO' : 'FALSO';
          break;
        default: {
          const n = v === undefined ? NaN : Number(v);
          valor = Number.isFinite(n) ? n : null;
        }
      }
      if (valor === null || valor === '') continue;
      while (celdas.length <= fila) celdas.push([]);
      const f = celdas[fila];
      while (f.length < col) f.push(null);
      f[col] = valor;
    }
  }
  return celdas;
}

export class ErrorLectura extends Error {}

/** true si los bytes empiezan como un ZIP (.xlsx, .ods…). */
export const esZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b;

/** true si los bytes son un documento OLE, como el .xls antiguo de Excel 97–2003. */
export const esXlsAntiguo = (bytes: Uint8Array) => bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;

/** Lee las hojas visibles de un .xlsx. */
export function leerXlsx(bytes: Uint8Array): Hoja[] {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(bytes, { filter: (f) => (f.name.startsWith('xl/') && f.name.endsWith('.xml')) || f.name.endsWith('.rels') });
  } catch {
    throw new ErrorLectura('El archivo está dañado o no es un libro de Excel.');
  }
  const texto = (ruta: string) => (zip[ruta] ? strFromU8(zip[ruta]) : null);
  const libro = texto('xl/workbook.xml');
  if (!libro) throw new ErrorLectura('El archivo no es un libro de Excel (.xlsx).');

  const relaciones = new Map<string, string>();
  for (const m of (texto('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<(?:\w+:)?Relationship\b([^>]*)>/g)) {
    const a = atributos(m[1]);
    if (a.Id && a.Target) relaciones.set(a.Id, resolverRuta(a.Target));
  }

  const compartidos: string[] = [];
  for (const m of (texto('xl/sharedStrings.xml') ?? '').matchAll(/<(?:\w+:)?si\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g)) {
    compartidos.push(textoDe(m[1] ?? ''));
  }

  const hojas: Hoja[] = [];
  let i = 0;
  for (const m of libro.matchAll(/<(?:\w+:)?sheet\b([^>]*)>/g)) {
    i++;
    const a = atributos(m[1]);
    if (a.state === 'hidden' || a.state === 'veryHidden') continue;
    const id = a['r:id'] ?? Object.entries(a).find(([k]) => k.endsWith(':id'))?.[1];
    const ruta = (id && relaciones.get(id)) ?? `xl/worksheets/sheet${i}.xml`;
    const xml = texto(ruta);
    if (xml === null) continue;
    hojas.push({ nombre: a.name ?? `Hoja ${i}`, celdas: leerHoja(xml, compartidos) });
  }
  if (hojas.length === 0) throw new ErrorLectura('El libro no tiene hojas visibles con datos.');
  return hojas;
}
