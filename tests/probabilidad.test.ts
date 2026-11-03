import { describe, expect, it } from 'vitest';
import fixtures from '../validation/fixtures/probabilidad.json';
import { EJEMPLOS_PROBABILIDAD } from '../src/core/probabilidad/ejemplos';
import { resolverHerramienta } from '../src/core/probabilidad/formularios';
import { parseRacional } from '../src/core/entrada';
import { FORMATO_BASE } from '../src/core/formato';
import { combinaciones, contarLetras, factorial, permRepeticion, permutaciones } from '../src/core/combinatoria';

const texto = (v: { num: bigint; den: bigint } | null) => (v === null ? 'indef' : v.den === 1n ? `${v.num}` : `${v.num}/${v.den}`);
const normal = (s: string) => {
  if (s === 'indef') return s;
  const r = parseRacional(s);
  if (!r.ok) throw new Error(s);
  return texto(r.valor);
};

describe('taller de probabilidad y ejemplos de clase', () => {
  it('cubre los 36 puntos del taller', () => {
    const puntos = new Set(
      EJEMPLOS_PROBABILIDAD.filter((e) => e.fuente === 'taller').map((e) => Number(/Punto (\d+)/.exec(e.etiqueta)![1])),
    );
    expect([...puntos].sort((a, b) => a - b)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  });

  for (const e of EJEMPLOS_PROBABILIDAD) {
    it(`${e.etiqueta} (${e.herramienta})`, () => {
      const r = resolverHerramienta(e.herramienta, e.form as never, FORMATO_BASE);
      if (!r.ok) throw new Error(r.error);
      const obtenidos = r.solucion.resultado.valores.map((v) => texto(v.valor));
      expect(obtenidos).toEqual(e.respuestas.map(normal));
      const referencia = (fixtures as Record<string, string[]>)[e.id];
      expect(referencia, `falta la referencia de Python para ${e.id}`).toBeDefined();
      expect(obtenidos).toEqual(referencia.map(normal));
      expect(r.solucion.pasos.length).toBeGreaterThan(0);
    });
  }
});

describe('técnicas de conteo', () => {
  it('fórmulas básicas', () => {
    expect(factorial(0)).toBe(1n);
    expect(factorial(5)).toBe(120n);
    expect(permutaciones(10, 3)).toBe(720n);
    expect(combinaciones(52, 5)).toBe(2598960n);
    expect(combinaciones(10, 8)).toBe(combinaciones(10, 2));
    expect(permRepeticion([4, 2])).toBe(15n);
    expect(factorial(25)).toBe(15511210043330985984000000n);
  });

  it('cuenta letras sin tildes y conserva la Ñ', () => {
    expect(contarLetras('Estadística')).toEqual(contarLetras('ESTADISTICA'));
    expect(contarLetras('año').map((g) => g.etiqueta)).toEqual(['A', 'Ñ', 'O']);
  });

  it('rechaza datos incoherentes', () => {
    const r = resolverHerramienta(
      'reglas',
      { modo: 'dos', simA: 'A', descA: '', pA: '0.3', simB: 'B', descB: '', pB: '0.2', relacion: 'interseccion', valor: '0.5', tres: ['', '', '', '', '', '', ''] },
      FORMATO_BASE,
    );
    expect(r.ok).toBe(false);
    const b = resolverHerramienta(
      'bayes',
      { evento: { simbolo: 'A', descripcion: '' }, ramas: [{ simbolo: 'B1', descripcion: '', prior: '0.5', verosimilitud: '0.1' }, { simbolo: 'B2', descripcion: '', prior: '0.4', verosimilitud: '0.1' }], objetivo: 0 },
      FORMATO_BASE,
    );
    expect(b.ok).toBe(false);
  });
});
