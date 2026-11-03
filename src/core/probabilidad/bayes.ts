/** Probabilidad total (diap. 35–36) y teorema de Bayes (diap. 37). */
import type { Formato } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { b, paso, type Paso, type Respuesta } from '../steps';

export interface RamaBayes {
  simbolo: string;
  descripcion: string;
  /** P(Bᵢ) */
  prior: Racional;
  /** P(A | Bᵢ) */
  verosimilitud: Racional;
}

export interface DatosBayes {
  evento: { simbolo: string; descripcion: string };
  particion: RamaBayes[];
  /** Índice de la rama cuya probabilidad a posteriori se pide; null = todas por igual. */
  objetivo: number | null;
}

export interface ResultadoBayes {
  total: Racional;
  conjuntas: Racional[];
  posteriores: Racional[];
}

export function resolverBayes(d: DatosBayes, f: Formato): Respuesta<ResultadoBayes> {
  const k = d.particion.length;
  if (k < 2) return { ok: false, error: 'Una partición necesita al menos dos eventos B₁, B₂.' };
  const suma = d.particion.reduce((s, r) => s.mas(r.prior), Racional.CERO);
  if (!suma.igual(Racional.UNO)) {
    return {
      ok: false,
      error: `Las probabilidades P(Bᵢ) deben sumar 1 porque los Bᵢ forman una partición de S; ahora suman ${probTexto(suma, f)}. Si un valor es periódico, escríbelo como fracción (1/3).`,
    };
  }
  if (d.particion.some((r) => r.prior.esCero())) return { ok: false, error: 'Cada P(Bᵢ) debe ser mayor que 0.' };

  const A = simTex(d.evento.simbolo || 'A');
  const At = d.evento.simbolo || 'A';
  const Bs = d.particion.map((r, i) => simTex(r.simbolo || `B${i + 1}`));
  const Bt = d.particion.map((r, i) => r.simbolo || `B${i + 1}`);
  const conjuntas = d.particion.map((r) => r.prior.por(r.verosimilitud));
  const total = conjuntas.reduce((s, v) => s.mas(v), Racional.CERO);
  const pasos: Paso[] = [];

  pasos.push(
    paso({
      titulo: 'Partición y datos',
      metodo: 'probabilidad-total',
      porque: 'Los eventos Bᵢ no se cruzan y juntos cubren todo S (forman una partición). Por eso sus probabilidades suman 1.',
      bloques: [
        b.texto(`${At}: ${d.evento.descripcion || 'evento de interés'}.`),
        {
          tipo: 'tabla',
          columnas: [{ titulo: 'Bᵢ', alinear: 'centro' }, { titulo: 'Descripción', alinear: 'izq' }, { titulo: 'P(Bᵢ)' }, { titulo: `P(${At} | Bᵢ)` }],
          filas: d.particion.map((r, i) => [
            Bt[i],
            r.descripcion,
            { latex: probTex(r.prior, f), texto: probTexto(r.prior, f) },
            { latex: probTex(r.verosimilitud, f), texto: probTexto(r.verosimilitud, f) },
          ]),
          pie: ['Σ', '', '1', ''],
        },
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: 'Regla del producto en cada rama',
      metodo: 'regla-producto',
      porque: `En el diagrama de árbol, cada rama es «primero ocurre Bᵢ y luego ${At}»: su probabilidad es P(Bᵢ)·P(${At} | Bᵢ).`,
      bloques: [
        b.formula(
          `\\begin{aligned} ${d.particion
            .map((r, i) => `P(${Bs[i]}\\cap ${A}) &= P(${Bs[i]})\\,P(${A}\\mid ${Bs[i]}) = ${r.prior.aLatex()} \\cdot ${r.verosimilitud.aLatex()} = ${probTex(conjuntas[i], f)}`)
            .join(' \\\\ ')} \\end{aligned}`,
          conjuntas.map((c, i) => `P(${Bt[i]} ∩ ${At}) = ${probTexto(c, f)}`).join('; '),
        ),
      ],
    }),
  );

  pasos.push(
    paso({
      titulo: `Probabilidad total de ${At}`,
      metodo: 'probabilidad-total',
      porque: `${At} puede ocurrir por cualquiera de las ramas, que son mutuamente excluyentes; por eso P(${At}) es la suma de las probabilidades de todas las ramas.`,
      bloques: [
        b.formula(
          `P(${A}) = \\sum_{i=1}^{${k}} P(B_i)\\,P(${A}\\mid B_i) = ${conjuntas.map((c) => c.aLatex()).join(' + ')} = ${probTex(total, f)}`,
          `P(${At}) = ${conjuntas.map((c) => c.aTexto()).join(' + ')} = ${probTexto(total, f)}`,
        ),
        b.resultado(`P(${A}) = ${probTex(total, f)}`, `P(${At}) = ${probTexto(total, f)}`),
      ],
    }),
  );

  if (total.esCero()) {
    return { ok: true, solucion: { resultado: { total, conjuntas, posteriores: [] }, pasos } };
  }

  const posteriores = conjuntas.map((c) => c.entre(total));
  const r = d.objetivo !== null && d.objetivo >= 0 && d.objetivo < k ? d.objetivo : null;
  const bloques = [];
  if (r !== null) {
    bloques.push(
      b.formula(
        `P(${Bs[r]}\\mid ${A}) = \\frac{P(${Bs[r]})\\,P(${A}\\mid ${Bs[r]})}{\\sum_{i=1}^{${k}} P(B_i)\\,P(${A}\\mid B_i)} = \\frac{${conjuntas[r].aLatex()}}{${total.aLatex()}} = ${probTex(posteriores[r], f)}`,
        `P(${Bt[r]} | ${At}) = ${probTexto(posteriores[r], f)}`,
      ),
      b.resultado(`P(${Bs[r]}\\mid ${A}) = ${probTex(posteriores[r], f)}`, `P(${Bt[r]} | ${At}) = ${probTexto(posteriores[r], f)}`),
    );
  }
  bloques.push({
    tipo: 'tabla' as const,
    columnas: [{ titulo: 'Bᵢ', alinear: 'centro' as const }, { titulo: `P(Bᵢ ∩ ${At})` }, { titulo: `P(Bᵢ | ${At})` }],
    filas: d.particion.map((_, i) => [
      Bt[i],
      { latex: probTex(conjuntas[i], f), texto: probTexto(conjuntas[i], f) },
      { latex: probTex(posteriores[i], f), texto: probTexto(posteriores[i], f) },
    ]),
    pie: ['Σ', { latex: probTex(total, f), texto: probTexto(total, f) }, '1'],
  });
  pasos.push(
    paso({
      titulo: r !== null ? `Teorema de Bayes: P(${Bt[r]} | ${At})` : 'Teorema de Bayes',
      metodo: 'bayes',
      porque: `Bayes invierte la condición: se sabe que ocurrió ${At} y se pregunta por cuál rama llegó. Es la probabilidad de esa rama dividida entre la probabilidad total de ${At}.`,
      bloques,
    }),
  );

  return { ok: true, solucion: { resultado: { total, conjuntas, posteriores }, pasos } };
}
