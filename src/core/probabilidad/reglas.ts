/**
 * Reglas para dos y tres eventos: regla aditiva, complemento, probabilidad
 * condicional, regla del producto e independencia (diap. 26–34).
 */
import type { Formato } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { b, paso, type Paso, type Respuesta } from '../steps';

export type Relacion =
  | { tipo: 'interseccion'; valor: Racional }
  | { tipo: 'union'; valor: Racional }
  /** P(B | A) */
  | { tipo: 'condicionalBA'; valor: Racional }
  /** P(A | B) */
  | { tipo: 'condicionalAB'; valor: Racional }
  | { tipo: 'independientes' }
  | { tipo: 'excluyentes' };

export type TipoRelacion = Relacion['tipo'];

export interface EventoSimple {
  simbolo: string;
  descripcion: string;
  p: Racional;
}

export interface DatosDosEventos {
  A: EventoSimple;
  B: EventoSimple;
  relacion: Relacion;
}

export interface ResultadoDosEventos {
  interseccion: Racional;
  union: Racional;
  complementoA: Racional;
  complementoB: Racional;
  ninguno: Racional;
  BdadoA: Racional | null;
  AdadoB: Racional | null;
  independientes: boolean;
}

const max = (a: Racional, c: Racional) => (a.cmp(c) >= 0 ? a : c);
const min = (a: Racional, c: Racional) => (a.cmp(c) <= 0 ? a : c);

export function resolverDosEventos(d: DatosDosEventos, f: Formato): Respuesta<ResultadoDosEventos> {
  const { A, B, relacion: rel } = d;
  const a = simTex(A.simbolo || 'A');
  const c = simTex(B.simbolo || 'B');
  const at = A.simbolo || 'A';
  const ct = B.simbolo || 'B';
  const pA = A.p;
  const pB = B.p;
  const pasos: Paso[] = [];

  const datos: { latex: string; texto: string }[] = [
    { latex: `P(${a}) = ${probTex(pA, f)}`, texto: `P(${at}) = ${probTexto(pA, f)}` },
    { latex: `P(${c}) = ${probTex(pB, f)}`, texto: `P(${ct}) = ${probTexto(pB, f)}` },
  ];
  switch (rel.tipo) {
    case 'interseccion':
      datos.push({ latex: `P(${a}\\cap ${c}) = ${probTex(rel.valor, f)}`, texto: `P(${at} ∩ ${ct}) = ${probTexto(rel.valor, f)}` });
      break;
    case 'union':
      datos.push({ latex: `P(${a}\\cup ${c}) = ${probTex(rel.valor, f)}`, texto: `P(${at} ∪ ${ct}) = ${probTexto(rel.valor, f)}` });
      break;
    case 'condicionalBA':
      datos.push({ latex: `P(${c}\\mid ${a}) = ${probTex(rel.valor, f)}`, texto: `P(${ct} | ${at}) = ${probTexto(rel.valor, f)}` });
      break;
    case 'condicionalAB':
      datos.push({ latex: `P(${a}\\mid ${c}) = ${probTex(rel.valor, f)}`, texto: `P(${at} | ${ct}) = ${probTexto(rel.valor, f)}` });
      break;
    case 'independientes':
      datos.push({ latex: `${a}\\text{ y }${c}\\text{ son independientes}`, texto: `${at} y ${ct} son independientes` });
      break;
    case 'excluyentes':
      datos.push({ latex: `${a}\\text{ y }${c}\\text{ son mutuamente excluyentes}`, texto: `${at} y ${ct} son mutuamente excluyentes` });
      break;
  }
  const descripciones = [A, B].filter((e) => e.descripcion).map((e) => `${e.simbolo}: ${e.descripcion}`);
  pasos.push(
    paso({
      titulo: 'Datos del problema',
      metodo: 'axiomas',
      bloques: [
        ...(descripciones.length ? [b.lista(descripciones, 'Eventos')] : []),
        b.formula(datos.map((x) => x.latex).join(',\\qquad '), datos.map((x) => x.texto).join('; ')),
      ],
    }),
  );

  // Intersección
  let inter: Racional;
  switch (rel.tipo) {
    case 'interseccion':
      inter = rel.valor;
      break;
    case 'union':
      inter = pA.mas(pB).menos(rel.valor);
      pasos.push(
        paso({
          titulo: `Intersección ${at} ∩ ${ct}`,
          metodo: 'regla-aditiva',
          porque: 'Se despeja P(A ∩ B) de la regla aditiva P(A ∪ B) = P(A) + P(B) − P(A ∩ B).',
          bloques: [
            b.formula(
              `P(${a}\\cap ${c}) = P(${a}) + P(${c}) - P(${a}\\cup ${c}) = ${pA.aLatex()} + ${pB.aLatex()} - ${rel.valor.aLatex()} = ${probTex(inter, f)}`,
              `P(${at} ∩ ${ct}) = ${probTexto(inter, f)}`,
            ),
          ],
        }),
      );
      break;
    case 'condicionalBA':
      inter = pA.por(rel.valor);
      pasos.push(
        paso({
          titulo: `Intersección ${at} ∩ ${ct} (regla del producto)`,
          metodo: 'regla-producto',
          porque: 'Para que ocurran A y B, primero ocurre A y luego, sabiendo que ocurrió A, ocurre B: se multiplican P(A) y P(B | A).',
          bloques: [
            b.formula(
              `P(${a}\\cap ${c}) = P(${a})\\,P(${c}\\mid ${a}) = ${pA.aLatex()} \\cdot ${rel.valor.aLatex()} = ${probTex(inter, f)}`,
              `P(${at} ∩ ${ct}) = ${probTexto(inter, f)}`,
            ),
          ],
        }),
      );
      break;
    case 'condicionalAB':
      inter = pB.por(rel.valor);
      pasos.push(
        paso({
          titulo: `Intersección ${at} ∩ ${ct} (regla del producto)`,
          metodo: 'regla-producto',
          porque: 'Para que ocurran A y B, primero ocurre B y luego, sabiendo que ocurrió B, ocurre A: se multiplican P(B) y P(A | B).',
          bloques: [
            b.formula(
              `P(${a}\\cap ${c}) = P(${c})\\,P(${a}\\mid ${c}) = ${pB.aLatex()} \\cdot ${rel.valor.aLatex()} = ${probTex(inter, f)}`,
              `P(${at} ∩ ${ct}) = ${probTexto(inter, f)}`,
            ),
          ],
        }),
      );
      break;
    case 'independientes':
      inter = pA.por(pB);
      pasos.push(
        paso({
          titulo: `Intersección ${at} ∩ ${ct} (eventos independientes)`,
          metodo: 'independencia',
          porque: 'Si A y B son independientes, saber que ocurrió uno no cambia la probabilidad del otro, y entonces P(A ∩ B) = P(A)P(B).',
          bloques: [
            b.formula(
              `P(${a}\\cap ${c}) = P(${a})\\,P(${c}) = ${pA.aLatex()} \\cdot ${pB.aLatex()} = ${probTex(inter, f)}`,
              `P(${at} ∩ ${ct}) = ${probTexto(inter, f)}`,
            ),
          ],
        }),
      );
      break;
    case 'excluyentes':
      inter = Racional.CERO;
      pasos.push(
        paso({
          titulo: `Intersección ${at} ∩ ${ct}`,
          metodo: 'union-interseccion',
          porque: 'Dos eventos mutuamente excluyentes no tienen elementos en común: A ∩ B = ∅.',
          bloques: [b.formula(`${a}\\cap ${c} = \\varnothing \\;\\Rightarrow\\; P(${a}\\cap ${c}) = 0`, `P(${at} ∩ ${ct}) = 0`)],
        }),
      );
      break;
  }

  const minimo = max(Racional.CERO, pA.mas(pB).menos(Racional.UNO));
  const maximo = min(pA, pB);
  if (inter.cmp(minimo) < 0 || inter.cmp(maximo) > 0) {
    return {
      ok: false,
      error: `Los datos no son coherentes: P(${at} ∩ ${ct}) = ${probTexto(inter, f)}, pero debe estar entre ${probTexto(minimo, f)} y ${probTexto(maximo, f)} (no puede superar a P(${at}) ni a P(${ct}), y P(${at} ∪ ${ct}) no puede pasar de 1).`,
    };
  }
  const union = pA.mas(pB).menos(inter);

  pasos.push(
    paso({
      titulo: `Unión ${at} ∪ ${ct} (regla aditiva)`,
      metodo: 'regla-aditiva',
      porque: 'Al sumar P(A) y P(B), los resultados comunes quedan contados dos veces; por eso se resta una vez P(A ∩ B).',
      bloques: [
        b.formula(
          `P(${a}\\cup ${c}) = P(${a}) + P(${c}) - P(${a}\\cap ${c}) = ${pA.aLatex()} + ${pB.aLatex()} - ${inter.aLatex()} = ${probTex(union, f)}`,
          `P(${at} ∪ ${ct}) = ${probTexto(union, f)}`,
        ),
        ...(rel.tipo === 'union' ? [b.texto('Coincide con el dato del problema.')] : []),
      ],
    }),
  );

  const cA = pA.complemento();
  const cB = pB.complemento();
  const ninguno = union.complemento();
  pasos.push(
    paso({
      titulo: 'Complementos',
      metodo: 'complemento',
      porque: 'A y A′ son complementarios: juntos forman S y no se cruzan, así que P(A) + P(A′) = P(S) = 1.',
      bloques: [
        b.formula(
          `P(${a}') = 1 - ${pA.aLatex()} = ${probTex(cA, f)},\\qquad P(${c}') = 1 - ${pB.aLatex()} = ${probTex(cB, f)}`,
          `P(${at}′) = ${probTexto(cA, f)}; P(${ct}′) = ${probTexto(cB, f)}`,
        ),
        b.formula(
          `P(${a}'\\cap ${c}') = 1 - P(${a}\\cup ${c}) = 1 - ${union.aLatex()} = ${probTex(ninguno, f)}`,
          `P(ninguno) = 1 − P(${at} ∪ ${ct}) = ${probTexto(ninguno, f)}`,
        ),
        b.texto(`\\(P(${a}'\\cap ${c}')\\) es la probabilidad de que no ocurra ninguno de los dos eventos.`),
      ],
    }),
  );

  const BdadoA = pA.esCero() ? null : inter.entre(pA);
  const AdadoB = pB.esCero() ? null : inter.entre(pB);
  const condBloques = [];
  if (BdadoA) {
    condBloques.push(
      b.formula(
        `P(${c}\\mid ${a}) = \\frac{P(${a}\\cap ${c})}{P(${a})} = \\frac{${inter.aLatex()}}{${pA.aLatex()}} = ${probTex(BdadoA, f)}`,
        `P(${ct} | ${at}) = ${probTexto(BdadoA, f)}`,
      ),
    );
  }
  if (AdadoB) {
    condBloques.push(
      b.formula(
        `P(${a}\\mid ${c}) = \\frac{P(${a}\\cap ${c})}{P(${c})} = \\frac{${inter.aLatex()}}{${pB.aLatex()}} = ${probTex(AdadoB, f)}`,
        `P(${at} | ${ct}) = ${probTexto(AdadoB, f)}`,
      ),
    );
  }
  if (condBloques.length) {
    pasos.push(
      paso({
        titulo: 'Probabilidades condicionales',
        metodo: 'condicional',
        porque: 'Saber que ocurrió un evento reduce el espacio muestral a ese evento; la probabilidad del otro se mide dentro de él.',
        bloques: condBloques,
      }),
    );
  }

  const producto = pA.por(pB);
  const independientes = producto.igual(inter);
  pasos.push(
    paso({
      titulo: '¿Son independientes?',
      metodo: 'independencia',
      porque: 'A y B son independientes si y solo si P(A ∩ B) = P(A)P(B); es decir, si saber que ocurrió uno no cambia la probabilidad del otro.',
      bloques: [
        b.formula(
          `P(${a})\\,P(${c}) = ${pA.aLatex()} \\cdot ${pB.aLatex()} = ${probTex(producto, f)} \\;${independientes ? '=' : '\\neq'}\\; P(${a}\\cap ${c}) = ${probTex(inter, f)}`,
          `P(${at})P(${ct}) = ${probTexto(producto, f)} ${independientes ? '=' : '≠'} ${probTexto(inter, f)}`,
        ),
        b.conclusion(
          independientes
            ? `${at} y ${ct} son independientes.`
            : `${at} y ${ct} son dependientes: la ocurrencia de uno cambia la probabilidad del otro.`,
          independientes ? 'afirmativo' : 'neutro',
        ),
      ],
    }),
  );

  return {
    ok: true,
    solucion: {
      resultado: { interseccion: inter, union, complementoA: cA, complementoB: cB, ninguno, BdadoA, AdadoB, independientes },
      pasos,
    },
  };
}

export interface DatosTresEventos {
  simbolos: [string, string, string];
  pA: Racional;
  pB: Racional;
  pC: Racional;
  pAB: Racional;
  pAC: Racional;
  pBC: Racional;
  pABC: Racional;
}

export function resolverTresEventos(d: DatosTresEventos, f: Formato): Respuesta<Racional> {
  const [a, c, e] = d.simbolos.map((s, i) => simTex(s || 'ABC'[i]));
  const u = d.pA.mas(d.pB).mas(d.pC).menos(d.pAB).menos(d.pAC).menos(d.pBC).mas(d.pABC);
  if (!u.enRango01()) {
    return {
      ok: false,
      error: `Con estos datos P(A ∪ B ∪ C) = ${probTexto(u, f)}, que no está entre 0 y 1. Revisa las intersecciones.`,
    };
  }
  const L = (r: Racional) => r.aLatex();
  return {
    ok: true,
    solucion: {
      resultado: u,
      pasos: [
        paso({
          titulo: 'Regla aditiva para tres eventos',
          metodo: 'regla-aditiva',
          porque:
            'Al sumar las tres probabilidades, las intersecciones de a dos se cuentan dos veces (se restan) y la intersección de los tres se descuenta de más (se vuelve a sumar).',
          bloques: [
            b.formula(
              `P(${a}\\cup ${c}\\cup ${e}) = P(${a}) + P(${c}) + P(${e}) - P(${a}\\cap ${c}) - P(${a}\\cap ${e}) - P(${c}\\cap ${e}) + P(${a}\\cap ${c}\\cap ${e})`,
              'P(A ∪ B ∪ C) = P(A) + P(B) + P(C) − P(A∩B) − P(A∩C) − P(B∩C) + P(A∩B∩C)',
            ),
            b.formula(
              `= ${L(d.pA)} + ${L(d.pB)} + ${L(d.pC)} - ${L(d.pAB)} - ${L(d.pAC)} - ${L(d.pBC)} + ${L(d.pABC)} = ${probTex(u, f)}`,
              `= ${probTexto(u, f)}`,
            ),
            b.resultado(`P(${a}\\cup ${c}\\cup ${e}) = ${probTex(u, f)}`, `P(A ∪ B ∪ C) = ${probTexto(u, f)}`),
          ],
        }),
      ],
    },
  };
}
