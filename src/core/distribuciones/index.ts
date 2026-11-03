/**
 * Distribución F de Fisher. Se usa solo para los valores que en clase se
 * buscan en tabla: el valor crítico F(α; ν₁, ν₂) de la cola superior.
 */
import jstatModulo from 'jstat';

const jStat = (jstatModulo as { jStat?: JStatF }).jStat ?? (jstatModulo as unknown as JStatF);

interface JStatF {
  centralF: {
    inv(p: number, df1: number, df2: number): number;
    cdf(x: number, df1: number, df2: number): number;
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
