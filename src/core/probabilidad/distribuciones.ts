/**
 * Distribuciones discretas de probabilidad (presentación «Distribuciones
 * discretas de probabilidad»): binomial, hipergeométrica, Poisson y
 * multinomial, con probabilidades puntuales y acumuladas, media, varianza e
 * intervalo μ ± 2σ por el teorema de Tchebycheff.
 *
 * Binomial, hipergeométrica y multinomial se calculan con fracciones exactas
 * (con π racional el resultado es exacto, como el 27/64 de la diap. 6);
 * Poisson, con decimales, porque e^{−λ} no es racional.
 */
import { type Formato, fmt, fmtTex, par } from '../formato';
import { Racional, probTex, probTexto } from '../racional';
import { combinaciones, enteroTex, enteroTexto, factorial } from '../combinatoria';
import { b, paso, type Bloque, type Paso, type Respuesta } from '../steps';

export type TipoConsulta = 'igual' | 'a-lo-sumo' | 'menos-de' | 'al-menos' | 'mas-de' | 'entre';

export interface Consulta {
  /** Letra del literal («a», «b»…), si el enunciado la trae. */
  etiqueta?: string;
  tipo: TipoConsulta;
  a: number;
  /** Límite superior, solo en «entre». */
  b?: number;
}

export interface Opciones {
  consultas: Consulta[];
  /** Media y varianza de la distribución. */
  momentos: boolean;
  /** Interpretar el intervalo μ ± 2σ con el teorema de Tchebycheff. */
  tchebycheff: boolean;
  /** Tabla completa de la función de probabilidad f(x). */
  tabla: boolean;
}

/** Probabilidad: exacta cuando se puede, siempre con su valor decimal. */
export interface Prob {
  exacto: Racional | null;
  valor: number;
}

export interface ValorSalida {
  etiqueta: string;
  prob: Prob;
}

export interface SalidaDistribucion {
  valores: ValorSalida[];
}

const exacta = (r: Racional): Prob => ({ exacto: r, valor: r.aNumero() });
const aprox = (v: number): Prob => ({ exacto: null, valor: v });
const sumar = (a: Prob, c: Prob): Prob =>
  a.exacto && c.exacto ? exacta(a.exacto.mas(c.exacto)) : aprox(a.valor + c.valor);
const complemento = (p: Prob): Prob => (p.exacto ? exacta(p.exacto.complemento()) : aprox(1 - p.valor));

/**
 * Decimales suficientes para que una probabilidad menor que 1 no se muestre
 * como «1» al redondear (P(X ≥ 3) con λ = 24 es 0,99999998…, no 1).
 */
function decimalesPara(v: number, f: Formato): Formato {
  let d = f.decimales;
  while (d < 15 && v > 0 && v < 1 && Math.round(v * 10 ** d) >= 10 ** d) d++;
  return { ...f, decimales: d };
}

/** Probabilidad en LaTeX sin el signo inicial: «\frac{27}{64} \approx 0{,}4219», «\approx 0{,}0282», «0{,}1042». */
export function probTexP(p: Prob, f: Formato): string {
  const fd = decimalesPara(p.valor, f);
  const redondeo = fd.decimales > f.decimales;
  if (p.exacto) {
    if (p.exacto.esEntero()) return probTex(p.exacto, f);
    const base = probTex(p.exacto, fd);
    return redondeo && !base.includes('\\approx') ? base.replace(/ = ([^=]+)$/, ' \\approx $1') : base;
  }
  return `${redondeo ? '\\approx ' : ''}${fmtTex(p.valor, fd)}`;
}

export function probTextoP(p: Prob, f: Formato): string {
  const fd = decimalesPara(p.valor, f);
  const redondeo = fd.decimales > f.decimales;
  if (p.exacto) {
    if (p.exacto.esEntero()) return probTexto(p.exacto, f);
    const base = probTexto(p.exacto, fd);
    return redondeo && !base.includes('≈') ? base.replace(/ = ([^=]+)$/, ' ≈ $1') : base;
  }
  return `${redondeo ? '≈ ' : ''}${fmt(p.valor, fd)}`;
}

/** « = valor» o « \approx valor» (sin repetir el signo cuando el valor ya empieza por ≈). */
const igual = (p: Prob, f: Formato) => {
  const t = probTexP(p, f);
  return t.startsWith('\\approx') ? ` ${t}` : ` = ${t}`;
};
const igualTxt = (p: Prob, f: Formato) => {
  const t = probTextoP(p, f);
  return t.startsWith('≈') ? ` ${t}` : ` = ${t}`;
};
/** Solo el número (sin la fracción), para sumas largas. */
const numTex = (p: Prob, f: Formato) => fmtTex(p.valor, { ...f, decimales: Math.max(f.decimales, 4) });

/** Una distribución con soporte entero [min, max] (max = null: infinito). */
interface Modelo {
  min: number;
  max: number | null;
  metodo: string;
  /** «b(x; 10, 0{,}3)» en LaTeX para un x dado (o la letra x). */
  simbolo: (x: string) => string;
  simboloTexto: (x: string) => string;
  f: (x: number) => Prob;
  /** Sustitución de la fórmula para un x: «\binom{10}{3}0{,}3^3(1-0{,}3)^{7}». */
  sustitucion: (x: number) => string;
  /** Fórmula general con los parámetros: «b(x; n, π) = \binom{n}{x}π^x(1-π)^{n-x}». */
  general: string;
}

/* ───────────── consultas: P(X = a), P(X ≤ a), P(X ≥ a)… ───────────── */

const OPERADOR: Record<TipoConsulta, string> = {
  igual: '=',
  'a-lo-sumo': '\\leq',
  'menos-de': '<',
  'al-menos': '\\geq',
  'mas-de': '>',
  entre: '',
};
const OPERADOR_TXT: Record<TipoConsulta, string> = { igual: '=', 'a-lo-sumo': '≤', 'menos-de': '<', 'al-menos': '≥', 'mas-de': '>', entre: '' };
const LECTURA: Record<TipoConsulta, string> = {
  igual: 'exactamente',
  'a-lo-sumo': 'a lo sumo',
  'menos-de': 'menos de',
  'al-menos': 'al menos',
  'mas-de': 'más de',
  entre: 'entre',
};

export function etiquetaConsulta(c: Consulta): string {
  return c.tipo === 'entre' ? `P(${c.a} ≤ X ≤ ${c.b})` : `P(X ${OPERADOR_TXT[c.tipo]} ${c.a})`;
}
const consultaTex = (c: Consulta) => (c.tipo === 'entre' ? `P(${c.a} \\leq X \\leq ${c.b})` : `P(X ${OPERADOR[c.tipo]} ${c.a})`);

/** Valores de x que suma la consulta, directamente: [desde, hasta] (hasta = null: infinito). */
function rangoDirecto(c: Consulta): [number, number | null] {
  switch (c.tipo) {
    case 'igual':
      return [c.a, c.a];
    case 'a-lo-sumo':
      return [-Infinity, c.a];
    case 'menos-de':
      return [-Infinity, c.a - 1];
    case 'al-menos':
      return [c.a, null];
    case 'mas-de':
      return [c.a + 1, null];
    case 'entre':
      return [c.a, c.b ?? c.a];
  }
}

const MAX_TERMINOS = 2000;

function resolverConsulta(m: Modelo, c: Consulta, f: Formato): { paso: Paso; prob: Prob } {
  const [d0, d1] = rangoDirecto(c);
  const desde = Math.max(d0, m.min);
  const hasta = d1 === null ? m.max : m.max === null ? d1 : Math.min(d1, m.max);
  // Por complemento si el rango directo es infinito o tiene más términos que su complemento (siempre con desde = mín).
  const directos = hasta === null ? Infinity : Math.max(0, hasta - desde + 1);
  const usaComplemento = hasta === null || (desde > m.min && hasta === m.max && desde - m.min < directos);
  const terminosDe = (a: number, z: number) => (z < a ? [] : Array.from({ length: z - a + 1 }, (_, i) => a + i));
  const xs = usaComplemento ? terminosDe(m.min, desde - 1) : terminosDe(desde, hasta as number);
  if (xs.length > MAX_TERMINOS) throw new Error(`La consulta suma ${xs.length} términos; el máximo es ${MAX_TERMINOS}.`);
  const terminos = xs.map((x) => ({ x, p: m.f(x) }));
  const suma = terminos.reduce<Prob>((s, t) => sumar(s, t.p), exacta(Racional.entero(0)));
  const prob = usaComplemento ? complemento(suma) : suma;

  const titulo = `${c.etiqueta ? `${c.etiqueta}) ` : ''}${etiquetaConsulta(c)}`;
  const bloques: Bloque[] = [];
  const lectura =
    c.tipo === 'entre' ? `«entre ${c.a} y ${c.b}» significa ${c.a} ≤ X ≤ ${c.b}` : `«${LECTURA[c.tipo]} ${c.a}» significa X ${OPERADOR_TXT[c.tipo]} ${c.a}`;
  bloques.push(b.texto(`${lectura.charAt(0).toUpperCase()}${lectura.slice(1)}.`));

  const sumaTex = (lista: number[]) =>
    lista.length === 0 ? '0' : lista.length <= 6 ? lista.map((x) => m.simbolo(String(x))).join(' + ') : `\\sum_{x=${lista[0]}}^{${lista[lista.length - 1]}} ${m.simbolo('x')}`;
  if (usaComplemento) {
    const tope = desde - 1;
    bloques.push(
      b.formula(
        `${consultaTex(c)} = 1 - P(X \\leq ${tope}) = 1 - \\left[${sumaTex(xs)}\\right]`,
        `${etiquetaConsulta(c)} = 1 − P(X ≤ ${tope})`,
      ),
      b.texto(
        m.max === null
          ? 'X puede tomar infinitos valores (0, 1, 2, …), así que se calcula por el complemento: se restan de 1 los valores que no cumplen.'
          : 'Se calcula por el complemento porque hay menos valores que no cumplen la condición que valores que sí.',
      ),
    );
  } else if (xs.length > 1) {
    bloques.push(b.formula(`${consultaTex(c)} = ${sumaTex(xs)}`, `${etiquetaConsulta(c)} = suma de f(x) para x = ${xs[0]}…${xs[xs.length - 1]}`));
  }

  // Cada término: la fórmula con los valores reemplazados
  const formulaTermino = (t: { x: number; p: Prob }) =>
    b.formula(`${m.simbolo(String(t.x))} = ${m.sustitucion(t.x)}${igual(t.p, f)}`, `${m.simboloTexto(String(t.x))}${igualTxt(t.p, f)}`);
  if (terminos.length <= 4) bloques.push(...terminos.map(formulaTermino));
  else {
    bloques.push({
      tipo: 'tabla',
      columnas: [{ titulo: 'x', alinear: 'centro' }, { titulo: 'f(x)' }],
      filas: terminos.map((t) => [String(t.x), { latex: probTexP(t.p, f), texto: probTextoP(t.p, f) }]),
      pie: ['Σ', { latex: probTexP(suma, f), texto: probTextoP(suma, f) }],
    });
    bloques.push(b.detalles('Ver la fórmula de cada término', terminos.map(formulaTermino)));
  }
  if (terminos.length > 1) {
    bloques.push(
      b.formula(
        `${usaComplemento ? `P(X \\leq ${desde - 1})` : consultaTex(c)}${terminos.length <= 6 ? ` = ${terminos.map((t) => numTex(t.p, f)).join(' + ')}` : ''}${igual(suma, f)}`,
        `Suma${igualTxt(suma, f)}`,
      ),
    );
  }
  if (usaComplemento) bloques.push(b.formula(`${consultaTex(c)} = 1 - ${numTex(suma, f)}${igual(prob, f)}`, `${etiquetaConsulta(c)}${igualTxt(prob, f)}`));
  bloques.push(b.resultado(`${consultaTex(c)}${igual(prob, f)}`, `${etiquetaConsulta(c)}${igualTxt(prob, f)}`));

  return {
    prob,
    paso: paso({
      titulo,
      metodo: m.metodo,
      porque:
        terminos.length === 1 && !usaComplemento
          ? 'Se reemplazan los valores en la función de probabilidad de la distribución.'
          : 'Los valores de X son excluyentes entre sí, así que la probabilidad de un conjunto de valores es la suma de f(x) para cada uno (axioma de la suma).',
      bloques,
    }),
  };
}

/* ───────────── media, varianza y Tchebycheff ───────────── */

function pasosMomentos(
  media: Prob,
  varianza: Prob,
  formulas: { metodo: string; media: string; varianza: string; mediaTxt: string; varianzaTxt: string },
  op: Opciones,
  m: Modelo,
  f: Formato,
): { pasos: Paso[]; valores: ValorSalida[] } {
  const pasos: Paso[] = [];
  const valores: ValorSalida[] = [];
  const sigma = Math.sqrt(varianza.valor);
  if (op.momentos || op.tchebycheff) {
    pasos.push(
      paso({
        titulo: 'Media y varianza',
        metodo: formulas.metodo,
        porque: 'La media μ es el número esperado de éxitos; la varianza σ² mide cuánto se dispersa X alrededor de μ.',
        bloques: [
          b.formula(`${formulas.media}${igual(media, f)}`, `${formulas.mediaTxt}${igualTxt(media, f)}`),
          b.formula(`${formulas.varianza}${igual(varianza, f)}`, `${formulas.varianzaTxt}${igualTxt(varianza, f)}`),
          b.formula(`\\sigma = \\sqrt{\\sigma^2} = \\sqrt{${numTex(varianza, f)}} = ${fmtTex(sigma, f)}`, `σ = ${fmt(sigma, f)}`),
          b.resultado(
            `\\mu = ${numTex(media, f)},\\quad \\sigma^2 = ${numTex(varianza, f)},\\quad \\sigma = ${fmtTex(sigma, f)}`,
            `μ = ${fmt(media.valor, f)}; σ² = ${fmt(varianza.valor, f)}; σ = ${fmt(sigma, f)}`,
          ),
        ],
      }),
    );
    valores.push({ etiqueta: 'μ', prob: media }, { etiqueta: 'σ²', prob: varianza });
  }
  if (op.tchebycheff) {
    const li = media.valor - 2 * sigma;
    const ls = media.valor + 2 * sigma;
    const enteros: number[] = [];
    const tope = m.max ?? Math.floor(ls);
    for (let x = Math.max(m.min, Math.ceil(li)); x <= Math.min(tope, Math.floor(ls)); x++) if (x > li && x < ls) enteros.push(x);
    pasos.push(
      paso({
        titulo: 'Intervalo μ ± 2σ (teorema de Tchebycheff)',
        metodo: 'tchebycheff',
        porque:
          'El teorema de Tchebycheff asegura que, para cualquier distribución, la probabilidad de que X esté a menos de k desviaciones estándar de la media es al menos 1 − 1/k². Con k = 2 eso es al menos 3/4.',
        bloques: [
          b.formula(
            `\\mu \\pm 2\\sigma = ${par(media.valor, f)} \\pm 2${par(sigma, f)} \\;\\Rightarrow\\; (${fmtTex(li, f)},\\; ${fmtTex(ls, f)})`,
            `μ ± 2σ = (${fmt(li, f)}, ${fmt(ls, f)})`,
          ),
          b.formula('P(\\mu - 2\\sigma < X < \\mu + 2\\sigma) \\geq 1 - \\frac{1}{2^2} = \\frac{3}{4}', 'P(μ − 2σ < X < μ + 2σ) ≥ 1 − 1/2² = 3/4'),
          b.conclusion(
            enteros.length
              ? `Con probabilidad de al menos 3/4 (75 %), X toma un valor entre ${fmt(li, f)} y ${fmt(ls, f)}; como X es entera, eso es X = ${enteros.length > 8 ? `${enteros[0]}, …, ${enteros[enteros.length - 1]}` : enteros.join(', ')}.`
              : `Con probabilidad de al menos 3/4 (75 %), X toma un valor entre ${fmt(li, f)} y ${fmt(ls, f)}.`,
          ),
        ],
      }),
    );
  }
  return { pasos, valores };
}

function pasoTabla(m: Modelo, f: Formato, nombre: string): Paso {
  const filas: [number, Prob][] = [];
  let acum = 0;
  const tope = m.max ?? Infinity;
  for (let x = m.min; x <= tope && filas.length < 60; x++) {
    const p = m.f(x);
    filas.push([x, p]);
    acum += p.valor;
    if (m.max === null && acum > 1 - 1e-6 && x > m.min) break;
  }
  return paso({
    titulo: 'Función de probabilidad de X',
    metodo: m.metodo,
    porque: `Se evalúa ${nombre} en cada valor posible de X; las probabilidades suman 1.`,
    bloques: [
      {
        tipo: 'tabla',
        columnas: [{ titulo: 'x', alinear: 'centro' }, { titulo: 'f(x)' }],
        filas: filas.map(([x, p]) => [String(x), { latex: probTexP(p, f), texto: probTextoP(p, f) }]),
        nota: m.max === null ? 'Se muestran los valores hasta que la suma llega prácticamente a 1.' : undefined,
      },
    ],
  });
}

function armar(
  m: Modelo,
  planteamiento: Paso,
  momentos: { media: Prob; varianza: Prob; formulas: Parameters<typeof pasosMomentos>[2] },
  op: Opciones,
  f: Formato,
  nombre: string,
): Respuesta<SalidaDistribucion> {
  const pasos: Paso[] = [planteamiento];
  const valores: ValorSalida[] = [];
  if (op.tabla) pasos.push(pasoTabla(m, f, nombre));
  try {
    for (const c of op.consultas) {
      const r = resolverConsulta(m, c, f);
      pasos.push(r.paso);
      valores.push({ etiqueta: `${c.etiqueta ? `${c.etiqueta}) ` : ''}${etiquetaConsulta(c)}`, prob: r.prob });
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const mo = pasosMomentos(momentos.media, momentos.varianza, momentos.formulas, op, m, f);
  pasos.push(...mo.pasos);
  valores.push(...mo.valores);
  if (pasos.length === 1) return { ok: false, error: 'Agrega al menos una probabilidad para calcular, o marca la media y la varianza.' };
  return { ok: true, solucion: { pasos, resultado: { valores } } };
}

function validarConsultas(op: Opciones, nombre = 'X'): string | null {
  for (const c of op.consultas) {
    if (!Number.isInteger(c.a) || c.a < 0) return `En ${etiquetaConsulta(c)}, el valor de ${nombre} debe ser un entero mayor o igual que 0.`;
    if (c.tipo === 'entre' && (!Number.isInteger(c.b) || (c.b as number) < c.a)) return `En «entre», el segundo valor debe ser un entero mayor o igual que ${c.a}.`;
  }
  return null;
}

const potencia = (r: Racional, e: number) => new Racional(r.num ** BigInt(e), r.den ** BigInt(e));
const racTex = (r: Racional, f: Formato) => (r.den === 1n ? enteroTex(r.num) : r.decimalExacto(8) ? fmtTex(r.aNumero(), { ...f, decimales: 8 }) : r.aLatex());

/* ───────────── binomial ───────────── */

export interface DatosBinomial {
  n: number;
  pi: Racional;
  /** Qué es un éxito, para el texto («pozo con impurezas»). */
  exito?: string;
}

export function resolverBinomial(d: DatosBinomial, op: Opciones, f: Formato): Respuesta<SalidaDistribucion> {
  const { n, pi } = d;
  if (!Number.isInteger(n) || n < 1 || n > 1000) return { ok: false, error: 'n debe ser un entero entre 1 y 1000.' };
  if (!pi.enRango01()) return { ok: false, error: 'π debe estar entre 0 y 1.' };
  const err = validarConsultas(op);
  if (err) return { ok: false, error: err };
  const q = pi.complemento();
  const piT = racTex(pi, f);
  const qT = racTex(q, f);
  const m: Modelo = {
    min: 0,
    max: n,
    metodo: 'binomial',
    simbolo: (x) => `b(${x};\\,${n},\\,${piT})`,
    simboloTexto: (x) => `b(${x}; ${n}, ${probTextoP(exacta(pi), f)})`,
    f: (x) => (x < 0 || x > n ? exacta(Racional.entero(0)) : exacta(new Racional(combinaciones(n, x)).por(potencia(pi, x)).por(potencia(q, n - x)))),
    sustitucion: (x) => `\\binom{${n}}{${x}}\\left(${piT}\\right)^{${x}}\\left(${qT}\\right)^{${n - x}}`,
    general: `b(x; n, \\pi) = \\binom{n}{x}\\pi^x(1-\\pi)^{n-x}`,
  };
  const exito = d.exito?.trim() || 'éxito';
  const planteamiento = paso({
    titulo: 'Planteamiento: distribución binomial',
    metodo: 'bernoulli',
    porque:
      'Es un proceso de Bernoulli: n ensayos repetidos e independientes, cada uno con éxito o fracaso y la misma probabilidad de éxito π. El número X de éxitos es una variable aleatoria binomial.',
    bloques: [
      b.texto(`Éxito: ${exito}. X = número de éxitos en los n ensayos.`),
      b.formula(
        `n = ${n},\\qquad \\pi = ${piT},\\qquad 1 - \\pi = ${qT}`,
        `n = ${n}; π = ${probTextoP(exacta(pi), f)}; 1 − π = ${probTextoP(exacta(q), f)}`,
      ),
      b.formula(`${m.general},\\qquad x = 0, 1, \\dots, ${n}`, 'b(x; n, π) = C(n, x)·π^x·(1 − π)^(n − x)'),
    ],
  });
  const media = exacta(Racional.entero(n).por(pi));
  const varianza = exacta(Racional.entero(n).por(pi).por(q));
  return armar(
    m,
    planteamiento,
    {
      media,
      varianza,
      formulas: {
        metodo: 'momentos-binomial',
        media: `\\mu = n\\pi = ${n}\\left(${piT}\\right)`,
        varianza: `\\sigma^2 = n\\pi(1-\\pi) = ${n}\\left(${piT}\\right)\\left(${qT}\\right)`,
        mediaTxt: 'μ = nπ',
        varianzaTxt: 'σ² = nπ(1 − π)',
      },
    },
    op,
    f,
    'b(x; n, π)',
  );
}

/* ───────────── hipergeométrica ───────────── */

export interface DatosHipergeometrica {
  /** Tamaño de la población. */
  N: number;
  /** Tamaño de la muestra. */
  n: number;
  /** Éxitos en la población. */
  k: number;
  exito?: string;
}

export function resolverHipergeometrica(d: DatosHipergeometrica, op: Opciones, f: Formato): Respuesta<SalidaDistribucion> {
  const { N, n, k } = d;
  if (!Number.isInteger(N) || N < 1 || N > 100000) return { ok: false, error: 'N debe ser un entero entre 1 y 100 000.' };
  if (!Number.isInteger(n) || n < 1 || n > N || n > 1000) return { ok: false, error: `n debe ser un entero entre 1 y ${Math.min(N, 1000)}.` };
  if (!Number.isInteger(k) || k < 0 || k > N) return { ok: false, error: `k debe ser un entero entre 0 y N = ${N}.` };
  const err = validarConsultas(op);
  if (err) return { ok: false, error: err };
  const total = combinaciones(N, n);
  const m: Modelo = {
    min: Math.max(0, n - (N - k)),
    max: Math.min(n, k),
    metodo: 'hipergeometrica',
    simbolo: (x) => `h(${x};\\,${N},\\,${n},\\,${k})`,
    simboloTexto: (x) => `h(${x}; ${N}, ${n}, ${k})`,
    f: (x) =>
      x < Math.max(0, n - (N - k)) || x > Math.min(n, k)
        ? exacta(Racional.entero(0))
        : exacta(new Racional(combinaciones(k, x) * combinaciones(N - k, n - x), total)),
    // Solo se evalúa dentro del soporte, donde las dos combinaciones existen.
    sustitucion: (x) =>
      `\\frac{\\binom{${k}}{${x}}\\binom{${N - k}}{${n - x}}}{\\binom{${N}}{${n}}} = \\frac{${enteroTex(combinaciones(k, x))} \\cdot ${enteroTex(combinaciones(N - k, n - x))}}{${enteroTex(total)}}`,
    general: 'h(x; N, n, k) = \\frac{\\binom{k}{x}\\binom{N-k}{n-x}}{\\binom{N}{n}}',
  };
  const exito = d.exito?.trim() || 'éxito';
  const planteamiento = paso({
    titulo: 'Planteamiento: distribución hipergeométrica',
    metodo: 'hipergeometrica',
    porque:
      'Se toma una muestra de n objetos sin reemplazo de una población de N, en la que k son éxitos y N − k fracasos. El número X de éxitos en la muestra sigue una distribución hipergeométrica.',
    bloques: [
      b.texto(`Éxito: ${exito}. X = número de éxitos en la muestra.`),
      b.formula(`N = ${N},\\qquad n = ${n},\\qquad k = ${k},\\qquad N - k = ${N - k}`, `N = ${N}; n = ${n}; k = ${k}; N − k = ${N - k}`),
      b.formula(`${m.general},\\qquad x = ${m.min}, \\dots, ${m.max}`, 'h(x; N, n, k) = C(k, x)·C(N − k, n − x) / C(N, n)'),
      b.formula(`\\binom{N}{n} = \\binom{${N}}{${n}} = ${enteroTex(total)}`, `C(${N}, ${n}) = ${enteroTexto(total)}`),
    ],
  });
  const piR = new Racional(BigInt(k), BigInt(N));
  const media = exacta(Racional.entero(n).por(piR));
  const varianza = exacta(
    (N === 1 ? Racional.entero(0) : new Racional(BigInt(N - n), BigInt(N - 1))).por(Racional.entero(n).por(piR)).por(piR.complemento()),
  );
  return armar(
    m,
    planteamiento,
    {
      media,
      varianza,
      formulas: {
        metodo: 'momentos-hipergeometrica',
        media: `\\mu = \\frac{nk}{N} = \\frac{${n}\\cdot ${k}}{${N}}`,
        varianza: `\\sigma^2 = \\frac{N-n}{N-1}\\cdot\\frac{nk}{N}\\left(1-\\frac{k}{N}\\right) = \\frac{${N - n}}{${N - 1}}\\cdot\\frac{${n}\\cdot ${k}}{${N}}\\left(1-\\frac{${k}}{${N}}\\right)`,
        mediaTxt: 'μ = nk/N',
        varianzaTxt: 'σ² = (N − n)/(N − 1)·(nk/N)·(1 − k/N)',
      },
    },
    op,
    f,
    'h(x; N, n, k)',
  );
}

/* ───────────── Poisson ───────────── */

export type DatosPoisson =
  /** λ = tasa por unidad × unidades (12 llamadas por minuto, en 0,5 minutos). */
  | { modo: 'tasa'; tasa: number; unidades: number; unidad?: string; exito?: string }
  /** λ = nπ: aproximación de la binomial (diap. 21). */
  | { modo: 'np'; n: number; pi: number; exito?: string };

export function resolverPoisson(d: DatosPoisson, op: Opciones, f: Formato): Respuesta<SalidaDistribucion> {
  const lambda = d.modo === 'tasa' ? d.tasa * d.unidades : d.n * d.pi;
  if (d.modo === 'tasa' && (!(d.tasa > 0) || !(d.unidades > 0))) return { ok: false, error: 'La tasa y el número de unidades deben ser mayores que 0.' };
  if (d.modo === 'np' && (!Number.isInteger(d.n) || d.n < 1 || !(d.pi > 0 && d.pi <= 1))) return { ok: false, error: 'n debe ser un entero positivo y π estar entre 0 y 1.' };
  if (!(lambda > 0) || lambda > 500) return { ok: false, error: 'λ debe ser mayor que 0 y como máximo 500.' };
  const err = validarConsultas(op);
  if (err) return { ok: false, error: err };
  const eMenosL = Math.exp(-lambda);
  // f(x) = e^{−λ}λ^x/x!, de forma recursiva para no desbordar con x grande
  const cache = [eMenosL];
  const fx = (x: number) => {
    for (let i = cache.length; i <= x; i++) cache.push((cache[i - 1] * lambda) / i);
    return cache[x];
  };
  const L = fmtTex(lambda, { ...f, decimales: Math.max(f.decimales, 4) });
  const m: Modelo = {
    min: 0,
    max: null,
    metodo: 'poisson',
    simbolo: (x) => `P(${x};\\,${L})`,
    simboloTexto: (x) => `P(${x}; ${fmt(lambda, f)})`,
    f: (x) => aprox(x < 0 ? 0 : fx(x)),
    sustitucion: (x) => `\\frac{e^{-${L}}\\cdot ${L}^{${x}}}{${x}!}`,
    general: 'P(x; \\lambda) = \\frac{e^{-\\lambda}\\lambda^x}{x!}',
  };
  const exito = d.exito?.trim() || 'resultados';
  const bloques: Bloque[] = [b.texto(`X = número de ${exito}.`)];
  if (d.modo === 'tasa') {
    const unidad = d.unidad?.trim() || 'unidad';
    bloques.push(
      b.texto(
        `λ es el número promedio de resultados en el intervalo que pregunta el ejercicio: la tasa por ${unidad} por el número de ${unidad}s del intervalo.`,
      ),
      b.formula(`\\lambda = ${fmtTex(d.tasa, f)} \\times ${fmtTex(d.unidades, f)} = ${L}`, `λ = ${fmt(d.tasa, f)} × ${fmt(d.unidades, f)} = ${fmt(lambda, f)}`),
    );
  } else {
    bloques.push(
      b.texto('Cuando n es grande y π pequeña, la binomial se aproxima con una Poisson de media λ = nπ.'),
      b.formula(`\\lambda = n\\pi = ${d.n} \\times ${fmtTex(d.pi, { ...f, decimales: 8 })} = ${L}`, `λ = nπ = ${fmt(lambda, f)}`),
    );
  }
  bloques.push(b.formula(`${m.general},\\qquad x = 0, 1, 2, \\dots \\qquad e^{-${L}} = ${fmtTex(eMenosL, { ...f, decimales: Math.max(f.decimales, 6) })}`, 'P(x; λ) = e^(−λ)·λ^x / x!'));
  const planteamiento = paso({
    titulo: 'Planteamiento: distribución de Poisson',
    metodo: d.modo === 'np' ? 'aproximacion-poisson' : 'poisson',
    porque:
      'X cuenta resultados que ocurren al azar en un intervalo de tiempo o una región, de forma independiente y con una tasa promedio constante: es una variable aleatoria de Poisson.',
    bloques,
  });
  return armar(
    m,
    planteamiento,
    {
      media: aprox(lambda),
      varianza: aprox(lambda),
      formulas: { metodo: 'poisson', media: '\\mu = \\lambda', varianza: '\\sigma^2 = \\lambda', mediaTxt: 'μ = λ', varianzaTxt: 'σ² = λ' },
    },
    op,
    f,
    'P(x; λ)',
  );
}

/* ───────────── multinomial ───────────── */

export interface CategoriaMultinomial {
  nombre: string;
  pi: Racional;
  x: number;
}

export function resolverMultinomial(cats: CategoriaMultinomial[], f: Formato): Respuesta<SalidaDistribucion> {
  if (cats.length < 2) return { ok: false, error: 'Se necesitan al menos 2 resultados posibles.' };
  for (const c of cats) {
    if (!c.pi.enRango01()) return { ok: false, error: `La probabilidad de «${c.nombre}» debe estar entre 0 y 1.` };
    if (!Number.isInteger(c.x) || c.x < 0 || c.x > 500) return { ok: false, error: `El número de ocurrencias de «${c.nombre}» debe ser un entero entre 0 y 500.` };
  }
  const sumaPi = cats.reduce((s, c) => s.mas(c.pi), Racional.entero(0));
  if (!sumaPi.igual(Racional.entero(1))) {
    return { ok: false, error: `Las probabilidades deben sumar 1 (Σπᵢ = 1); ahora suman ${sumaPi.aTexto()}.` };
  }
  const n = cats.reduce((s, c) => s + c.x, 0);
  if (n < 1) return { ok: false, error: 'Debe haber al menos un ensayo (Σxᵢ = n ≥ 1).' };
  const coef = factorial(n) / cats.reduce((s, c) => s * factorial(c.x), 1n);
  const p = cats.reduce((s, c) => s.por(potencia(c.pi, c.x)), new Racional(coef));
  const xs = cats.map((c) => c.x).join(',');
  const pis = cats.map((c) => racTex(c.pi, f)).join(';\\,');
  const prob = exacta(p);
  const pasos: Paso[] = [
    paso({
      titulo: 'Planteamiento: distribución multinomial',
      metodo: 'multinomial',
      porque:
        'Cada ensayo puede dar uno de k resultados con probabilidades fijas π₁, …, πₖ, y los n ensayos son independientes. La probabilidad de obtener x₁ veces el primero, x₂ el segundo, … es la multinomial.',
      bloques: [
        {
          tipo: 'tabla',
          columnas: [{ titulo: 'Resultado', alinear: 'izq' }, { titulo: 'πᵢ' }, { titulo: 'xᵢ' }],
          filas: cats.map((c) => [c.nombre, { latex: racTex(c.pi, f), texto: c.pi.aTexto() }, String(c.x)]),
          pie: ['Σ', '1', String(n)],
        },
        b.formula(
          'f(x_1, \\dots, x_k; \\pi_1, \\dots, \\pi_k, n) = \\binom{n}{x_1, x_2, \\dots, x_k}\\pi_1^{x_1}\\pi_2^{x_2}\\cdots\\pi_k^{x_k},\\qquad \\binom{n}{x_1, \\dots, x_k} = \\frac{n!}{x_1!\\,x_2!\\cdots x_k!}',
          'f = n!/(x₁!·x₂!·…·xₖ!)·π₁^x₁·π₂^x₂·…·πₖ^xₖ',
        ),
      ],
    }),
    paso({
      titulo: 'Probabilidad',
      metodo: 'multinomial',
      porque: 'Se reemplazan los valores: el coeficiente multinomial cuenta los órdenes posibles y el producto de potencias es la probabilidad de cada orden.',
      bloques: [
        b.formula(
          `f(${xs};\\,${pis},\\,${n}) = \\binom{${n}}{${xs}}${cats.map((c) => `\\left(${racTex(c.pi, f)}\\right)^{${c.x}}`).join('')} = \\frac{${n}!}{${cats.map((c) => `${c.x}!`).join('\\,')}}${cats.map((c) => `\\left(${racTex(c.pi, f)}\\right)^{${c.x}}`).join('')}`,
          `f = ${n}!/(${cats.map((c) => `${c.x}!`).join('·')})·…`,
        ),
        b.formula(`\\frac{${n}!}{${cats.map((c) => `${c.x}!`).join('\\,')}} = ${enteroTex(coef)}`, `coeficiente = ${enteroTexto(coef)}`),
        b.resultado(`f${igual(prob, f)}`, `f${igualTxt(prob, f)}`),
      ],
    }),
  ];
  return { ok: true, solucion: { pasos, resultado: { valores: [{ etiqueta: 'f', prob }] } } };
}
