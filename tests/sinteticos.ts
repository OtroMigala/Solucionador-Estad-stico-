/** Datos de regresión generados de forma determinista para probar casos con muchas variables. */

/** Generador congruencial lineal: siempre la misma secuencia para la misma semilla. */
function generador(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** n observaciones de k variables con escalas distintas (de 0,1 a 1000) y y lineal más ruido. */
export function datosSinteticos(n: number, k: number, semilla = 2026) {
  const azar = generador(semilla);
  const escalas = Array.from({ length: k }, (_, j) => 10 ** ((j % 5) - 1));
  const x = escalas.map((e) => Array.from({ length: n }, () => Math.round((5 + 4 * (azar() - 0.5)) * e * 1000) / 1000));
  const y = Array.from({ length: n }, (_, i) =>
    Math.round((3 + x.reduce((s, c, j) => s + ((j % 3) - 1 + 0.5) * (c[i] / escalas[j]), 0) + 2 * (azar() - 0.5)) * 1000) / 1000,
  );
  return { y, x };
}
