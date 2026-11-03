/**
 * Extracciones sucesivas con o sin reposición: regla del producto con
 * probabilidades condicionales (diap. 30–34) y suma de secuencias
 * mutuamente excluyentes (regla aditiva).
 */
import type { Formato } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { b, paso, type Paso, type Respuesta } from '../steps';

/** Evento «objeto de tipo sim en la extracción t+1»: {R}_{1}. */
const extraccion = (sim: string, t: number) => `{${simTex(sim)}}_{${t + 1}}`;

export interface CategoriaUrna {
  nombre: string;
  simbolo: string;
  cantidad: number;
}

export interface DatosSucesivas {
  categorias: CategoriaUrna[];
  /** Cada secuencia es una lista de símbolos de categoría, en orden de extracción. */
  secuencias: string[][];
  reemplazo: boolean;
}

export function resolverSucesivas(d: DatosSucesivas, f: Formato): Respuesta<Racional> {
  if (d.categorias.length === 0) return { ok: false, error: 'Agrega al menos una categoría.' };
  const indice = new Map<string, number>();
  for (const [i, c] of d.categorias.entries()) {
    const s = c.simbolo.trim();
    if (!s) return { ok: false, error: `Falta el símbolo de «${c.nombre}».` };
    if (indice.has(s)) return { ok: false, error: `El símbolo «${s}» está repetido.` };
    if (!(Number.isInteger(c.cantidad) && c.cantidad >= 0)) return { ok: false, error: `La cantidad de «${c.nombre}» debe ser un entero ≥ 0.` };
    indice.set(s, i);
  }
  const N = d.categorias.reduce((s, c) => s + c.cantidad, 0);
  if (N === 0) return { ok: false, error: 'La urna está vacía.' };
  if (d.secuencias.length === 0 || d.secuencias.some((s) => s.length === 0)) {
    return { ok: false, error: 'Escribe al menos una secuencia de extracciones, por ejemplo «R R B».' };
  }
  for (const s of d.secuencias) {
    for (const sim of s) if (!indice.has(sim)) return { ok: false, error: `«${sim}» no es el símbolo de ninguna categoría.` };
    if (!d.reemplazo && s.length > N) return { ok: false, error: `Sin reposición no se pueden hacer ${s.length} extracciones de ${N} objetos.` };
  }

  const pasos: Paso[] = [
    paso({
      titulo: 'Composición inicial',
      metodo: 'axiomas',
      bloques: [
        {
          tipo: 'tabla',
          columnas: [{ titulo: 'Objeto', alinear: 'izq' }, { titulo: 'Símbolo', alinear: 'centro' }, { titulo: 'Cantidad' }],
          filas: d.categorias.map((c) => [c.nombre, c.simbolo, String(c.cantidad)]),
          pie: ['Total', '', String(N)],
        },
        b.texto(d.reemplazo ? 'Con reposición: cada objeto se devuelve antes de la siguiente extracción.' : 'Sin reposición: cada objeto extraído sale de la urna.'),
      ],
    }),
  ];

  const valores: Racional[] = [];
  d.secuencias.forEach((sec, si) => {
    const quedan = d.categorias.map((c) => c.cantidad);
    let total = N;
    const factores: Racional[] = [];
    const fraccTex: string[] = [];
    const generales: string[] = [];
    sec.forEach((sim, t) => {
      const ci = indice.get(sim)!;
      const ev = extraccion(sim, t);
      const previos = sec.slice(0, t).map((s, u) => extraccion(s, u));
      generales.push(
        t === 0 || d.reemplazo ? `P(${ev})` : `P(${ev}\\mid ${previos.length > 2 ? previos.join('') : previos.join('\\cap ')})`,
      );
      factores.push(new Racional(BigInt(quedan[ci]), BigInt(total)));
      fraccTex.push(`\\frac{${quedan[ci]}}{${total}}`);
      if (!d.reemplazo) {
        quedan[ci] = Math.max(quedan[ci] - 1, 0);
        total -= 1;
      }
    });
    const p = factores.reduce((acc, x) => acc.por(x), Racional.UNO);
    valores.push(p);
    const nombreSec = sec.map((s, t) => `${s}${t + 1}`).join(', ');
    const evLatex = sec.map((s, t) => extraccion(s, t)).join('\\cap ');
    const numProd = factores.reduce((acc, x) => acc * x.num, 1n);
    const denProd = factores.reduce((acc, x) => acc * x.den, 1n);
    pasos.push(
      paso({
        titulo: d.secuencias.length > 1 ? `Secuencia ${si + 1}: ${sec.join(', ')}` : `Secuencia ${sec.join(', ')}`,
        metodo: 'regla-producto',
        porque: d.reemplazo
          ? 'Con reposición la urna no cambia, así que las extracciones son independientes y se multiplican sus probabilidades.'
          : 'Por la regla del producto, la probabilidad de la secuencia es la de la primera extracción por la de cada extracción siguiente, sabiendo lo que ya salió (la urna tiene un objeto menos cada vez).',
        bloques: [
          b.texto(`Orden: ${nombreSec} (el subíndice indica el número de la extracción).`),
          b.formula(`P(${evLatex}) = ${generales.join('\\,')}`, `P(${nombreSec}) = producto de probabilidades condicionales`),
          b.formula(
            `= ${fraccTex.join(' \\cdot ')} = \\frac{${numProd}}{${denProd}} = ${probTex(p, f)}`,
            `= ${factores.map((x) => x.aTexto()).join(' · ')} = ${probTexto(p, f)}`,
          ),
        ],
      }),
    );
  });

  const total = valores.reduce((s, v) => s.mas(v), Racional.CERO);
  if (d.secuencias.length > 1) {
    pasos.push(
      paso({
        titulo: 'Suma de las secuencias',
        metodo: 'regla-aditiva',
        porque: 'Las secuencias son mutuamente excluyentes (no pueden ocurrir a la vez), así que sus probabilidades se suman.',
        bloques: [
          b.formula(`P = ${valores.map((v) => v.aLatex()).join(' + ')} = ${probTex(total, f)}`, `P = ${probTexto(total, f)}`),
        ],
      }),
    );
  }
  pasos[pasos.length - 1].bloques.push(b.resultado(`P = ${probTex(total, f)}`, `P = ${probTexto(total, f)}`));
  return { ok: true, solucion: { resultado: total, pasos } };
}
