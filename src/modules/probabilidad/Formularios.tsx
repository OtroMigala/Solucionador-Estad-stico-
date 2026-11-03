import { useMemo, useState } from 'react';
import { NOMBRE_TERMINO, type TipoTermino } from '../../core/combinatoria';
import { parseRacional } from '../../core/entrada';
import { LIMITES, type ModoPesos, type TipoEspacio, generarPuntos } from '../../core/probabilidad/espacio';
import {
  type BayesForm,
  type ClasicaForm,
  type ConteoForm,
  type ContingenciaForm,
  type EspacioForm,
  type ReglasForm,
  type SucesivasForm,
  type TerminoForm,
  configDeForm,
  terminoVacio,
} from '../../core/probabilidad/formularios';
import type { TipoRelacion } from '../../core/probabilidad/reglas';
import type { RefEvento } from '../../core/probabilidad/contingencia';
import { TRES_EVENTOS_EJEMPLO } from '../../core/probabilidad/ejemplos';
import { Campo, Segmentado } from '../../components/Controles';

const quitar = <T,>(lista: T[], i: number) => lista.filter((_, j) => j !== i);
const poner = <T,>(lista: T[], i: number, v: T) => lista.map((x, j) => (j === i ? v : x));
const probInvalida = (s: string) => {
  if (s.trim() === '') return true;
  const r = parseRacional(s);
  return !r.ok || !r.valor.enRango01();
};
const NOTA_PROB = 'Acepta decimales (0,8), fracciones (30/80) o porcentajes (20%).';

/* ───────────── Conteo ───────────── */

const ORDEN_TIPOS: TipoTermino[] = ['combinacion', 'permutacion', 'factorial', 'circular', 'repeticion', 'potencia', 'producto', 'numero'];

function EditorTermino({ t, id, onCambio, onQuitar }: { t: TerminoForm; id: string; onCambio: (t: TerminoForm) => void; onQuitar?: () => void }) {
  const set = (p: Partial<TerminoForm>) => onCambio({ ...t, ...p });
  const [conDescripcion, setConDescripcion] = useState(false);
  const entero = (campo: 'n' | 'r', etiqueta: string) => (
    <Campo etiqueta={etiqueta}>
      <input
        id={`${id}-${campo}`}
        className="dato"
        inputMode="numeric"
        value={t[campo]}
        aria-invalid={!/^\d+$/.test(t[campo].trim()) || undefined}
        onChange={(e) => set({ [campo]: e.target.value })}
      />
    </Campo>
  );
  return (
    <div className="termino">
      <div className="terminos">
        <Campo etiqueta="Técnica">
          <select id={`${id}-tipo`} value={t.tipo} onChange={(e) => set({ tipo: e.target.value as TipoTermino })}>
            {ORDEN_TIPOS.map((v) => (
              <option key={v} value={v}>
                {NOMBRE_TERMINO[v]}
              </option>
            ))}
          </select>
        </Campo>
        <div className="termino-campos">
          {t.tipo === 'numero' && entero('n', 'Cantidad')}
          {(t.tipo === 'factorial' || t.tipo === 'circular') && entero('n', 'n (objetos)')}
          {(t.tipo === 'permutacion' || t.tipo === 'combinacion') && (
            <>
              {entero('n', 'n (total)')}
              {entero('r', 'r (se eligen)')}
            </>
          )}
          {t.tipo === 'potencia' && (
            <>
              {entero('n', 'n (opciones)')}
              {entero('r', 'r (elecciones)')}
            </>
          )}
          {t.tipo === 'producto' && (
            <Campo etiqueta="Factores n₁, n₂, …">
              <input id={`${id}-factores`} className="dato" value={t.factores} onChange={(e) => set({ factores: e.target.value })} placeholder="4, 5, 2" />
            </Campo>
          )}
          {t.tipo === 'repeticion' && (
            <>
              <Campo etiqueta="Palabra">
                <input id={`${id}-palabra`} value={t.palabra} onChange={(e) => set({ palabra: e.target.value })} placeholder="ESTADISTICA" />
              </Campo>
              <Campo etiqueta="o grupos (nombre: cantidad)">
                <input
                  id={`${id}-grupos`}
                  className="dato"
                  value={t.grupos}
                  disabled={t.palabra.trim() !== ''}
                  onChange={(e) => set({ grupos: e.target.value })}
                  placeholder="rojas: 4, azules: 2"
                />
              </Campo>
            </>
          )}
        </div>
        {t.descripcion !== '' || conDescripcion ? (
          <Campo etiqueta="Qué cuenta (opcional)">
            <input id={`${id}-desc`} value={t.descripcion} autoFocus={conDescripcion && t.descripcion === ''} onChange={(e) => set({ descripcion: e.target.value })} />
          </Campo>
        ) : (
          <button type="button" className="boton mini" style={{ alignSelf: 'flex-start' }} onClick={() => setConDescripcion(true)}>
            + Describir qué cuenta
          </button>
        )}
      </div>
      {onQuitar && (
        <button type="button" className="boton quitar" onClick={onQuitar} aria-label="Quitar término">
          ✕
        </button>
      )}
    </div>
  );
}

export function EditorConteo({ form, onCambio, id }: { form: ConteoForm; onCambio: (f: ConteoForm) => void; id: string }) {
  const varios = form.casos.length > 1;
  return (
    <div className="terminos">
      {form.casos.map((c, ci) => (
        <div key={ci} className="terminos">
          {ci > 0 && <div className="operador">+ (casos mutuamente excluyentes)</div>}
          <div className={varios ? 'caso' : 'terminos'}>
            {varios && (
              <div className="caso-cabeza">
                <input
                  id={`${id}-caso${ci}`}
                  value={c.descripcion}
                  placeholder={`Caso ${ci + 1}`}
                  aria-label={`Descripción del caso ${ci + 1}`}
                  onChange={(e) => onCambio({ casos: poner(form.casos, ci, { ...c, descripcion: e.target.value }) })}
                />
                <button type="button" className="boton quitar" onClick={() => onCambio({ casos: quitar(form.casos, ci) })} aria-label={`Quitar caso ${ci + 1}`}>
                  ✕
                </button>
              </div>
            )}
            {c.terminos.map((t, ti) => (
              <div key={ti} className="terminos">
                {ti > 0 && <div className="operador">× (regla de la multiplicación)</div>}
                <EditorTermino
                  t={t}
                  id={`${id}-c${ci}t${ti}`}
                  onCambio={(nt) => onCambio({ casos: poner(form.casos, ci, { ...c, terminos: poner(c.terminos, ti, nt) }) })}
                  onQuitar={c.terminos.length > 1 ? () => onCambio({ casos: poner(form.casos, ci, { ...c, terminos: quitar(c.terminos, ti) }) }) : undefined}
                />
              </div>
            ))}
            <div className="botones">
              <button
                type="button"
                className="boton mini"
                onClick={() => onCambio({ casos: poner(form.casos, ci, { ...c, terminos: [...c.terminos, terminoVacio('combinacion')] }) })}
              >
                × Multiplicar por otro término
              </button>
            </div>
          </div>
        </div>
      ))}
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ casos: [...form.casos, { descripcion: '', terminos: [terminoVacio('combinacion')] }] })}
        >
          + Sumar otro caso
        </button>
      </div>
    </div>
  );
}

export function FormConteo({ form, onCambio }: { form: ConteoForm; onCambio: (f: ConteoForm) => void }) {
  return (
    <section className="tarjeta" aria-label="Planteamiento">
      <div className="tarjeta-titulo">
        <h2>Planteamiento del conteo</h2>
      </div>
      <p className="nota">Cada caso es un producto de términos; los casos, si son excluyentes, se suman.</p>
      <EditorConteo form={form} onCambio={onCambio} id="conteo" />
    </section>
  );
}

export function FormClasica({ form, onCambio }: { form: ClasicaForm; onCambio: (f: ClasicaForm) => void }) {
  return (
    <section className="tarjeta" aria-label="Planteamiento">
      <div className="tarjeta-titulo">
        <h2>P(A) = n(A) / n(S)</h2>
      </div>
      <Campo etiqueta="Nombre del evento">
        <input id="clasica-evento" value={form.evento} onChange={(e) => onCambio({ ...form, evento: e.target.value })} />
      </Campo>
      <h3 className="paso-titulo" style={{ fontSize: '0.98rem' }}>
        Casos favorables n({form.evento || 'A'})
      </h3>
      <EditorConteo id="favorables" form={form.favorables} onCambio={(favorables) => onCambio({ ...form, favorables })} />
      <h3 className="paso-titulo" style={{ fontSize: '0.98rem' }}>
        Casos posibles n(S)
      </h3>
      <EditorConteo id="totales" form={form.totales} onCambio={(totales) => onCambio({ ...form, totales })} />
    </section>
  );
}

/* ───────────── Espacio muestral ───────────── */

const TIPOS_ESPACIO: { valor: TipoEspacio; texto: string }[] = [
  { valor: 'monedas', texto: 'Lanzar monedas' },
  { valor: 'dados', texto: 'Lanzar dados' },
  { valor: 'moneda-dado', texto: 'Una moneda y un dado' },
  { valor: 'domino', texto: 'Ficha de dominó' },
  { valor: 'urna', texto: 'Sacar un objeto de una urna' },
  { valor: 'lista', texto: 'Escribir los resultados' },
];

const PESOS: { valor: ModoPesos; texto: string }[] = [
  { valor: 'uniforme', texto: 'Igualmente probables' },
  { valor: 'proporcional', texto: 'Proporcional a la cara (un dado)' },
  { valor: 'pares-doble', texto: 'Pares con el doble de probabilidad (un dado)' },
  { valor: 'personalizado', texto: 'Pesos escritos a mano' },
];

export function FormEspacio({ form, onCambio }: { form: EspacioForm; onCambio: (f: EspacioForm) => void }) {
  const gen = useMemo(() => generarPuntos(configDeForm(form)), [form]);
  const puntos = gen.ok ? gen.valor : [];
  const ids = new Set(puntos.map((p) => p.id));

  /** Cambia la configuración del experimento y descarta lo que ya no existe en S. */
  const cambiarConfig = (p: Partial<EspacioForm>) => {
    const nuevo = { ...form, ...p };
    const g = generarPuntos(configDeForm(nuevo));
    const validos = new Set(g.ok ? g.valor.map((x) => x.id) : []);
    onCambio({ ...nuevo, eventos: nuevo.eventos.map((e) => ({ ...e, ids: e.ids.filter((i) => validos.has(i)) })) });
  };

  const rejilla = form.tipo === 'dados' && form.cantidad === '2';
  const par = form.par;

  return (
    <section className="tarjeta" aria-label="Experimento y eventos">
      <div className="tarjeta-titulo">
        <h2>Experimento</h2>
        <span className="nota">n(S) = {puntos.length}</span>
      </div>
      <div className="fila-campos">
        <Campo etiqueta="Tipo">
          <select id="esp-tipo" value={form.tipo} onChange={(e) => cambiarConfig({ tipo: e.target.value as TipoEspacio, pesos: 'uniforme' })}>
            {TIPOS_ESPACIO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </Campo>
        {(form.tipo === 'monedas' || form.tipo === 'dados') && (
          <Campo etiqueta={form.tipo === 'monedas' ? 'Monedas' : 'Dados'}>
            <select id="esp-cantidad" value={form.cantidad} onChange={(e) => cambiarConfig({ cantidad: e.target.value })}>
              {Array.from({ length: form.tipo === 'monedas' ? LIMITES.monedas : LIMITES.dados }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>
      {form.tipo === 'urna' && (
        <div className="terminos">
          {form.categorias.map((c, i) => (
            <div key={i} className="fila-campos" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 80px auto', alignItems: 'end' }}>
              <Campo etiqueta="Objeto">
                <input id={`urna-n${i}`} value={c.nombre} onChange={(e) => cambiarConfig({ categorias: poner(form.categorias, i, { ...c, nombre: e.target.value }) })} />
              </Campo>
              <Campo etiqueta="Símbolo">
                <input id={`urna-s${i}`} value={c.simbolo} onChange={(e) => cambiarConfig({ categorias: poner(form.categorias, i, { ...c, simbolo: e.target.value }) })} />
              </Campo>
              <Campo etiqueta="Cantidad">
                <input id={`urna-c${i}`} className="dato" inputMode="numeric" value={c.cantidad} onChange={(e) => cambiarConfig({ categorias: poner(form.categorias, i, { ...c, cantidad: e.target.value }) })} />
              </Campo>
              <button type="button" className="boton quitar" onClick={() => cambiarConfig({ categorias: quitar(form.categorias, i) })} aria-label="Quitar objeto">
                ✕
              </button>
            </div>
          ))}
          <div className="botones">
            <button type="button" className="boton mini" onClick={() => cambiarConfig({ categorias: [...form.categorias, { nombre: '', simbolo: '', cantidad: '1' }] })}>
              + Tipo de objeto
            </button>
          </div>
        </div>
      )}
      {form.tipo === 'lista' && (
        <Campo etiqueta="Resultados posibles, separados por comas">
          <input id="esp-lista" value={form.elementos} onChange={(e) => cambiarConfig({ elementos: e.target.value })} />
        </Campo>
      )}
      <Campo etiqueta="Probabilidad de cada punto muestral">
        <select id="esp-pesos" value={form.pesos} onChange={(e) => onCambio({ ...form, pesos: e.target.value as ModoPesos })}>
          {PESOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.texto}
            </option>
          ))}
        </select>
      </Campo>
      {form.pesos === 'personalizado' && (
        <div className="fila-campos">
          {puntos.map((p, i) => (
            <Campo key={p.id} etiqueta={`Peso de ${p.id}`}>
              <input
                id={`peso-${i}`}
                className="dato"
                value={form.pesosPersonalizados[i] ?? ''}
                aria-invalid={!parseRacional(form.pesosPersonalizados[i] ?? '').ok || undefined}
                onChange={(e) => {
                  const pesos = Array.from({ length: puntos.length }, (_, j) => form.pesosPersonalizados[j] ?? '');
                  pesos[i] = e.target.value;
                  onCambio({ ...form, pesosPersonalizados: pesos });
                }}
              />
            </Campo>
          ))}
        </div>
      )}
      {!gen.ok && <p className="aviso">{gen.error}</p>}

      <div className="tarjeta-titulo">
        <h2>Eventos</h2>
        <span className="nota">Toca los resultados que forman cada evento</span>
      </div>
      {form.eventos.map((ev, i) => (
        <div key={i} className="evento">
          <div className="evento-cabeza">
            <Campo etiqueta="Nombre">
              <input id={`ev-n${i}`} value={ev.nombre} onChange={(e) => onCambio({ ...form, eventos: poner(form.eventos, i, { ...ev, nombre: e.target.value }) })} />
            </Campo>
            <Campo etiqueta="Descripción">
              <input id={`ev-d${i}`} value={ev.descripcion} onChange={(e) => onCambio({ ...form, eventos: poner(form.eventos, i, { ...ev, descripcion: e.target.value }) })} />
            </Campo>
            <button
              type="button"
              className="boton quitar"
              aria-label={`Quitar el evento ${ev.nombre}`}
              onClick={() => onCambio({ ...form, eventos: quitar(form.eventos, i), par: null })}
            >
              ✕
            </button>
          </div>
          <div className={`puntos${rejilla ? ' rejilla-6' : ''}`} role="group" aria-label={`Resultados del evento ${ev.nombre}`}>
            {puntos.map((p) => {
              const dentro = ev.ids.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="punto"
                  aria-pressed={dentro}
                  onClick={() =>
                    onCambio({
                      ...form,
                      eventos: poner(form.eventos, i, { ...ev, ids: dentro ? ev.ids.filter((x) => x !== p.id) : [...ev.ids, p.id] }),
                    })
                  }
                >
                  {p.id}
                </button>
              );
            })}
          </div>
          <div className="botones">
            <span className="nota">
              n({ev.nombre || '?'}) = {ev.ids.filter((x) => ids.has(x)).length}
            </span>
            <button type="button" className="boton mini" onClick={() => onCambio({ ...form, eventos: poner(form.eventos, i, { ...ev, ids: puntos.map((p) => p.id) }) })}>
              Todos
            </button>
            <button type="button" className="boton mini" onClick={() => onCambio({ ...form, eventos: poner(form.eventos, i, { ...ev, ids: [] }) })}>
              Ninguno
            </button>
            <button
              type="button"
              className="boton mini"
              onClick={() => onCambio({ ...form, eventos: poner(form.eventos, i, { ...ev, ids: puntos.map((p) => p.id).filter((x) => !ev.ids.includes(x)) }) })}
            >
              Complemento
            </button>
          </div>
        </div>
      ))}
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          disabled={form.eventos.length >= 4}
          onClick={() => onCambio({ ...form, eventos: [...form.eventos, { nombre: 'ABCD'[form.eventos.length] ?? 'E', descripcion: '', ids: [] }] })}
        >
          + Evento
        </button>
      </div>
      {form.eventos.length >= 2 && (
        <div className="fila-campos">
          <Campo etiqueta="Unión, intersección y P(X | Y) entre">
            <select
              id="esp-par-x"
              value={par ? String(par[0]) : ''}
              onChange={(e) => onCambio({ ...form, par: e.target.value === '' ? null : [Number(e.target.value), par?.[1] ?? (Number(e.target.value) === 0 ? 1 : 0)] })}
            >
              <option value="">— ninguno —</option>
              {form.eventos.map((ev, i) => (
                <option key={i} value={i}>
                  X = {ev.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="y">
            <select id="esp-par-y" value={par ? String(par[1]) : ''} disabled={!par} onChange={(e) => par && onCambio({ ...form, par: [par[0], Number(e.target.value)] })}>
              {form.eventos.map((ev, i) => (
                <option key={i} value={i} disabled={par?.[0] === i}>
                  Y = {ev.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      )}
    </section>
  );
}

/* ───────────── Reglas ───────────── */

const RELACIONES: { valor: TipoRelacion; texto: (a: string, b: string) => string }[] = [
  { valor: 'interseccion', texto: (a, b) => `Se conoce P(${a} ∩ ${b})` },
  { valor: 'union', texto: (a, b) => `Se conoce P(${a} ∪ ${b})` },
  { valor: 'condicionalBA', texto: (a, b) => `Se conoce P(${b} | ${a})` },
  { valor: 'condicionalAB', texto: (a, b) => `Se conoce P(${a} | ${b})` },
  { valor: 'independientes', texto: (a, b) => `${a} y ${b} son independientes` },
  { valor: 'excluyentes', texto: (a, b) => `${a} y ${b} son mutuamente excluyentes` },
];

export function FormReglas({ form, onCambio }: { form: ReglasForm; onCambio: (f: ReglasForm) => void }) {
  const set = (p: Partial<ReglasForm>) => onCambio({ ...form, ...p });
  const A = form.simA || 'A';
  const B = form.simB || 'B';
  const necesitaValor = form.relacion !== 'independientes' && form.relacion !== 'excluyentes';
  const etiquetasTres = ['P(A)', 'P(B)', 'P(C)', 'P(A ∩ B)', 'P(A ∩ C)', 'P(B ∩ C)', 'P(A ∩ B ∩ C)'];
  return (
    <section className="tarjeta" aria-label="Datos de los eventos">
      <div className="tarjeta-titulo">
        <h2>Eventos y datos</h2>
        <Segmentado
          etiqueta="Número de eventos"
          valor={form.modo}
          onCambio={(modo) => set(modo === 'tres' && form.tres.every((t) => t === '') ? { modo, tres: [...TRES_EVENTOS_EJEMPLO] } : { modo })}
          opciones={[
            { valor: 'dos', texto: 'Dos eventos' },
            { valor: 'tres', texto: 'Unión de tres' },
          ]}
        />
      </div>
      {form.modo === 'dos' ? (
        <>
          {(['A', 'B'] as const).map((ev) => {
            const sim = ev === 'A' ? 'simA' : 'simB';
            const desc = ev === 'A' ? 'descA' : 'descB';
            const p = ev === 'A' ? 'pA' : 'pB';
            const s = form[sim] || ev;
            return (
              <div key={ev} className="evento">
                <div className="fila-campos" style={{ gridTemplateColumns: '64px minmax(0,1fr) 110px' }}>
                  <Campo etiqueta="Símbolo">
                    <input id={`reg-${sim}`} value={form[sim]} onChange={(e) => set({ [sim]: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Descripción">
                    <input id={`reg-${desc}`} value={form[desc]} onChange={(e) => set({ [desc]: e.target.value })} />
                  </Campo>
                  <Campo etiqueta={`P(${s})`}>
                    <input id={`reg-${p}`} className="dato" value={form[p]} aria-invalid={probInvalida(form[p]) || undefined} onChange={(e) => set({ [p]: e.target.value })} />
                  </Campo>
                </div>
              </div>
            );
          })}
          <Campo etiqueta="Además se sabe que">
            <select id="reg-relacion" value={form.relacion} onChange={(e) => set({ relacion: e.target.value as TipoRelacion })}>
              {RELACIONES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.texto(A, B)}
                </option>
              ))}
            </select>
          </Campo>
          {necesitaValor && (
            <Campo etiqueta="Valor">
              <input id="reg-valor" className="dato" value={form.valor} aria-invalid={probInvalida(form.valor) || undefined} onChange={(e) => set({ valor: e.target.value })} />
            </Campo>
          )}
        </>
      ) : (
        <div className="fila-campos">
          {etiquetasTres.map((et, i) => (
            <Campo key={et} etiqueta={et}>
              <input
                id={`tres-${i}`}
                className="dato"
                value={form.tres[i]}
                aria-invalid={probInvalida(form.tres[i]) || undefined}
                onChange={(e) => {
                  const tres = [...form.tres] as ReglasForm['tres'];
                  tres[i] = e.target.value;
                  set({ tres });
                }}
              />
            </Campo>
          ))}
        </div>
      )}
      <p className="nota">{NOTA_PROB}</p>
    </section>
  );
}

/* ───────────── Extracciones sucesivas ───────────── */

export function FormSucesivas({ form, onCambio }: { form: SucesivasForm; onCambio: (f: SucesivasForm) => void }) {
  return (
    <section className="tarjeta" aria-label="Urna y extracciones">
      <div className="tarjeta-titulo">
        <h2>Contenido</h2>
        <span className="nota">N = {form.categorias.reduce((s, c) => s + (Number(c.cantidad) || 0), 0)}</span>
      </div>
      {form.categorias.map((c, i) => (
        <div key={i} className="fila-campos" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 80px auto', alignItems: 'end' }}>
          <Campo etiqueta="Objeto">
            <input id={`suc-n${i}`} value={c.nombre} onChange={(e) => onCambio({ ...form, categorias: poner(form.categorias, i, { ...c, nombre: e.target.value }) })} />
          </Campo>
          <Campo etiqueta="Símbolo">
            <input id={`suc-s${i}`} value={c.simbolo} onChange={(e) => onCambio({ ...form, categorias: poner(form.categorias, i, { ...c, simbolo: e.target.value }) })} />
          </Campo>
          <Campo etiqueta="Cantidad">
            <input
              id={`suc-c${i}`}
              className="dato"
              inputMode="numeric"
              value={c.cantidad}
              aria-invalid={!/^\d+$/.test(c.cantidad.trim()) || undefined}
              onChange={(e) => onCambio({ ...form, categorias: poner(form.categorias, i, { ...c, cantidad: e.target.value }) })}
            />
          </Campo>
          <button type="button" className="boton quitar" disabled={form.categorias.length <= 1} onClick={() => onCambio({ ...form, categorias: quitar(form.categorias, i) })} aria-label="Quitar objeto">
            ✕
          </button>
        </div>
      ))}
      <div className="botones">
        <button type="button" className="boton mini" onClick={() => onCambio({ ...form, categorias: [...form.categorias, { nombre: '', simbolo: '', cantidad: '1' }] })}>
          + Tipo de objeto
        </button>
      </div>
      <Campo etiqueta="Secuencias (una por línea, con los símbolos en orden)">
        <textarea id="suc-secuencias" rows={3} value={form.secuencias} onChange={(e) => onCambio({ ...form, secuencias: e.target.value })} />
      </Campo>
      <p className="nota">Si escribes varias líneas, las secuencias se tratan como casos mutuamente excluyentes y sus probabilidades se suman.</p>
      <label className="check">
        <input type="checkbox" checked={form.reemplazo} onChange={(e) => onCambio({ ...form, reemplazo: e.target.checked })} />
        Con reposición (el objeto se devuelve antes de la siguiente extracción)
      </label>
    </section>
  );
}

/* ───────────── Tabla de contingencia ───────────── */

const refValor = (r: RefEvento) => `${r.eje === 'fila' ? 'f' : 'c'}-${r.i}`;
const refDe = (v: string): RefEvento => ({ eje: v.startsWith('f') ? 'fila' : 'columna', i: Number(v.slice(2)) });

export function FormContingencia({ form, onCambio }: { form: ContingenciaForm; onCambio: (f: ContingenciaForm) => void }) {
  const opciones = [
    ...form.filas.map((f, i) => ({ valor: `f-${i}`, texto: `${f.simbolo} · ${f.nombre}` })),
    ...form.columnas.map((c, i) => ({ valor: `c-${i}`, texto: `${c.simbolo} · ${c.nombre}` })),
  ];
  const setConteo = (i: number, j: number, v: string) => onCambio({ ...form, conteos: form.conteos.map((f, a) => (a === i ? poner(f, j, v) : f)) });
  const quitarFila = (i: number) =>
    onCambio({
      ...form,
      filas: quitar(form.filas, i),
      conteos: quitar(form.conteos, i),
      consultas: form.consultas.filter((q) => !(q.a.eje === 'fila' && q.a.i === i) && !(q.b?.eje === 'fila' && q.b.i === i)).map((q) => ({
        ...q,
        a: q.a.eje === 'fila' && q.a.i > i ? { ...q.a, i: q.a.i - 1 } : q.a,
        b: q.b && q.b.eje === 'fila' && q.b.i > i ? { ...q.b, i: q.b.i - 1 } : q.b,
      })),
    });
  const quitarColumna = (j: number) =>
    onCambio({
      ...form,
      columnas: quitar(form.columnas, j),
      conteos: form.conteos.map((f) => quitar(f, j)),
      consultas: form.consultas.filter((q) => !(q.a.eje === 'columna' && q.a.i === j) && !(q.b?.eje === 'columna' && q.b.i === j)).map((q) => ({
        ...q,
        a: q.a.eje === 'columna' && q.a.i > j ? { ...q.a, i: q.a.i - 1 } : q.a,
        b: q.b && q.b.eje === 'columna' && q.b.i > j ? { ...q.b, i: q.b.i - 1 } : q.b,
      })),
    });

  return (
    <section className="tarjeta" aria-label="Tabla de contingencia">
      <div className="tarjeta-titulo">
        <h2>Tabla de conteos</h2>
      </div>
      <div className="contingencia">
        <table>
          <thead>
            <tr>
              <th />
              {form.columnas.map((c, j) => (
                <th key={j} className="eje">
                  <div className="eje-campos">
                    <input id={`con-cn${j}`} value={c.nombre} aria-label={`Nombre de la columna ${j + 1}`} onChange={(e) => onCambio({ ...form, columnas: poner(form.columnas, j, { ...c, nombre: e.target.value }) })} />
                    <input id={`con-cs${j}`} value={c.simbolo} aria-label={`Símbolo de la columna ${j + 1}`} onChange={(e) => onCambio({ ...form, columnas: poner(form.columnas, j, { ...c, simbolo: e.target.value }) })} />
                    {form.columnas.length > 1 && (
                      <button type="button" className="boton quitar mini" onClick={() => quitarColumna(j)} aria-label={`Quitar columna ${j + 1}`}>
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.filas.map((f, i) => (
              <tr key={i}>
                <th className="eje">
                  <div className="eje-campos">
                    <input id={`con-fn${i}`} value={f.nombre} aria-label={`Nombre de la fila ${i + 1}`} onChange={(e) => onCambio({ ...form, filas: poner(form.filas, i, { ...f, nombre: e.target.value }) })} />
                    <input id={`con-fs${i}`} value={f.simbolo} aria-label={`Símbolo de la fila ${i + 1}`} onChange={(e) => onCambio({ ...form, filas: poner(form.filas, i, { ...f, simbolo: e.target.value }) })} />
                    {form.filas.length > 1 && (
                      <button type="button" className="boton quitar mini" onClick={() => quitarFila(i)} aria-label={`Quitar fila ${i + 1}`}>
                        ✕
                      </button>
                    )}
                  </div>
                </th>
                {form.columnas.map((_, j) => (
                  <td key={j}>
                    <input
                      id={`con-${i}-${j}`}
                      className="dato"
                      inputMode="numeric"
                      value={form.conteos[i]?.[j] ?? ''}
                      aria-label={`${f.nombre}, ${form.columnas[j].nombre}`}
                      aria-invalid={!/^\d+$/.test((form.conteos[i]?.[j] ?? '').trim()) || undefined}
                      onChange={(e) => setConteo(i, j, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ ...form, filas: [...form.filas, { nombre: `Fila ${form.filas.length + 1}`, simbolo: `F${form.filas.length + 1}` }], conteos: [...form.conteos, form.columnas.map(() => '0')] })}
        >
          + Fila
        </button>
        <button
          type="button"
          className="boton mini"
          onClick={() =>
            onCambio({
              ...form,
              columnas: [...form.columnas, { nombre: `Columna ${form.columnas.length + 1}`, simbolo: `K${form.columnas.length + 1}` }],
              conteos: form.conteos.map((f) => [...f, '0']),
            })
          }
        >
          + Columna
        </button>
      </div>
      <div className="tarjeta-titulo">
        <h2>Preguntas</h2>
      </div>
      {form.consultas.map((q, i) => (
        <div key={i} className="consulta">
          <select id={`q-a${i}`} value={refValor(q.a)} aria-label="Evento" onChange={(e) => onCambio({ ...form, consultas: poner(form.consultas, i, { ...q, a: refDe(e.target.value) }) })}>
            {opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
          <select
            id={`q-op${i}`}
            value={q.op}
            aria-label="Operación"
            onChange={(e) => {
              const op = e.target.value as typeof q.op;
              onCambio({ ...form, consultas: poner(form.consultas, i, { ...q, op, b: op === 'sola' ? undefined : (q.b ?? refDe(opciones[0].valor)) }) });
            }}
          >
            <option value="sola">sola</option>
            <option value="y">∩</option>
            <option value="o">∪</option>
            <option value="dado">|</option>
          </select>
          {q.op !== 'sola' && q.b ? (
            <select id={`q-b${i}`} value={refValor(q.b)} aria-label="Segundo evento" onChange={(e) => onCambio({ ...form, consultas: poner(form.consultas, i, { ...q, b: refDe(e.target.value) }) })}>
              {opciones.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.texto}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          <button type="button" className="boton quitar" onClick={() => onCambio({ ...form, consultas: quitar(form.consultas, i) })} aria-label="Quitar pregunta">
            ✕
          </button>
        </div>
      ))}
      <div className="botones">
        <button type="button" className="boton mini" onClick={() => onCambio({ ...form, consultas: [...form.consultas, { a: { eje: 'fila', i: 0 }, op: 'dado', b: { eje: 'columna', i: 0 } }] })}>
          + Pregunta
        </button>
      </div>
      <p className="nota">«|» se lee «dado que»: P(A | B) es la probabilidad de A sabiendo que ocurrió B.</p>
    </section>
  );
}

/* ───────────── Probabilidad total y Bayes ───────────── */

export function FormBayes({ form, onCambio }: { form: BayesForm; onCambio: (f: BayesForm) => void }) {
  const A = form.evento.simbolo || 'A';
  return (
    <section className="tarjeta" aria-label="Partición y evento">
      <div className="tarjeta-titulo">
        <h2>Evento observado</h2>
      </div>
      <div className="fila-campos" style={{ gridTemplateColumns: '70px minmax(0,1fr)' }}>
        <Campo etiqueta="Símbolo">
          <input id="bay-sim" value={form.evento.simbolo} onChange={(e) => onCambio({ ...form, evento: { ...form.evento, simbolo: e.target.value } })} />
        </Campo>
        <Campo etiqueta="Descripción">
          <input id="bay-desc" value={form.evento.descripcion} onChange={(e) => onCambio({ ...form, evento: { ...form.evento, descripcion: e.target.value } })} />
        </Campo>
      </div>
      <div className="tarjeta-titulo">
        <h2>Partición B₁, B₂, …</h2>
        <span className="nota">Las P(Bᵢ) deben sumar 1</span>
      </div>
      {form.ramas.map((r, i) => (
        <div key={i} className="rama">
          <Campo etiqueta="Símbolo">
            <input id={`bay-s${i}`} value={r.simbolo} onChange={(e) => onCambio({ ...form, ramas: poner(form.ramas, i, { ...r, simbolo: e.target.value }) })} />
          </Campo>
          <div className="caso-cabeza" style={{ alignItems: 'end' }}>
            <Campo etiqueta="Descripción" className="crece">
              <input id={`bay-d${i}`} value={r.descripcion} onChange={(e) => onCambio({ ...form, ramas: poner(form.ramas, i, { ...r, descripcion: e.target.value }) })} />
            </Campo>
            <button
              type="button"
              className="boton quitar"
              disabled={form.ramas.length <= 2}
              onClick={() => onCambio({ ...form, ramas: quitar(form.ramas, i), objetivo: form.objetivo === null || form.objetivo < i ? form.objetivo : form.objetivo === i ? null : form.objetivo - 1 })}
              aria-label="Quitar rama"
            >
              ✕
            </button>
          </div>
          <div className="fila-campos">
            <Campo etiqueta={`P(${r.simbolo || `B${i + 1}`})`}>
              <input id={`bay-p${i}`} className="dato" value={r.prior} aria-invalid={probInvalida(r.prior) || undefined} onChange={(e) => onCambio({ ...form, ramas: poner(form.ramas, i, { ...r, prior: e.target.value }) })} />
            </Campo>
            <Campo etiqueta={`P(${A} | ${r.simbolo || `B${i + 1}`})`}>
              <input
                id={`bay-v${i}`}
                className="dato"
                value={r.verosimilitud}
                aria-invalid={probInvalida(r.verosimilitud) || undefined}
                onChange={(e) => onCambio({ ...form, ramas: poner(form.ramas, i, { ...r, verosimilitud: e.target.value }) })}
              />
            </Campo>
          </div>
        </div>
      ))}
      <div className="botones">
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ ...form, ramas: [...form.ramas, { simbolo: `B${form.ramas.length + 1}`, descripcion: '', prior: '', verosimilitud: '' }] })}
        >
          + Evento de la partición
        </button>
      </div>
      <Campo etiqueta="Pregunta de Bayes">
        <select id="bay-obj" value={form.objetivo === null ? '' : String(form.objetivo)} onChange={(e) => onCambio({ ...form, objetivo: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Solo P({A}) y la tabla de Bayes</option>
          {form.ramas.map((r, i) => (
            <option key={i} value={i}>
              P({r.simbolo || `B${i + 1}`} | {A})
            </option>
          ))}
        </select>
      </Campo>
      <p className="nota">{NOTA_PROB}</p>
    </section>
  );
}
