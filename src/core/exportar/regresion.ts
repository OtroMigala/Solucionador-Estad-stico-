/**
 * Libro de Excel con el ejercicio de regresión resuelto. Hojas, en el orden
 * del procedimiento:
 *
 *   Datos · Tabla de sumas (con fórmulas) · Matrices · Resumen · Respuestas
 *
 * «Resumen» reproduce la salida de la herramienta de regresión de Excel
 * (estadísticas, ANOVA, coeficientes con error típico, t, probabilidad e
 * intervalos del 95 %) seguida de la prueba de hipótesis, R² y la predicción.
 */
import { fmt, subindice } from '../formato';
import { inversaGaussJordan } from '../linalg';
import { colaSuperiorF, dosColasT, tCritico } from '../distribuciones';
import {
  type DatosRegresion,
  type OpcionesRegresion,
  type ResultadoRegresion,
  decisionF,
  ecuacionTexto,
  interpretacionR2,
  interpretarPearson,
} from '../regresion';
import { type Literal, formatoCoeficientes, letra, tituloLiteral } from '../regresion/literales';
import { type Celda, type Hoja, type ValorCelda, ref } from './xlsx';

export interface EjercicioResuelto {
  datos: DatosRegresion;
  resultado: ResultadoRegresion;
  op: OpcionesRegresion;
  literales: Literal[];
  /** Nombre del ejercicio o del archivo de origen. */
  titulo: string;
  enunciado?: string;
}

/** Lo que la herramienta de regresión de Excel agrega a la solución del curso. */
export interface EstadisticasExcel {
  rMultiple: number;
  r2Ajustado: number;
  errorTipico: number;
  valorPF: number;
  coeficientes: { valor: number; errorTipico: number; t: number; p: number; inferior: number; superior: number }[];
}

export function estadisticasExcel(r: ResultadoRegresion, confianza = 0.95): EstadisticasExcel {
  const C = r.inversa ?? (inversaGaussJordan(r.XtX) as { inversa: number[][] }).inversa;
  const tc = tCritico(1 - confianza, r.glE);
  return {
    rMultiple: Math.sqrt(r.R2),
    r2Ajustado: 1 - ((1 - r.R2) * (r.n - 1)) / r.glE,
    errorTipico: Math.sqrt(r.CME),
    valorPF: colaSuperiorF(r.F, r.glR, r.glE),
    coeficientes: r.beta.map((b, j) => {
      const e = Math.sqrt(C[j][j] * r.CME);
      const t = b / e;
      return { valor: b, errorTipico: e, t, p: dosColasT(t, r.glE), inferior: b - tc * e, superior: b + tc * e };
    }),
  };
}

const c = (v: Celda['v'], e?: Celda['e'], f?: string): Celda => ({ v, e, f });
const titulo = (s: string) => c(s, 'titulo');
const negrita = (s: string) => c(s, 'negrita');
const nota = (s: string) => c(s, 'nota');
const encabezados = (...t: string[]) => t.map((s) => c(s, 'encabezado'));

export function libroRegresion(e: EjercicioResuelto): { hojas: Hoja[]; activa: number } {
  const { datos, resultado: r, op } = e;
  const { y, x } = datos;
  const n = y.length;
  const k = x.length;
  const simbolo = (j: number) => (k === 1 ? 'x' : `x${j + 1}`);
  const conNombre = (j: number) => {
    const nom = datos.nombresX?.[j]?.trim();
    return nom ? `${simbolo(j)} (${nom})` : simbolo(j);
  };
  const nombreY = datos.nombreY?.trim() || 'y';
  const fc = formatoCoeficientes(op.formato, k);
  const est = estadisticasExcel(r);

  /* ───── Datos ───── */
  const hayNombres = Boolean(datos.nombreY?.trim() || datos.nombresX?.some((s) => s?.trim()));
  const hojaDatos: Hoja = {
    nombre: 'Datos',
    anchos: [13, ...x.map(() => 14), 14],
    filas: [
      [titulo('Datos del ejercicio')],
      [nota(e.titulo)],
      [],
      encabezados('Observación', ...x.map((_, j) => simbolo(j)), 'y'),
      ...(hayNombres ? [[nota(''), ...x.map((_, j) => nota(datos.nombresX?.[j]?.trim() ?? '')), nota(datos.nombreY?.trim() ?? '')]] : []),
      ...y.map((yi, i) => [i + 1, ...x.map((col) => col[i]), yi]),
    ],
  };

  /* ───── Tabla de sumas: mismo orden de columnas que la hoja del taller, con fórmulas ───── */
  const inicio = 4; // fila (desde 0) de la primera observación
  const fin = inicio + n - 1;
  const colX = (j: number) => 1 + j;
  const colY = 1 + k;
  type Columna = { titulo: string; valor: (i: number) => number; formula: (fila: number) => string | undefined };
  const base: Columna[] = [
    ...x.map((col, j) => ({ titulo: simbolo(j), valor: (i: number) => col[i], formula: () => undefined })),
    { titulo: 'y', valor: (i: number) => y[i], formula: () => undefined },
  ];
  const producto = (a: number, bcol: number, titulo: string, va: number[], vb: number[]): Columna => ({
    titulo,
    valor: (i) => va[i] * vb[i],
    formula: (fila) => `${ref(fila, a)}*${ref(fila, bcol)}`,
  });
  const productos: Columna[] = [];
  for (let j = 0; j < k; j++) {
    productos.push(producto(colX(j), colX(j), `${simbolo(j)}²`, x[j], x[j]));
    for (let l = j + 1; l < k; l++) productos.push(producto(colX(j), colX(l), `${simbolo(j)}·${simbolo(l)}`, x[j], x[l]));
  }
  for (let j = 0; j < k; j++) productos.push(producto(colX(j), colY, `${simbolo(j)}·y`, x[j], y));
  productos.push(producto(colY, colY, 'y²', y, y));
  const columnas = [...base, ...productos];
  const hojaSumas: Hoja = {
    nombre: 'Tabla de sumas',
    anchos: [8, ...columnas.map(() => 13)],
    filas: [
      [titulo('Tabla de productos y sumas')],
      [nota('Cada columna de productos es una fórmula sobre los datos; la fila Σ son las sumas que forman X\'X y X\'y.')],
      [],
      encabezados('i', ...columnas.map((col) => col.titulo)),
      ...y.map((_, i) => [i + 1, ...columnas.map((col) => c(col.valor(i), undefined, col.formula(inicio + i)))]),
      [
        c('Σ', 'encabezado'),
        ...columnas.map((col, j) => {
          let s = 0;
          for (let i = 0; i < n; i++) s += col.valor(i);
          return c(s, 'encabezado', `SUM(${ref(inicio, j + 1)}:${ref(fin, j + 1)})`);
        }),
      ],
    ],
  };

  /* ───── Matrices ───── */
  const etiquetasX = ['1', ...x.map((_, j) => simbolo(j))];
  const matriz = (M: number[][]): ValorCelda[][] => [
    encabezados('', ...etiquetasX),
    ...M.map((fila, i) => [c(etiquetasX[i], 'negrita'), ...fila]),
  ];
  const C = r.inversa ?? (inversaGaussJordan(r.XtX) as { inversa: number[][] }).inversa;
  const hojaMatrices: Hoja = {
    nombre: 'Matrices',
    anchos: [16, ...etiquetasX.map(() => 15)],
    filas: [
      [titulo('Método matricial: β̂ = (X\'X)⁻¹ X\'y')],
      [],
      [negrita('A = X\'X')],
      ...matriz(r.XtX),
      [],
      [negrita('g = X\'y')],
      ...etiquetasX.map((et, i) => [c(et, 'negrita'), r.Xty[i]]),
      [],
      [negrita('C = (X\'X)⁻¹')],
      ...matriz(C),
      [],
      [negrita('β̂ = C · g')],
      encabezados('Estimador', 'Variable', 'Valor'),
      ...r.beta.map((b, j) => [`β${subindice(j)}`, j === 0 ? 'intercepto' : conNombre(j - 1), c(b, 'resaltado')]),
    ],
  };

  /* ───── Resumen (formato de la herramienta de regresión de Excel) ───── */
  const alfaTxt = fmt(op.alfa, { ...op.formato, decimales: 6 });
  const h0 = k === 1 ? 'H0: β1 = 0     H1: β1 ≠ 0' : `H0: β1 = β2 = … = β${k} = 0     H1: al menos un βj ≠ 0`;
  const resumen: ValorCelda[][] = [
    [titulo('Resumen')],
    [nota(e.titulo)],
    [],
    [negrita('Estadísticas de la regresión')],
    ['Coeficiente de correlación múltiple', est.rMultiple],
    ['Coeficiente de determinación R^2', r.R2],
    ['R^2 ajustado', est.r2Ajustado],
    ['Error típico', est.errorTipico],
    ['Observaciones', n],
    [],
    [negrita('ANÁLISIS DE VARIANZA')],
    encabezados('', 'Grados de libertad', 'Suma de cuadrados', 'Promedio de los cuadrados', 'F', 'Valor p'),
    ['Regresión', r.glR, r.SCR, r.CMR, r.F, est.valorPF],
    ['Residuos', r.glE, r.SCE, r.CME],
    ['Total', r.glT, r.SCT],
    [nota('En la salida de Excel, el valor p aparece con el nombre «Valor crítico de F».')],
    [],
    encabezados('', 'Coeficientes', 'Error típico', 'Estadístico t', 'Probabilidad', 'Inferior 95%', 'Superior 95%'),
    ...est.coeficientes.map((co, j) => [j === 0 ? 'Intercepción' : conNombre(j - 1), co.valor, co.errorTipico, co.t, co.p, co.inferior, co.superior]),
    [],
    [negrita('Prueba de hipótesis')],
    [h0],
    ['α', op.alfa],
    ['F calculado', r.F],
    [k === 1 ? 'F tabla F(α; 1, n−2)' : 'F tabla F(α; k, n−k−1)', r.Fcritico],
    ['Decisión', c(r.rechazaH0 ? 'Se rechaza H0' : 'No se rechaza H0', 'resaltado')],
    [nota(decisionF(r, op.alfa, op.formato, k, nombreY))],
    [],
    [negrita('Coeficiente de determinación')],
    ['R^2 = SCR/SCT', c(r.R2, 'resaltadoPorcentaje')],
  ];
  if (r.prediccion !== null && op.x0) {
    resumen.push([], [negrita('Predicción')], ...op.x0.map((v, j) => [conNombre(j), v]), ['ŷ', c(r.prediccion, 'resaltado')]);
  }
  const hojaResumen: Hoja = { nombre: 'Resumen', anchos: [36, 18, 18, 26, 14, 14, 14], filas: resumen };

  /* ───── Respuestas, por literal ───── */
  const respuestas: ValorCelda[][] = [[titulo('Respuestas')], [nota(e.titulo)]];
  if (e.enunciado) respuestas.push([e.enunciado]);
  e.literales.forEach((lit, i) => {
    respuestas.push([], [negrita(`${letra(i)} ${tituloLiteral(lit, k)}`)]);
    switch (lit) {
      case 'correlacion': {
        const s = r.simple!;
        respuestas.push(['Cov(x, y)', s.cov], ['r', c(s.r, 'resaltado')], [nota(interpretarPearson(s.r))]);
        break;
      }
      case 'parametros':
        respuestas.push(
          encabezados('Estimador', 'Variable', 'Valor'),
          ...r.beta.map((b, j) => [`β̂${subindice(j)}`, j === 0 ? 'intercepto' : conNombre(j - 1), b]),
          ['Ecuación ajustada', c(ecuacionTexto(r.beta, fc, k === 1), 'resaltado')],
        );
        break;
      case 'anova':
        respuestas.push(
          encabezados('Fuente de variación', 'Suma de cuadrados', 'Grados de libertad', 'Cuadrado medio', 'F calculado'),
          ['Regresión', r.SCR, r.glR, r.CMR, r.F],
          ['Error', r.SCE, r.glE, r.CME],
          ['Total', r.SCT, r.glT],
        );
        break;
      case 'prueba':
        respuestas.push(
          [h0],
          [`α = ${alfaTxt}`],
          ['F calculado', r.F],
          ['F de tabla', r.Fcritico],
          ['Decisión', c(r.rechazaH0 ? 'Se rechaza H0' : 'No se rechaza H0', 'resaltado')],
          [nota(decisionF(r, op.alfa, op.formato, k, nombreY))],
        );
        break;
      case 'r2':
        respuestas.push(['R²', c(r.R2, 'resaltadoPorcentaje')], [nota(interpretacionR2(r.R2, op.formato, k, nombreY))]);
        break;
      case 'varianzas':
        respuestas.push(
          encabezados('Estimador', 'cⱼⱼ', 'σ̂²(β̂ⱼ) = cⱼⱼS²', 'σ̂(β̂ⱼ)'),
          ...(r.varianzas ?? []).map((v, j) => [`β̂${subindice(j)}`, C[j][j], v, Math.sqrt(v)]),
        );
        break;
      case 'prediccion':
        if (r.prediccion === null || !op.x0) respuestas.push([nota('No se dieron los valores de las x para predecir.')]);
        else respuestas.push(...op.x0.map((v, j) => [conNombre(j), v]), ['ŷ₀', c(r.prediccion, 'resaltado')]);
        break;
    }
  });
  const hojaRespuestas: Hoja = { nombre: 'Respuestas', anchos: [30, 20, 20, 18, 16], filas: respuestas };

  return { hojas: [hojaDatos, hojaSumas, hojaMatrices, hojaResumen, hojaRespuestas], activa: 3 };
}
