import { useState, type DragEvent } from 'react';
import { useFormato } from '../../contexto';
import {
  ErrorLectura,
  type HojaLeida,
  type Rol,
  analizarHoja,
  construirDatos,
  hojaSugerida,
  leerArchivo,
  letraColumna,
  parseCsv,
  sugerirRoles,
} from '../../core/importar';
import { subindice } from '../../core/formato';
import { EJEMPLOS_REGRESION, type EjemploRegresion } from '../../core/regresion/ejemplos';
import { aTexto } from './estado';
import type { DatosTabla } from './TablaDatos';

/** Archivo o celdas pegadas que se están revisando antes de usarlos. */
export interface Lectura {
  origen: string;
  /** Nombre del archivo; null si son celdas pegadas. */
  archivo: string | null;
  hojas: HojaLeida[];
  hoja: number;
  roles: Rol[];
}

function nuevaLectura(origen: string, archivo: string | null, hojas: HojaLeida[]): Lectura {
  const hoja = hojaSugerida(hojas);
  const t = hojas[hoja]?.tabla;
  return { origen, archivo, hojas, hoja, roles: t ? sugerirRoles(t) : [] };
}

interface Props {
  lectura: Lectura | null;
  onLectura: (l: Lectura | null) => void;
  onUsar: (tabla: DatosTabla, archivo: string | null) => void;
  onEjemplo: (e: EjemploRegresion) => void;
  onManual: () => void;
}

const TEXTO_ROL: Record<Rol, string> = { y: 'y', x: 'x', ignorar: 'No usar' };

function Revision({ lectura, onLectura, onUsar }: Pick<Props, 'onLectura' | 'onUsar'> & { lectura: Lectura }) {
  const { formato } = useFormato();
  const hoja = lectura.hojas[lectura.hoja];
  const t = hoja.tabla;
  const datos = t ? construirDatos(t, lectura.roles) : null;
  const filas = (h: HojaLeida) => (h.tabla ? h.tabla.filaFin - h.tabla.filaInicio + 1 : 0);

  const usar = () => {
    if (!datos || 'error' in datos) return;
    onUsar(
      {
        nombreY: datos.nombreY,
        nombresX: datos.nombresX,
        celdas: datos.filas.map((f) => f.map((v) => (v === null ? '' : aTexto(v, formato.coma)))),
      },
      lectura.archivo,
    );
  };

  const k = datos && !('error' in datos) ? datos.nombresX.length : 0;
  const nombreX = (j: number) => (k > 1 ? `x${subindice(j + 1)}` : 'x');

  return (
    <section className="tarjeta revision" aria-label="Revisión de los datos leídos">
      <div className="tarjeta-titulo">
        <h2>Revisa lo que se leyó</h2>
        <span className="nota">{lectura.origen}</span>
      </div>

      {lectura.hojas.length > 1 && (
        <label className="campo">
          <span>Hoja del libro</span>
          <select
            id="hoja"
            value={lectura.hoja}
            onChange={(e) => {
              const i = Number(e.target.value);
              const tt = lectura.hojas[i].tabla;
              onLectura({ ...lectura, hoja: i, roles: tt ? sugerirRoles(tt) : [] });
            }}
          >
            {lectura.hojas.map((h, i) => (
              <option key={i} value={i}>
                {h.nombre} — {h.esResumen ? 'resumen de la regresión de Excel' : h.tabla ? `${filas(h)} filas × ${h.tabla.columnas.length} columnas` : 'sin tabla de números'}
              </option>
            ))}
          </select>
        </label>
      )}

      {hoja.esResumen && (
        <p className="aviso">
          Esta hoja es el resumen que genera la herramienta de regresión de Excel: aquí están los resultados, no los datos. Elige la hoja con
          las observaciones.
        </p>
      )}
      {!t && !hoja.esResumen && <p className="aviso">En esta hoja no se encontró una tabla de números.</p>}

      {t && (
        <>
          <p className="nota">
            Se encontraron <b>{filas(hoja)} observaciones</b> en las filas {t.filaInicio + 1} a {t.filaFin + 1} (columnas{' '}
            {letraColumna(t.columnas[0])} a {letraColumna(t.columnas[t.columnas.length - 1])}). Indica qué es cada columna: <b>y</b> es la
            variable de respuesta y las <b>x</b> son las regresoras. La sugerencia sale de los encabezados.
          </p>
          <div className="mapeo">
            <table>
              <thead>
                <tr>
                  <th className="num-fila">Fila</th>
                  {t.columnas.map((c, j) => (
                    <th key={j} className={`rol-${lectura.roles[j]}`}>
                      <select
                        id={`rol-${j}`}
                        aria-label={`Papel de la columna ${letraColumna(c)}`}
                        value={lectura.roles[j]}
                        onChange={(e) => {
                          const v = e.target.value as Rol;
                          // Solo puede haber una y: la anterior pasa a ser x.
                          const roles = lectura.roles.map((r, i) => (i === j ? v : v === 'y' && r === 'y' ? 'x' : r));
                          onLectura({ ...lectura, roles });
                        }}
                      >
                        {(['y', 'x', 'ignorar'] as Rol[]).map((r) => (
                          <option key={r} value={r}>
                            {TEXTO_ROL[r]}
                          </option>
                        ))}
                      </select>
                      <span className="mapeo-enc">
                        {letraColumna(c)} · {t.encabezados[j] || 'sin encabezado'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.crudos.map((f, i) => (
                  <tr key={i}>
                    <td className="num-fila">{t.filaInicio + i + 1}</td>
                    {f.map((v, j) => (
                      <td key={j} className={`rol-${lectura.roles[j]}${t.valores[i][j] === null ? ' invalida' : ''}`}>
                        {v === null ? '—' : typeof v === 'number' ? aTexto(v, formato.coma) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos && 'error' in datos && <p className="aviso">{datos.error}</p>}
          {datos && !('error' in datos) && (
            <>
              <p className="lectura-variables">
                <b>y</b> = {datos.nombreY || 'sin nombre'}
                {datos.nombresX.map((nom, j) => (
                  <span key={j}>
                    {' · '}
                    <b>{nombreX(j)}</b> = {nom || 'sin nombre'}
                  </span>
                ))}
              </p>
              {datos.problemas.length > 0 && (
                <p className="aviso">
                  Hay celdas que faltan o no son números: {datos.problemas.slice(0, 4).join('; ')}
                  {datos.problemas.length > 4 ? ` y ${datos.problemas.length - 4} más` : ''}. Puedes corregirlas en el siguiente paso.
                </p>
              )}
            </>
          )}
        </>
      )}

      <div className="botones">
        <button type="button" className="boton primario" disabled={!datos || 'error' in datos} onClick={usar}>
          Usar estos datos →
        </button>
        <button type="button" className="boton" onClick={() => onLectura(null)}>
          Descartar
        </button>
      </div>
    </section>
  );
}

function TarjetaEjemplo({ e, onEjemplo }: { e: EjemploRegresion; onEjemplo: Props['onEjemplo'] }) {
  const [, titulo] = e.etiqueta.split(' · ');
  return (
    <button type="button" className="ejemplo" onClick={() => onEjemplo(e)}>
      <strong>{e.fuente === 'taller' ? e.etiqueta : titulo ?? e.etiqueta}</strong>
      <span className="ejemplo-enunciado">{e.enunciado}</span>
      <small>
        n = {e.y.length} · {e.x.length === 1 ? 'regresión simple' : `k = ${e.x.length}`}
      </small>
    </button>
  );
}

export function CargaDatos({ lectura, onLectura, onUsar, onEjemplo, onManual }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [pegando, setPegando] = useState(false);
  const [texto, setTexto] = useState('');

  const abrir = async (archivo: File) => {
    setError(null);
    try {
      const hojas = leerArchivo(archivo.name, new Uint8Array(await archivo.arrayBuffer()));
      if (!hojas.some((h) => h.tabla)) {
        setError(`No se encontró una tabla de números en «${archivo.name}». La tabla debe tener una columna por variable y una fila por observación.`);
        return;
      }
      onLectura(nuevaLectura(archivo.name, archivo.name, hojas));
    } catch (e) {
      setError(e instanceof ErrorLectura ? e.message : `No se pudo leer «${archivo.name}». Verifica que sea un archivo .xlsx o .csv.`);
    }
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files[0];
    if (archivo) void abrir(archivo);
  };

  const usarPegado = () => {
    setError(null);
    const hoja = analizarHoja({ nombre: 'Celdas pegadas', celdas: parseCsv(texto, false) });
    if (!hoja.tabla) {
      setError('No se reconoció una tabla en el texto pegado. Copia las columnas desde Excel, con o sin la fila de encabezados.');
      return;
    }
    onLectura(nuevaLectura('Celdas pegadas', null, [hoja]));
    setPegando(false);
    setTexto('');
  };

  const taller = EJEMPLOS_REGRESION.filter((e) => e.fuente === 'taller');
  const clase = EJEMPLOS_REGRESION.filter((e) => e.fuente === 'clase');

  return (
    <div className="inicio">
      <div className="inicio-principal">
        <section className="tarjeta" aria-label="Cargar datos">
          <div className="tarjeta-titulo">
            <h2>¿Con qué datos vas a trabajar?</h2>
          </div>
          <label
            className={`zona-archivo${arrastrando ? ' activa' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
          >
            <input
              id="archivo"
              type="file"
              accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void abrir(archivo);
                e.target.value = '';
              }}
            />
            <svg className="zona-icono" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
              <path
                d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <strong>Arrastra aquí tu archivo de Excel</strong>
            <span>
              o <u>haz clic para elegirlo</u> · .xlsx o .csv
            </span>
            <small>Una columna por variable (y, x1, x2…) y una fila por observación, como la tabla del taller. Puede tener títulos y totales.</small>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="otras-formas">
            <span className="nota">Otras formas de empezar:</span>
            <div className="botones">
              <button type="button" className="boton" onClick={() => setPegando((v) => !v)} aria-expanded={pegando}>
                Pegar celdas copiadas de Excel
              </button>
              <button type="button" className="boton" onClick={onManual}>
                Escribir los datos a mano
              </button>
            </div>
          </div>
          {pegando && (
            <div className="caso">
              <label className="campo">
                <span>Selecciona la tabla en Excel (con los encabezados), cópiala con Ctrl + C y pégala aquí con Ctrl + V</span>
                <textarea id="texto-pegado" rows={7} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'y\tx1\tx2\n240\t25\t24\n236\t31\t21'} />
              </label>
              <div className="botones">
                <button type="button" className="boton primario mini" onClick={usarPegado} disabled={texto.trim() === ''}>
                  Leer la tabla
                </button>
                <button type="button" className="boton mini" onClick={() => setPegando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
        {lectura && <Revision lectura={lectura} onLectura={onLectura} onUsar={onUsar} />}
      </div>

      <section className="tarjeta" aria-label="Ejercicios precargados">
        <div className="tarjeta-titulo">
          <h2>O abre un ejercicio ya cargado</h2>
        </div>
        <span className="ceja">Taller del tercer corte</span>
        <div className="ejemplos">
          {taller.map((e) => (
            <TarjetaEjemplo key={e.id} e={e} onEjemplo={onEjemplo} />
          ))}
        </div>
        <span className="ceja">Ejemplos de las diapositivas</span>
        <div className="ejemplos">
          {clase.map((e) => (
            <TarjetaEjemplo key={e.id} e={e} onEjemplo={onEjemplo} />
          ))}
        </div>
      </section>
    </div>
  );
}
