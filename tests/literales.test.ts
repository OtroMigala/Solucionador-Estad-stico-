import { describe, expect, it } from 'vitest';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';
import { resolverRegresion } from '../src/core/regresion';
import { literalesDisponibles, organizarSolucion, respuestaLiteral, type Literal } from '../src/core/regresion/literales';
import { FORMATO_BASE } from '../src/core/formato';

function resolver(id: string) {
  const e = EJEMPLOS_REGRESION.find((x) => x.id === id)!;
  const op = { alfa: e.alfa, x0: e.x0, formato: FORMATO_BASE };
  const r = resolverRegresion({ y: e.y, x: e.x, nombreY: e.nombreY, nombresX: e.nombresX }, op);
  if (!r.ok) throw new Error(r.error);
  return { e, op, s: r.solucion };
}

const titulos = (pasos: { titulo: string }[]) => pasos.map((p) => p.titulo);

describe('organización por literales', () => {
  it('todos los pasos tienen parte', () => {
    for (const e of EJEMPLOS_REGRESION) {
      const { s } = resolver(e.id);
      expect(s.pasos.every((p) => p.parte)).toBe(true);
    }
  });

  it('punto 3: planteamiento y los cinco literales con el método matricial en a)', () => {
    const { e, s } = resolver('taller-3');
    const secciones = organizarSolucion(s.pasos, e.literales);
    expect(secciones.map((x) => x.letra)).toEqual([null, 'a)', 'b)', 'c)', 'd)', 'e)']);
    expect(titulos(secciones[0].pasos)).toEqual(['Modelo y datos', 'Tabla de productos y sumas']);
    expect(titulos(secciones[1].pasos)).toEqual([
      'Ecuaciones normales',
      'Forma matricial',
      "Inversa de X'X por Gauss-Jordan",
      "Estimadores β̂ = (X'X)⁻¹X'y",
    ]);
    expect(titulos(secciones[2].pasos)).toEqual(['Valores ajustados y residuos', 'Tabla ANOVA']);
    expect(titulos(secciones[5].pasos)).toEqual(['Predicción']);
  });

  it('punto 2 respeta el orden del enunciado (predicción antes que R²)', () => {
    const { e, s } = resolver('taller-2');
    const secciones = organizarSolucion(s.pasos, e.literales);
    expect(secciones.slice(1).map((x) => `${x.letra} ${x.parte}`)).toEqual(['a) parametros', 'b) anova', 'c) prueba', 'd) prediccion', 'e) r2']);
  });

  it('si se pide la prueba sin la tabla ANOVA, sus pasos se muestran dentro de la prueba', () => {
    const { s } = resolver('taller-1');
    const secciones = organizarSolucion(s.pasos, ['parametros', 'prueba']);
    expect(secciones[2].contiene).toEqual(['anova', 'prueba']);
    expect(titulos(secciones[2].pasos)).toEqual(['Valores ajustados y residuos', 'Tabla ANOVA', 'Prueba de hipótesis F']);
  });

  it('un literal pedido después de resolverse como requisito queda marcado', () => {
    const { s } = resolver('taller-1');
    const secciones = organizarSolucion(s.pasos, ['prueba', 'anova']);
    expect(secciones[1].letra).toBe('a)');
    expect(secciones[2].pasos).toEqual([]);
    expect(secciones[2].resueltoEn).toBe('a)');
  });

  it('la correlación solo se ofrece en regresión simple y la varianza de estimadores en múltiple', () => {
    expect(literalesDisponibles(1).map((l) => l.id)).not.toContain('varianzas');
    expect(literalesDisponibles(3).map((l) => l.id)).not.toContain('correlacion');
  });
});

describe('respuestas', () => {
  it('punto 3 coincide con la hoja de Excel del taller', () => {
    const { e, op, s } = resolver('taller-3');
    const r = s.resultado;
    const texto = (l: Literal) =>
      respuestaLiteral(l, r, op, e.nombreY)
        .map((b) => ('texto' in b ? b.texto : ''))
        .join(' | ');
    expect(texto('parametros')).toContain('β̂₀ = 2395,513094');
    expect(texto('parametros')).toContain('β̂₄ = −38,918516');
    expect(texto('prueba')).toContain('Fc = 105,2684 > F = 3,478');
    expect(texto('prueba')).toContain('se rechaza H₀');
    expect(texto('r2')).toContain('97,68 %');
    expect(texto('prediccion')).toContain('ŷ₀ = 1125,967485');
  });

  it('cada literal disponible produce una respuesta en todos los ejemplos', () => {
    for (const e of EJEMPLOS_REGRESION) {
      const { op, s } = resolver(e.id);
      for (const l of literalesDisponibles(e.x.length)) expect(respuestaLiteral(l.id, s.resultado, op).length).toBeGreaterThan(0);
    }
  });
});
