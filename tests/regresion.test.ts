import { describe, expect, it } from 'vitest';
import fixtures from '../validation/fixtures/regresion.json';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';
import { resolverRegresion, interpretarPearson } from '../src/core/regresion';
import { FORMATO_BASE } from '../src/core/formato';
import { datosSinteticos } from './sinteticos';

type Ref = (typeof fixtures)[keyof typeof fixtures] & { prediccion?: number; cov?: number; r?: number };

/** |a − b| ≤ 1e-6 · max(1, |b|) (RNF-02). */
function cerca(a: number, b: number, tol = 1e-6) {
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
}

function resolver(id: string) {
  const e = EJEMPLOS_REGRESION.find((x) => x.id === id)!;
  const r = resolverRegresion(
    { y: e.y, x: e.x, nombreY: e.nombreY, nombresX: e.nombresX },
    { alfa: e.alfa, x0: e.x0, formato: FORMATO_BASE },
  );
  if (!r.ok) throw new Error(r.error);
  return r.solucion;
}

describe('regresión contra statsmodels y scipy (tolerancia 1e-6)', () => {
  for (const e of EJEMPLOS_REGRESION) {
    it(e.etiqueta, () => {
      const ref = (fixtures as Record<string, Ref>)[e.id];
      const s = resolver(e.id).resultado;
      expect(s.n).toBe(ref.n);
      expect(s.k).toBe(ref.k);
      s.beta.forEach((v, j) => cerca(v, ref.beta[j]));
      cerca(s.SCR, ref.SCR);
      cerca(s.SCE, ref.SCE);
      cerca(s.SCT, ref.SCT);
      expect(s.glR).toBe(ref.glR);
      expect(s.glE).toBe(ref.glE);
      cerca(s.CMR, ref.CMR);
      cerca(s.CME, ref.CME);
      cerca(s.F, ref.F);
      cerca(s.R2, ref.R2);
      cerca(s.Fcritico, ref.Fcritico);
      if (s.inversa) s.inversa.forEach((fila, i) => cerca(fila[i], ref.cii[i]));
      if (s.varianzas) s.varianzas.forEach((v, i) => cerca(v, ref.varianzas[i]));
      if (ref.prediccion !== undefined) cerca(s.prediccion!, ref.prediccion);
      if (ref.cov !== undefined) {
        cerca(s.simple!.cov, ref.cov);
        cerca(s.simple!.r, ref.r!);
      }
    });
  }
});

describe('coincide con el material del curso', () => {
  it('camiones diésel: valores del Excel del profesor', () => {
    const s = resolver('clase-diesel').resultado;
    const excel = [-3.507778141, -0.002624991, 0.000798941, 0.15415503];
    s.beta.forEach((v, j) => expect(Math.abs(v - excel[j])).toBeLessThan(5e-9));
    expect(Math.abs(s.R2 - 0.800462661)).toBeLessThan(5e-10);
    expect(Math.abs(s.SCR - 0.202501044)).toBeLessThan(5e-10);
    expect(Math.abs(s.SCE - 0.050478956)).toBeLessThan(5e-10);
    expect(Math.abs(s.F - 21.39516456)).toBeLessThan(5e-8);
    const diag = [2861.931789, 0.000135928, 0.001325736, 3.256917377];
    s.inversa!.forEach((f, i) => expect(Math.abs(f[i] - diag[i])).toBeLessThan(1e-6 * Math.max(1, diag[i])));
  });

  it('punto 1: sumas de la hoja de cálculo del taller', () => {
    const s = resolver('taller-1').resultado;
    expect(s.SCT).toBeCloseTo(6656.25, 4);
    expect(s.SCR).toBeCloseTo(4957.2407, 4);
    expect(s.SCE).toBeCloseTo(1699.0093, 4);
    expect(s.XtX[1]).toEqual([685, 43245, 16852, 61054, 68011]);
    expect(s.Xty).toEqual([3345, 194890, 81678, 298850, 332254]);
  });

  it('sólidos y DQO: β̂₀ = 3,8296 y β̂₁ = 0,9036', () => {
    const s = resolver('clase-dqo').resultado;
    expect(s.beta[0]).toBeCloseTo(3.8296, 4);
    expect(s.beta[1]).toBeCloseTo(0.9036, 4);
  });
});

describe('pasos y validación de entradas', () => {
  it('la regresión múltiple muestra los doce pasos del procedimiento', () => {
    const titulos = resolver('taller-1').pasos.map((p) => p.titulo);
    expect(titulos).toEqual([
      'Modelo y datos',
      'Tabla de productos y sumas',
      'Ecuaciones normales',
      'Forma matricial',
      "Inversa de X'X por Gauss-Jordan",
      "Estimadores β̂ = (X'X)⁻¹X'y",
      'Valores ajustados y residuos',
      'Tabla ANOVA',
      'Prueba de hipótesis F',
      'Coeficiente de determinación R²',
      'Varianza de los estimadores',
      'Predicción',
    ]);
  });

  it('avisa si faltan observaciones', () => {
    const r = resolverRegresion({ y: [1, 2, 3], x: [[1, 2, 3], [2, 1, 5]] }, { alfa: 0.05, formato: FORMATO_BASE });
    expect(r.ok).toBe(false);
  });

  it('avisa si una variable es combinación lineal de otra', () => {
    const r = resolverRegresion(
      { y: [1, 3, 2, 5, 4], x: [[1, 2, 3, 4, 5], [2, 4, 6, 8, 10]] },
      { alfa: 0.05, formato: FORMATO_BASE },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no tiene inversa/);
  });

  it('avisa de celdas vacías y de y constante', () => {
    expect(resolverRegresion({ y: [1, NaN, 3, 4], x: [[1, 2, 3, 4]] }, { alfa: 0.05, formato: FORMATO_BASE }).ok).toBe(false);
    expect(resolverRegresion({ y: [2, 2, 2, 2], x: [[1, 2, 3, 4]] }, { alfa: 0.05, formato: FORMATO_BASE }).ok).toBe(false);
  });

  it('interpreta r por rangos', () => {
    expect(interpretarPearson(0.95)).toMatch(/fuerte positiva/);
    expect(interpretarPearson(-0.6)).toMatch(/moderada negativa/);
    expect(interpretarPearson(0.2)).toMatch(/débil/);
    expect(interpretarPearson(1)).toMatch(/perfecta/);
  });
});

describe('muchas variables', () => {
  it('con k = 16 los β̂ cumplen las ecuaciones normales y SCR + SCE = SCT', () => {
    const { y, x } = datosSinteticos(40, 16);
    const r = resolverRegresion({ y, x }, { alfa: 0.05, x0: null, formato: FORMATO_BASE });
    if (!r.ok) throw new Error(r.error);
    const s = r.solucion.resultado;
    s.XtX.forEach((fila, i) => cerca(fila.reduce((acc, v, j) => acc + v * s.beta[j], 0), s.Xty[i], 1e-9));
    cerca(s.SCR + s.SCE, s.SCT, 1e-9);
  });
});
