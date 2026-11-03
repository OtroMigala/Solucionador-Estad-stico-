/**
 * Álgebra matricial: transpuesta, producto e inversa por Gauss-Jordan.
 * La inversa se implementa a mano (no con mathjs) para poder mostrar los pasos;
 * mathjs se usa solo en las pruebas como verificación.
 */
export type Matriz = number[][];

export function transpuesta(A: Matriz): Matriz {
  return A[0].map((_, j) => A.map((fila) => fila[j]));
}

export function producto(A: Matriz, B: Matriz): Matriz {
  if (A[0].length !== B.length) throw new Error('Dimensiones incompatibles');
  return A.map((fila) => B[0].map((_, j) => fila.reduce((s, a, k) => s + a * B[k][j], 0)));
}

// TODO(fase 1): inversa(A) por Gauss-Jordan devolviendo también los pasos.
