/**
 * Técnicas de conteo (diap. 14–21): regla de la multiplicación, n!, nPr,
 * permutaciones circulares, permutaciones con repetición y combinaciones.
 * Todo se calcula con enteros exactos (BigInt).
 */
import { fmtEntero, fmtEnteroTex, superindice } from '../formato';
import { b, paso, type Bloque, type Paso, type Respuesta } from '../steps';

export const MAX_N = 500;

export function factorial(n: number): bigint {
  let r = 1n;
  for (let i = 2; i <= n; i++) r *= BigInt(i);
  return r;
}

/** nPr = n!/(n − r)! */
export function permutaciones(n: number, r: number): bigint {
  let p = 1n;
  for (let i = 0; i < r; i++) p *= BigInt(n - i);
  return p;
}

/** nCr = n!/((n − r)!·r!) */
export function combinaciones(n: number, r: number): bigint {
  const m = Math.min(r, n - r);
  if (m < 0) return 0n;
  return permutaciones(n, m) / factorial(m);
}

/** Permutaciones circulares: (n − 1)! */
export const circulares = (n: number): bigint => factorial(Math.max(n - 1, 0));

/** n!/(n₁!·n₂!·…·nₖ!) */
export function permRepeticion(cantidades: number[]): bigint {
  const n = cantidades.reduce((s, c) => s + c, 0);
  return cantidades.reduce((acc, c) => acc / factorial(c), factorial(n));
}

export const potencia = (n: number, r: number): bigint => BigInt(n) ** BigInt(r);

export type TerminoConteo =
  /** Una cantidad que se cuenta directamente (p. ej. 12 parejas). */
  | { tipo: 'numero'; n: number; descripcion?: string }
  /** n₁·n₂·…·nₖ */
  | { tipo: 'producto'; factores: number[]; descripcion?: string }
  /** nʳ: r elecciones con reposición entre n opciones */
  | { tipo: 'potencia'; n: number; r: number; descripcion?: string }
  | { tipo: 'factorial'; n: number; descripcion?: string }
  | { tipo: 'permutacion'; n: number; r: number; descripcion?: string }
  | { tipo: 'circular'; n: number; descripcion?: string }
  | { tipo: 'repeticion'; grupos: { etiqueta: string; cantidad: number }[]; palabra?: string; descripcion?: string }
  | { tipo: 'combinacion'; n: number; r: number; descripcion?: string };

export type TipoTermino = TerminoConteo['tipo'];

export interface CasoConteo {
  descripcion?: string;
  terminos: TerminoConteo[];
}

/** Suma de casos mutuamente excluyentes; cada caso es un producto de términos. */
export interface ExpresionConteo {
  casos: CasoConteo[];
}

export const NOMBRE_TERMINO: Record<TipoTermino, string> = {
  numero: 'Cantidad directa',
  producto: 'Regla de la multiplicación',
  potencia: 'Con reposición (nʳ)',
  factorial: 'Permutación de n (n!)',
  permutacion: 'Permutación nPr',
  circular: 'Permutación circular',
  repeticion: 'Permutación con repetición',
  combinacion: 'Combinación nCr',
};

/** Cuenta las letras de una palabra en orden de aparición (ignora tildes y espacios, conserva la Ñ). */
export function contarLetras(palabra: string): { etiqueta: string; cantidad: number }[] {
  const limpia = palabra
    .normalize('NFD')
    .replace(/[̀́̈]/g, '')
    .normalize('NFC')
    .toUpperCase()
    .replace(/[^A-ZÑ0-9]/g, '');
  const mapa = new Map<string, number>();
  for (const c of limpia) mapa.set(c, (mapa.get(c) ?? 0) + 1);
  return [...mapa.entries()].map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }));
}

export function validarTermino(t: TerminoConteo): string | null {
  const entero = (v: number) => Number.isInteger(v) && v >= 0 && v <= MAX_N;
  switch (t.tipo) {
    case 'numero':
      return Number.isInteger(t.n) && t.n >= 0 ? null : 'La cantidad debe ser un entero mayor o igual que 0.';
    case 'producto':
      if (t.factores.length === 0) return 'Escribe al menos un factor.';
      return t.factores.every((v) => Number.isInteger(v) && v >= 0) ? null : 'Los factores deben ser enteros mayores o iguales que 0.';
    case 'potencia':
      return entero(t.n) && entero(t.r) ? null : `n y r deben ser enteros entre 0 y ${MAX_N}.`;
    case 'factorial':
      return entero(t.n) ? null : `n debe ser un entero entre 0 y ${MAX_N}.`;
    case 'circular':
      return entero(t.n) && t.n >= 1 ? null : `n debe ser un entero entre 1 y ${MAX_N}.`;
    case 'permutacion':
    case 'combinacion':
      if (!entero(t.n) || !entero(t.r)) return `n y r deben ser enteros entre 0 y ${MAX_N}.`;
      return t.r <= t.n ? null : `r no puede ser mayor que n (r = ${t.r}, n = ${t.n}).`;
    case 'repeticion': {
      if (t.grupos.length === 0) return 'Indica al menos un grupo de objetos repetidos.';
      if (!t.grupos.every((g) => Number.isInteger(g.cantidad) && g.cantidad >= 1)) return 'Cada grupo debe tener al menos 1 objeto.';
      const n = t.grupos.reduce((s, g) => s + g.cantidad, 0);
      return n <= MAX_N ? null : `El total de objetos no puede pasar de ${MAX_N}.`;
    }
  }
}

export function valorTermino(t: TerminoConteo): bigint {
  switch (t.tipo) {
    case 'numero':
      return BigInt(t.n);
    case 'producto':
      return t.factores.reduce((acc, v) => acc * BigInt(v), 1n);
    case 'potencia':
      return potencia(t.n, t.r);
    case 'factorial':
      return factorial(t.n);
    case 'permutacion':
      return permutaciones(t.n, t.r);
    case 'circular':
      return circulares(t.n);
    case 'repeticion':
      return permRepeticion(t.grupos.map((g) => g.cantidad));
    case 'combinacion':
      return combinaciones(t.n, t.r);
  }
}

export function evaluarExpresion(e: ExpresionConteo): bigint {
  return e.casos.reduce((s, c) => s + c.terminos.reduce((p, t) => p * valorTermino(t), 1n), 0n);
}

/** Entero grande en LaTeX: completo hasta 40 cifras; si no, aproximado. */
export function enteroTex(v: bigint): string {
  const s = v.toString();
  if (s.length <= 40) return fmtEnteroTex(v);
  return `${s[0]}{,}${s.slice(1, 5)} \\times 10^{${s.length - 1}}\\ (\\text{${s.length} cifras})`;
}

export function enteroTexto(v: bigint): string {
  const s = v.toString();
  if (s.length <= 40) return fmtEntero(v);
  return `${s[0]},${s.slice(1, 5)} × 10${superindice(s.length - 1)} (${s.length} cifras)`;
}

/** Producto expandido «n·(n−1)·…» con r factores, si es corto. */
function expandir(desde: number, factores: number): string | null {
  if (factores > 10) return null;
  if (factores <= 0) return '1';
  return Array.from({ length: factores }, (_, i) => desde - i).join(' \\cdot ');
}

export function simboloTermino(t: TerminoConteo): { latex: string; texto: string } {
  switch (t.tipo) {
    case 'numero':
      return { latex: String(t.n), texto: String(t.n) };
    case 'producto':
      return { latex: t.factores.join(' \\cdot '), texto: t.factores.join('·') };
    case 'potencia':
      return { latex: `${t.n}^{${t.r}}`, texto: `${t.n}${superindice(t.r)}` };
    case 'factorial':
      return { latex: `${t.n}!`, texto: `${t.n}!` };
    case 'permutacion':
      return { latex: `{}_{${t.n}}P_{${t.r}}`, texto: `${t.n}P${t.r}` };
    case 'circular':
      return { latex: `(${t.n}-1)!`, texto: `(${t.n} − 1)!` };
    case 'repeticion': {
      const n = t.grupos.reduce((s, g) => s + g.cantidad, 0);
      const den = t.grupos.filter((g) => g.cantidad > 1).map((g) => `${g.cantidad}!`);
      return {
        latex: den.length ? `\\frac{${n}!}{${den.join('\\,')}}` : `${n}!`,
        texto: den.length ? `${n}!/(${den.join('·')})` : `${n}!`,
      };
    }
    case 'combinacion':
      return { latex: `{}_{${t.n}}C_{${t.r}}`, texto: `${t.n}C${t.r}` };
  }
}

/** Bloques que muestran cómo se calcula un término. */
function bloquesTermino(t: TerminoConteo): { metodo: string; titulo: string; porque: string; bloques: Bloque[] } {
  const v = valorTermino(t);
  const res = enteroTex(v);
  switch (t.tipo) {
    case 'numero':
      return {
        metodo: 'regla-multiplicacion',
        titulo: 'Cantidad directa',
        porque: 'Se cuentan directamente las opciones disponibles.',
        bloques: [b.formula(`n = ${res}`, `n = ${enteroTexto(v)}`)],
      };
    case 'producto':
      return {
        metodo: 'regla-multiplicacion',
        titulo: 'Regla de la multiplicación',
        porque:
          'Si una operación se hace de n₁ formas y, por cada una, la siguiente de n₂ formas, y así sucesivamente, la serie completa se puede hacer de n₁·n₂·…·nₖ formas.',
        bloques: [b.formula(`n_1 \\cdot n_2 \\cdots n_k = ${t.factores.join(' \\cdot ')} = ${res}`, `${t.factores.join('·')} = ${enteroTexto(v)}`)],
      };
    case 'potencia':
      return {
        metodo: 'regla-multiplicacion',
        titulo: 'Elecciones con reposición',
        porque: `Con reposición, cada una de las ${t.r} elecciones tiene las mismas ${t.n} opciones; por la regla de la multiplicación se multiplica ${t.n} por sí mismo ${t.r} veces.`,
        bloques: [b.formula(`n^r = ${t.n}^{${t.r}} = ${res}`, `${t.n}${superindice(t.r)} = ${enteroTexto(v)}`)],
      };
    case 'factorial': {
      const exp = t.n <= 1 ? null : expandir(t.n, t.n);
      return {
        metodo: 'permutaciones',
        titulo: 'Permutación de n objetos',
        porque: 'Para ordenar n objetos distintos hay n opciones para el primer lugar, n − 1 para el segundo, y así hasta 1: n(n − 1)···1 = n!.',
        bloques: [
          b.formula(
            t.n <= 1 ? `${t.n}! = 1` : `${t.n}! = ${exp ? `${exp} = ` : ''}${res}`,
            `${t.n}! = ${enteroTexto(v)}`,
          ),
        ],
      };
    }
    case 'permutacion': {
      const exp = expandir(t.n, t.r);
      return {
        metodo: 'permutaciones',
        titulo: 'Permutación nPr',
        porque: 'Importa el orden y no se repiten objetos: se eligen r de n en orden. Es n·(n − 1)·… con r factores, que equivale a n!/(n − r)!.',
        bloques: [
          b.formula(
            `{}_{n}P_{r} = \\frac{n!}{(n-r)!} = \\frac{${t.n}!}{(${t.n}-${t.r})!} = \\frac{${t.n}!}{${t.n - t.r}!} = ${exp ? `${exp} = ` : ''}${res}`,
            `${t.n}P${t.r} = ${t.n}!/(${t.n - t.r})! = ${enteroTexto(v)}`,
          ),
        ],
      };
    }
    case 'circular': {
      const exp = t.n - 1 <= 1 ? null : expandir(t.n - 1, t.n - 1);
      return {
        metodo: 'permutaciones',
        titulo: 'Permutación circular',
        porque: 'En un círculo no hay primer lugar: al fijar a una persona como referencia, las otras n − 1 se ordenan libremente, (n − 1)! formas.',
        bloques: [b.formula(`(n-1)! = (${t.n}-1)! = ${t.n - 1}! = ${exp ? `${exp} = ` : ''}${res}`, `(${t.n} − 1)! = ${enteroTexto(v)}`)],
      };
    }
    case 'repeticion': {
      const n = t.grupos.reduce((s, g) => s + g.cantidad, 0);
      const repetidos = t.grupos.filter((g) => g.cantidad > 1);
      const den = repetidos.reduce((acc, g) => acc * factorial(g.cantidad), 1n);
      const bloques: Bloque[] = [];
      if (t.palabra) {
        bloques.push(
          b.texto(
            `Letras de «${t.palabra.toUpperCase()}» (n = ${n}): ${t.grupos.map((g) => `${g.etiqueta}: ${g.cantidad}`).join(', ')}.`,
          ),
        );
      }
      bloques.push(
        b.formula(
          `\\frac{n!}{n_1!\\,n_2!\\cdots n_k!} = ${
            repetidos.length
              ? `\\frac{${n}!}{${repetidos.map((g) => `${g.cantidad}!`).join('\\,')}} = \\frac{${enteroTex(factorial(n))}}{${enteroTex(den)}} = `
              : `${n}! = `
          }${res}`,
          `${n}!/(${repetidos.map((g) => `${g.cantidad}!`).join('·') || '1'}) = ${enteroTexto(v)}`,
        ),
      );
      return {
        metodo: 'permutaciones-repeticion',
        titulo: 'Permutación con repetición',
        porque:
          'Si hay objetos iguales, intercambiarlos entre sí no produce un arreglo nuevo. Por eso se divide n! entre el factorial de las repeticiones de cada tipo.',
        bloques,
      };
    }
    case 'combinacion': {
      const m = Math.min(t.r, t.n - t.r);
      const expNum = expandir(t.n, m);
      const expDen = expandir(m, m);
      return {
        metodo: 'combinaciones',
        titulo: 'Combinación nCr',
        porque: 'No importa el orden: cada grupo de r objetos aparece r! veces entre las permutaciones nPr, así que se divide entre r!.',
        bloques: [
          b.formula(
            `{}_{n}C_{r} = \\binom{n}{r} = \\frac{n!}{(n-r)!\\,r!} = \\frac{${t.n}!}{${t.n - t.r}!\\,${t.r}!} = ${
              expNum && m > 0 ? `\\frac{${expNum}}{${expDen}} = ` : ''
            }${res}`,
            `${t.n}C${t.r} = ${t.n}!/(${t.n - t.r}!·${t.r}!) = ${enteroTexto(v)}`,
          ),
        ],
      };
    }
  }
}

/**
 * Resuelve una expresión de conteo: cada caso es un producto de términos
 * (regla de la multiplicación) y los casos, mutuamente excluyentes, se suman.
 */
export function resolverConteo(e: ExpresionConteo, prefijo = ''): Respuesta<bigint> {
  if (e.casos.length === 0 || e.casos.some((c) => c.terminos.length === 0)) {
    return { ok: false, error: 'Cada caso necesita al menos un término.' };
  }
  for (const c of e.casos) {
    for (const t of c.terminos) {
      const err = validarTermino(t);
      if (err) return { ok: false, error: err };
    }
  }

  const pasos: Paso[] = [];
  const varios = e.casos.length > 1;
  const valoresCaso: bigint[] = [];
  const titulo = (s: string) => (prefijo ? `${prefijo}: ${s}` : s);

  e.casos.forEach((caso, ci) => {
    const etiquetaCaso = varios ? `Caso ${ci + 1}${caso.descripcion ? ` (${caso.descripcion})` : ''}` : '';
    const valores = caso.terminos.map(valorTermino);
    const conPaso = caso.terminos.filter((t) => t.tipo !== 'numero' || caso.terminos.length === 1);
    for (const t of conPaso) {
      const info = bloquesTermino(t);
      const desc = t.descripcion ? b.texto(t.descripcion) : null;
      pasos.push(
        paso({
          titulo: titulo([etiquetaCaso, info.titulo].filter(Boolean).join(' · ')),
          metodo: info.metodo,
          porque: info.porque,
          bloques: desc ? [desc, ...info.bloques] : info.bloques,
        }),
      );
    }
    const total = valores.reduce((p, v) => p * v, 1n);
    if (caso.terminos.length > 1) {
      const partes = caso.terminos.map((t) => simboloTermino(t));
      const detalle = caso.terminos
        .map((t, i) => `${t.descripcion ? `${t.descripcion}: ` : ''}${partes[i].texto} = ${enteroTexto(valores[i])}`)
        .join('; ');
      pasos.push(
        paso({
          titulo: titulo([etiquetaCaso, 'Regla de la multiplicación'].filter(Boolean).join(' · ')),
          metodo: 'regla-multiplicacion',
          porque: 'Las elecciones se hacen una tras otra y cada combinación de ellas es un resultado distinto, así que los conteos se multiplican.',
          bloques: [
            b.texto(detalle + '.'),
            b.formula(
              `${partes.map((p) => p.latex).join(' \\cdot ')} = ${valores.map(enteroTex).join(' \\cdot ')} = ${enteroTex(total)}`,
              `${partes.map((p) => p.texto).join(' · ')} = ${enteroTexto(total)}`,
            ),
          ],
        }),
      );
    }
    valoresCaso.push(total);
  });

  const total = valoresCaso.reduce((s, v) => s + v, 0n);
  if (varios) {
    pasos.push(
      paso({
        titulo: titulo('Suma de los casos'),
        metodo: 'regla-aditiva',
        porque: 'Los casos son mutuamente excluyentes (no pueden ocurrir a la vez), así que el total es la suma de los conteos de cada caso.',
        bloques: [
          b.formula(
            `${valoresCaso.map(enteroTex).join(' + ')} = ${enteroTex(total)}`,
            `${valoresCaso.map(enteroTexto).join(' + ')} = ${enteroTexto(total)}`,
          ),
        ],
      }),
    );
  }

  const ultimo = pasos[pasos.length - 1];
  ultimo.bloques.push(b.resultado(`n = ${enteroTex(total)}`, `n = ${enteroTexto(total)}`));
  return { ok: true, solucion: { resultado: total, pasos } };
}
