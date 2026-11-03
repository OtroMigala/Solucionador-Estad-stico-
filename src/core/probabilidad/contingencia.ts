/**
 * Tablas de contingencia (diap. 30–32): probabilidades marginales, conjuntas,
 * de uniones y condicionales a partir de conteos.
 */
import { type Formato, fmtEntero } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { b, paso, type Paso, type Respuesta } from '../steps';
import { cadenaFraccion } from './clasica';

export interface EjeEvento {
  nombre: string;
  simbolo: string;
}

export interface RefEvento {
  eje: 'fila' | 'columna';
  i: number;
}

export type OperacionConsulta = 'sola' | 'y' | 'o' | 'dado';

export interface Consulta {
  a: RefEvento;
  op: OperacionConsulta;
  b?: RefEvento;
}

export interface DatosContingencia {
  filas: EjeEvento[];
  columnas: EjeEvento[];
  conteos: number[][];
  consultas: Consulta[];
}

export interface ResultadoContingencia {
  total: number;
  respuestas: Racional[];
}

export function resolverContingencia(d: DatosContingencia, f: Formato): Respuesta<ResultadoContingencia> {
  const nf = d.filas.length;
  const nc = d.columnas.length;
  if (nf < 1 || nc < 1) return { ok: false, error: 'La tabla necesita al menos una fila y una columna.' };
  for (let i = 0; i < nf; i++) {
    for (let j = 0; j < nc; j++) {
      const v = d.conteos[i]?.[j];
      if (!(Number.isInteger(v) && v >= 0)) {
        return { ok: false, error: `La celda (${d.filas[i].nombre}, ${d.columnas[j].nombre}) debe ser un entero ≥ 0.` };
      }
    }
  }
  const totFila = d.conteos.map((f0) => f0.reduce((s, v) => s + v, 0));
  const totCol = d.columnas.map((_, j) => d.conteos.reduce((s, f0) => s + f0[j], 0));
  const N = totFila.reduce((s, v) => s + v, 0);
  if (N === 0) return { ok: false, error: 'La tabla está vacía (total 0).' };

  const valido = (r?: RefEvento) => !!r && (r.eje === 'fila' ? r.i >= 0 && r.i < nf : r.i >= 0 && r.i < nc);
  const sim = (r: RefEvento) => (r.eje === 'fila' ? d.filas[r.i] : d.columnas[r.i]).simbolo || '?';
  const nom = (r: RefEvento) => (r.eje === 'fila' ? d.filas[r.i] : d.columnas[r.i]).nombre;
  const celdas = (r: RefEvento): [number, number][] =>
    r.eje === 'fila' ? d.columnas.map((_, j) => [r.i, j]) : d.filas.map((_, i) => [i, r.i]);
  const n = (cs: [number, number][]) => cs.reduce((s, [i, j]) => s + d.conteos[i][j], 0);
  const interseccion = (x: RefEvento, y: RefEvento): [number, number][] => {
    const ys = new Set(celdas(y).map(([i, j]) => `${i},${j}`));
    return celdas(x).filter(([i, j]) => ys.has(`${i},${j}`));
  };

  const pasos: Paso[] = [
    paso({
      titulo: 'Tabla con totales',
      metodo: 'condicional',
      porque: 'Los totales de cada fila y columna (marginales) son los que se usan como denominadores de las probabilidades condicionales.',
      bloques: [
        {
          tipo: 'tabla',
          columnas: [{ titulo: '', alinear: 'izq' }, ...d.columnas.map((c) => ({ titulo: `${c.nombre} (${c.simbolo})` })), { titulo: 'Total' }],
          filas: d.filas.map((fi, i) => [`${fi.nombre} (${fi.simbolo})`, ...d.conteos[i].map((v) => fmtEntero(v)), fmtEntero(totFila[i])]),
          pie: ['Total', ...totCol.map((v) => fmtEntero(v)), fmtEntero(N)],
        },
      ],
    }),
  ];

  const respuestas: Racional[] = [];
  for (const q of d.consultas) {
    if (!valido(q.a) || (q.op !== 'sola' && !valido(q.b))) return { ok: false, error: 'Hay una pregunta con un evento que no existe en la tabla.' };
    const A = simTex(sim(q.a));
    const At = sim(q.a);
    if (q.op === 'sola') {
      const nA = n(celdas(q.a));
      const p = new Racional(BigInt(nA), BigInt(N));
      respuestas.push(p);
      pasos.push(
        paso({
          titulo: `P(${At})`,
          metodo: 'axiomas',
          porque: `Probabilidad de que la persona u objeto elegido sea «${nom(q.a)}»: casos de ese total marginal entre el total general.`,
          bloques: [
            b.formula(`P(${A}) = \\frac{n(${A})}{N} = ${cadenaFraccion(BigInt(nA), BigInt(N), f)}`, `P(${At}) = ${nA}/${N} = ${probTexto(p, f)}`),
            b.resultado(`P(${A}) = ${probTex(p, f)}`, `P(${At}) = ${probTexto(p, f)}`),
          ],
        }),
      );
      continue;
    }
    const qb = q.b!;
    const B = simTex(sim(qb));
    const Bt = sim(qb);
    const nA = n(celdas(q.a));
    const nB = n(celdas(qb));
    const nAB = n(interseccion(q.a, qb));
    if (q.op === 'y') {
      const p = new Racional(BigInt(nAB), BigInt(N));
      respuestas.push(p);
      pasos.push(
        paso({
          titulo: `P(${At} ∩ ${Bt})`,
          metodo: 'union-interseccion',
          porque: `La intersección son los casos que son a la vez «${nom(q.a)}» y «${nom(qb)}»: la celda donde se cruzan.`,
          bloques: [
            b.formula(`P(${A}\\cap ${B}) = \\frac{n(${A}\\cap ${B})}{N} = ${cadenaFraccion(BigInt(nAB), BigInt(N), f)}`, `P(${At} ∩ ${Bt}) = ${nAB}/${N}`),
            b.resultado(`P(${A}\\cap ${B}) = ${probTex(p, f)}`, `P(${At} ∩ ${Bt}) = ${probTexto(p, f)}`),
          ],
        }),
      );
    } else if (q.op === 'o') {
      const p = new Racional(BigInt(nA + nB - nAB), BigInt(N));
      respuestas.push(p);
      pasos.push(
        paso({
          titulo: `P(${At} ∪ ${Bt})`,
          metodo: 'regla-aditiva',
          porque: 'Se suman los casos de ambos eventos y se resta una vez la intersección, que quedó contada dos veces.',
          bloques: [
            b.formula(
              `P(${A}\\cup ${B}) = P(${A}) + P(${B}) - P(${A}\\cap ${B}) = \\frac{${nA}}{${N}} + \\frac{${nB}}{${N}} - \\frac{${nAB}}{${N}} = ${cadenaFraccion(BigInt(nA + nB - nAB), BigInt(N), f)}`,
              `P(${At} ∪ ${Bt}) = (${nA} + ${nB} − ${nAB})/${N} = ${probTexto(p, f)}`,
            ),
            ...(nAB === 0 ? [b.texto(`${At} y ${Bt} son mutuamente excluyentes (\\(${A}\\cap ${B} = \\varnothing\\)).`)] : []),
            b.resultado(`P(${A}\\cup ${B}) = ${probTex(p, f)}`, `P(${At} ∪ ${Bt}) = ${probTexto(p, f)}`),
          ],
        }),
      );
    } else {
      if (nB === 0) return { ok: false, error: `No se puede condicionar a ${Bt}: su total es 0.` };
      const p = new Racional(BigInt(nAB), BigInt(nB));
      respuestas.push(p);
      pasos.push(
        paso({
          titulo: `P(${At} | ${Bt})`,
          metodo: 'condicional',
          porque: `Como se sabe que ocurrió «${nom(qb)}», el espacio muestral se reduce a sus ${nB} casos; de ellos, ${nAB} son también «${nom(q.a)}».`,
          bloques: [
            b.formula(
              `P(${A}\\mid ${B}) = \\frac{P(${A}\\cap ${B})}{P(${B})} = \\frac{${nAB}/${N}}{${nB}/${N}} = \\frac{n(${A}\\cap ${B})}{n(${B})} = ${cadenaFraccion(BigInt(nAB), BigInt(nB), f)}`,
              `P(${At} | ${Bt}) = ${nAB}/${nB} = ${probTexto(p, f)}`,
            ),
            b.resultado(`P(${A}\\mid ${B}) = ${probTex(p, f)}`, `P(${At} | ${Bt}) = ${probTexto(p, f)}`),
          ],
        }),
      );
    }
  }
  return { ok: true, solucion: { resultado: { total: N, respuestas }, pasos } };
}
