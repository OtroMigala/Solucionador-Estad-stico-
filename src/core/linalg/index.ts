/**
 * Álgebra matricial: transpuesta, producto e inversa por Gauss-Jordan.
 * La inversa se implementa a mano (no con mathjs) para poder mostrar cada
 * operación de fila; mathjs se usa solo en las pruebas como verificación.
 */
export type Matriz = number[][];

export function transpuesta(A: Matriz): Matriz {
  return A[0].map((_, j) => A.map((fila) => fila[j]));
}

export function producto(A: Matriz, B: Matriz): Matriz {
  if (A[0].length !== B.length) throw new Error('Dimensiones incompatibles');
  return A.map((fila) => B[0].map((_, j) => fila.reduce((s, a, k) => s + a * B[k][j], 0)));
}

export function productoVector(A: Matriz, v: number[]): number[] {
  if (A[0].length !== v.length) throw new Error('Dimensiones incompatibles');
  return A.map((fila) => fila.reduce((s, a, k) => s + a * v[k], 0));
}

export function identidad(n: number): Matriz {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

export type OperacionFila =
  | { tipo: 'intercambio'; i: number; j: number }
  /** F_i ← F_i / divisor */
  | { tipo: 'escalar'; i: number; divisor: number }
  /** F_i ← F_i − factor·F_j */
  | { tipo: 'eliminar'; i: number; j: number; factor: number };

export interface EtapaGaussJordan {
  /** Columna pivote (0-indexada). */
  columna: number;
  operaciones: OperacionFila[];
  /** Lado izquierdo y derecho de [A | I] después de procesar la columna. */
  izquierda: Matriz;
  derecha: Matriz;
}

export type ResultadoInversa =
  | { singular: false; inversa: Matriz; etapas: EtapaGaussJordan[] }
  | { singular: true; columna: number };

/**
 * Inversa por Gauss-Jordan sobre [A | I].
 *
 * Para cada columna j: si el pivote es (casi) cero se intercambia con una fila
 * inferior; luego la fila pivote se divide por el pivote y se anulan los demás
 * elementos de la columna. X'X es simétrica y definida positiva cuando las
 * columnas de X son independientes, así que en la práctica no hace falta
 * pivoteo y el procedimiento coincide con el que se hace a mano.
 *
 * Un pivote se considera cero en relación con la escala de su propia columna,
 * no con el mayor número de la matriz: si una variable se mide en centésimas y
 * otra en miles, el pivote de la pequeña es legítimamente pequeño.
 */
export function inversaGaussJordan(A: Matriz): ResultadoInversa {
  const n = A.length;
  const izq = A.map((f) => [...f]);
  const der = identidad(n);
  const tol = A[0].map((_, j) => 1e-12 * Math.max(...A.map((f) => Math.abs(f[j])), 1e-300));
  const etapas: EtapaGaussJordan[] = [];

  for (let j = 0; j < n; j++) {
    const operaciones: OperacionFila[] = [];
    const tolJ = tol[j];
    if (Math.abs(izq[j][j]) <= tolJ) {
      let r = -1;
      for (let i = j + 1; i < n; i++) {
        if (Math.abs(izq[i][j]) > tolJ && (r < 0 || Math.abs(izq[i][j]) > Math.abs(izq[r][j]))) r = i;
      }
      if (r < 0) return { singular: true, columna: j };
      [izq[j], izq[r]] = [izq[r], izq[j]];
      [der[j], der[r]] = [der[r], der[j]];
      operaciones.push({ tipo: 'intercambio', i: j, j: r });
    }

    const pivote = izq[j][j];
    if (pivote !== 1) {
      for (let c = 0; c < n; c++) {
        izq[j][c] /= pivote;
        der[j][c] /= pivote;
      }
      izq[j][j] = 1;
      operaciones.push({ tipo: 'escalar', i: j, divisor: pivote });
    }

    for (let i = 0; i < n; i++) {
      if (i === j) continue;
      const factor = izq[i][j];
      if (factor === 0) continue;
      for (let c = 0; c < n; c++) {
        izq[i][c] -= factor * izq[j][c];
        der[i][c] -= factor * der[j][c];
      }
      izq[i][j] = 0;
      operaciones.push({ tipo: 'eliminar', i, j, factor });
    }

    etapas.push({
      columna: j,
      operaciones,
      izquierda: izq.map((f) => [...f]),
      derecha: der.map((f) => [...f]),
    });
  }

  return { singular: false, inversa: der, etapas };
}
