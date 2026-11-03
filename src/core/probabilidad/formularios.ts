/**
 * Estado de los formularios de probabilidad (todo como texto, tal como lo
 * escribe el usuario) y su conversión a los datos del núcleo.
 */
import type { Formato } from '../formato';
import { type Lectura, parseEntero, parseProbabilidad } from '../entrada';
import { Racional } from '../racional';
import type { Respuesta } from '../steps';
import {
  type ExpresionConteo,
  type TerminoConteo,
  type TipoTermino,
  contarLetras,
  resolverConteo,
} from '../combinatoria';
import { resolverProbConteo } from './clasica';
import { type ModoPesos, type TipoEspacio, resolverEspacio } from './espacio';
import { type TipoRelacion, type Relacion, resolverDosEventos, resolverTresEventos } from './reglas';
import { resolverSucesivas } from './sucesivas';
import { type Consulta, resolverContingencia } from './contingencia';
import { resolverBayes } from './bayes';

/* ─────────── Conteo ─────────── */

export interface TerminoForm {
  tipo: TipoTermino;
  n: string;
  r: string;
  /** Factores de la regla de la multiplicación: «4, 5, 2». */
  factores: string;
  /** Palabra cuyas letras se permutan (permutación con repetición). */
  palabra: string;
  /** Grupos repetidos: «rojas: 4, azules: 2» o «4, 2». */
  grupos: string;
  descripcion: string;
}

export interface CasoForm {
  descripcion: string;
  terminos: TerminoForm[];
}

export interface ConteoForm {
  casos: CasoForm[];
}

export const terminoVacio = (tipo: TipoTermino = 'combinacion', parcial: Partial<TerminoForm> = {}): TerminoForm => ({
  tipo,
  n: '',
  r: '',
  factores: '',
  palabra: '',
  grupos: '',
  descripcion: '',
  ...parcial,
});

function leerGrupos(texto: string): Lectura<{ etiqueta: string; cantidad: number }[]> {
  const partes = texto.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (partes.length === 0) return { ok: false, error: 'Escribe la cantidad de cada grupo, por ejemplo «4, 2».' };
  const grupos = [];
  for (const [i, p] of partes.entries()) {
    const m = /^(?:(.+?)\s*[:=]\s*)?(\d+)$/.exec(p);
    if (!m) return { ok: false, error: `«${p}» no es válido; usa «nombre: cantidad» o solo la cantidad.` };
    grupos.push({ etiqueta: m[1]?.trim() || `tipo ${i + 1}`, cantidad: Number(m[2]) });
  }
  return { ok: true, valor: grupos };
}

export function leerTermino(t: TerminoForm): Lectura<TerminoConteo> {
  const descripcion = t.descripcion.trim() || undefined;
  const nr = (): Lectura<{ n: number; r: number }> => {
    const n = parseEntero(t.n, 'n');
    if (!n.ok) return n;
    const r = parseEntero(t.r, 'r');
    if (!r.ok) return r;
    return { ok: true, valor: { n: n.valor, r: r.valor } };
  };
  switch (t.tipo) {
    case 'numero': {
      const n = parseEntero(t.n, 'La cantidad', 10 ** 12);
      return n.ok ? { ok: true, valor: { tipo: 'numero', n: n.valor, descripcion } } : n;
    }
    case 'producto': {
      const partes = t.factores.split(/[,;·*x×\s]+/).filter(Boolean);
      const factores: number[] = [];
      for (const p of partes) {
        const v = parseEntero(p, 'Cada factor', 10 ** 9);
        if (!v.ok) return v;
        factores.push(v.valor);
      }
      if (!factores.length) return { ok: false, error: 'Escribe los factores separados por comas, por ejemplo «4, 5, 2».' };
      return { ok: true, valor: { tipo: 'producto', factores, descripcion } };
    }
    case 'factorial':
    case 'circular': {
      const n = parseEntero(t.n, 'n');
      return n.ok ? { ok: true, valor: { tipo: t.tipo, n: n.valor, descripcion } } : n;
    }
    case 'potencia':
    case 'permutacion':
    case 'combinacion': {
      const v = nr();
      return v.ok ? { ok: true, valor: { tipo: t.tipo, ...v.valor, descripcion } } : v;
    }
    case 'repeticion': {
      if (t.palabra.trim()) {
        const grupos = contarLetras(t.palabra);
        if (!grupos.length) return { ok: false, error: 'La palabra no tiene letras.' };
        return { ok: true, valor: { tipo: 'repeticion', grupos, palabra: t.palabra.trim(), descripcion } };
      }
      const g = leerGrupos(t.grupos);
      return g.ok ? { ok: true, valor: { tipo: 'repeticion', grupos: g.valor, descripcion } } : g;
    }
  }
}

export function leerConteo(form: ConteoForm): Lectura<ExpresionConteo> {
  const casos = [];
  for (const [ci, c] of form.casos.entries()) {
    const terminos: TerminoConteo[] = [];
    for (const [ti, t] of c.terminos.entries()) {
      const r = leerTermino(t);
      if (!r.ok) return { ok: false, error: `${form.casos.length > 1 ? `Caso ${ci + 1}, ` : ''}término ${ti + 1}: ${r.error}` };
      terminos.push(r.valor);
    }
    casos.push({ descripcion: c.descripcion.trim() || undefined, terminos });
  }
  return { ok: true, valor: { casos } };
}

/* ─────────── Probabilidad clásica ─────────── */

export interface ClasicaForm {
  evento: string;
  favorables: ConteoForm;
  totales: ConteoForm;
}

/* ─────────── Espacio muestral ─────────── */

export interface EspacioForm {
  tipo: TipoEspacio;
  cantidad: string;
  categorias: { nombre: string; simbolo: string; cantidad: string }[];
  /** Resultados separados por comas (tipo «lista»). */
  elementos: string;
  pesos: ModoPesos;
  pesosPersonalizados: string[];
  eventos: { nombre: string; descripcion: string; ids: string[] }[];
  par: [number, number] | null;
}

export function configDeForm(e: EspacioForm) {
  return {
    tipo: e.tipo,
    cantidad: Number(e.cantidad) || 0,
    categorias: e.categorias.map((c) => ({ nombre: c.nombre, simbolo: c.simbolo, cantidad: Number(c.cantidad) })),
    elementos: e.elementos.split(',').map((s) => s.trim()).filter(Boolean),
    pesos: e.pesos,
    pesosPersonalizados: e.pesosPersonalizados,
  };
}

/* ─────────── Reglas de probabilidad ─────────── */

export interface ReglasForm {
  modo: 'dos' | 'tres';
  simA: string;
  descA: string;
  pA: string;
  simB: string;
  descB: string;
  pB: string;
  relacion: TipoRelacion;
  valor: string;
  /** Tres eventos: P(A), P(B), P(C), P(A∩B), P(A∩C), P(B∩C), P(A∩B∩C). */
  tres: [string, string, string, string, string, string, string];
}

/* ─────────── Extracciones sucesivas ─────────── */

export interface SucesivasForm {
  categorias: { nombre: string; simbolo: string; cantidad: string }[];
  /** Una secuencia por línea: «R R B». Varias líneas = secuencias que se suman. */
  secuencias: string;
  reemplazo: boolean;
}

/* ─────────── Tabla de contingencia ─────────── */

export interface ContingenciaForm {
  filas: { nombre: string; simbolo: string }[];
  columnas: { nombre: string; simbolo: string }[];
  conteos: string[][];
  consultas: Consulta[];
}

/* ─────────── Probabilidad total y Bayes ─────────── */

export interface BayesForm {
  evento: { simbolo: string; descripcion: string };
  ramas: { simbolo: string; descripcion: string; prior: string; verosimilitud: string }[];
  objetivo: number | null;
}

/* ─────────── Despacho ─────────── */

export type Herramienta = 'conteo' | 'clasica' | 'espacio' | 'reglas' | 'sucesivas' | 'contingencia' | 'bayes';

export interface FormPorHerramienta {
  conteo: ConteoForm;
  clasica: ClasicaForm;
  espacio: EspacioForm;
  reglas: ReglasForm;
  sucesivas: SucesivasForm;
  contingencia: ContingenciaForm;
  bayes: BayesForm;
}

/** Resultado común para la interfaz: pasos + valores principales para el resumen y las pruebas. */
export interface Salida {
  /** Valores principales con su etiqueta, en orden (exactos). */
  valores: { etiqueta: string; valor: Racional | null }[];
}

export function resolverHerramienta<H extends Herramienta>(h: H, form: FormPorHerramienta[H], f: Formato): Respuesta<Salida> {
  switch (h) {
    case 'conteo': {
      const e = leerConteo(form as ConteoForm);
      if (!e.ok) return e;
      const r = resolverConteo(e.valor);
      if (!r.ok) return r;
      return conValores(r, [{ etiqueta: 'Número de formas', valor: new Racional(r.solucion.resultado) }]);
    }
    case 'clasica': {
      const c = form as ClasicaForm;
      const fa = leerConteo(c.favorables);
      if (!fa.ok) return { ok: false, error: `Casos favorables: ${fa.error}` };
      const to = leerConteo(c.totales);
      if (!to.ok) return { ok: false, error: `Casos posibles: ${to.error}` };
      const r = resolverProbConteo(fa.valor, to.valor, c.evento, f);
      if (!r.ok) return r;
      return conValores(r, [{ etiqueta: `P(${c.evento || 'A'})`, valor: r.solucion.resultado }]);
    }
    case 'espacio': {
      const e = form as EspacioForm;
      const r = resolverEspacio({ config: configDeForm(e), eventos: e.eventos, par: e.par }, f);
      if (!r.ok) return r;
      const valores: Salida['valores'] = e.eventos.map((ev, i) => ({ etiqueta: `P(${ev.nombre})`, valor: r.solucion.resultado.probabilidades[i] }));
      if (e.par && e.par[0] !== e.par[1] && e.eventos[e.par[0]] && e.eventos[e.par[1]]) {
        const [i, j] = e.par;
        const X = e.eventos[i];
        const Y = e.eventos[j];
        const pX = r.solucion.resultado.probabilidades[i];
        const pY = r.solucion.resultado.probabilidades[j];
        const ys = new Set(Y.ids);
        const pesos = new Map(r.solucion.resultado.puntos.map((p, k) => [p.id, r.solucion.resultado.pesos[k]]));
        const pI = [...new Set(X.ids)].filter((id) => ys.has(id)).reduce((s, id) => s.mas(pesos.get(id) ?? Racional.CERO), Racional.CERO);
        valores.push({ etiqueta: `P(${X.nombre} ∪ ${Y.nombre})`, valor: pX.mas(pY).menos(pI) });
        valores.push({ etiqueta: `P(${X.nombre} | ${Y.nombre})`, valor: pY.esCero() ? null : pI.entre(pY) });
      }
      return conValores(r, valores);
    }
    case 'reglas': {
      const g = form as ReglasForm;
      if (g.modo === 'tres') {
        const nombres = ['P(A)', 'P(B)', 'P(C)', 'P(A ∩ B)', 'P(A ∩ C)', 'P(B ∩ C)', 'P(A ∩ B ∩ C)'];
        const v: Racional[] = [];
        for (const [i, t] of g.tres.entries()) {
          const p = parseProbabilidad(t, nombres[i]);
          if (!p.ok) return p;
          v.push(p.valor);
        }
        const r = resolverTresEventos({ simbolos: ['A', 'B', 'C'], pA: v[0], pB: v[1], pC: v[2], pAB: v[3], pAC: v[4], pBC: v[5], pABC: v[6] }, f);
        if (!r.ok) return r;
        return conValores(r, [{ etiqueta: 'P(A ∪ B ∪ C)', valor: r.solucion.resultado }]);
      }
      const A = g.simA.trim() || 'A';
      const B = g.simB.trim() || 'B';
      const pA = parseProbabilidad(g.pA, `P(${A})`);
      if (!pA.ok) return pA;
      const pB = parseProbabilidad(g.pB, `P(${B})`);
      if (!pB.ok) return pB;
      let relacion: Relacion;
      if (g.relacion === 'independientes' || g.relacion === 'excluyentes') {
        relacion = { tipo: g.relacion };
      } else {
        const nombre = { interseccion: `P(${A} ∩ ${B})`, union: `P(${A} ∪ ${B})`, condicionalBA: `P(${B} | ${A})`, condicionalAB: `P(${A} | ${B})` }[g.relacion];
        const v = parseProbabilidad(g.valor, nombre);
        if (!v.ok) return v;
        relacion = { tipo: g.relacion, valor: v.valor };
      }
      const r = resolverDosEventos({ A: { simbolo: A, descripcion: g.descA.trim(), p: pA.valor }, B: { simbolo: B, descripcion: g.descB.trim(), p: pB.valor }, relacion }, f);
      if (!r.ok) return r;
      const s = r.solucion.resultado;
      return conValores(r, [
        { etiqueta: `P(${A} ∩ ${B})`, valor: s.interseccion },
        { etiqueta: `P(${A} ∪ ${B})`, valor: s.union },
        { etiqueta: `P(${B} | ${A})`, valor: s.BdadoA },
        { etiqueta: `P(${A} | ${B})`, valor: s.AdadoB },
      ]);
    }
    case 'sucesivas': {
      const s = form as SucesivasForm;
      const categorias = [];
      for (const c of s.categorias) {
        const n = parseEntero(c.cantidad, `Cantidad de «${c.nombre || c.simbolo}»`, 10000);
        if (!n.ok) return n;
        categorias.push({ nombre: c.nombre, simbolo: c.simbolo.trim(), cantidad: n.valor });
      }
      const secuencias = s.secuencias
        .split('\n')
        .map((l) => l.split(/[\s,;]+/).filter(Boolean))
        .filter((l) => l.length > 0);
      const r = resolverSucesivas({ categorias, secuencias, reemplazo: s.reemplazo }, f);
      if (!r.ok) return r;
      return conValores(r, [{ etiqueta: 'P', valor: r.solucion.resultado }]);
    }
    case 'contingencia': {
      const c = form as ContingenciaForm;
      const conteos: number[][] = [];
      for (const [i, fila] of c.conteos.entries()) {
        const nums: number[] = [];
        for (const [j, v] of fila.entries()) {
          const n = parseEntero(v, `Celda (${c.filas[i]?.nombre}, ${c.columnas[j]?.nombre})`, 10 ** 9);
          if (!n.ok) return n;
          nums.push(n.valor);
        }
        conteos.push(nums);
      }
      const r = resolverContingencia({ filas: c.filas, columnas: c.columnas, conteos, consultas: c.consultas }, f);
      if (!r.ok) return r;
      const sim = (ref: { eje: 'fila' | 'columna'; i: number }) => (ref.eje === 'fila' ? c.filas[ref.i] : c.columnas[ref.i])?.simbolo ?? '?';
      const op = { sola: '', y: ' ∩ ', o: ' ∪ ', dado: ' | ' };
      return conValores(
        r,
        c.consultas.map((q, i) => ({
          etiqueta: `P(${sim(q.a)}${q.op === 'sola' || !q.b ? '' : op[q.op] + sim(q.b)})`,
          valor: r.solucion.resultado.respuestas[i],
        })),
      );
    }
    case 'bayes': {
      const bf = form as BayesForm;
      const particion = [];
      for (const [i, rama] of bf.ramas.entries()) {
        const s = rama.simbolo.trim() || `B${i + 1}`;
        const pr = parseProbabilidad(rama.prior, `P(${s})`);
        if (!pr.ok) return pr;
        const ve = parseProbabilidad(rama.verosimilitud, `P(${bf.evento.simbolo || 'A'} | ${s})`);
        if (!ve.ok) return ve;
        particion.push({ simbolo: s, descripcion: rama.descripcion, prior: pr.valor, verosimilitud: ve.valor });
      }
      const r = resolverBayes({ evento: bf.evento, particion, objetivo: bf.objetivo }, f);
      if (!r.ok) return r;
      const A = bf.evento.simbolo || 'A';
      const valores: Salida['valores'] = [{ etiqueta: `P(${A})`, valor: r.solucion.resultado.total }];
      if (bf.objetivo !== null && r.solucion.resultado.posteriores[bf.objetivo]) {
        valores.push({ etiqueta: `P(${particion[bf.objetivo].simbolo} | ${A})`, valor: r.solucion.resultado.posteriores[bf.objetivo] });
      }
      return conValores(r, valores);
    }
  }
  return { ok: false, error: 'Herramienta desconocida.' };
}

function conValores(r: { ok: true; solucion: { pasos: import('../steps').Paso[] } }, valores: Salida['valores']): Respuesta<Salida> {
  return { ok: true, solucion: { pasos: r.solucion.pasos, resultado: { valores } } };
}
