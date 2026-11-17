import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { EJEMPLOS_DISTRIBUCIONES, type EjemploDistribucion } from '../src/core/probabilidad/ejemplosDistribuciones';
import {
  type BinomialForm,
  type HipergeometricaForm,
  type MultinomialForm,
  type PoissonForm,
  resolverBinomialForm,
  resolverHipergeometricaForm,
  resolverMultinomialForm,
  resolverPoissonForm,
} from '../src/core/probabilidad/formulariosDistribuciones';
import { probTexP, probTextoP, resolverBinomial, resolverHipergeometrica, resolverPoisson } from '../src/core/probabilidad/distribuciones';
import { FORMATO_BASE } from '../src/core/formato';
import { OPCIONES_KATEX } from '../src/core/latex';
import { Racional } from '../src/core/racional';
import type { Bloque } from '../src/core/steps';

function resolver(e: EjemploDistribucion) {
  switch (e.herramienta) {
    case 'binomial':
      return resolverBinomialForm(e.form as BinomialForm, FORMATO_BASE);
    case 'hipergeometrica':
      return resolverHipergeometricaForm(e.form as HipergeometricaForm, FORMATO_BASE);
    case 'poisson':
      return resolverPoissonForm(e.form as PoissonForm, FORMATO_BASE);
    case 'multinomial':
      return resolverMultinomialForm(e.form as MultinomialForm, FORMATO_BASE);
  }
}

const formulas = (bs: Bloque[]): string[] =>
  bs.flatMap((b) =>
    b.tipo === 'formula' || b.tipo === 'resultado'
      ? [b.latex]
      : b.tipo === 'detalles'
        ? formulas(b.bloques)
        : b.tipo === 'tabla'
          ? [...b.filas.flat(), ...(b.pie ?? [])].flatMap((c) => (typeof c === 'string' ? [] : [c.latex]))
          : [],
  );

const sinOpciones = { consultas: [], momentos: false, tchebycheff: false, tabla: false };

describe('ejemplos de «Distribuciones discretas de probabilidad» contra scipy', () => {
  for (const e of EJEMPLOS_DISTRIBUCIONES) {
    it(e.etiqueta, () => {
      const r = resolver(e);
      if (!r.ok) throw new Error(r.error);
      const valores = r.solucion.resultado.valores;
      expect(valores.map((v) => v.prob.valor)).toHaveLength(e.esperados.length);
      valores.forEach((v, i) => expect(Math.abs(v.prob.valor - e.esperados[i])).toBeLessThan(1e-9 * Math.max(1, e.esperados[i])));
      e.respuestas.forEach((s, i) => expect(valores[i].prob.exacto?.aTexto()).toBe(s));
      for (const p of r.solucion.pasos) {
        for (const l of formulas(p.bloques)) {
          expect(() => katex.renderToString(l, { ...OPCIONES_KATEX, throwOnError: true, strict: 'error', displayMode: true }), l).not.toThrow();
        }
      }
    });
  }
});

describe('valores exactos de las diapositivas', () => {
  it('ejemplo 1: f(x) = 27/64, 27/64, 9/64, 1/64', () => {
    const r = resolverBinomial(
      { n: 3, pi: Racional.de(1, 4) },
      { ...sinOpciones, consultas: [0, 1, 2, 3].map((a) => ({ tipo: 'igual' as const, a })) },
      FORMATO_BASE,
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.solucion.resultado.valores.map((v) => v.prob.exacto?.aTexto())).toEqual(['27/64', '27/64', '9/64', '1/64']);
  });

  it('la tabla de la función de probabilidad suma 1', () => {
    const r = resolverHipergeometrica({ N: 100, n: 10, k: 12 }, { ...sinOpciones, consultas: [{ tipo: 'entre', a: 0, b: 10 }] }, FORMATO_BASE);
    if (!r.ok) throw new Error(r.error);
    expect(r.solucion.resultado.valores[0].prob.exacto?.aTexto()).toBe('1');
  });
});

describe('consultas acumuladas y complemento', () => {
  const op = (tipo: 'al-menos' | 'mas-de' | 'menos-de' | 'a-lo-sumo', a: number) => ({ ...sinOpciones, consultas: [{ tipo, a }] });

  it('«al menos», «más de», «menos de» y «a lo sumo» cuadran entre sí', () => {
    const datos = { n: 12, pi: Racional.de(3, 10) };
    const p = (tipo: Parameters<typeof op>[0], a: number) => {
      const r = resolverBinomial(datos, op(tipo, a), FORMATO_BASE);
      if (!r.ok) throw new Error(r.error);
      return r.solucion.resultado.valores[0].prob.exacto!;
    };
    expect(p('al-menos', 4).mas(p('menos-de', 4)).aTexto()).toBe('1');
    expect(p('mas-de', 4).mas(p('a-lo-sumo', 4)).aTexto()).toBe('1');
  });

  it('Poisson usa el complemento en «al menos» (infinitos valores)', () => {
    const r = resolverPoisson({ modo: 'tasa', tasa: 3, unidades: 1 }, op('al-menos', 2), FORMATO_BASE);
    if (!r.ok) throw new Error(r.error);
    expect(Math.abs(r.solucion.resultado.valores[0].prob.valor - (1 - Math.exp(-3) * (1 + 3)))).toBeLessThan(1e-12);
    expect(JSON.stringify(r.solucion.pasos)).toContain('1 - P(X \\\\leq 1)');
  });
});

describe('presentación de los valores', () => {
  it('ninguna fórmula escribe «= ≈» con los dos signos seguidos', () => {
    for (const e of EJEMPLOS_DISTRIBUCIONES) {
      const r = resolver(e);
      if (!r.ok) throw new Error(r.error);
      const todo = JSON.stringify(r.solucion.pasos);
      expect(todo, e.id).not.toMatch(/=\s*\\\\approx/);
      expect(todo, e.id).not.toMatch(/=\s*≈/);
    }
  });

  it('una probabilidad menor que 1 no se muestra como 1 al redondear', () => {
    expect(probTexP({ exacto: null, valor: 0.999999988183829 }, FORMATO_BASE)).toBe('\\approx 0{,}99999999');
    expect(probTextoP({ exacto: null, valor: 0.999999988183829 }, FORMATO_BASE)).toBe('≈ 0,99999999');
    expect(probTexP({ exacto: null, valor: 0.1042 }, FORMATO_BASE)).toBe('0{,}1042');
  });
});

describe('datos inválidos', () => {
  it('rechaza probabilidades que no suman 1 en la multinomial', () => {
    const r = resolverMultinomialForm(
      {
        categorias: [
          { nombre: 'A', pi: '1/2', x: '1' },
          { nombre: 'B', pi: '1/3', x: '1' },
        ],
      },
      FORMATO_BASE,
    );
    expect(r.ok).toBe(false);
  });

  it('rechaza π fuera de [0, 1] y n de la muestra mayor que la población', () => {
    const base = { exito: '', consultas: [], momentos: true, tchebycheff: false, tabla: false };
    expect(resolverBinomialForm({ ...base, n: '10', pi: '1,3' }, FORMATO_BASE).ok).toBe(false);
    expect(resolverHipergeometricaForm({ ...base, N: '10', n: '12', k: '3' }, FORMATO_BASE).ok).toBe(false);
  });
});
