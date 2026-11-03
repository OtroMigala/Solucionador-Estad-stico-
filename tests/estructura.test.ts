import { describe, expect, it } from 'vitest';
import { REGISTRO, paso } from '../src/core/steps';
import { factorial } from '../src/core/combinatoria';
import { producto, transpuesta } from '../src/core/linalg';

describe('estructura base', () => {
  it('el registro contiene los 24 métodos de la propuesta', () => {
    expect(Object.keys(REGISTRO)).toHaveLength(24);
  });

  it('rechaza pasos con métodos fuera del registro', () => {
    expect(() => paso({ titulo: 'x', latex: 'x', textoPlano: 'x', metodo: 'no-existe' })).toThrow();
  });

  it('factorial', () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(5)).toBe(120);
  });

  it("X'X con transpuesta y producto", () => {
    const X = [[1, 2], [1, 3], [1, 5]];
    expect(producto(transpuesta(X), X)).toEqual([[3, 10], [10, 38]]);
  });
});
