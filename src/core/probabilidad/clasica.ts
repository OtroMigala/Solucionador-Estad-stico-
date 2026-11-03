/** Probabilidad clásica por conteo: P(A) = n(A)/n(S) (diap. 22–25). */
import { type Formato, fmtTex } from '../formato';
import { simTex } from '../latex';
import { Racional, probTex, probTexto } from '../racional';
import { b, paso, type Respuesta } from '../steps';
import { type ExpresionConteo, enteroTex, enteroTexto, resolverConteo } from '../combinatoria';

/** «\frac{4}{10} = \frac{2}{5} = 0{,}4»: fracción original, simplificada y decimal. */
export function cadenaFraccion(num: bigint, den: bigint, f: Formato): string {
  const p = new Racional(num, den);
  let s = `\\frac{${enteroTex(num)}}{${enteroTex(den)}}`;
  if (p.num !== num || p.den !== den) s += ` = ${p.aLatex()}`;
  if (!p.esEntero()) s += ` ${p.decimalExacto(f.decimales) ? '=' : '\\approx'} ${fmtTex(p.aNumero(), f)}`;
  return s;
}

export function resolverProbConteo(
  favorables: ExpresionConteo,
  totales: ExpresionConteo,
  evento: string,
  f: Formato,
): Respuesta<Racional> {
  const a = resolverConteo(favorables, 'Casos favorables');
  if (!a.ok) return { ok: false, error: `Casos favorables: ${a.error}` };
  const s = resolverConteo(totales, 'Casos posibles');
  if (!s.ok) return { ok: false, error: `Casos posibles: ${s.error}` };
  const nA = a.solucion.resultado;
  const nS = s.solucion.resultado;
  if (nS === 0n) return { ok: false, error: 'El número de casos posibles no puede ser 0.' };
  if (nA > nS) {
    return {
      ok: false,
      error: `Hay más casos favorables (${enteroTexto(nA)}) que posibles (${enteroTexto(nS)}). Revisa el planteamiento.`,
    };
  }
  const p = new Racional(nA, nS);
  const E = simTex(evento || 'A');
  const Et = evento || 'A';
  const final = paso({
    titulo: `Probabilidad de ${Et}`,
    metodo: 'axiomas',
    porque:
      'Si todos los resultados posibles son igualmente probables, cada uno pesa 1/n(S), y la probabilidad de A es la suma de los pesos de sus resultados: n(A)/n(S).',
    bloques: [
      b.formula(
        `P(${E}) = \\frac{n(${E})}{n(S)} = ${cadenaFraccion(nA, nS, f)}`,
        `P(${Et}) = ${enteroTexto(nA)}/${enteroTexto(nS)} → ${probTexto(p, f)}`,
      ),
      b.resultado(`P(${E}) = ${probTex(p, f)}`, `P(${Et}) = ${probTexto(p, f)}`),
    ],
  });
  return { ok: true, solucion: { resultado: p, pasos: [...a.solucion.pasos, ...s.solucion.pasos, final] } };
}
