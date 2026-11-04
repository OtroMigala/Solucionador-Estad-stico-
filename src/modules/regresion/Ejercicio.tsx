import { useFormato } from '../../contexto';
import { parseNumero } from '../../core/entrada';
import { subindice } from '../../core/formato';
import { type Literal, letra, literalesDisponibles, tituloLiteral } from '../../core/regresion/literales';
import { Campo, MensajeError } from '../../components/Controles';
import { type Ejercicio, desdeEjemplo, filasConDatos, leerAlfa, literalesValidos } from './estado';
import { TablaDatos } from './TablaDatos';

const ALFAS = ['0.01', '0.025', '0.05', '0.10'];

interface Props {
  ejercicio: Ejercicio;
  onCambio: (e: Ejercicio) => void;
  error: string | null;
  abrirTabla: boolean;
  onResolver: () => void;
  onCambiarDatos: () => void;
}

export function EjercicioRegresion({ ejercicio, onCambio, error, abrirTabla, onResolver, onCambiarDatos }: Props) {
  const { formato } = useFormato();
  const { tabla, ejemplo } = ejercicio;
  const k = tabla.nombresX.length;
  const n = filasConDatos(tabla).length;
  const simbolo = (j: number) => (k > 1 ? `x${subindice(j + 1)}` : 'x');
  const conComa = (s: string) => (formato.coma ? s.replace('.', ',') : s);
  const cambiar = (parcial: Partial<Ejercicio>) => onCambio({ ...ejercicio, ...parcial, modificado: ejemplo !== null });

  const pedidos = literalesValidos(ejercicio);
  const otros = literalesDisponibles(k).filter((l) => !pedidos.includes(l.id));
  const items = [...pedidos.map((id) => ({ id, activo: true })), ...otros.map((l) => ({ id: l.id, activo: false }))];
  const alfa = leerAlfa(ejercicio.alfa);

  const alternar = (id: Literal) =>
    cambiar({ literales: pedidos.includes(id) ? pedidos.filter((l) => l !== id) : [...pedidos, id] });
  const mover = (i: number, d: -1 | 1) => {
    const l = [...pedidos];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    cambiar({ literales: l });
  };

  return (
    <div className="etapa-ejercicio">
      <section className="tarjeta" aria-label="Datos del ejercicio">
        <div className="tarjeta-titulo">
          <h2>Datos</h2>
          <button type="button" className="boton mini" onClick={onCambiarDatos}>
            Cambiar datos
          </button>
        </div>
        {ejemplo && (
          <>
            <span className="etiqueta-fuente">
              <b>{ejemplo.fuente === 'taller' ? 'Taller' : 'Diapositivas'}</b> {ejemplo.etiqueta.split(' · ')[0]}
            </span>
            <p className="enunciado">{ejemplo.enunciado}</p>
            {ejemplo.nota && <p className="aviso">{ejemplo.nota}</p>}
          </>
        )}
        {ejercicio.archivo && (
          <p className="nota">
            Leídos de <b>{ejercicio.archivo}</b>.
          </p>
        )}
        <dl className="variables">
          <div className="variables-fila">
            <dt>y</dt>
            <dd>{tabla.nombreY.trim() || 'variable de respuesta'}</dd>
          </div>
          {tabla.nombresX.map((nom, j) => (
            <div key={j} className="variables-fila">
              <dt>{simbolo(j)}</dt>
              <dd>{nom.trim() || 'variable regresora'}</dd>
            </div>
          ))}
        </dl>
        <p className="nota">
          n = {n} observaciones y k = {k} variable{k > 1 ? 's' : ''} regresora{k > 1 ? 's' : ''}:{' '}
          {k === 1 ? 'regresión lineal simple.' : 'regresión lineal múltiple, que se resuelve por el método matricial.'}
        </p>
        <details className="detalles" open={abrirTabla}>
          <summary>Ver o corregir la tabla de datos</summary>
          <div className="detalles-cuerpo">
            <TablaDatos
              datos={tabla}
              onCambio={(t) => {
                const x0 = Array.from({ length: t.nombresX.length }, (_, j) => ejercicio.x0[j] ?? '');
                cambiar({ tabla: t, x0 });
              }}
            />
          </div>
        </details>
        {ejercicio.modificado && ejemplo && (
          <div className="botones">
            <span className="nota">Cambiaste los datos del ejercicio.</span>
            <button type="button" className="boton mini" onClick={() => onCambio(desdeEjemplo(ejemplo, formato.coma))}>
              Restaurar
            </button>
          </div>
        )}
      </section>

      <section className="tarjeta" aria-label="Qué pide el ejercicio">
        <div className="tarjeta-titulo">
          <h2>¿Qué pide el ejercicio?</h2>
        </div>
        <p className="nota">Marca lo que pide el enunciado y ordénalo como aparece. La solución se organiza igual: a), b), c)…</p>
        <ol className="literales">
          {items.map(({ id, activo }) => {
            const i = pedidos.indexOf(id);
            return (
              <li key={id} className={`literal${activo ? ' activo' : ''}`}>
                <div className="literal-fila">
                  <label className="literal-check">
                    <input type="checkbox" id={`literal-${id}`} checked={activo} onChange={() => alternar(id)} />
                    <span className="literal-letra">{activo ? letra(i) : ''}</span>
                    <span className="literal-titulo">{tituloLiteral(id, k)}</span>
                  </label>
                  {activo && (
                    <span className="literal-orden">
                      <button type="button" className="boton mini" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                        ↑
                      </button>
                      <button type="button" className="boton mini" aria-label="Bajar" disabled={i === pedidos.length - 1} onClick={() => mover(i, 1)}>
                        ↓
                      </button>
                    </span>
                  )}
                </div>
                {activo && id === 'prueba' && (
                  <div className="literal-param">
                    <Campo etiqueta="Nivel de significancia α">
                      <input
                        id="alfa"
                        className="dato"
                        value={ejercicio.alfa}
                        inputMode="decimal"
                        aria-invalid={!(alfa > 0 && alfa < 1) || undefined}
                        onChange={(e) => cambiar({ alfa: e.target.value })}
                      />
                    </Campo>
                    <div className="botones">
                      {ALFAS.map((a) => (
                        <button key={a} type="button" className="boton mini" aria-pressed={Math.abs(alfa - Number(a)) < 1e-12} onClick={() => cambiar({ alfa: conComa(a) })}>
                          {conComa(a)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activo && id === 'prediccion' && (
                  <div className="literal-param">
                    <span className="nota">Valores dados para predecir ŷ:</span>
                    <div className="fila-campos">
                      {tabla.nombresX.map((nom, j) => (
                        <Campo key={j} etiqueta={`${simbolo(j)}${nom ? ` · ${nom}` : ''}`}>
                          <input
                            id={`x0-${j}`}
                            className="dato"
                            inputMode="decimal"
                            value={ejercicio.x0[j] ?? ''}
                            aria-invalid={(ejercicio.x0[j] ?? '').trim() !== '' && Number.isNaN(parseNumero(ejercicio.x0[j])) ? true : undefined}
                            onChange={(e) => {
                              const x0 = [...ejercicio.x0];
                              x0[j] = e.target.value;
                              cambiar({ x0 });
                            }}
                          />
                        </Campo>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {error && <MensajeError texto={error} />}
        <div className="botones">
          <button type="button" className="boton primario grande" disabled={error !== null} onClick={onResolver}>
            Resolver paso a paso →
          </button>
        </div>
      </section>
    </div>
  );
}
