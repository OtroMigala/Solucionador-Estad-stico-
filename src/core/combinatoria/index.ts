// Conteo: multiplicación, nPr, circulares, con repetición, nCr (diap. 14–21).

/** n! para enteros no negativos. */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('n debe ser un entero no negativo');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// TODO(fase 2): funciones que devuelvan Solucion<number> con sus pasos.
