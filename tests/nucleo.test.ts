import { describe, expect, it } from 'vitest';
import { inv, multiply } from 'mathjs';
import { inversaGaussJordan, producto, transpuesta } from '../src/core/linalg';
import { fmt, fmtTex } from '../src/core/formato';
import { parseNumero, parseRacional, parseTablaPegada } from '../src/core/entrada';
import { REGISTRO, paso } from '../src/core/steps';
import { fCritico } from '../src/core/distribuciones';
import { segmentar } from '../src/core/textoRico';

describe('álgebra matricial', () => {
  it("X'X con transpuesta y producto", () => {
    const X = [
      [1, 2],
      [1, 3],
      [1, 5],
    ];
    expect(producto(transpuesta(X), X)).toEqual([
      [3, 10],
      [10, 38],
    ]);
  });

  it('Gauss-Jordan coincide con mathjs en matrices simétricas definidas positivas', () => {
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647) * 10 - 5;
    for (let n = 2; n <= 6; n++) {
      const X = Array.from({ length: n + 4 }, () => Array.from({ length: n }, azar));
      const A = producto(transpuesta(X), X);
      const r = inversaGaussJordan(A);
      expect(r.singular).toBe(false);
      if (r.singular) return;
      const ref = inv(A) as number[][];
      r.inversa.forEach((fila, i) => fila.forEach((v, j) => expect(Math.abs(v - ref[i][j])).toBeLessThan(1e-9 * Math.max(1, Math.abs(ref[i][j])))));
      const I = multiply(A, r.inversa) as number[][];
      I.forEach((fila, i) => fila.forEach((v, j) => expect(Math.abs(v - (i === j ? 1 : 0))).toBeLessThan(1e-9)));
      expect(r.etapas).toHaveLength(n);
    }
  });

  it('intercambia filas si el pivote es cero y detecta matrices singulares', () => {
    const r = inversaGaussJordan([
      [0, 1],
      [1, 0],
    ]);
    expect(r.singular).toBe(false);
    if (!r.singular) expect(r.etapas[0].operaciones[0]).toEqual({ tipo: 'intercambio', i: 0, j: 1 });
    expect(
      inversaGaussJordan([
        [1, 2],
        [2, 4],
      ]).singular,
    ).toBe(true);
  });
});

describe('formato de números', () => {
  const coma = { decimales: 4, coma: true };
  it('redondea y quita ceros sobrantes', () => {
    expect(fmt(278.75, coma)).toBe('278,75');
    expect(fmt(5.106017679, coma)).toBe('5,106');
    expect(fmt(-102.71323639, coma)).toBe('−102,7132');
    expect(fmt(0, coma)).toBe('0');
  });
  it('agrupa miles con espacio fino desde cinco cifras', () => {
    expect(fmt(1072, coma)).toBe('1072');
    expect(fmt(43245, coma)).toBe('43 245');
    expect(fmtTex(939075, coma)).toBe('939\\,075');
  });
  it('usa cifras significativas para valores pequeños', () => {
    expect(fmt(0.000135928342, coma)).toBe('0,0001359');
    expect(fmt(-0.002624990745, coma)).toBe('−0,002625');
    expect(fmtTex(4.5e-8, coma)).toBe('4{,}5 \\times 10^{-8}');
  });
  it('respeta el punto decimal', () => {
    expect(fmt(3.14159, { decimales: 2, coma: false })).toBe('3.14');
  });
});

describe('lectura de datos', () => {
  it('números con coma o punto decimal', () => {
    expect(parseNumero('25,00')).toBe(25);
    expect(parseNumero('1.072,5')).toBe(1072.5);
    expect(parseNumero('1,072.5')).toBe(1072.5);
    expect(parseNumero('−3.5')).toBe(-3.5);
    expect(parseNumero('1e-3')).toBe(0.001);
    expect(parseNumero('abc')).toBeNaN();
    expect(parseNumero('')).toBeNaN();
  });
  it('fracciones exactas, porcentajes y decimales', () => {
    const t = (s: string) => {
      const r = parseRacional(s);
      return r.ok ? r.valor.aTexto() : 'error';
    };
    expect(t('0,83')).toBe('83/100');
    expect(t('30/80')).toBe('3/8');
    expect(t('20%')).toBe('1/5');
    expect(t('1/0')).toBe('error');
  });
  it('tablas pegadas desde Excel con encabezados', () => {
    const p = parseTablaPegada('y\tx1\tx2\n240\t25\t24\n236\t31\t21\n');
    expect(p.encabezados).toEqual(['y', 'x1', 'x2']);
    expect(p.filas).toEqual([
      ['240', '25', '24'],
      ['236', '31', '21'],
    ]);
  });
});

describe('estructura base', () => {
  it('el registro contiene los 24 métodos de la propuesta', () => {
    expect(Object.keys(REGISTRO)).toHaveLength(24);
  });
  it('rechaza pasos con métodos fuera del registro', () => {
    expect(() => paso({ titulo: 'x', metodo: 'no-existe', bloques: [] })).toThrow();
  });
  it('valor crítico F de tabla', () => {
    expect(fCritico(0.05, 2, 10)).toBeCloseTo(4.1028, 4);
    expect(fCritico(0.025, 4, 7)).toBeCloseTo(5.5226, 4);
  });
  it('separa texto y fórmulas en línea', () => {
    expect(segmentar('Si \\(F_c > F\\) se rechaza')).toEqual([
      { tipo: 'texto', valor: 'Si ' },
      { tipo: 'formula', valor: 'F_c > F' },
      { tipo: 'texto', valor: ' se rechaza' },
    ]);
  });
});
