import { parseNumero } from '../../core/entrada';
import type { Formato } from '../../core/formato';
import { type OpcionesRegresion, type ResultadoRegresion, resolverRegresion } from '../../core/regresion';
import type { EjemploRegresion } from '../../core/regresion/ejemplos';
import { type Literal, literalesDisponibles, literalesPorDefecto } from '../../core/regresion/literales';
import type { Solucion } from '../../core/steps';
import type { DatosTabla } from './TablaDatos';

/** Lo que el usuario armó en las etapas 1 y 2: los datos y lo que pide el ejercicio. */
export interface Ejercicio {
  ejemplo: EjemploRegresion | null;
  /** Archivo del que salieron los datos, si se subió uno. */
  archivo: string | null;
  modificado: boolean;
  tabla: DatosTabla;
  alfa: string;
  x0: string[];
  /** Literales pedidos, en el orden del enunciado. */
  literales: Literal[];
}

/** Número a texto para la tabla editable, sin el ruido de los decimales binarios (15 cifras, como Excel). */
export function aTexto(v: number, coma: boolean) {
  const s = String(Number(v.toPrecision(15)));
  return coma ? s.replace('.', ',') : s;
}

export function desdeEjemplo(e: EjemploRegresion, coma: boolean): Ejercicio {
  return {
    ejemplo: e,
    archivo: null,
    modificado: false,
    tabla: {
      nombreY: e.nombreY,
      nombresX: [...e.nombresX],
      celdas: e.y.map((yi, i) => [aTexto(yi, coma), ...e.x.map((c) => aTexto(c[i], coma))]),
    },
    alfa: aTexto(e.alfa, coma),
    x0: e.x0 ? e.x0.map((v) => aTexto(v, coma)) : e.nombresX.map(() => ''),
    literales: [...e.literales],
  };
}

export function desdeDatos(tabla: DatosTabla, archivo: string | null, coma: boolean): Ejercicio {
  return {
    ejemplo: null,
    archivo,
    modificado: false,
    tabla,
    alfa: coma ? '0,05' : '0.05',
    x0: tabla.nombresX.map(() => ''),
    literales: literalesPorDefecto(tabla.nombresX.length),
  };
}

export function leerAlfa(s: string): number {
  const t = s.trim();
  return t.endsWith('%') ? parseNumero(t.slice(0, -1)) / 100 : parseNumero(t);
}

export const filasConDatos = (t: DatosTabla) => t.celdas.filter((f) => f.some((c) => c.trim() !== ''));

/** Literales pedidos que tienen sentido con el número actual de variables x. */
export function literalesValidos(e: Ejercicio): Literal[] {
  const disponibles = new Set(literalesDisponibles(e.tabla.nombresX.length).map((l) => l.id));
  return e.literales.filter((l) => disponibles.has(l));
}

export type Calculo =
  | { ok: true; solucion: Solucion<ResultadoRegresion>; op: OpcionesRegresion; literales: Literal[] }
  | { ok: false; error: string };

export function calcular(e: Ejercicio, formato: Formato): Calculo {
  const k = e.tabla.nombresX.length;
  const literales = literalesValidos(e);
  if (literales.length === 0) return { ok: false, error: 'Marca al menos una de las preguntas del ejercicio.' };
  const nums = filasConDatos(e.tabla).map((f) => f.map(parseNumero));
  const datos = {
    y: nums.map((f) => f[0]),
    x: Array.from({ length: k }, (_, j) => nums.map((f) => f[j + 1])),
    nombreY: e.tabla.nombreY.trim() || undefined,
    nombresX: e.tabla.nombresX.map((s) => s.trim()),
  };
  const valores = e.x0.slice(0, k).map((v) => v.trim());
  const faltaX0 = literales.includes('prediccion') && (valores.length < k || valores.some((v) => v === ''));
  const op: OpcionesRegresion = { alfa: leerAlfa(e.alfa), x0: literales.includes('prediccion') && !faltaX0 ? valores.map(parseNumero) : null, formato };
  const r = resolverRegresion(datos, op);
  // Los problemas de los datos se avisan antes que los valores que faltan para predecir.
  if (r.ok && faltaX0) return { ok: false, error: 'Para la predicción escribe el valor de cada variable x, o quita la predicción de la lista.' };
  return r.ok ? { ok: true, solucion: r.solucion, op, literales } : r;
}
