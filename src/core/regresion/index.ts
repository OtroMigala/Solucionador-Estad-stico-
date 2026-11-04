/**
 * Regresión lineal simple y múltiple, resuelta paso a paso con los métodos de
 * las presentaciones «Covarianza y regresión lineal» y «Regresión lineal
 * múltiple». Los cálculos internos usan precisión completa; los pasos muestran
 * los valores redondeados según el formato elegido.
 */
import { type Formato, fmt, fmtPct, fmtPctTex, fmtTex, fmtTexP, par, subindice } from '../formato';
import { aumentada, frac, matriz, matrizNum, sistema, vectorNum } from '../latex';
import { b, paso, type Bloque, type Celda, type Paso, type Respuesta } from '../steps';
import { type EtapaGaussJordan, type OperacionFila, inversaGaussJordan, productoVector } from '../linalg';
import { fCritico } from '../distribuciones';

export interface DatosRegresion {
  /** Variable de respuesta. */
  y: number[];
  /** Variables regresoras: x[j][i] es la observación i de la variable j. */
  x: number[][];
  nombreY?: string;
  nombresX?: string[];
}

export interface OpcionesRegresion {
  /** Nivel de significancia de la prueba F. */
  alfa: number;
  /** Valores de las x para predecir ŷ (uno por variable); null u omitido para no predecir. */
  x0?: number[] | null;
  formato: Formato;
}

export interface ResumenSimple {
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
  cov: number;
  sx: number;
  sy: number;
  r: number;
}

export interface ResultadoRegresion {
  n: number;
  k: number;
  beta: number[];
  yGorro: number[];
  mediaY: number;
  mediasX: number[];
  SCR: number;
  SCE: number;
  SCT: number;
  glR: number;
  glE: number;
  glT: number;
  CMR: number;
  CME: number;
  F: number;
  Fcritico: number;
  rechazaH0: boolean;
  R2: number;
  /** X'X y X'y (en regresión simple, la matriz 2×2 de las ecuaciones normales). */
  XtX: number[][];
  Xty: number[];
  /** (X'X)⁻¹; solo en regresión múltiple. */
  inversa: number[][] | null;
  /** cᵢᵢ·S² para i = 0…k; solo en regresión múltiple. */
  varianzas: number[] | null;
  prediccion: number | null;
  simple: ResumenSimple | null;
}

/** Rangos para interpretar r (diap. 12–13). Confirmar con la diapositiva del curso. */
export const RANGOS_PEARSON = [
  { desde: 0.8, fuerza: 'fuerte' },
  { desde: 0.5, fuerza: 'moderada' },
  { desde: 0, fuerza: 'débil' },
] as const;

const sumar = (v: number[]) => v.reduce((s, a) => s + a, 0);
const xs = (j: number) => `x${subindice(j)}`;

export function interpretarPearson(r: number): string {
  const a = Math.abs(r);
  if (a < 1e-12) return 'r = 0: no hay correlación lineal entre x e y.';
  const fuerza = a > 1 - 1e-12 ? 'perfecta' : RANGOS_PEARSON.find((g) => a >= g.desde)!.fuerza;
  const sentido =
    r > 0
      ? 'positiva (directa): cuando x aumenta, y tiende a aumentar'
      : 'negativa (inversa): cuando x aumenta, y tiende a disminuir';
  return `Correlación ${fuerza} ${sentido}.`;
}

function validar(d: DatosRegresion, op: OpcionesRegresion): string | null {
  const n = d.y.length;
  const k = d.x.length;
  if (k < 1) return 'Agrega al menos una variable regresora x.';
  if (d.x.some((c) => c.length !== n)) return 'Todas las columnas deben tener la misma cantidad de datos.';
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(d.y[i])) return `Fila ${i + 1}: el valor de y está vacío o no es un número.`;
    for (let j = 0; j < k; j++) {
      if (!Number.isFinite(d.x[j][i])) return `Fila ${i + 1}: el valor de ${xs(j + 1)} está vacío o no es un número.`;
    }
  }
  if (n < k + 2) {
    return `Con ${k} variable${k > 1 ? 's' : ''} regresora${k > 1 ? 's' : ''} se necesitan al menos ${k + 2} observaciones, para que los grados de libertad del error, n − (k + 1), sean al menos 1. Ahora hay ${n}.`;
  }
  if (!(op.alfa > 0 && op.alfa < 1)) return 'El nivel de significancia α debe estar entre 0 y 1, por ejemplo 0,05.';
  if (op.x0 && (op.x0.length !== k || op.x0.some((v) => !Number.isFinite(v)))) {
    return 'Para predecir, escribe un valor numérico para cada variable x (o deja todos vacíos).';
  }
  if (d.y.every((v) => v === d.y[0])) return 'Todos los valores de y son iguales: no hay variación que explicar (SCT = 0).';
  return null;
}

export function resolverRegresion(d: DatosRegresion, op: OpcionesRegresion): Respuesta<ResultadoRegresion> {
  const error = validar(d, op);
  if (error) return { ok: false, error };
  return d.x.length === 1 ? resolverSimple(d, op) : resolverMultiple(d, op);
}

/* ────────────────────────── piezas comunes ────────────────────────── */

/**
 * Con más variables regresoras que esto, la solución se muestra compacta: las
 * tablas y sistemas que crecen con k² quedan en desplegables y las sumas
 * largas se abrevian con «…».
 */
export const K_COMPACTO = 5;
const TERMINOS_POR_LINEA = 4;

/** «= primero + términos» como filas de un entorno aligned, con cuatro términos por fila. */
function filasDeSuma(primero: string, terminos: string[]): string {
  const filas: string[] = [];
  for (let i = 0; i < terminos.length; i += TERMINOS_POR_LINEA) filas.push(terminos.slice(i, i + TERMINOS_POR_LINEA).join(''));
  return `&= ${primero}${filas[0] ?? ''} ${filas
    .slice(1)
    .map((l) => `\\\\ &\\quad ${l}`)
    .join(' ')}`;
}

/** «izq = primero + términos», partido en varias líneas alineadas si hay más de cuatro términos. */
function enLineas(izq: string, primero: string, terminos: string[]): string {
  if (terminos.length <= TERMINOS_POR_LINEA) return `${izq} = ${primero}${terminos.join('')}`;
  return `\\begin{aligned} ${izq} ${filasDeSuma(primero, terminos)} \\end{aligned}`;
}

/** t(1) + t(2) + … + t(k), abreviada con \dots cuando k es grande. */
function sumaGeneral(k: number, t: (j: number) => string, sep = ' + '): string {
  return k > K_COMPACTO ? `${t(1)}${sep}${t(2)}${sep}\\dots${sep}${t(k)}` : Array.from({ length: k }, (_, j) => t(j + 1)).join(sep);
}

export function ecuacionTex(beta: number[], f: Formato, simple: boolean): string {
  const terminos = beta.slice(1).map((bj, j) => {
    const v = simple ? 'x' : `x_{${j + 1}}`;
    return bj < 0 ? ` - ${fmtTex(-bj, f)}\\,${v}` : ` + ${fmtTex(bj, f)}\\,${v}`;
  });
  return enLineas('\\hat{y}', fmtTex(beta[0], f), terminos);
}

/** Tabla de los β̂ⱼ con su variable; con interpretación, dice cuánto cambia y por unidad de xⱼ. */
export function tablaCoeficientes(beta: number[], f: Formato, nombresX?: string[], conInterpretacion = false): Bloque {
  return {
    tipo: 'tabla',
    columnas: [
      { titulo: 'Estimador', alinear: 'izq' },
      { titulo: 'Variable', alinear: 'izq' },
      { titulo: 'Valor' },
      ...(conInterpretacion ? [{ titulo: 'Si xⱼ aumenta una unidad (las demás fijas), y…', alinear: 'izq' as const }] : []),
    ],
    filas: beta.map((bj, j) => [
      { latex: `\\hat\\beta_{${j}}`, texto: `β̂${subindice(j)}` },
      j === 0 ? 'intercepto' : `${xs(j)}${nombresX?.[j - 1] ? ` · ${nombresX[j - 1]}` : ''}`,
      fmt(bj, f),
      ...(conInterpretacion ? [j === 0 ? '' : `${bj >= 0 ? 'aumenta' : 'disminuye'} en promedio ${fmt(Math.abs(bj), f)}`] : []),
    ]),
  };
}

export function ecuacionTexto(beta: number[], f: Formato, simple: boolean): string {
  let s = `ŷ = ${fmt(beta[0], f)}`;
  beta.slice(1).forEach((bj, j) => {
    const v = simple ? 'x' : xs(j + 1);
    s += bj < 0 ? ` − ${fmt(-bj, f)}·${v}` : ` + ${fmt(bj, f)}·${v}`;
  });
  return s;
}

export interface Anova {
  yGorro: number[];
  mediaY: number;
  SCR: number;
  SCE: number;
  SCT: number;
  glR: number;
  glE: number;
  glT: number;
  CMR: number;
  CME: number;
  F: number;
  Fcritico: number;
  rechazaH0: boolean;
  R2: number;
}

function calcularAnova(y: number[], yGorro: number[], k: number, alfa: number): Anova {
  const n = y.length;
  const mediaY = sumar(y) / n;
  const SCR = sumar(yGorro.map((v) => (v - mediaY) ** 2));
  const SCE = sumar(y.map((v, i) => (v - yGorro[i]) ** 2));
  const SCT = sumar(y.map((v) => (v - mediaY) ** 2));
  const glR = k;
  const glE = n - k - 1;
  const glT = n - 1;
  const CMR = SCR / glR;
  const CME = SCE / glE;
  const F = CMR / CME;
  const Fcritico = fCritico(alfa, glR, glE);
  return { yGorro, mediaY, SCR, SCE, SCT, glR, glE, glT, CMR, CME, F, Fcritico, rechazaH0: F > Fcritico, R2: SCR / SCT };
}

function tablaAjustados(y: number[], a: Anova, f: Formato, xSimple?: number[]): Bloque {
  const filas: Celda[][] = y.map((yi, i) => [
    String(i + 1),
    ...(xSimple ? [fmt(xSimple[i], f)] : []),
    fmt(yi, f),
    fmt(a.yGorro[i], f),
    fmt((yi - a.mediaY) ** 2, f),
    fmt((a.yGorro[i] - a.mediaY) ** 2, f),
    fmt((yi - a.yGorro[i]) ** 2, f),
  ]);
  return {
    tipo: 'tabla',
    columnas: [
      { titulo: 'i', alinear: 'centro' },
      ...(xSimple ? [{ titulo: 'x' }] : []),
      { titulo: 'yᵢ' },
      { titulo: 'ŷᵢ' },
      { titulo: '(yᵢ − ȳ)²' },
      { titulo: '(ŷᵢ − ȳ)²' },
      { titulo: '(yᵢ − ŷᵢ)²' },
    ],
    filas,
    pie: [
      'Σ',
      ...(xSimple ? [fmt(sumar(xSimple), f)] : []),
      fmt(sumar(y), f),
      fmt(sumar(a.yGorro), f),
      fmt(a.SCT, f),
      fmt(a.SCR, f),
      fmt(a.SCE, f),
    ],
    nota: `ȳ = ${fmt(a.mediaY, f)}. Las tres últimas sumas son SCT, SCR y SCE.`,
  };
}

function bloquesAnova(a: Anova, f: Formato, n: number, k: number): Bloque[] {
  const glE = k === 1 ? 'n-2' : 'n-(k+1)';
  return [
    b.formula(
      `\\begin{aligned} SCR &= \\sum(\\hat{y}_i-\\bar{y})^2 = ${fmtTex(a.SCR, f)} \\\\ SCE &= \\sum(y_i-\\hat{y}_i)^2 = ${fmtTex(a.SCE, f)} \\\\ SCT &= \\sum(y_i-\\bar{y})^2 = ${fmtTex(a.SCT, f)} \\end{aligned}`,
      `SCR = Σ(ŷᵢ − ȳ)² = ${fmt(a.SCR, f)}; SCE = Σ(yᵢ − ŷᵢ)² = ${fmt(a.SCE, f)}; SCT = Σ(yᵢ − ȳ)² = ${fmt(a.SCT, f)}`,
    ),
    b.texto(
      `Comprobación: \\(SCR + SCE = ${fmtTex(a.SCR, f)} + ${fmtTex(a.SCE, f)} = ${fmtTex(a.SCR + a.SCE, f)} = SCT\\).`,
    ),
    b.formula(
      `CMR = \\frac{SCR}{${k === 1 ? '1' : 'k'}} = ${frac(fmtTex(a.SCR, f), a.glR)} = ${fmtTex(a.CMR, f)},\\qquad CME = S^2 = \\frac{SCE}{${glE}} = ${frac(fmtTex(a.SCE, f), a.glE)} = ${fmtTex(a.CME, f)}`,
      `CMR = SCR/${a.glR} = ${fmt(a.CMR, f)}; CME = S² = SCE/${a.glE} = ${fmt(a.CME, f)}`,
    ),
    b.formula(
      `F_c = \\frac{CMR}{CME} = ${frac(fmtTex(a.CMR, f), fmtTex(a.CME, f))} = ${fmtTex(a.F, f)}`,
      `Fc = CMR/CME = ${fmt(a.F, f)}`,
    ),
    tablaAnova(a, f, n, k),
  ];
}

/** Tabla ANOVA con fuente, sumas de cuadrados, grados de libertad, cuadrados medios y F. */
export function tablaAnova(a: Anova, f: Formato, n: number, k: number): Bloque {
  return {
    tipo: 'tabla',
    columnas: [
      { titulo: 'Fuente de variación', alinear: 'izq' },
      { titulo: 'Suma de cuadrados' },
      { titulo: 'Grados de libertad' },
      { titulo: 'Cuadrado medio' },
      { titulo: 'F calculado' },
    ],
    filas: [
      ['Regresión', `SCR = ${fmt(a.SCR, f)}`, `${k === 1 ? '1' : `k = ${a.glR}`}`, `CMR = ${fmt(a.CMR, f)}`, `Fc = ${fmt(a.F, f)}`],
      ['Error', `SCE = ${fmt(a.SCE, f)}`, `${k === 1 ? 'n − 2' : 'n − (k + 1)'} = ${a.glE}`, `CME = ${fmt(a.CME, f)}`, ''],
      ['Total', `SCT = ${fmt(a.SCT, f)}`, `n − 1 = ${a.glT}`, '', ''],
    ],
    nota: `n = ${n}`,
  };
}

/** Hipótesis de la prueba F, en LaTeX y en texto plano. */
export function hipotesisF(k: number): { latex: string; texto: string } {
  const h0 = k === 1 ? '\\beta_1 = 0' : sumaGeneral(k, (j) => `\\beta_{${j}}`, ' = ') + ' = 0';
  const h1 = k === 1 ? '\\beta_1 \\neq 0' : '\\text{al menos un } \\beta_j \\neq 0';
  return {
    latex: `H_0: ${h0} \\qquad H_1: ${h1}`,
    texto: `H₀: ${k === 1 ? 'β₁ = 0' : 'β₁ = … = βₖ = 0'}; H₁: ${k === 1 ? 'β₁ ≠ 0' : 'al menos un βⱼ ≠ 0'}`,
  };
}

/** Decisión redactada de la prueba F. */
export function decisionF(a: Anova, alfa: number, f: Formato, k: number, nombreY: string): string {
  const alfaTxt = fmt(alfa, { ...f, decimales: 6 });
  return a.rechazaH0
    ? k === 1
      ? `Como Fc = ${fmt(a.F, f)} > ${fmt(a.Fcritico, f)}, se rechaza H₀: la variable regresora x aporta significativamente a explicar ${nombreY} (α = ${alfaTxt}).`
      : `Como Fc = ${fmt(a.F, f)} > ${fmt(a.Fcritico, f)}, se rechaza H₀: al menos una de las variables regresoras aporta significativamente al modelo de ${nombreY} (α = ${alfaTxt}).`
    : k === 1
      ? `Como Fc = ${fmt(a.F, f)} ≤ ${fmt(a.Fcritico, f)}, no se rechaza H₀: con α = ${alfaTxt} no hay evidencia de que x aporte a explicar ${nombreY}.`
      : `Como Fc = ${fmt(a.F, f)} ≤ ${fmt(a.Fcritico, f)}, no se rechaza H₀: con α = ${alfaTxt} no hay evidencia de que alguna variable regresora aporte al modelo.`;
}

/** Interpretación del coeficiente de determinación. */
export function interpretacionR2(R2: number, f: Formato, k: number, nombreY: string): string {
  return `${k === 1 ? 'La variable regresora explica' : 'Las variables regresoras explican'} el ${fmtPct(R2, f)} de la variabilidad de ${nombreY}; el ${fmtPct(1 - R2, f)} restante se debe a otros factores no incluidos en el modelo.`;
}

function pasoPrueba(a: Anova, op: OpcionesRegresion, k: number, nombreY: string): Paso {
  const f = op.formato;
  const alfaTex = fmtTex(op.alfa, { ...f, decimales: 6 });
  const alfaTxt = fmt(op.alfa, { ...f, decimales: 6 });
  const h = hipotesisF(k);
  return paso({
    titulo: 'Prueba de hipótesis F',
    metodo: k === 1 ? 'anova-simple' : 'anova-multiple',
    parte: 'prueba',
    porque:
      'Si H₀ fuera cierta, CMR y CME estimarían la misma varianza y F estaría cerca de 1. Un F grande indica que el modelo explica más variación de la que se esperaría por azar; por eso se rechaza H₀ solo en la cola superior de la distribución F.',
    bloques: [
      b.formula(h.latex, h.texto),
      b.formula(
        `F_{\\alpha;\\,${k === 1 ? '1' : 'k'};\\,${k === 1 ? 'n-2' : 'n-k-1'}} = F_{${alfaTex};\\,${a.glR};\\,${a.glE}} = ${fmtTex(a.Fcritico, f)}`,
        `F(α = ${alfaTxt}; ${a.glR}; ${a.glE}) = ${fmt(a.Fcritico, f)} (valor de tabla)`,
      ),
      b.texto(
        `Regla de decisión: se rechaza \\(H_0\\) si \\(F_c > F_{\\alpha}\\). Aquí \\(F_c = ${fmtTex(a.F, f)} ${a.rechazaH0 ? '>' : '\\leq'} ${fmtTex(a.Fcritico, f)}\\).`,
      ),
      b.conclusion(decisionF(a, op.alfa, f, k, nombreY), a.rechazaH0 ? 'afirmativo' : 'negativo'),
    ],
  });
}

function pasoR2(a: Anova, f: Formato, k: number, nombreY: string): Paso {
  return paso({
    titulo: 'Coeficiente de determinación R²',
    metodo: 'r2',
    parte: 'r2',
    porque:
      'R² es la fracción de la variación total de y (SCT) que el modelo logra explicar (SCR). Va de 0 (el modelo no explica nada) a 1 (explica todo).',
    bloques: [
      b.formula(
        `R^2 = \\frac{SCR}{SCT} = 1 - \\frac{SCE}{SCT} = ${frac(fmtTex(a.SCR, f), fmtTex(a.SCT, f))} = ${fmtTex(a.R2, f)}`,
        `R² = SCR/SCT = ${fmt(a.SCR, f)}/${fmt(a.SCT, f)} = ${fmt(a.R2, f)}`,
      ),
      b.resultado(`R^2 = ${fmtTex(a.R2, f)} \\;\\Rightarrow\\; ${fmtPctTex(a.R2, f)}`, `R² = ${fmt(a.R2, f)} (${fmtPct(a.R2, f)})`),
      b.conclusion(interpretacionR2(a.R2, f, k, nombreY)),
    ],
  });
}

function pasoPrediccion(beta: number[], x0: number[], f: Formato, simple: boolean): { paso: Paso; valor: number } {
  const valor = beta[0] + x0.reduce((s, v, j) => s + beta[j + 1] * v, 0);
  const general = simple
    ? '\\hat\\beta_0 + \\hat\\beta_1 x_0'
    : `\\hat\\beta_0 + ${sumaGeneral(x0.length, (j) => `\\hat\\beta_{${j}}x_{${j}}`)}`;
  const terminos = x0.map((v, j) => {
    const bj = beta[j + 1];
    return `${bj < 0 ? ' - ' : ' + '}${fmtTex(Math.abs(bj), f)}\\left(${fmtTex(v, f)}\\right)`;
  });
  // Con muchas variables, la sustitución va en varias líneas debajo de la fórmula general.
  const sustitucion =
    terminos.length > TERMINOS_POR_LINEA
      ? `\\begin{aligned} \\hat{y}_0 &= ${general} \\\\ ${filasDeSuma(fmtTex(beta[0], f), terminos)} \\end{aligned}`
      : `\\hat{y}_0 = ${general} = ${fmtTex(beta[0], f)}${terminos.join('')}`;
  const valoresTxt = x0.map((v, j) => `${simple ? 'x' : xs(j + 1)} = ${fmt(v, f)}`).join(', ');
  return {
    valor,
    paso: paso({
      titulo: 'Predicción',
      metodo: simple ? 'estimadores-simple' : 'forma-matricial',
      parte: 'prediccion',
      porque: 'Para predecir se reemplazan los valores dados de las variables regresoras en la ecuación ajustada.',
      bloques: [
        b.texto(`Valores dados: ${valoresTxt}.`),
        b.formula(sustitucion, `ŷ₀ = ${fmt(valor, f)}`),
        b.resultado(`\\hat{y}_0 = ${fmtTex(valor, f)}`, `ŷ₀ = ${fmt(valor, f)}`),
      ],
    }),
  };
}

function bloqueModelo(d: DatosRegresion, simple: boolean): Bloque[] {
  const k = d.x.length;
  const n = d.y.length;
  const bloques: Bloque[] = [
    simple
      ? b.formula('Y = \\beta_0 + \\beta_1 x + \\varepsilon', 'Y = β₀ + β₁x + ε')
      : b.formula(
          `Y = \\beta_0 + ${sumaGeneral(k, (j) => `\\beta_{${j}}x_{${j}}`)} + \\varepsilon`,
          `Y = β₀ + ${k > K_COMPACTO ? `β₁x₁ + … + β${subindice(k)}${xs(k)}` : Array.from({ length: k }, (_, j) => `β${subindice(j + 1)}${xs(j + 1)}`).join(' + ')} + ε`,
        ),
    b.texto(`n = ${n} observaciones${simple ? '' : `, k = ${k} variables regresoras`}.`),
  ];
  const nombres: string[] = [];
  if (d.nombreY) nombres.push(`y: ${d.nombreY}`);
  d.nombresX?.forEach((nom, j) => nom && nombres.push(`${simple ? 'x' : xs(j + 1)}: ${nom}`));
  if (nombres.length) bloques.push(b.lista(nombres, 'Variables'));
  return bloques;
}

/* ────────────────────────── regresión simple ────────────────────────── */

function resolverSimple(d: DatosRegresion, op: OpcionesRegresion): Respuesta<ResultadoRegresion> {
  const f = op.formato;
  const x = d.x[0];
  const y = d.y;
  const n = y.length;
  const nombreY = d.nombreY || 'y';

  const sumX = sumar(x);
  const sumY = sumar(y);
  const sumX2 = sumar(x.map((v) => v * v));
  const sumY2 = sumar(y.map((v) => v * v));
  const sumXY = sumar(x.map((v, i) => v * y[i]));
  const mx = sumX / n;
  const my = sumY / n;
  const sxx = sumar(x.map((v) => (v - mx) ** 2));
  const syy = sumar(y.map((v) => (v - my) ** 2));
  const sxy = sumar(x.map((v, i) => (v - mx) * (y[i] - my)));
  if (sxx === 0) return { ok: false, error: 'Todos los valores de x son iguales: no se puede ajustar una recta (Σ(x − x̄)² = 0).' };

  const cov = sxy / n;
  const sx = Math.sqrt(sxx / n);
  const sy = Math.sqrt(syy / n);
  const r = sxy / Math.sqrt(sxx * syy);
  const b1 = sxy / sxx;
  const b0 = my - b1 * mx;
  const beta = [b0, b1];
  const yGorro = x.map((v) => b0 + b1 * v);
  const a = calcularAnova(y, yGorro, 1, op.alfa);

  const pasos: Paso[] = [];

  pasos.push(
    paso({
      titulo: 'Modelo y datos',
      metodo: 'ecuaciones-normales-simple',
      parte: 'planteamiento',
      porque:
        'El modelo supone que y se relaciona linealmente con x más un error aleatorio ε con media cero. Los parámetros β₀ y β₁ son desconocidos y se estiman con los datos.',
      bloques: bloqueModelo(d, true),
    }),
  );

  pasos.push(
    paso({
      titulo: 'Tabla de productos y sumas',
      metodo: 'ecuaciones-normales-simple',
      parte: 'planteamiento',
      porque:
        'Todas las fórmulas siguientes solo necesitan sumas: Σx, Σy, Σx², Σy² y Σxy. Por eso primero se construye la tabla con cada producto y se suma cada columna.',
      bloques: [
        {
          tipo: 'tabla',
          columnas: [{ titulo: 'i', alinear: 'centro' }, { titulo: 'x' }, { titulo: 'y' }, { titulo: 'x²' }, { titulo: 'y²' }, { titulo: 'x·y' }],
          filas: x.map((xi, i) => [String(i + 1), fmt(xi, f), fmt(y[i], f), fmt(xi * xi, f), fmt(y[i] * y[i], f), fmt(xi * y[i], f)]),
          pie: ['Σ', fmt(sumX, f), fmt(sumY, f), fmt(sumX2, f), fmt(sumY2, f), fmt(sumXY, f)],
        },
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Medias',
      metodo: 'covarianza',
      parte: 'planteamiento',
      bloques: [
        b.formula(
          `\\bar{x} = \\frac{\\sum x_i}{n} = ${frac(fmtTex(sumX, f), n)} = ${fmtTex(mx, f)},\\qquad \\bar{y} = \\frac{\\sum y_i}{n} = ${frac(fmtTex(sumY, f), n)} = ${fmtTex(my, f)}`,
          `x̄ = ${fmt(sumX, f)}/${n} = ${fmt(mx, f)}; ȳ = ${fmt(sumY, f)}/${n} = ${fmt(my, f)}`,
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Covarianza',
      metodo: 'covarianza',
      parte: 'correlacion',
      porque:
        'La covarianza mide cómo varían juntas x e y: es positiva si tienden a crecer juntas y negativa si una crece cuando la otra decrece. Sus unidades son las de x por las de y, así que su tamaño no indica qué tan fuerte es la relación.',
      bloques: [
        b.formula(
          `\\operatorname{Cov}(x,y) = \\frac{\\sum (x_i-\\bar{x})(y_i-\\bar{y})}{n} = \\frac{\\sum x_i y_i}{n} - \\bar{x}\\,\\bar{y}`,
          'Cov(x,y) = Σ(xᵢ − x̄)(yᵢ − ȳ)/n = Σxᵢyᵢ/n − x̄ȳ',
        ),
        b.formula(
          `\\operatorname{Cov}(x,y) = ${frac(fmtTex(sumXY, f), n)} - ${par(mx, f)}${par(my, f)} = ${fmtTex(cov, f)}`,
          `Cov(x,y) = ${fmt(sumXY, f)}/${n} − (${fmt(mx, f)})(${fmt(my, f)}) = ${fmt(cov, f)}`,
        ),
        b.conclusion(
          cov > 0
            ? 'La covarianza es positiva: x e y tienden a aumentar juntas.'
            : cov < 0
              ? 'La covarianza es negativa: cuando x aumenta, y tiende a disminuir.'
              : 'La covarianza es cero: no hay relación lineal.',
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Desviaciones estándar',
      metodo: 'pearson',
      parte: 'correlacion',
      porque: 'Se calculan con el mismo divisor n de la covarianza, para que r quede entre −1 y 1.',
      bloques: [
        b.formula(
          `S_x = \\sqrt{\\frac{\\sum x_i^2}{n} - \\bar{x}^2} = \\sqrt{${frac(fmtTex(sumX2, f), n)} - ${par(mx, f)}^2} = ${fmtTex(sx, f)}`,
          `Sx = √(Σx²/n − x̄²) = ${fmt(sx, f)}`,
        ),
        b.formula(
          `S_y = \\sqrt{\\frac{\\sum y_i^2}{n} - \\bar{y}^2} = \\sqrt{${frac(fmtTex(sumY2, f), n)} - ${par(my, f)}^2} = ${fmtTex(sy, f)}`,
          `Sy = √(Σy²/n − ȳ²) = ${fmt(sy, f)}`,
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Coeficiente de correlación de Pearson',
      metodo: 'pearson',
      parte: 'correlacion',
      porque:
        'Al dividir la covarianza entre SₓSᵧ desaparecen las unidades y el resultado queda entre −1 y 1: el signo da el sentido de la relación y el valor absoluto su fuerza.',
      bloques: [
        b.formula(
          `r = \\frac{\\operatorname{Cov}(x,y)}{S_x S_y} = \\frac{${fmtTex(cov, f)}}{${par(sx, f)}${par(sy, f)}} = ${fmtTex(r, f)}`,
          `r = Cov(x,y)/(Sx·Sy) = ${fmt(r, f)}`,
        ),
        b.resultado(`r = ${fmtTex(r, f)}`, `r = ${fmt(r, f)}`),
        b.conclusion(interpretarPearson(r)),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Ecuaciones normales',
      metodo: 'ecuaciones-normales-simple',
      parte: 'parametros',
      porque:
        'Los estimadores de mínimos cuadrados son los que hacen mínima la suma de los errores al cuadrado, Σ(yᵢ − β₀ − β₁xᵢ)². Al derivar respecto a β₀ y β₁ e igualar a cero se obtiene este sistema de dos ecuaciones.',
      bloques: [
        b.formula(
          sistema([
            ['n\\hat\\beta_0 + \\hat\\beta_1 \\sum x_i', '\\sum y_i'],
            ['\\hat\\beta_0 \\sum x_i + \\hat\\beta_1 \\sum x_i^2', '\\sum x_i y_i'],
          ]),
          'nβ̂₀ + β̂₁Σx = Σy; β̂₀Σx + β̂₁Σx² = Σxy',
        ),
        b.formula(
          sistema([
            [`${n}\\,\\hat\\beta_0 + ${fmtTexP(sumX, f)}\\,\\hat\\beta_1`, fmtTex(sumY, f)],
            [`${fmtTexP(sumX, f)}\\,\\hat\\beta_0 + ${fmtTexP(sumX2, f)}\\,\\hat\\beta_1`, fmtTex(sumXY, f)],
          ]),
          `${n}β̂₀ + ${fmt(sumX, f)}β̂₁ = ${fmt(sumY, f)}; ${fmt(sumX, f)}β̂₀ + ${fmt(sumX2, f)}β̂₁ = ${fmt(sumXY, f)}`,
        ),
      ],
    }),
  );

  const numB1 = n * sumXY - sumX * sumY;
  const denB1 = n * sumX2 - sumX * sumX;
  pasos.push(
    paso({
      titulo: 'Estimadores de mínimos cuadrados',
      metodo: 'estimadores-simple',
      parte: 'parametros',
      porque:
        'Resolviendo el sistema de ecuaciones normales se obtienen estas fórmulas cerradas: primero la pendiente β̂₁ y luego el intercepto β̂₀, que hace que la recta pase por el punto (x̄, ȳ).',
      bloques: [
        b.formula(
          `\\hat\\beta_1 = \\frac{n\\sum x_i y_i - \\sum x_i \\sum y_i}{n\\sum x_i^2 - \\left(\\sum x_i\\right)^2} = \\frac{${n}${par(sumXY, f)} - ${par(sumX, f)}${par(sumY, f)}}{${n}${par(sumX2, f)} - ${par(sumX, f)}^2} = ${frac(fmtTex(numB1, f), fmtTex(denB1, f))} = ${fmtTex(b1, f)}`,
          `β̂₁ = (nΣxy − ΣxΣy)/(nΣx² − (Σx)²) = ${fmt(numB1, f)}/${fmt(denB1, f)} = ${fmt(b1, f)}`,
        ),
        b.formula(
          `\\hat\\beta_0 = \\bar{y} - \\hat\\beta_1\\bar{x} = ${fmtTex(my, f)} - ${par(b1, f)}${par(mx, f)} = ${fmtTex(b0, f)}`,
          `β̂₀ = ȳ − β̂₁x̄ = ${fmt(b0, f)}`,
        ),
        b.resultado(ecuacionTex(beta, f, true), ecuacionTexto(beta, f, true)),
        b.texto(
          `Interpretación de la pendiente: por cada unidad que aumenta x, y ${b1 >= 0 ? 'aumenta' : 'disminuye'} en promedio ${fmt(Math.abs(b1), f)} unidades.`,
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Valores ajustados y residuos',
      metodo: 'anova-simple',
      parte: 'anova',
      porque: 'Con la recta se calcula ŷᵢ para cada xᵢ. Las diferencias al cuadrado respecto a ȳ y a ŷᵢ dan las sumas de cuadrados de la tabla ANOVA.',
      bloques: [tablaAjustados(y, a, f, x)],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Tabla ANOVA',
      metodo: 'anova-simple',
      parte: 'anova',
      porque:
        'La variación total de y (SCT) se divide en la parte que explica la recta (SCR) y la que queda sin explicar alrededor de ella (SCE): SCT = SCR + SCE. Al dividir cada suma entre sus grados de libertad se obtienen cuadrados medios comparables.',
      bloques: bloquesAnova(a, f, n, 1),
    }),
  );

  pasos.push(pasoPrueba(a, op, 1, nombreY));

  const r2 = pasoR2(a, f, 1, nombreY);
  r2.bloques.push(b.texto(`En regresión simple \\(R^2 = r^2\\): \\(${par(r, f)}^2 = ${fmtTex(r * r, f)}\\).`));
  pasos.push(r2);

  let prediccion: number | null = null;
  if (op.x0 && op.x0.length === 1) {
    const p = pasoPrediccion(beta, op.x0, f, true);
    prediccion = p.valor;
    pasos.push(p.paso);
  }

  return {
    ok: true,
    solucion: {
      pasos,
      resultado: {
        n,
        k: 1,
        beta,
        mediasX: [mx],
        XtX: [
          [n, sumX],
          [sumX, sumX2],
        ],
        Xty: [sumY, sumXY],
        inversa: null,
        varianzas: null,
        prediccion,
        simple: { sumX, sumY, sumX2, sumY2, sumXY, cov, sx, sy, r },
        ...a,
      },
    },
  };
}

/* ────────────────────────── regresión múltiple ────────────────────────── */

function textoOperacion(op: OperacionFila, f: Formato): { latex: string; texto: string } {
  const F = (i: number) => `F_{${i + 1}}`;
  const Ft = (i: number) => `F${subindice(i + 1)}`;
  switch (op.tipo) {
    case 'intercambio':
      return { latex: `${F(op.i)} \\leftrightarrow ${F(op.j)}`, texto: `${Ft(op.i)} ↔ ${Ft(op.j)}` };
    case 'escalar':
      return {
        latex: `${F(op.i)} \\leftarrow \\frac{${F(op.i)}}{${fmtTex(op.divisor, f)}}`,
        texto: `${Ft(op.i)} ← ${Ft(op.i)} / ${fmt(op.divisor, f)}`,
      };
    case 'eliminar': {
      const signo = op.factor < 0 ? '+' : '-';
      return {
        latex: `${F(op.i)} \\leftarrow ${F(op.i)} ${signo} ${fmtTex(Math.abs(op.factor), f)}\\,${F(op.j)}`,
        texto: `${Ft(op.i)} ← ${Ft(op.i)} ${signo === '-' ? '−' : '+'} ${fmt(Math.abs(op.factor), f)}·${Ft(op.j)}`,
      };
    }
  }
}

function bloquesGaussJordan(A: number[][], etapas: EtapaGaussJordan[], f: Formato): Bloque[] {
  const n = A.length;
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const bloques: Bloque[] = [
    b.texto('Se parte de la matriz aumentada \\([\\,\\mathbf{X}\'\\mathbf{X} \\mid I\\,]\\):'),
    b.formula(aumentada(A, I, f), 'Matriz aumentada [X\'X | I]'),
  ];
  for (const e of etapas) {
    const ops = e.operaciones.map((o) => textoOperacion(o, f));
    bloques.push(
      b.texto(`Columna ${e.columna + 1}: se deja un 1 en la posición (${e.columna + 1}, ${e.columna + 1}) y ceros en el resto de la columna.`),
    );
    if (ops.length) {
      bloques.push(
        b.formula(
          `\\begin{aligned} ${ops.map((o) => `&${o.latex}`).join(' \\\\ ')} \\end{aligned}`,
          ops.map((o) => o.texto).join('; '),
        ),
      );
    }
    bloques.push(b.formula(aumentada(e.izquierda, e.derecha, f), `Matriz después de la columna ${e.columna + 1}`));
  }
  return bloques;
}

function resolverMultiple(d: DatosRegresion, op: OpcionesRegresion): Respuesta<ResultadoRegresion> {
  const f = op.formato;
  const fSig: Formato = { ...f, decimales: Math.max(f.decimales, 6) };
  const { y, x } = d;
  const n = y.length;
  const k = x.length;
  const p = k + 1;
  const nombreY = d.nombreY || 'y';

  // Columnas de X con x₀ = 1
  const cols = [Array(n).fill(1) as number[], ...x];
  const XtX = cols.map((ci) => cols.map((cj) => sumar(ci.map((v, t) => v * cj[t]))));
  const Xty = cols.map((ci) => sumar(ci.map((v, t) => v * y[t])));
  const inv = inversaGaussJordan(XtX);
  if (inv.singular) {
    return {
      ok: false,
      error:
        'X\'X no tiene inversa: alguna variable regresora es constante o es combinación lineal de las otras (por ejemplo, una columna repetida). Revisa los datos.',
    };
  }
  const C = inv.inversa;
  const beta = productoVector(C, Xty);
  const yGorro = Array.from({ length: n }, (_, i) => beta[0] + x.reduce((s, col, j) => s + beta[j + 1] * col[i], 0));
  const a = calcularAnova(y, yGorro, k, op.alfa);
  const varianzas = C.map((fila, i) => fila[i] * a.CME);
  const mediasX = x.map((c) => sumar(c) / n);
  const compacto = k > K_COMPACTO;

  const pasos: Paso[] = [];

  pasos.push(
    paso({
      titulo: 'Modelo y datos',
      metodo: 'ecuaciones-normales-multiple',
      parte: 'planteamiento',
      porque:
        'Cuando y depende de varias variables, el modelo incluye un coeficiente βⱼ por cada una: βⱼ es el cambio promedio de y cuando xⱼ aumenta una unidad y las demás x se mantienen fijas.',
      bloques: bloqueModelo(d, false),
    }),
  );

  // Tabla de productos (mismo orden que la hoja de cálculo del taller)
  const columnas: { titulo: string; v: number[] }[] = [];
  x.forEach((c, j) => columnas.push({ titulo: xs(j + 1), v: c }));
  columnas.push({ titulo: 'y', v: y });
  for (let j = 0; j < k; j++) {
    columnas.push({ titulo: `${xs(j + 1)}²`, v: x[j].map((v) => v * v) });
    for (let l = j + 1; l < k; l++) columnas.push({ titulo: `${xs(j + 1)}·${xs(l + 1)}`, v: x[j].map((v, t) => v * x[l][t]) });
  }
  for (let j = 0; j < k; j++) columnas.push({ titulo: `${xs(j + 1)}·y`, v: x[j].map((v, t) => v * y[t]) });
  columnas.push({ titulo: 'y²', v: y.map((v) => v * v) });
  const tablaProductos: Bloque = {
    tipo: 'tabla',
    columnas: [{ titulo: 'i', alinear: 'centro' }, ...columnas.map((c) => ({ titulo: c.titulo }))],
    filas: y.map((_, i) => [String(i + 1), ...columnas.map((c) => fmt(c.v[i], f))]),
    pie: ['Σ', ...columnas.map((c) => fmt(sumar(c.v), f))],
  };

  pasos.push(
    paso({
      titulo: 'Tabla de productos y sumas',
      metodo: 'ecuaciones-normales-multiple',
      parte: 'planteamiento',
      porque:
        'Las ecuaciones normales usan las sumas de cada variable, de sus cuadrados, de los productos entre ellas y de sus productos con y. La tabla las reúne todas.',
      bloques: compacto
        ? [
            b.texto(
              `Con k = ${k} la tabla tiene ${columnas.length} columnas: cada x, y, los cuadrados, los productos entre cada par de x, los productos con y e y². Sus sumas (fila Σ) son las entradas de \\(\\mathbf{X}'\\mathbf{X}\\) y \\(\\mathbf{X}'\\mathbf{y}\\), que aparecen completas en el paso «Forma matricial».`,
            ),
            b.detalles(`Ver la tabla completa (${columnas.length} columnas)`, [tablaProductos]),
          ]
        : [tablaProductos],
    }),
  );

  // Ecuaciones normales
  const simbolo = (r: number, c: number): string => {
    if (r === 0 && c === 0) return 'n';
    if (r === 0) return `\\sum x_{${c}}`;
    if (c === 0) return `\\sum x_{${r}}`;
    if (r === c) return `\\sum x_{${r}}^2`;
    return `\\sum x_{${r}}x_{${c}}`;
  };
  const lineasGen: [string, string][] = XtX.map((_, r) => [
    Array.from({ length: p }, (_, c) => (r === 0 && c === 0 ? 'n\\hat\\beta_0' : `\\hat\\beta_{${c}}${simbolo(r, c)}`)).join(' + '),
    r === 0 ? '\\sum y' : `\\sum x_{${r}}y`,
  ]);
  const lineasNum: [string, string][] = XtX.map((fila, r) => [
    fila
      .map((v, c) => {
        const t = `${fmtTex(Math.abs(v), f)}\\,\\hat\\beta_{${c}}`;
        return c === 0 ? (v < 0 ? `-${t}` : t) : `${v < 0 ? '-' : '+'} ${t}`;
      })
      .join(' '),
    fmtTex(Xty[r], f),
  ]);
  // Respaldo en texto plano del sistema con números (RNF-03).
  const lineasNumTexto = XtX.map(
    (fila, r) =>
      fila.map((v, c) => `${c === 0 ? (v < 0 ? '−' : '') : v < 0 ? ' − ' : ' + '}${fmt(Math.abs(v), f)}·β̂${subindice(c)}`).join('') +
      ` = ${fmt(Xty[r], f)}`,
  ).join('; ');
  const sistemaCompleto = [
    b.formula(sistema(lineasGen), 'Sistema general de ecuaciones normales'),
    b.texto('Reemplazando las sumas de la tabla:'),
    b.formula(sistema(lineasNum), lineasNumTexto),
  ];
  pasos.push(
    paso({
      titulo: 'Ecuaciones normales',
      metodo: 'ecuaciones-normales-multiple',
      parte: 'parametros',
      porque:
        'Igual que en la regresión simple, se minimiza la suma de los errores al cuadrado. Al derivar respecto a cada uno de los k + 1 parámetros e igualar a cero se obtiene un sistema de k + 1 ecuaciones lineales.',
      bloques: compacto
        ? [
            b.texto(`Hay una ecuación por cada parámetro, \\(r = 0, 1, \\dots, ${k}\\), con \\(x_0 = 1\\):`),
            b.formula(
              `\\hat\\beta_0 \\sum x_r + \\hat\\beta_1 \\sum x_r x_1 + \\hat\\beta_2 \\sum x_r x_2 + \\dots + \\hat\\beta_{${k}} \\sum x_r x_{${k}} = \\sum x_r\\,y`,
              `β̂₀Σxᵣ + β̂₁Σxᵣx₁ + … + β̂${subindice(k)}Σxᵣx${subindice(k)} = Σxᵣy, r = 0…${k}`,
            ),
            b.detalles(`Ver las ${p} ecuaciones`, sistemaCompleto),
          ]
        : sistemaCompleto,
    }),
  );

  const filasX = Array.from({ length: n }, (_, i) => cols.map((c) => fmtTex(c[i], f)));
  pasos.push(
    paso({
      titulo: 'Forma matricial',
      metodo: 'forma-matricial',
      parte: 'parametros',
      porque:
        'El mismo sistema se escribe como (X\'X)β̂ = X\'y. X tiene una columna de unos (para β₀) y una columna por variable; cada entrada de X\'X es una de las sumas de la tabla, por eso A = X\'X coincide con los coeficientes de las ecuaciones normales.',
      bloques: [
        b.formula('\\mathbf{y} = \\mathbf{X}\\boldsymbol\\beta + \\boldsymbol\\varepsilon', 'y = Xβ + ε'),
        compacto
          ? b.detalles(`Ver la matriz X (${n} × ${p}) y el vector y`, [
              b.formula(`\\mathbf{X} = ${matriz(filasX)},\\qquad \\mathbf{y} = ${vectorNum(y, f)}`, 'Matriz X y vector y'),
            ])
          : b.formula(`\\mathbf{X} = ${matriz(filasX)},\\qquad \\mathbf{y} = ${vectorNum(y, f)}`, 'Matriz X y vector y'),
        b.formula(
          `A = \\mathbf{X}'\\mathbf{X} = ${matrizNum(XtX, f)},\\qquad g = \\mathbf{X}'\\mathbf{y} = ${vectorNum(Xty, f)}`,
          'A = X\'X y g = X\'y',
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Inversa de X\'X por Gauss-Jordan',
      metodo: 'forma-matricial',
      parte: 'parametros',
      porque:
        'Para despejar β̂ hay que multiplicar por (X\'X)⁻¹. Gauss-Jordan convierte [X\'X | I] en [I | (X\'X)⁻¹]: cada operación de fila que lleva X\'X a la identidad, aplicada a I, construye la inversa.',
      bloques: compacto
        ? [
            b.detalles(`Ver las operaciones de fila (${p} columnas)`, bloquesGaussJordan(XtX, inv.etapas, fSig)),
            b.detalles(`Ver la inversa completa C = (X'X)⁻¹ (${p} × ${p})`, [
              b.formula(`C = (\\mathbf{X}'\\mathbf{X})^{-1} = ${matrizNum(C, fSig)}`, '(X\'X)⁻¹'),
            ]),
            b.texto('De C se usa sobre todo su diagonal, \\(c_{00}, c_{11}, \\dots, c_{kk}\\), para la varianza de los estimadores:'),
            {
              tipo: 'tabla',
              columnas: [{ titulo: 'j', alinear: 'centro' }, { titulo: 'cⱼⱼ' }],
              filas: C.map((fila, j) => [String(j), fmt(fila[j], fSig)]),
            },
          ]
        : [
            b.detalles('Ver las operaciones de fila', bloquesGaussJordan(XtX, inv.etapas, fSig)),
            b.formula(`C = (\\mathbf{X}'\\mathbf{X})^{-1} = ${matrizNum(C, fSig)}`, '(X\'X)⁻¹'),
            b.texto('Los elementos de la diagonal, \\(c_{00}, c_{11}, \\dots, c_{kk}\\), se usan más adelante para la varianza de los estimadores.'),
          ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Estimadores β̂ = (X\'X)⁻¹X\'y',
      metodo: 'forma-matricial',
      parte: 'parametros',
      porque: 'Cada β̂ⱼ es la fila j de la inversa multiplicada por el vector g = X\'y.',
      bloques: compacto
        ? [
            b.formula(
              `\\hat{\\boldsymbol\\beta} = (\\mathbf{X}'\\mathbf{X})^{-1}\\mathbf{X}'\\mathbf{y} = C\\,g,\\qquad \\hat\\beta_j = \\sum_{l=0}^{${k}} c_{jl}\\,g_l`,
              'β̂ = (X\'X)⁻¹X\'y = C·g; β̂ⱼ = Σ cⱼₗ·gₗ',
            ),
            b.detalles('Ver el producto C · g completo', [
              b.formula(
                `${matrizNum(C, fSig)}${vectorNum(Xty, f)} = ${matriz(beta.map((v, j) => [`\\hat\\beta_{${j}} = ${fmtTex(v, fSig)}`]))}`,
                beta.map((v, j) => `β̂${subindice(j)} = ${fmt(v, fSig)}`).join('; '),
              ),
            ]),
            tablaCoeficientes(beta, fSig, d.nombresX, true),
            b.resultado(ecuacionTex(beta, fSig, false), ecuacionTexto(beta, fSig, false)),
          ]
        : [
            b.formula(
              `\\hat{\\boldsymbol\\beta} = (\\mathbf{X}'\\mathbf{X})^{-1}\\mathbf{X}'\\mathbf{y} = ${matrizNum(C, fSig)}${vectorNum(Xty, f)} = ${matriz(beta.map((v, j) => [`\\hat\\beta_{${j}} = ${fmtTex(v, fSig)}`]))}`,
              beta.map((v, j) => `β̂${subindice(j)} = ${fmt(v, fSig)}`).join('; '),
            ),
            b.resultado(ecuacionTex(beta, fSig, false), ecuacionTexto(beta, fSig, false)),
            b.texto(
              beta
                .slice(1)
                .map(
                  (bj, j) =>
                    `${xs(j + 1)}${d.nombresX?.[j] ? ` (${d.nombresX[j]})` : ''}: si aumenta una unidad y las demás se mantienen fijas, y ${bj >= 0 ? 'aumenta' : 'disminuye'} en promedio ${fmt(Math.abs(bj), fSig)}.`,
                )
                .join(' '),
            ),
          ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Valores ajustados y residuos',
      metodo: 'anova-multiple',
      parte: 'anova',
      porque: 'Con la ecuación ajustada se calcula ŷᵢ para cada observación. Las columnas al cuadrado dan las sumas SCT, SCR y SCE.',
      bloques: [tablaAjustados(y, a, f)],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Tabla ANOVA',
      metodo: 'anova-multiple',
      parte: 'anova',
      porque:
        'La variación total de y (SCT) se reparte entre lo que explica el modelo (SCR) y lo que queda sin explicar (SCE). Los grados de libertad son k para la regresión, n − (k + 1) para el error y n − 1 en total.',
      bloques: bloquesAnova(a, f, n, k),
    }),
  );

  pasos.push(pasoPrueba(a, op, k, nombreY));
  pasos.push(pasoR2(a, f, k, nombreY));

  pasos.push(
    paso({
      titulo: 'Varianza de los estimadores',
      metodo: 'varianza-estimadores',
      parte: 'varianzas',
      porque:
        'Los β̂ⱼ cambian de una muestra a otra: son variables aleatorias. Su varianza es cⱼⱼσ², con cⱼⱼ en la diagonal de (X\'X)⁻¹. Como σ² es desconocida, se estima con S² = CME.',
      bloques: [
        b.formula(
          `\\sigma^2(\\hat\\beta_j) = c_{jj}\\,\\sigma^2 \\approx c_{jj}\\,S^2,\\qquad S^2 = CME = \\frac{SCE}{n-k-1} = ${frac(fmtTex(a.SCE, f), a.glE)} = ${fmtTex(a.CME, f)}`,
          `σ²(β̂ⱼ) = cⱼⱼ·S², S² = ${fmt(a.CME, f)}`,
        ),
        {
          tipo: 'tabla',
          columnas: [
            { titulo: 'Estimador', alinear: 'izq' },
            { titulo: 'Valor' },
            { titulo: 'cⱼⱼ' },
            { titulo: 'σ̂²(β̂ⱼ) = cⱼⱼS²' },
            { titulo: 'σ̂(β̂ⱼ)' },
          ],
          filas: beta.map((bj, j) => [
            `β̂${subindice(j)}`,
            fmt(bj, fSig),
            fmt(C[j][j], fSig),
            fmt(varianzas[j], fSig),
            fmt(Math.sqrt(varianzas[j]), fSig),
          ]),
        },
      ],
    }),
  );

  let prediccion: number | null = null;
  if (op.x0 && op.x0.length === k) {
    const pr = pasoPrediccion(beta, op.x0, fSig, false);
    prediccion = pr.valor;
    pasos.push(pr.paso);
  }

  return {
    ok: true,
    solucion: {
      pasos,
      resultado: { n, k, beta, mediasX, XtX, Xty, inversa: C, varianzas, prediccion, simple: null, ...a },
    },
  };
}
