import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormato } from '../../contexto';
import { parseNumero } from '../../core/entrada';
import { subindice } from '../../core/formato';
import type { OpcionesRegresion, ResultadoRegresion } from '../../core/regresion';
import { type Literal, type Seccion, infoLiteral, organizarSolucion, respuestaLiteral } from '../../core/regresion/literales';
import type { Solucion } from '../../core/steps';
import { GraficoDispersion } from '../../components/GraficoDispersion';
import { BloqueVista, PasoVista } from '../../components/Pasos';
import { type Ejercicio, filasConDatos } from './estado';

interface Props {
  ejercicio: Ejercicio;
  solucion: Solucion<ResultadoRegresion>;
  op: OpcionesRegresion;
  literales: Literal[];
  onEditar: () => void;
}

const idSeccion = (s: Seccion) => `sec-${s.parte}`;
const idPaso = (s: Seccion, i: number) => `paso-${s.parte}-${i + 1}`;

function ir(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function SolucionRegresion({ ejercicio, solucion, op, literales, onEditar }: Props) {
  const { formato } = useFormato();
  const r = solucion.resultado;
  const { tabla, ejemplo } = ejercicio;
  const nombreY = tabla.nombreY.trim() || 'y';
  const secciones = useMemo(() => organizarSolucion(solucion.pasos, literales, r.k), [solucion, literales, r.k]);
  const [activa, setActiva] = useState<string>(idSeccion(secciones[0]));
  const documento = useRef<HTMLDivElement>(null);

  // Resalta en el índice la sección que se está leyendo.
  useEffect(() => {
    const raiz = documento.current;
    if (!raiz || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiva(visible.target.id);
      },
      { rootMargin: '0px 0px -65% 0px' },
    );
    raiz.querySelectorAll('[data-seccion]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [secciones]);

  const filas = filasConDatos(tabla);
  const ys = filas.map((f) => parseNumero(f[0]));
  const xs = filas.map((f) => parseNumero(f[1]));
  const parteGrafica: Literal = r.k === 1 ? 'parametros' : 'anova';
  const simbolo = (j: number) => (r.k > 1 ? `x${subindice(j + 1)}` : 'x');

  // Al imprimir (con el botón o con Ctrl + P) se abren las operaciones de fila de Gauss-Jordan.
  useEffect(() => {
    const abrir = () => documento.current?.querySelectorAll('details').forEach((d) => (d.open = true));
    window.addEventListener('beforeprint', abrir);
    return () => window.removeEventListener('beforeprint', abrir);
  }, []);

  const literalesResueltos = secciones.filter((s) => s.letra !== null);

  return (
    <div className="solucion">
      <nav className="indice" aria-label="Contenido de la solución">
        <span className="indice-titulo">Contenido</span>
        <ol>
          {secciones.map((s) => (
            <li key={s.parte} className={activa === idSeccion(s) ? 'activa' : undefined}>
              <button type="button" className="indice-seccion" onClick={() => ir(idSeccion(s))}>
                <b>{s.letra ?? '·'}</b>
                <span>{s.titulo}</span>
              </button>
              {s.pasos.length > 0 && (
                <ol>
                  {s.pasos.map((p, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => ir(idPaso(s, i))}>
                        {i + 1}. {p.titulo}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
          <li className={activa === 'resumen' ? 'activa' : undefined}>
            <button type="button" className="indice-seccion" onClick={() => ir('resumen')}>
              <b>✓</b>
              <span>Resumen de respuestas</span>
            </button>
          </li>
        </ol>
      </nav>

      <div className="documento" ref={documento}>
        <header className="tarjeta solucion-cabecera">
          <div className="solucion-cabecera-texto">
            <span className="ceja">
              {ejemplo ? ejemplo.etiqueta : ejercicio.archivo ? `Datos de ${ejercicio.archivo}` : 'Datos propios'}
            </span>
            <h2>{r.k === 1 ? 'Regresión lineal simple' : `Regresión lineal múltiple con k = ${r.k} variables`}</h2>
            <p className="nota">
              n = {r.n} observaciones · y = {nombreY}
              {tabla.nombresX.map((nom, j) => ` · ${simbolo(j)} = ${nom.trim() || 'sin nombre'}`)}
            </p>
            {ejemplo && <p className="enunciado">{ejemplo.enunciado}</p>}
          </div>
          <div className="botones no-imprimir">
            <button type="button" className="boton" onClick={onEditar}>
              ← Cambiar lo que se pide
            </button>
            <button type="button" className="boton primario" onClick={() => window.print()}>
              Imprimir o guardar en PDF
            </button>
          </div>
        </header>

        {secciones.map((s) => {
          const requisitos = s.contiene.filter((p) => p !== s.parte && p !== 'planteamiento');
          return (
            <article key={s.parte} id={idSeccion(s)} data-seccion className="procedimiento literal-seccion" aria-labelledby={`${idSeccion(s)}-titulo`}>
              <header className="procedimiento-cabecera">
                <span className="literal-marca" aria-hidden="true">
                  {s.letra}
                </span>
                <div>
                  <h2 id={`${idSeccion(s)}-titulo`}>
                    {s.letra && <span className="solo-lector">Literal {s.letra} </span>}
                    {s.titulo}
                  </h2>
                  <span className="nota">
                    {s.letra === null
                      ? 'Lo que necesitan todos los literales'
                      : `${s.pasos.length} paso${s.pasos.length === 1 ? '' : 's'}`}
                  </span>
                </div>
              </header>
              {requisitos.length > 0 && (
                <p className="aviso literal-aviso">
                  Para responder este literal se necesita{requisitos.length > 1 ? 'n' : ''}{' '}
                  {requisitos.map((p) => infoLiteral(p as Literal).titulo.toLowerCase()).join(' y ')}, que no se
                  pidi{requisitos.length > 1 ? 'eron' : 'ó'} antes; por eso se calcula{requisitos.length > 1 ? 'n' : ''} aquí primero.
                </p>
              )}
              {s.resueltoEn && <p className="aviso literal-aviso">Los pasos de este literal ya se mostraron en el literal {s.resueltoEn}.</p>}
              {s.pasos.map((p, i) => (
                <PasoVista key={`${i}-${p.titulo}`} paso={p} n={i + 1} id={idPaso(s, i)} />
              ))}
              {s.contiene.includes(parteGrafica) && (
                <div className="literal-grafica">
                  <GraficoDispersion
                    modo={r.k === 1 ? 'simple' : 'ajustados'}
                    x={xs}
                    y={ys}
                    yGorro={r.yGorro}
                    beta={r.beta}
                    etiquetaX={tabla.nombresX[0]?.trim() || 'x'}
                    etiquetaY={nombreY}
                    formato={formato}
                  />
                </div>
              )}
              {s.parte !== 'planteamiento' && (
                <section className="respuesta-literal" aria-label={`Respuesta del literal ${s.letra}`}>
                  <span className="respuesta-etiqueta">Respuesta {s.letra}</span>
                  {respuestaLiteral(s.parte, r, op, nombreY).map((b, i) => (
                    <BloqueVista key={i} b={b} />
                  ))}
                </section>
              )}
            </article>
          );
        })}

        <section id="resumen" data-seccion className="tarjeta resumen" aria-labelledby="resumen-titulo">
          <div className="tarjeta-titulo">
            <h2 id="resumen-titulo">Resumen de respuestas</h2>
            <span className="nota">Lo que se responde en cada literal</span>
          </div>
          {literalesResueltos.map((s) => (
            <div key={s.parte} className="resumen-item">
              <h3>
                <span className="literal-letra">{s.letra}</span> {s.titulo}
              </h3>
              {respuestaLiteral(s.parte as Literal, r, op, nombreY).map((b, i) => (
                <BloqueVista key={i} b={b} />
              ))}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
