/**
 * Tipos base del motor de pasos.
 *
 * Cada función del núcleo devuelve el resultado y la lista de pasos que lo
 * producen. Cada paso referencia un método del registro (RNF-01): si un
 * método no está en el registro, no se puede usar.
 */

export type Tema = 'regresion-simple' | 'regresion-multiple' | 'probabilidad';

export interface Metodo {
  id: string;
  nombre: string;
  tema: Tema;
  /** Presentación del curso de donde proviene el método. */
  presentacion: string;
  /** Diapositiva(s), p. ej. "23" o "24–25". */
  diapositiva: string;
}

export interface Paso {
  titulo: string;
  /** Fórmula general en LaTeX. */
  latex: string;
  /** Versión en texto plano, respaldo si KaTeX falla (RNF-03). */
  textoPlano: string;
  /** Fórmula con los valores sustituidos (LaTeX). */
  sustitucion?: string;
  /** Resultado numérico o textual del paso. */
  resultado?: string;
  /** id de un método del registro. */
  metodo: string;
}

export interface Solucion<T> {
  resultado: T;
  pasos: Paso[];
}

const P_SIMPLE = 'Covarianza y regresión lineal';
const P_MULTIPLE = 'Regresión lineal múltiple';
const P_PROB = 'Principios de probabilidad';

/** Registro de métodos (sección «Registro de métodos» de la propuesta). */
export const REGISTRO: Record<string, Metodo> = Object.fromEntries(
  (
    [
      ['covarianza', 'Covarianza', 'regresion-simple', P_SIMPLE, '10'],
      ['pearson', 'Correlación de Pearson', 'regresion-simple', P_SIMPLE, '12–13'],
      ['ecuaciones-normales-simple', 'Ecuaciones normales', 'regresion-simple', P_SIMPLE, '23'],
      ['estimadores-simple', 'Estimadores β̂₀ y β̂₁', 'regresion-simple', P_SIMPLE, '23'],
      ['anova-simple', 'Tabla ANOVA', 'regresion-simple', P_SIMPLE, '24–25'],
      ['r2', 'Coeficiente de determinación', 'regresion-simple', P_SIMPLE, '26'],
      ['ecuaciones-normales-multiple', 'Ecuaciones normales', 'regresion-multiple', P_MULTIPLE, '5'],
      ['forma-matricial', 'Forma matricial', 'regresion-multiple', P_MULTIPLE, '7–8'],
      ['varianza-estimadores', 'Varianza de los estimadores', 'regresion-multiple', P_MULTIPLE, '9–10'],
      ['anova-multiple', 'Tabla ANOVA', 'regresion-multiple', P_MULTIPLE, '11–12'],
      ['espacio-muestral', 'Espacio muestral, eventos, complemento', 'probabilidad', P_PROB, '4–11'],
      ['union-interseccion', 'Unión e intersección', 'probabilidad', P_PROB, '12–13'],
      ['regla-multiplicacion', 'Regla de la multiplicación', 'probabilidad', P_PROB, '14–16'],
      ['permutaciones', 'Permutaciones', 'probabilidad', P_PROB, '16–18'],
      ['permutaciones-repeticion', 'Permutaciones con repetición', 'probabilidad', P_PROB, '19'],
      ['combinaciones', 'Combinaciones', 'probabilidad', P_PROB, '20–21'],
      ['axiomas', 'Axiomas', 'probabilidad', P_PROB, '22–25'],
      ['regla-aditiva', 'Regla aditiva', 'probabilidad', P_PROB, '26–28'],
      ['complemento', 'Complemento', 'probabilidad', P_PROB, '29'],
      ['condicional', 'Probabilidad condicional', 'probabilidad', P_PROB, '30–32'],
      ['independencia', 'Independencia', 'probabilidad', P_PROB, '33'],
      ['regla-producto', 'Regla del producto', 'probabilidad', P_PROB, '34'],
      ['probabilidad-total', 'Probabilidad total', 'probabilidad', P_PROB, '35–36'],
      ['bayes', 'Teorema de Bayes', 'probabilidad', P_PROB, '37'],
    ] as const
  ).map(([id, nombre, tema, presentacion, diapositiva]) => [
    id,
    { id, nombre, tema, presentacion, diapositiva },
  ]),
);

/** Crea un paso verificando que su método exista en el registro. */
export function paso(p: Paso): Paso {
  if (!(p.metodo in REGISTRO)) {
    throw new Error(`Método fuera del registro: ${p.metodo}`);
  }
  return p;
}
