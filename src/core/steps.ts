/**
 * Motor de pasos.
 *
 * Cada función del núcleo devuelve el resultado y la lista de pasos que lo
 * producen. Un paso se compone de bloques (texto, fórmula, tabla, resultado…)
 * y siempre referencia un método del registro: si un método no está en el
 * registro, no se puede usar (RNF-01).
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

/** Celda de tabla: texto plano o LaTeX en línea. */
export type Celda = string | { latex: string; texto: string };

export interface Columna {
  titulo: string;
  /** Alineación; por defecto, números a la derecha. */
  alinear?: 'izq' | 'der' | 'centro';
}

export type Bloque =
  /** Párrafo. Admite fórmulas en línea entre \( y \). */
  | { tipo: 'texto'; texto: string }
  /** Fórmula en bloque con su versión en texto plano (respaldo si KaTeX falla, RNF-03). */
  | { tipo: 'formula'; latex: string; texto: string }
  /** Resultado destacado del paso. */
  | { tipo: 'resultado'; latex: string; texto: string }
  | { tipo: 'tabla'; columnas: Columna[]; filas: Celda[][]; pie?: Celda[]; nota?: string }
  /** Decisión o interpretación final. */
  | { tipo: 'conclusion'; texto: string; tono: 'afirmativo' | 'negativo' | 'neutro' }
  /** Lista de elementos (p. ej. un espacio muestral por extensión). */
  | { tipo: 'lista'; titulo?: string; items: string[] }
  | { tipo: 'aviso'; texto: string }
  /** Contenido plegable (p. ej. las operaciones de fila de Gauss-Jordan). */
  | { tipo: 'detalles'; titulo: string; bloques: Bloque[] };

export interface Paso {
  titulo: string;
  /** id de un método del registro. */
  metodo: string;
  /** Por qué se hace este paso: la idea detrás de la fórmula. */
  porque?: string;
  bloques: Bloque[];
}

export interface Solucion<T> {
  resultado: T;
  pasos: Paso[];
}

export type Respuesta<T> = { ok: true; solucion: Solucion<T> } | { ok: false; error: string };

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

/** Atajos para construir bloques. */
export const b = {
  texto: (texto: string): Bloque => ({ tipo: 'texto', texto }),
  formula: (latex: string, texto: string): Bloque => ({ tipo: 'formula', latex, texto }),
  resultado: (latex: string, texto: string): Bloque => ({ tipo: 'resultado', latex, texto }),
  conclusion: (texto: string, tono: 'afirmativo' | 'negativo' | 'neutro' = 'neutro'): Bloque => ({
    tipo: 'conclusion',
    texto,
    tono,
  }),
  aviso: (texto: string): Bloque => ({ tipo: 'aviso', texto }),
  lista: (items: string[], titulo?: string): Bloque => ({ tipo: 'lista', items, titulo }),
  detalles: (titulo: string, bloques: Bloque[]): Bloque => ({ tipo: 'detalles', titulo, bloques }),
};
