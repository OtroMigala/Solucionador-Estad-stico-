import type { ReactNode } from 'react';

export function Campo({ etiqueta, children, className }: { etiqueta: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`campo ${className ?? ''}`}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

interface EntradaProps {
  id: string;
  valor: string;
  onCambio: (v: string) => void;
  dato?: boolean;
  invalido?: boolean;
  placeholder?: string;
  modo?: 'decimal' | 'numeric' | 'text';
  etiquetaAccesible?: string;
}

export function Entrada({ id, valor, onCambio, dato, invalido, placeholder, modo, etiquetaAccesible }: EntradaProps) {
  return (
    <input
      id={id}
      className={dato ? 'dato' : undefined}
      value={valor}
      placeholder={placeholder}
      inputMode={modo}
      aria-invalid={invalido || undefined}
      aria-label={etiquetaAccesible}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => onCambio(e.target.value)}
    />
  );
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="segmentado" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => onCambio(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function MensajeError({ texto }: { texto: string }) {
  return (
    <p className="error" role="alert">
      <strong>Revisa los datos.</strong> {texto}
    </p>
  );
}

/** Selector de ejemplos del taller y de clase, con su enunciado. */
export function SelectorEjemplo<E extends { id: string; etiqueta: string; fuente: 'taller' | 'clase'; enunciado: string; nota?: string }>({
  id,
  ejemplos,
  actual,
  modificado,
  onElegir,
}: {
  id: string;
  ejemplos: E[];
  actual: E | null;
  modificado: boolean;
  onElegir: (e: E) => void;
}) {
  const taller = ejemplos.filter((e) => e.fuente === 'taller');
  const clase = ejemplos.filter((e) => e.fuente === 'clase');
  /** «Punto 35 · El 20 % de los empleados son…» cuando la etiqueta no trae título propio. */
  const textoOpcion = (e: E) => {
    if (e.etiqueta.includes('·') || e.fuente === 'clase') return e.etiqueta;
    const corto = e.enunciado.length > 46 ? `${e.enunciado.slice(0, 46).replace(/\s+\S*$/, '')}…` : e.enunciado;
    return `${e.etiqueta} · ${corto}`;
  };
  return (
    <section className="tarjeta" aria-label="Ejercicio">
      <Campo etiqueta="Ejercicio precargado">
        <select
          id={id}
          value={actual?.id ?? ''}
          onChange={(ev) => {
            const e = ejemplos.find((x) => x.id === ev.target.value);
            if (e) onElegir(e);
          }}
        >
          {!actual && <option value="">Datos propios</option>}
          {taller.length > 0 && (
            <optgroup label="Taller del tercer corte">
              {taller.map((e) => (
                <option key={e.id} value={e.id}>
                  {textoOpcion(e)}
                </option>
              ))}
            </optgroup>
          )}
          {clase.length > 0 && (
            <optgroup label="Ejemplos de las diapositivas">
              {clase.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.etiqueta}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Campo>
      {actual && (
        <>
          <span className="etiqueta-fuente">
            <b>{actual.fuente === 'taller' ? 'Taller' : 'Diapositivas'}</b> {actual.etiqueta.split(' · ')[0]}
          </span>
          <p className="enunciado">{actual.enunciado}</p>
          {actual.nota && <p className="aviso">{actual.nota}</p>}
          {modificado && (
            <div className="botones">
              <span className="nota">Cambiaste los datos del ejercicio.</span>
              <button type="button" className="boton mini" onClick={() => onElegir(actual)}>
                Restaurar datos
              </button>
            </div>
          )}
        </>
      )}
      <button
        type="button"
        className="boton mini ver-solucion"
        onClick={(ev) => ev.currentTarget.closest('.trabajo')?.querySelector('.salida')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      >
        Ver la solución ↓
      </button>
    </section>
  );
}
