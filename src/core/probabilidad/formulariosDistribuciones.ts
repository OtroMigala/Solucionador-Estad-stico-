/**
 * Formularios de las distribuciones discretas (todo como texto, tal como lo
 * escribe el usuario) y su conversión a los datos del núcleo.
 */
import type { Formato } from '../formato';
import { parseEntero, parseProbabilidad, parseRacional } from '../entrada';
import type { Respuesta } from '../steps';
import {
  type Consulta,
  type Opciones,
  type SalidaDistribucion,
  type TipoConsulta,
  resolverBinomial,
  resolverHipergeometrica,
  resolverMultinomial,
  resolverPoisson,
} from './distribuciones';

export interface ConsultaForm {
  etiqueta: string;
  tipo: TipoConsulta;
  a: string;
  b: string;
}

export interface OpcionesForm {
  /** Qué es un éxito («pozo con impurezas»). */
  exito: string;
  consultas: ConsultaForm[];
  momentos: boolean;
  tchebycheff: boolean;
  tabla: boolean;
}

export interface BinomialForm extends OpcionesForm {
  n: string;
  pi: string;
}

export interface HipergeometricaForm extends OpcionesForm {
  N: string;
  n: string;
  k: string;
}

export interface PoissonForm extends OpcionesForm {
  modo: 'tasa' | 'np';
  tasa: string;
  unidades: string;
  unidad: string;
  n: string;
  pi: string;
}

export interface MultinomialForm {
  categorias: { nombre: string; pi: string; x: string }[];
}

export const consultaVacia = (tipo: TipoConsulta = 'igual', a = '', etiqueta = '', b = ''): ConsultaForm => ({ etiqueta, tipo, a, b });

function leerOpciones(o: OpcionesForm): { ok: true; valor: Opciones } | { ok: false; error: string } {
  const consultas: Consulta[] = [];
  for (const c of o.consultas) {
    const a = parseEntero(c.a, 'El valor de x', 100000);
    if (!a.ok) return a;
    const q: Consulta = { tipo: c.tipo, a: a.valor, etiqueta: c.etiqueta.trim() || undefined };
    if (c.tipo === 'entre') {
      const bb = parseEntero(c.b, 'El segundo valor de x', 100000);
      if (!bb.ok) return bb;
      q.b = bb.valor;
    }
    consultas.push(q);
  }
  return { ok: true, valor: { consultas, momentos: o.momentos, tchebycheff: o.tchebycheff, tabla: o.tabla } };
}

function leerPositivo(texto: string, nombre: string): { ok: true; valor: number } | { ok: false; error: string } {
  const r = parseRacional(texto);
  if (!r.ok) return { ok: false, error: `${nombre}: ${r.error}` };
  const v = r.valor.aNumero();
  return v > 0 ? { ok: true, valor: v } : { ok: false, error: `${nombre} debe ser mayor que 0.` };
}

export function resolverBinomialForm(form: BinomialForm, f: Formato): Respuesta<SalidaDistribucion> {
  const n = parseEntero(form.n, 'n', 1000);
  if (!n.ok) return n;
  const pi = parseProbabilidad(form.pi, 'π');
  if (!pi.ok) return pi;
  const op = leerOpciones(form);
  if (!op.ok) return op;
  return resolverBinomial({ n: n.valor, pi: pi.valor, exito: form.exito }, op.valor, f);
}

export function resolverHipergeometricaForm(form: HipergeometricaForm, f: Formato): Respuesta<SalidaDistribucion> {
  const N = parseEntero(form.N, 'N', 100000);
  if (!N.ok) return N;
  const n = parseEntero(form.n, 'n', 100000);
  if (!n.ok) return n;
  const k = parseEntero(form.k, 'k', 100000);
  if (!k.ok) return k;
  const op = leerOpciones(form);
  if (!op.ok) return op;
  return resolverHipergeometrica({ N: N.valor, n: n.valor, k: k.valor, exito: form.exito }, op.valor, f);
}

export function resolverPoissonForm(form: PoissonForm, f: Formato): Respuesta<SalidaDistribucion> {
  const op = leerOpciones(form);
  if (!op.ok) return op;
  if (form.modo === 'tasa') {
    const tasa = leerPositivo(form.tasa, 'El promedio por unidad');
    if (!tasa.ok) return tasa;
    const unidades = leerPositivo(form.unidades, 'El número de unidades');
    if (!unidades.ok) return unidades;
    return resolverPoisson({ modo: 'tasa', tasa: tasa.valor, unidades: unidades.valor, unidad: form.unidad, exito: form.exito }, op.valor, f);
  }
  const n = parseEntero(form.n, 'n', 10 ** 9);
  if (!n.ok) return n;
  const pi = parseProbabilidad(form.pi, 'π');
  if (!pi.ok) return pi;
  return resolverPoisson({ modo: 'np', n: n.valor, pi: pi.valor.aNumero(), exito: form.exito }, op.valor, f);
}

export function resolverMultinomialForm(form: MultinomialForm, f: Formato): Respuesta<SalidaDistribucion> {
  const cats = [];
  for (const [i, c] of form.categorias.entries()) {
    const nombre = c.nombre.trim() || `E${i + 1}`;
    const pi = parseProbabilidad(c.pi, `π de «${nombre}»`);
    if (!pi.ok) return pi;
    const x = parseEntero(c.x, `Ocurrencias de «${nombre}»`, 500);
    if (!x.ok) return x;
    cats.push({ nombre, pi: pi.valor, x: x.valor });
  }
  return resolverMultinomial(cats, f);
}
