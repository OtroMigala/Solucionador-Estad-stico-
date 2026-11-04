/**
 * Distribuciones F de Fisher y t de Student. La F da el valor crítico que en
 * clase se busca en tabla, F(α; ν₁, ν₂) de la cola superior. La t solo se usa
 * para el resumen que se exporta a Excel (error típico, estadístico t,
 * probabilidad e intervalos de los coeficientes, como la herramienta de
 * regresión de Excel).
 */
import jstatModulo from 'jstat';

const jStat = (jstatModulo as { jStat?: JStat }).jStat ?? (jstatModulo as unknown as JStat);

interface JStat {
  centralF: {
    inv(p: number, df1: number, df2: number): number;
    cdf(x: number, df1: number, df2: number): number;
  };
  studentt: {
    inv(p: number, df: number): number;
    cdf(x: number, df: number): number;
  };
}

/** Valor crítico de cola superior: P(F > valor) = α. */
export function fCritico(alfa: number, gl1: number, gl2: number): number {
  if (!(alfa > 0 && alfa < 1)) throw new Error('α debe estar entre 0 y 1');
  if (!(gl1 >= 1 && gl2 >= 1)) throw new Error('Grados de libertad inválidos');
  return jStat.centralF.inv(1 - alfa, gl1, gl2);
}

/** P(F > f) para F con (gl1, gl2) grados de libertad. */
export function colaSuperiorF(f: number, gl1: number, gl2: number): number {
  return 1 - jStat.centralF.cdf(f, gl1, gl2);
}

/** Valor crítico de dos colas: P(|T| > valor) = α. */
export function tCritico(alfa: number, gl: number): number {
  return jStat.studentt.inv(1 - alfa / 2, gl);
}

/** P(|T| > |t|) para T con gl grados de libertad. */
export function dosColasT(t: number, gl: number): number {
  return 2 * (1 - jStat.studentt.cdf(Math.abs(t), gl));
}
