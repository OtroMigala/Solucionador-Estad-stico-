import { parseRacional } from '../../core/entrada';
import type { TipoConsulta } from '../../core/probabilidad/distribuciones';
import {
  type BinomialForm,
  type ConsultaForm,
  type HipergeometricaForm,
  type MultinomialForm,
  type OpcionesForm,
  type PoissonForm,
  consultaVacia,
} from '../../core/probabilidad/formulariosDistribuciones';
import { Campo, Segmentado } from '../../components/Controles';

const TIPOS: { valor: TipoConsulta; texto: string }[] = [
  { valor: 'igual', texto: 'exactamente  (X = a)' },
  { valor: 'al-menos', texto: 'al menos / por lo menos  (X ≥ a)' },
  { valor: 'mas-de', texto: 'más de  (X > a)' },
  { valor: 'a-lo-sumo', texto: 'a lo sumo / como máximo  (X ≤ a)' },
  { valor: 'menos-de', texto: 'menos de  (X < a)' },
  { valor: 'entre', texto: 'entre a y b  (a ≤ X ≤ b)' },
];

const poner = <T,>(lista: T[], i: number, v: T) => lista.map((x, j) => (j === i ? v : x));
const quitar = <T,>(lista: T[], i: number) => lista.filter((_, j) => j !== i);
const probInvalida = (s: string) => {
  if (s.trim() === '') return false;
  const r = parseRacional(s);
  return !r.ok || !r.valor.enRango01();
};

/** Lo que se pregunta: probabilidades, media y varianza, Tchebycheff y tabla f(x). */
function Preguntas<F extends OpcionesForm>({ id, form, onCambio, tabla = true }: { id: string; form: F; onCambio: (f: F) => void; tabla?: boolean }) {
  const cambiar = (i: number, c: ConsultaForm) => onCambio({ ...form, consultas: poner(form.consultas, i, c) });
  return (
    <section className="tarjeta" aria-label="Qué se pregunta">
      <div className="tarjeta-titulo">
        <h2>¿Qué pide el ejercicio?</h2>
      </div>
      <Campo etiqueta="Qué es un éxito (opcional, para la redacción)">
        <input id={`${id}-exito`} value={form.exito} placeholder="pozo con impurezas" onChange={(e) => onCambio({ ...form, exito: e.target.value })} />
      </Campo>
      {form.consultas.map((c, i) => (
        <div key={i} className="caso">
          <div className="caso-cabeza" style={{ alignItems: 'end' }}>
            <Campo etiqueta="Literal">
              <input id={`${id}-l${i}`} value={c.etiqueta} placeholder="a" style={{ width: 56 }} onChange={(e) => cambiar(i, { ...c, etiqueta: e.target.value })} />
            </Campo>
            <Campo etiqueta="Probabilidad de que X sea…" className="crece">
              <select id={`${id}-t${i}`} value={c.tipo} onChange={(e) => cambiar(i, { ...c, tipo: e.target.value as TipoConsulta })}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </select>
            </Campo>
            <button type="button" className="boton quitar" aria-label="Quitar pregunta" onClick={() => onCambio({ ...form, consultas: quitar(form.consultas, i) })}>
              ✕
            </button>
          </div>
          <div className="fila-campos">
            <Campo etiqueta="a">
              <input id={`${id}-a${i}`} className="dato" inputMode="numeric" value={c.a} onChange={(e) => cambiar(i, { ...c, a: e.target.value })} />
            </Campo>
            {c.tipo === 'entre' && (
              <Campo etiqueta="b">
                <input id={`${id}-b${i}`} className="dato" inputMode="numeric" value={c.b} onChange={(e) => cambiar(i, { ...c, b: e.target.value })} />
              </Campo>
            )}
          </div>
        </div>
      ))}
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ ...form, consultas: [...form.consultas, consultaVacia('igual', '', String.fromCharCode(97 + form.consultas.length))] })}
        >
          + Probabilidad
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={form.momentos} onChange={(e) => onCambio({ ...form, momentos: e.target.checked })} />
        Media y varianza
      </label>
      <label className="check">
        <input type="checkbox" checked={form.tchebycheff} onChange={(e) => onCambio({ ...form, tchebycheff: e.target.checked })} />
        Interpretar el intervalo μ ± 2σ (teorema de Tchebycheff)
      </label>
      {tabla && (
        <label className="check">
          <input type="checkbox" checked={form.tabla} onChange={(e) => onCambio({ ...form, tabla: e.target.checked })} />
          Tabla de la función de probabilidad f(x)
        </label>
      )}
    </section>
  );
}

export function FormBinomial({ form, onCambio }: { form: BinomialForm; onCambio: (f: BinomialForm) => void }) {
  return (
    <>
      <section className="tarjeta" aria-label="Parámetros">
        <div className="tarjeta-titulo">
          <h2>b(x; n, π)</h2>
          <span className="nota">n ensayos independientes, cada uno con éxito o fracaso</span>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="n · número de ensayos">
            <input id="bin-n" className="dato" inputMode="numeric" value={form.n} onChange={(e) => onCambio({ ...form, n: e.target.value })} />
          </Campo>
          <Campo etiqueta="π · probabilidad de éxito">
            <input id="bin-pi" className="dato" value={form.pi} aria-invalid={probInvalida(form.pi) || undefined} placeholder="0,3 o 3/4 o 30%" onChange={(e) => onCambio({ ...form, pi: e.target.value })} />
          </Campo>
        </div>
      </section>
      <Preguntas id="bin" form={form} onCambio={onCambio} />
    </>
  );
}

export function FormHipergeometrica({ form, onCambio }: { form: HipergeometricaForm; onCambio: (f: HipergeometricaForm) => void }) {
  return (
    <>
      <section className="tarjeta" aria-label="Parámetros">
        <div className="tarjeta-titulo">
          <h2>h(x; N, n, k)</h2>
          <span className="nota">Muestra sin reemplazo de una población finita</span>
        </div>
        <div className="fila-campos">
          <Campo etiqueta="N · tamaño de la población">
            <input id="hip-N" className="dato" inputMode="numeric" value={form.N} onChange={(e) => onCambio({ ...form, N: e.target.value })} />
          </Campo>
          <Campo etiqueta="n · tamaño de la muestra">
            <input id="hip-n" className="dato" inputMode="numeric" value={form.n} onChange={(e) => onCambio({ ...form, n: e.target.value })} />
          </Campo>
          <Campo etiqueta="k · éxitos en la población">
            <input id="hip-k" className="dato" inputMode="numeric" value={form.k} onChange={(e) => onCambio({ ...form, k: e.target.value })} />
          </Campo>
        </div>
      </section>
      <Preguntas id="hip" form={form} onCambio={onCambio} />
    </>
  );
}

export function FormPoisson({ form, onCambio }: { form: PoissonForm; onCambio: (f: PoissonForm) => void }) {
  return (
    <>
      <section className="tarjeta" aria-label="Parámetros">
        <div className="tarjeta-titulo">
          <h2>P(x; λ)</h2>
          <span className="nota">Resultados al azar en un intervalo de tiempo o una región</span>
        </div>
        <Segmentado
          etiqueta="Cómo se obtiene λ"
          valor={form.modo}
          onCambio={(modo) => onCambio({ ...form, modo })}
          opciones={[
            { valor: 'tasa', texto: 'Promedio por unidad' },
            { valor: 'np', texto: 'λ = nπ (aproximar la binomial)' },
          ]}
        />
        {form.modo === 'tasa' ? (
          <div className="fila-campos">
            <Campo etiqueta="Promedio por unidad">
              <input id="poi-tasa" className="dato" value={form.tasa} placeholder="12" onChange={(e) => onCambio({ ...form, tasa: e.target.value })} />
            </Campo>
            <Campo etiqueta="Unidad">
              <input id="poi-unidad" value={form.unidad} placeholder="minuto" onChange={(e) => onCambio({ ...form, unidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Unidades del intervalo">
              <input id="poi-unidades" className="dato" value={form.unidades} placeholder="0,5" onChange={(e) => onCambio({ ...form, unidades: e.target.value })} />
            </Campo>
          </div>
        ) : (
          <div className="fila-campos">
            <Campo etiqueta="n · número de ensayos">
              <input id="poi-n" className="dato" inputMode="numeric" value={form.n} onChange={(e) => onCambio({ ...form, n: e.target.value })} />
            </Campo>
            <Campo etiqueta="π · probabilidad de éxito">
              <input id="poi-pi" className="dato" value={form.pi} aria-invalid={probInvalida(form.pi) || undefined} onChange={(e) => onCambio({ ...form, pi: e.target.value })} />
            </Campo>
          </div>
        )}
        <p className="nota">
          {form.modo === 'tasa'
            ? 'λ = promedio por unidad × unidades del intervalo. Ejemplo: 12 llamadas por minuto en medio minuto → λ = 12 × 0,5 = 6.'
            : 'Cuando n es grande y π pequeña, la binomial se aproxima con Poisson de media λ = nπ.'}
        </p>
      </section>
      <Preguntas id="poi" form={form} onCambio={onCambio} />
    </>
  );
}

export function FormMultinomial({ form, onCambio }: { form: MultinomialForm; onCambio: (f: MultinomialForm) => void }) {
  const n = form.categorias.reduce((s, c) => s + (Number(c.x) || 0), 0);
  return (
    <section className="tarjeta" aria-label="Resultados posibles">
      <div className="tarjeta-titulo">
        <h2>Resultados E₁, E₂, …, Eₖ</h2>
        <span className="nota">Las πᵢ deben sumar 1 · n = Σxᵢ = {n}</span>
      </div>
      {form.categorias.map((c, i) => (
        <div key={i} className="caso-cabeza" style={{ alignItems: 'end' }}>
          <Campo etiqueta="Resultado" className="crece">
            <input id={`mul-nom${i}`} value={c.nombre} onChange={(e) => onCambio({ categorias: poner(form.categorias, i, { ...c, nombre: e.target.value }) })} />
          </Campo>
          <Campo etiqueta={`π${i + 1}`}>
            <input
              id={`mul-pi${i}`}
              className="dato"
              style={{ width: 90 }}
              value={c.pi}
              aria-invalid={probInvalida(c.pi) || undefined}
              onChange={(e) => onCambio({ categorias: poner(form.categorias, i, { ...c, pi: e.target.value }) })}
            />
          </Campo>
          <Campo etiqueta={`x${i + 1}`}>
            <input id={`mul-x${i}`} className="dato" style={{ width: 70 }} inputMode="numeric" value={c.x} onChange={(e) => onCambio({ categorias: poner(form.categorias, i, { ...c, x: e.target.value }) })} />
          </Campo>
          <button type="button" className="boton quitar" disabled={form.categorias.length <= 2} aria-label="Quitar resultado" onClick={() => onCambio({ categorias: quitar(form.categorias, i) })}>
            ✕
          </button>
        </div>
      ))}
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ categorias: [...form.categorias, { nombre: `E${form.categorias.length + 1}`, pi: '', x: '' }] })}
        >
          + Resultado
        </button>
      </div>
    </section>
  );
}
