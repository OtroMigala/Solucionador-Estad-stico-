import { useState, type ClipboardEvent } from 'react';
import { parseNumero, parseTablaPegada } from '../../core/entrada';
import { subindice } from '../../core/formato';

export const MAX_X = 8;

export interface DatosTabla {
  nombreY: string;
  nombresX: string[];
  /** Filas de texto: [y, x₁, …, xₖ]. */
  celdas: string[][];
}

interface Props {
  datos: DatosTabla;
  onCambio: (d: DatosTabla) => void;
}

const vacia = (n: number) => Array.from({ length: n }, () => '');

export function celdaInvalida(v: string, fila: string[]): boolean {
  const filaVacia = fila.every((c) => c.trim() === '');
  return !filaVacia && Number.isNaN(parseNumero(v));
}

/** Combina una tabla pegada a partir de la celda (i, j). */
function combinar(d: DatosTabla, i: number, j: number, texto: string): DatosTabla {
  const p = parseTablaPegada(texto);
  if (p.filas.length === 0) return d;
  const ancho = Math.max(...p.filas.map((f) => f.length), p.encabezados?.length ?? 0);
  const columnas = Math.min(Math.max(d.nombresX.length + 1, j + ancho), MAX_X + 1);
  const nombresX = [...d.nombresX, ...vacia(columnas - 1 - d.nombresX.length)];
  let nombreY = d.nombreY;
  if (p.encabezados) {
    p.encabezados.forEach((h, c) => {
      const col = j + c;
      if (col === 0) nombreY = h;
      else if (col < columnas) nombresX[col - 1] = h;
    });
  }
  const filas = Math.max(d.celdas.length, i + p.filas.length);
  const celdas = Array.from({ length: filas }, (_, r) => {
    const base = d.celdas[r] ?? [];
    return Array.from({ length: columnas }, (_, c) => base[c] ?? '');
  });
  p.filas.forEach((f, r) => f.forEach((v, c) => j + c < columnas && (celdas[i + r][j + c] = v)));
  return { nombreY, nombresX, celdas };
}

export function TablaDatos({ datos, onCambio }: Props) {
  const [pegando, setPegando] = useState(false);
  const [textoPegado, setTextoPegado] = useState('');
  const [yAlFinal, setYAlFinal] = useState(false);
  const k = datos.nombresX.length;

  const setCelda = (i: number, j: number, v: string) => {
    const celdas = datos.celdas.map((f) => [...f]);
    celdas[i][j] = v;
    onCambio({ ...datos, celdas });
  };

  const alPegar = (e: ClipboardEvent<HTMLInputElement>, i: number, j: number) => {
    const texto = e.clipboardData.getData('text');
    if (!/[\t\n;]/.test(texto.trim())) return;
    e.preventDefault();
    onCambio(combinar(datos, i, j, texto));
  };

  const usarPegado = () => {
    const p = parseTablaPegada(textoPegado);
    if (p.filas.length === 0) return;
    const reordenar = (f: string[]) => (yAlFinal ? [f[f.length - 1], ...f.slice(0, -1)] : f);
    const filas = p.filas.map(reordenar);
    const enc = p.encabezados ? reordenar(p.encabezados) : null;
    const columnas = Math.min(Math.max(...filas.map((f) => f.length)), MAX_X + 1);
    if (columnas < 2) return;
    onCambio({
      nombreY: enc?.[0] ?? '',
      nombresX: Array.from({ length: columnas - 1 }, (_, c) => enc?.[c + 1] ?? ''),
      celdas: filas.map((f) => Array.from({ length: columnas }, (_, c) => f[c] ?? '')),
    });
    setPegando(false);
    setTextoPegado('');
  };

  return (
    <section className="tarjeta" aria-label="Datos">
      <div className="tarjeta-titulo">
        <h2>Datos</h2>
        <span className="nota">
          n = {datos.celdas.filter((f) => f.some((c) => c.trim() !== '')).length}, k = {k}
        </span>
      </div>
      <div className="grilla">
        <table>
          <thead>
            <tr>
              <th className="num-fila">#</th>
              <th>
                <span className="simbolo">y</span>
                <input
                  id="nombre-y"
                  value={datos.nombreY}
                  placeholder="nombre"
                  aria-label="Nombre de la variable y"
                  onChange={(e) => onCambio({ ...datos, nombreY: e.target.value })}
                />
              </th>
              {datos.nombresX.map((nom, j) => (
                <th key={j}>
                  <span className="simbolo">x{k > 1 ? subindice(j + 1) : ''}</span>
                  <input
                    id={`nombre-x${j + 1}`}
                    value={nom}
                    placeholder="nombre"
                    aria-label={`Nombre de la variable x${j + 1}`}
                    onChange={(e) => {
                      const nombresX = [...datos.nombresX];
                      nombresX[j] = e.target.value;
                      onCambio({ ...datos, nombresX });
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.celdas.map((fila, i) => (
              <tr key={i}>
                <td className="num-fila">{i + 1}</td>
                {fila.map((v, j) => (
                  <td key={j}>
                    <input
                      id={`celda-${i}-${j}`}
                      value={v}
                      inputMode="decimal"
                      autoComplete="off"
                      aria-label={`Fila ${i + 1}, ${j === 0 ? 'y' : `x${j}`}`}
                      aria-invalid={celdaInvalida(v, fila) || undefined}
                      onChange={(e) => setCelda(i, j, e.target.value)}
                      onPaste={(e) => alPegar(e, i, j)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="botones">
        <button type="button" className="boton mini" onClick={() => onCambio({ ...datos, celdas: [...datos.celdas, vacia(k + 1)] })}>
          + Fila
        </button>
        <button
          type="button"
          className="boton mini"
          disabled={datos.celdas.length <= 1}
          onClick={() => onCambio({ ...datos, celdas: datos.celdas.slice(0, -1) })}
        >
          − Fila
        </button>
        <button
          type="button"
          className="boton mini"
          disabled={k >= MAX_X}
          onClick={() => onCambio({ ...datos, nombresX: [...datos.nombresX, ''], celdas: datos.celdas.map((f) => [...f, '']) })}
        >
          + Variable x
        </button>
        <button
          type="button"
          className="boton mini"
          disabled={k <= 1}
          onClick={() => onCambio({ ...datos, nombresX: datos.nombresX.slice(0, -1), celdas: datos.celdas.map((f) => f.slice(0, -1)) })}
        >
          − Variable x
        </button>
        <button type="button" className="boton mini" onClick={() => setPegando((v) => !v)} aria-expanded={pegando}>
          Pegar desde Excel
        </button>
        <button
          type="button"
          className="boton mini"
          onClick={() => onCambio({ nombreY: '', nombresX: vacia(k), celdas: Array.from({ length: 5 }, () => vacia(k + 1)) })}
        >
          Vaciar
        </button>
      </div>
      {pegando && (
        <div className="caso">
          <label className="campo">
            <span>Pega aquí las columnas copiadas de Excel o Google Sheets (con o sin fila de encabezados)</span>
            <textarea
              id="texto-pegado"
              rows={6}
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder={'y\tx1\tx2\n240\t25\t24\n236\t31\t21'}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={yAlFinal} onChange={(e) => setYAlFinal(e.target.checked)} />
            La variable y está en la última columna
          </label>
          <div className="botones">
            <button type="button" className="boton primario mini" onClick={usarPegado}>
              Usar estos datos
            </button>
            <button type="button" className="boton mini" onClick={() => setPegando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <p className="nota">
        También puedes pegar varias celdas copiadas directamente sobre cualquier casilla. Se acepta coma o punto decimal.
      </p>
    </section>
  );
}
