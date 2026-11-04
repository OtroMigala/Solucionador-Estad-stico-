/**
 * Organización de la solución de regresión por literales del taller
 * (a, b, c…): cada literal reúne sus pasos y termina con la respuesta que se
 * escribiría en el taller.
 */
import { type Formato, fmt, fmtPct, fmtPctTex, fmtTex, subindice } from '../formato';
import { b, type Bloque, type Paso } from '../steps';
import {
  type OpcionesRegresion,
  type ResultadoRegresion,
  decisionF,
  ecuacionTex,
  ecuacionTexto,
  hipotesisF,
  interpretacionR2,
  interpretarPearson,
  tablaAnova,
} from '.';

export type Literal = 'correlacion' | 'parametros' | 'anova' | 'prueba' | 'r2' | 'varianzas' | 'prediccion';
export type Parte = 'planteamiento' | Literal;

export interface InfoLiteral {
  id: Literal;
  titulo: string;
  /** Lo que pide el literal, como aparece en los enunciados. */
  pregunta: string;
  /** Literales cuyos pasos se necesitan antes; si no se pidieron, se resuelven dentro de este. */
  requiere: Literal[];
  soloSimple?: boolean;
  soloMultiple?: boolean;
}

export const LITERALES: InfoLiteral[] = [
  {
    id: 'correlacion',
    titulo: 'Covarianza y correlación de Pearson',
    pregunta: 'Calcule la covarianza y el coeficiente de correlación e interprételos.',
    requiere: [],
    soloSimple: true,
  },
  {
    id: 'parametros',
    titulo: 'Estimación de los parámetros',
    pregunta: 'Estime los parámetros del modelo.',
    requiere: [],
  },
  { id: 'anova', titulo: 'Tabla ANOVA', pregunta: 'Construya la tabla de análisis de varianza.', requiere: ['parametros'] },
  { id: 'prueba', titulo: 'Prueba de hipótesis', pregunta: 'Pruebe si el modelo es significativo.', requiere: ['anova'] },
  {
    id: 'r2',
    titulo: 'Coeficiente de determinación R²',
    pregunta: 'Calcule e interprete el coeficiente de determinación.',
    requiere: ['anova'],
  },
  {
    id: 'varianzas',
    titulo: 'Varianza de los estimadores',
    pregunta: 'Calcule la varianza de cada estimador.',
    requiere: ['parametros', 'anova'],
    soloMultiple: true,
  },
  { id: 'prediccion', titulo: 'Predicción', pregunta: 'Prediga y para los valores dados de las x.', requiere: ['parametros'] },
];

export const infoLiteral = (id: Literal): InfoLiteral => LITERALES.find((l) => l.id === id)!;

/** Literales que tienen sentido con k variables regresoras. */
export function literalesDisponibles(k: number): InfoLiteral[] {
  return LITERALES.filter((l) => !(l.soloSimple && k !== 1) && !(l.soloMultiple && k === 1));
}

/** Lo que piden normalmente los ejercicios del taller. */
export function literalesPorDefecto(k: number): Literal[] {
  return k === 1 ? ['correlacion', 'parametros', 'anova', 'prueba', 'r2', 'prediccion'] : ['parametros', 'anova', 'prueba', 'r2', 'prediccion'];
}

export const letra = (i: number) => `${String.fromCharCode(97 + i)})`;

/** Título del literal; en regresión múltiple los parámetros se estiman por el método matricial. */
export function tituloLiteral(id: Literal, k: number): string {
  if (id === 'parametros') return k > 1 ? 'Estimación de los parámetros por el método matricial' : 'Estimación de los parámetros: recta de mínimos cuadrados';
  return infoLiteral(id).titulo;
}

export interface Seccion {
  parte: Parte;
  /** «a)», «b)»…; null para el planteamiento. */
  letra: string | null;
  titulo: string;
  pasos: Paso[];
  /** Partes cuyos pasos quedaron en esta sección (la propia y las que se necesitaban). */
  contiene: Parte[];
  /** Si los pasos de este literal ya se mostraron en un literal anterior, la letra de ese literal. */
  resueltoEn: string | null;
}

/**
 * Agrupa los pasos en el planteamiento y un literal por cada elemento de
 * `seleccion`, en ese orden. Si un literal necesita pasos de otro que no se
 * pidió (por ejemplo, la prueba F sin la tabla ANOVA), esos pasos se muestran
 * dentro de él.
 */
export function organizarSolucion(pasos: Paso[], seleccion: Literal[], k = 2): Seccion[] {
  const porParte = new Map<string, Paso[]>();
  for (const p of pasos) {
    const clave = p.parte ?? 'planteamiento';
    porParte.set(clave, [...(porParte.get(clave) ?? []), p]);
  }
  const secciones: Seccion[] = [
    {
      parte: 'planteamiento',
      letra: null,
      titulo: 'Planteamiento: modelo y tabla de sumas',
      pasos: porParte.get('planteamiento') ?? [],
      contiene: ['planteamiento'],
      resueltoEn: null,
    },
  ];
  const dondeSeResolvio = new Map<Literal, string>();
  seleccion.forEach((lit, i) => {
    const l = letra(i);
    const propios: Paso[] = [];
    const contiene: Parte[] = [];
    const agregar = (x: Literal) => {
      if (dondeSeResolvio.has(x)) return;
      infoLiteral(x).requiere.forEach(agregar);
      dondeSeResolvio.set(x, l);
      contiene.push(x);
      propios.push(...(porParte.get(x) ?? []));
    };
    const previo = dondeSeResolvio.get(lit) ?? null;
    agregar(lit);
    secciones.push({ parte: lit, letra: l, titulo: tituloLiteral(lit, k), pasos: propios, contiene, resueltoEn: previo });
  });
  return secciones;
}

/** Formato de los coeficientes: en regresión múltiple se muestran al menos 6 decimales. */
export const formatoCoeficientes = (f: Formato, k: number): Formato => (k > 1 ? { ...f, decimales: Math.max(f.decimales, 6) } : f);

const nombreX = (j: number, k: number) => (k === 1 ? 'x' : `x${subindice(j + 1)}`);

/** Respuesta final de un literal, lista para copiar en el taller. */
export function respuestaLiteral(lit: Literal, r: ResultadoRegresion, op: OpcionesRegresion, nombreY = 'y'): Bloque[] {
  const f = op.formato;
  const fc = formatoCoeficientes(f, r.k);
  const simple = r.k === 1;
  switch (lit) {
    case 'correlacion': {
      const s = r.simple!;
      return [
        b.resultado(
          `\\operatorname{Cov}(x,y) = ${fmtTex(s.cov, f)},\\qquad r = ${fmtTex(s.r, f)}`,
          `Cov(x,y) = ${fmt(s.cov, f)}; r = ${fmt(s.r, f)}`,
        ),
        b.conclusion(interpretarPearson(s.r)),
      ];
    }
    case 'parametros':
      return [
        b.formula(
          r.beta.map((v, j) => `\\hat\\beta_{${j}} = ${fmtTex(v, fc)}`).join(',\\quad '),
          r.beta.map((v, j) => `β̂${subindice(j)} = ${fmt(v, fc)}`).join('; '),
        ),
        b.resultado(ecuacionTex(r.beta, fc, simple), ecuacionTexto(r.beta, fc, simple)),
      ];
    case 'anova':
      return [tablaAnova(r, f, r.n, r.k)];
    case 'prueba': {
      const h = hipotesisF(r.k);
      const alfaTex = fmtTex(op.alfa, { ...f, decimales: 6 });
      return [
        b.formula(h.latex, h.texto),
        b.formula(
          `F_c = ${fmtTex(r.F, f)} ${r.rechazaH0 ? '>' : '\\leq'} F_{${alfaTex};\\,${r.glR};\\,${r.glE}} = ${fmtTex(r.Fcritico, f)}`,
          `Fc = ${fmt(r.F, f)} ${r.rechazaH0 ? '>' : '≤'} F = ${fmt(r.Fcritico, f)}`,
        ),
        b.conclusion(decisionF(r, op.alfa, f, r.k, nombreY), r.rechazaH0 ? 'afirmativo' : 'negativo'),
      ];
    }
    case 'r2':
      return [
        b.resultado(`R^2 = ${fmtTex(r.R2, f)} \\;\\Rightarrow\\; ${fmtPctTex(r.R2, f)}`, `R² = ${fmt(r.R2, f)} (${fmtPct(r.R2, f)})`),
        b.conclusion(interpretacionR2(r.R2, f, r.k, nombreY)),
      ];
    case 'varianzas':
      return [
        {
          tipo: 'tabla',
          columnas: [{ titulo: 'Estimador', alinear: 'izq' }, { titulo: 'σ̂²(β̂ⱼ) = cⱼⱼS²' }, { titulo: 'σ̂(β̂ⱼ)' }],
          filas: (r.varianzas ?? []).map((v, j) => [`β̂${subindice(j)}`, fmt(v, fc), fmt(Math.sqrt(v), fc)]),
        },
      ];
    case 'prediccion': {
      if (r.prediccion === null || !op.x0) return [b.aviso('No se dieron los valores de las x para predecir.')];
      const valores = op.x0.map((v, j) => `${nombreX(j, r.k)} = ${fmt(v, f)}`).join(', ');
      return [b.resultado(`\\hat{y}_0 = ${fmtTex(r.prediccion, fc)}`, `ŷ₀ = ${fmt(r.prediccion, fc)}`), b.texto(`Con ${valores}.`)];
    }
  }
}
