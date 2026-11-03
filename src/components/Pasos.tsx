import { Fragment, memo } from 'react';
import { REGISTRO, type Bloque, type Celda, type Paso } from '../core/steps';
import { segmentar } from '../core/textoRico';
import { Formula, FormulaEnLinea } from './Formula';

export function TextoRico({ texto }: { texto: string }) {
  return (
    <>
      {segmentar(texto).map((s, i) =>
        s.tipo === 'texto' ? <Fragment key={i}>{s.valor}</Fragment> : <FormulaEnLinea key={i} latex={s.valor} />,
      )}
    </>
  );
}

function CeldaVista({ c }: { c: Celda }) {
  return typeof c === 'string' ? <>{c}</> : <FormulaEnLinea latex={c.latex} />;
}

function BloqueVista({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case 'texto':
      return (
        <p className="texto">
          <TextoRico texto={b.texto} />
        </p>
      );
    case 'formula':
      return <Formula latex={b.latex} texto={b.texto} />;
    case 'resultado':
      return (
        <div className="resultado">
          <span className="marca">
            <Formula latex={b.latex} texto={b.texto} />
          </span>
        </div>
      );
    case 'tabla':
      return (
        <div className="tabla-cont">
          <table className="tabla">
            <thead>
              <tr>
                {b.columnas.map((c, i) => (
                  <th key={i} className={c.alinear ?? 'der'}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.filas.map((fila, i) => (
                <tr key={i}>
                  {fila.map((c, j) => (
                    <td key={j} className={b.columnas[j]?.alinear ?? 'der'}>
                      <CeldaVista c={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {b.pie && (
              <tfoot>
                <tr>
                  {b.pie.map((c, j) => (
                    <td key={j} className={b.columnas[j]?.alinear ?? 'der'}>
                      <CeldaVista c={c} />
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          {b.nota && <p className="nota">{b.nota}</p>}
        </div>
      );
    case 'conclusion':
      return <p className={`conclusion ${b.tono}`}>{b.texto}</p>;
    case 'aviso':
      return <p className="aviso">{b.texto}</p>;
    case 'lista':
      return (
        <div className="conjunto">
          {b.titulo && <span className="conjunto-etiqueta">{b.titulo} {'{'}</span>}
          {b.items.map((it, i) => (
            <span key={i} className="conjunto-elem">
              {it}
            </span>
          ))}
          {b.titulo && <span className="conjunto-etiqueta">{'}'}</span>}
        </div>
      );
    case 'detalles':
      return (
        <details className="detalles">
          <summary>{b.titulo}</summary>
          <div className="detalles-cuerpo">
            {b.bloques.map((x, i) => (
              <BloqueVista key={i} b={x} />
            ))}
          </div>
        </details>
      );
  }
}

export const PasoVista = memo(function PasoVista({ paso, n }: { paso: Paso; n: number }) {
  const m = REGISTRO[paso.metodo];
  return (
    <section className="paso" aria-labelledby={`paso-${n}`}>
      <div className="paso-num" aria-hidden="true">
        {n}
      </div>
      <div className="paso-cuerpo">
        <div className="paso-cabeza">
          <h3 className="paso-titulo" id={`paso-${n}`}>
            {paso.titulo}
          </h3>
          <span className="paso-ref" title={`${m.nombre} · ${m.presentacion}`}>
            {m.presentacion} · diap. {m.diapositiva}
          </span>
        </div>
        {paso.porque && (
          <p className="porque">
            <b>Por qué: </b>
            {paso.porque}
          </p>
        )}
        {paso.bloques.map((b, i) => (
          <BloqueVista key={i} b={b} />
        ))}
      </div>
    </section>
  );
});

export function Procedimiento({ pasos, titulo = 'Procedimiento', nota }: { pasos: Paso[]; titulo?: string; nota?: string }) {
  return (
    <article className="procedimiento">
      <header className="procedimiento-cabecera">
        <span />
        <div>
          <h2>{titulo}</h2>
          <span className="nota">{nota ?? `${pasos.length} pasos, con la diapositiva de donde sale cada uno`}</span>
        </div>
      </header>
      {pasos.map((p, i) => (
        <PasoVista key={`${i}-${p.titulo}`} paso={p} n={i + 1} />
      ))}
    </article>
  );
}
