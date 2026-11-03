/**
 * Espacio muestral, eventos y probabilidad como suma de pesos de los puntos
 * muestrales (diap. 4–13 y 22–25).
 */
import { type Formato, fmt } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { parseRacional, type Lectura } from '../entrada';
import { b, paso, type Paso, type Respuesta } from '../steps';
import { cadenaFraccion } from './clasica';

export type TipoEspacio = 'monedas' | 'dados' | 'moneda-dado' | 'domino' | 'urna' | 'lista';
export type ModoPesos = 'uniforme' | 'proporcional' | 'pares-doble' | 'personalizado';

export interface CategoriaEspacio {
  nombre: string;
  simbolo: string;
  cantidad: number;
}

export interface ConfigEspacio {
  tipo: TipoEspacio;
  /** Número de monedas o de dados. */
  cantidad: number;
  categorias: CategoriaEspacio[];
  elementos: string[];
  pesos: ModoPesos;
  /** Pesos relativos por punto (texto: «1», «2», «0,12», «1/9»). */
  pesosPersonalizados: string[];
}

export interface Punto {
  id: string;
  /** Atributos numéricos para describir eventos (suma, caras, d1…). */
  a: Record<string, number>;
}

export interface EventoEspacio {
  nombre: string;
  descripcion: string;
  ids: string[];
}

export interface DatosEspacio {
  config: ConfigEspacio;
  eventos: EventoEspacio[];
  /** Par de eventos (índices) para unión, intersección y condicional. */
  par: [number, number] | null;
}

export const LIMITES = { monedas: 6, dados: 3 } as const;

function producto<T>(listas: T[][]): T[][] {
  return listas.reduce<T[][]>((acc, l) => acc.flatMap((pre) => l.map((v) => [...pre, v])), [[]]);
}

export function describirExperimento(c: ConfigEspacio): string {
  switch (c.tipo) {
    case 'monedas':
      return c.cantidad === 1 ? 'Lanzar una moneda (C = cara, S = sello)' : `Lanzar ${c.cantidad} monedas (C = cara, S = sello)`;
    case 'dados':
      return c.cantidad === 1 ? 'Lanzar un dado' : `Lanzar ${c.cantidad} dados`;
    case 'moneda-dado':
      return 'Lanzar una moneda y un dado';
    case 'domino':
      return 'Levantar una ficha de dominó (28 fichas, de 0|0 a 6|6)';
    case 'urna':
      return `Sacar un objeto al azar de: ${c.categorias.map((k) => `${k.cantidad} ${k.nombre} (${k.simbolo})`).join(', ')}`;
    case 'lista':
      return 'Experimento con resultados escritos a mano';
  }
}

export function generarPuntos(c: ConfigEspacio): Lectura<Punto[]> {
  switch (c.tipo) {
    case 'monedas': {
      if (!(c.cantidad >= 1 && c.cantidad <= LIMITES.monedas)) {
        return { ok: false, error: `Elige entre 1 y ${LIMITES.monedas} monedas.` };
      }
      const combos = producto(Array.from({ length: c.cantidad }, () => ['C', 'S']));
      return {
        ok: true,
        valor: combos.map((cs) => {
          const caras = cs.filter((v) => v === 'C').length;
          return { id: cs.join(''), a: { caras, sellos: c.cantidad - caras } };
        }),
      };
    }
    case 'dados': {
      if (!(c.cantidad >= 1 && c.cantidad <= LIMITES.dados)) {
        return { ok: false, error: `Elige entre 1 y ${LIMITES.dados} dados.` };
      }
      const caras = [1, 2, 3, 4, 5, 6];
      const combos = producto(Array.from({ length: c.cantidad }, () => caras));
      return {
        ok: true,
        valor: combos.map((ds) => {
          const a: Record<string, number> = { suma: ds.reduce((s, v) => s + v, 0) };
          ds.forEach((v, i) => (a[`d${i + 1}`] = v));
          return { id: ds.length === 1 ? String(ds[0]) : `(${ds.join(',')})`, a };
        }),
      };
    }
    case 'moneda-dado':
      return {
        ok: true,
        valor: ['C', 'S'].flatMap((m) =>
          [1, 2, 3, 4, 5, 6].map((d) => ({ id: `${m}${d}`, a: { cara: m === 'C' ? 1 : 0, dado: d } })),
        ),
      };
    case 'domino': {
      const valor: Punto[] = [];
      for (let x = 0; x <= 6; x++) for (let y = x; y <= 6; y++) valor.push({ id: `${x}|${y}`, a: { a: x, b: y, suma: x + y } });
      return { ok: true, valor };
    }
    case 'urna': {
      if (c.categorias.length === 0) return { ok: false, error: 'Agrega al menos una categoría de objetos.' };
      const simbolos = new Set<string>();
      const valor: Punto[] = [];
      for (const [ci, k] of c.categorias.entries()) {
        const s = k.simbolo.trim();
        if (!s) return { ok: false, error: `Falta el símbolo de «${k.nombre}».` };
        if (simbolos.has(s)) return { ok: false, error: `El símbolo «${s}» está repetido.` };
        simbolos.add(s);
        if (!(Number.isInteger(k.cantidad) && k.cantidad >= 1 && k.cantidad <= 60)) {
          return { ok: false, error: `La cantidad de «${k.nombre}» debe ser un entero entre 1 y 60.` };
        }
        for (let i = 1; i <= k.cantidad; i++) valor.push({ id: k.cantidad === 1 ? s : `${s}${i}`, a: { categoria: ci } });
      }
      return { ok: true, valor };
    }
    case 'lista': {
      const ids = c.elementos.map((e) => e.trim()).filter(Boolean);
      if (ids.length === 0) return { ok: false, error: 'Escribe los resultados posibles separados por comas.' };
      if (new Set(ids).size !== ids.length) return { ok: false, error: 'Hay resultados repetidos en la lista.' };
      if (ids.length > 300) return { ok: false, error: 'La lista puede tener como máximo 300 resultados.' };
      return { ok: true, valor: ids.map((id, i) => ({ id, a: { indice: i + 1 } })) };
    }
  }
}

export function calcularPesos(c: ConfigEspacio, puntos: Punto[]): Lectura<Racional[]> {
  const N = puntos.length;
  switch (c.pesos) {
    case 'uniforme':
      return { ok: true, valor: puntos.map(() => new Racional(1n, BigInt(N))) };
    case 'proporcional':
    case 'pares-doble': {
      if (!(c.tipo === 'dados' && c.cantidad === 1)) {
        return { ok: false, error: 'Esta asignación de pesos solo aplica al lanzamiento de un dado.' };
      }
      const rel = puntos.map((p) => (c.pesos === 'proporcional' ? p.a.d1 : p.a.d1 % 2 === 0 ? 2 : 1));
      const total = rel.reduce((s, v) => s + v, 0);
      return { ok: true, valor: rel.map((v) => Racional.de(v, total)) };
    }
    case 'personalizado': {
      const rel: Racional[] = [];
      for (let i = 0; i < N; i++) {
        const r = parseRacional(c.pesosPersonalizados[i] ?? '');
        if (!r.ok) return { ok: false, error: `Peso de ${puntos[i].id}: ${r.error}` };
        if (r.valor.num < 0n) return { ok: false, error: `El peso de ${puntos[i].id} no puede ser negativo.` };
        rel.push(r.valor);
      }
      const total = rel.reduce((s, v) => s.mas(v), Racional.CERO);
      if (total.esCero()) return { ok: false, error: 'Al menos un punto debe tener peso mayor que 0.' };
      return { ok: true, valor: rel.map((v) => v.entre(total)) };
    }
  }
}

export interface ResultadoEspacio {
  puntos: Punto[];
  pesos: Racional[];
  probabilidades: Racional[];
}

export function resolverEspacio(d: DatosEspacio, f: Formato): Respuesta<ResultadoEspacio> {
  const gen = generarPuntos(d.config);
  if (!gen.ok) return gen;
  const puntos = gen.valor;
  const pw = calcularPesos(d.config, puntos);
  if (!pw.ok) return pw;
  const pesos = pw.valor;
  const N = puntos.length;
  const uniforme = d.config.pesos === 'uniforme';
  const peso = new Map(puntos.map((p, i) => [p.id, pesos[i]]));
  const orden = new Map(puntos.map((p, i) => [p.id, i]));
  const ordenar = (ids: Iterable<string>) => [...new Set(ids)].filter((id) => orden.has(id)).sort((a, z) => orden.get(a)! - orden.get(z)!);
  const prob = (ids: string[]) => ids.reduce((s, id) => s.mas(peso.get(id)!), Racional.CERO);

  for (const e of d.eventos) {
    const fuera = e.ids.filter((id) => !orden.has(id));
    if (fuera.length) return { ok: false, error: `El evento ${e.nombre} tiene resultados que no están en S: ${fuera.join(', ')}.` };
  }

  const pasos: Paso[] = [];
  pasos.push(
    paso({
      titulo: 'Espacio muestral',
      metodo: 'espacio-muestral',
      porque: 'El espacio muestral S es el conjunto de todos los resultados posibles del experimento; cada resultado es un punto muestral.',
      bloques: [
        b.texto(describirExperimento(d.config) + '.'),
        b.lista(puntos.map((p) => p.id), 'S ='),
        b.formula(`n(S) = ${N}`, `n(S) = ${N}`),
      ],
    }),
  );

  if (!uniforme) {
    pasos.push(
      paso({
        titulo: 'Pesos de los puntos muestrales',
        metodo: 'axiomas',
        porque: 'Los resultados no son igualmente probables: cada punto recibe un peso, y los pesos de todo S deben sumar 1 porque P(S) = 1.',
        bloques: [
          {
            tipo: 'tabla',
            columnas: [{ titulo: 'Punto', alinear: 'centro' }, { titulo: 'Peso' }],
            filas: puntos.map((p, i) => [p.id, { latex: probTex(pesos[i], f), texto: probTexto(pesos[i], f) }]),
            pie: ['Σ', '1'],
          },
        ],
      }),
    );
  }

  const probabilidades: Racional[] = [];
  for (const e of d.eventos) {
    const ids = ordenar(e.ids);
    const p = prob(ids);
    probabilidades.push(p);
    const E = simTex(e.nombre);
    const formula = uniforme
      ? b.formula(
          `P(${E}) = \\frac{n(${E})}{n(S)} = ${cadenaFraccion(BigInt(ids.length), BigInt(N), f)}`,
          `P(${e.nombre}) = ${ids.length}/${N} = ${probTexto(p, f)}`,
        )
      : b.formula(
          `P(${E}) = ${ids.length ? ids.map((id) => peso.get(id)!.aLatex()).join(' + ') : '0'} = ${probTex(p, f)}`,
          `P(${e.nombre}) = ${probTexto(p, f)}`,
        );
    pasos.push(
      paso({
        titulo: `Evento ${e.nombre}`,
        metodo: 'axiomas',
        porque: uniforme
          ? 'Todos los puntos de S son igualmente probables (peso 1/n(S)), así que P(E) es el número de puntos de E dividido entre n(S).'
          : 'La probabilidad de un evento es la suma de los pesos de los puntos muestrales que contiene.',
        bloques: [
          ...(e.descripcion ? [b.texto(`${e.nombre}: ${e.descripcion}.`)] : []),
          ids.length ? b.lista(ids, `${e.nombre} =`) : b.texto(`${e.nombre} = ∅ (evento vacío).`),
          formula,
        ],
      }),
    );
  }

  if (d.par && d.par[0] !== d.par[1] && d.eventos[d.par[0]] && d.eventos[d.par[1]]) {
    const X = d.eventos[d.par[0]];
    const Y = d.eventos[d.par[1]];
    const Ys = new Set(Y.ids);
    const union = ordenar([...X.ids, ...Y.ids]);
    const inter = ordenar(X.ids.filter((id) => Ys.has(id)));
    const pX = prob(ordenar(X.ids));
    const pY = prob(ordenar(Y.ids));
    const pI = prob(inter);
    const pU = pX.mas(pY).menos(pI);
    const x = simTex(X.nombre);
    const y = simTex(Y.nombre);
    pasos.push(
      paso({
        titulo: `Unión e intersección de ${X.nombre} y ${Y.nombre}`,
        metodo: 'union-interseccion',
        porque: `${X.nombre} ∪ ${Y.nombre} reúne los resultados que están en ${X.nombre}, en ${Y.nombre} o en ambos; ${X.nombre} ∩ ${Y.nombre} contiene solo los comunes.`,
        bloques: [
          union.length ? b.lista(union, `${X.nombre} ∪ ${Y.nombre} =`) : b.texto(`${X.nombre} ∪ ${Y.nombre} = ∅`),
          inter.length ? b.lista(inter, `${X.nombre} ∩ ${Y.nombre} =`) : b.texto(`${X.nombre} ∩ ${Y.nombre} = ∅: los eventos son mutuamente excluyentes.`),
        ],
      }),
    );
    pasos.push(
      paso({
        titulo: `Probabilidad de ${X.nombre} ∪ ${Y.nombre}`,
        metodo: 'regla-aditiva',
        porque: `Al sumar P(${X.nombre}) y P(${Y.nombre}), los resultados comunes se cuentan dos veces; por eso se resta una vez P(${X.nombre} ∩ ${Y.nombre}).`,
        bloques: [
          b.formula(
            `P(${x}\\cup ${y}) = P(${x}) + P(${y}) - P(${x}\\cap ${y}) = ${pX.aLatex()} + ${pY.aLatex()} - ${pI.aLatex()} = ${probTex(pU, f)}`,
            `P(${X.nombre} ∪ ${Y.nombre}) = ${probTexto(pU, f)}`,
          ),
        ],
      }),
    );
    if (!pY.esCero()) {
      const cond = pI.entre(pY);
      pasos.push(
        paso({
          titulo: `Probabilidad condicional P(${X.nombre} | ${Y.nombre})`,
          metodo: 'condicional',
          porque: `Saber que ocurrió ${Y.nombre} reduce el espacio muestral a ${Y.nombre}; dentro de él, los casos favorables son los de ${X.nombre} ∩ ${Y.nombre}.`,
          bloques: [
            b.formula(
              `P(${x}\\mid ${y}) = \\frac{P(${x}\\cap ${y})}{P(${y})} = \\frac{${pI.aLatex()}}{${pY.aLatex()}} = ${probTex(cond, f)}`,
              `P(${X.nombre} | ${Y.nombre}) = ${probTexto(cond, f)}`,
            ),
            ...(uniforme ? [b.texto(`Con conteos: \\(n(${x}\\cap ${y})/n(${y}) = ${inter.length}/${Ys.size}\\).`)] : []),
          ],
        }),
      );
    }
  }

  return { ok: true, solucion: { resultado: { puntos, pesos, probabilidades }, pasos } };
}

/** Utilidad para los ejemplos: ids de los puntos que cumplen una condición. */
export function idsDonde(c: ConfigEspacio, cond: (p: Punto) => boolean): string[] {
  const g = generarPuntos(c);
  return g.ok ? g.valor.filter(cond).map((p) => p.id) : [];
}

export const fmtProb = (p: Racional, f: Formato) => fmt(p.aNumero(), f);
