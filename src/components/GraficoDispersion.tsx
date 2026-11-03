import { useId, useState } from 'react';
import { type Formato, fmt } from '../core/formato';

interface Props {
  /** simple: x contra y con la recta ajustada. ajustados: ŷ contra y con la recta y = ŷ. */
  modo: 'simple' | 'ajustados';
  x: number[];
  y: number[];
  yGorro: number[];
  beta?: number[];
  etiquetaX: string;
  etiquetaY: string;
  formato: Formato;
}

const W = 640;
const H = 340;
const M = { l: 60, r: 18, t: 14, b: 48 };

function escala(min: number, max: number, objetivo = 5) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const bruto = (max - min) / objetivo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const r = bruto / pot;
  const paso = (r >= 7.5 ? 10 : r >= 3.5 ? 5 : r >= 1.5 ? 2 : 1) * pot;
  const ini = Math.floor(min / paso) * paso;
  const fin = Math.ceil(max / paso) * paso;
  const ticks: number[] = [];
  for (let v = ini; v <= fin + paso * 1e-9; v += paso) ticks.push(Number(v.toFixed(12)));
  const decimales = Math.max(0, -Math.floor(Math.log10(paso)));
  return { ini, fin, ticks, decimales };
}

export function GraficoDispersion({ modo, x, y, yGorro, beta, etiquetaX, etiquetaY, formato }: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const idClip = useId().replace(/:/g, '');
  const n = y.length;
  const xs = modo === 'simple' ? x : yGorro;

  let ex;
  let ey;
  if (modo === 'ajustados') {
    const todos = [...y, ...yGorro];
    const e = escala(Math.min(...todos), Math.max(...todos));
    ex = e;
    ey = e;
  } else {
    ex = escala(Math.min(...xs), Math.max(...xs));
    ey = escala(Math.min(...y, ...yGorro), Math.max(...y, ...yGorro));
  }
  const sx = (v: number) => M.l + ((v - ex.ini) / (ex.fin - ex.ini)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - ey.ini) / (ey.fin - ey.ini)) * (H - M.t - M.b);
  const tick = (v: number, d: number) => fmt(v, { ...formato, decimales: Math.min(d, 6) });

  const linea =
    modo === 'simple' && beta
      ? { x1: sx(ex.ini), y1: sy(beta[0] + beta[1] * ex.ini), x2: sx(ex.fin), y2: sy(beta[0] + beta[1] * ex.fin) }
      : { x1: sx(ex.ini), y1: sy(ex.ini), x2: sx(ex.fin), y2: sy(ex.fin) };

  const descripcion =
    modo === 'simple'
      ? `Diagrama de dispersión de ${etiquetaY} contra ${etiquetaX}, con la recta ajustada y los residuos de ${n} observaciones.`
      : `Valores observados de ${etiquetaY} contra los valores ajustados ŷ de ${n} observaciones, con la recta y = ŷ.`;
  const a = activo;

  return (
    <figure className="tarjeta" style={{ margin: 0 }}>
      <div className="tarjeta-titulo">
        <h2>{modo === 'simple' ? 'Diagrama de dispersión y recta ajustada' : 'Valores observados contra ajustados'}</h2>
      </div>
      <div className="leyenda" aria-hidden="true">
        <span>
          <svg width="12" height="12">
            <circle cx="6" cy="6" r="4.5" fill="var(--serie-1)" />
          </svg>
          Observaciones
        </span>
        <span>
          <i style={{ width: 18, height: 2, background: 'var(--serie-2)' }} />
          {modo === 'simple' ? 'Recta ajustada ŷ' : 'Ajuste perfecto (y = ŷ)'}
        </span>
        <span>
          <i style={{ width: 2, height: 12, background: 'var(--tinta-3)', opacity: 0.6 }} />
          Residuo y − ŷ
        </span>
      </div>
      <div className="grafica">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={descripcion}>
          <defs>
            <clipPath id={idClip}>
              <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
            </clipPath>
          </defs>
          <g className="eje">
            {ey.ticks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="var(--linea)" strokeWidth="1" />
                <text x={M.l - 8} y={sy(t)} dy="0.32em" textAnchor="end">
                  {tick(t, ey.decimales)}
                </text>
              </g>
            ))}
            {ex.ticks.map((t) => (
              <g key={`x${t}`}>
                <line x1={sx(t)} x2={sx(t)} y1={H - M.b} y2={H - M.b + 5} stroke="var(--linea-fuerte)" strokeWidth="1" />
                <text x={sx(t)} y={H - M.b + 18} textAnchor="middle">
                  {tick(t, ex.decimales)}
                </text>
              </g>
            ))}
            <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="var(--linea-fuerte)" strokeWidth="1" />
          </g>
          <text className="titulo-eje" x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle">
            {modo === 'simple' ? etiquetaX : `Valor ajustado ŷ`}
          </text>
          <text className="titulo-eje" transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle">
            {etiquetaY}
          </text>
          <g clipPath={`url(#${idClip})`}>
            {y.map((yi, i) => (
              <line
                key={`r${i}`}
                x1={sx(xs[i])}
                x2={sx(xs[i])}
                y1={sy(yi)}
                y2={sy(yGorro[i])}
                stroke="var(--tinta-3)"
                strokeOpacity={a === i ? 1 : 0.5}
                strokeWidth={a === i ? 2 : 1}
              />
            ))}
            <line {...linea} stroke="var(--serie-2)" strokeWidth="2" strokeLinecap="round" />
          </g>
          {y.map((yi, i) => (
            <circle
              key={`p${i}`}
              cx={sx(xs[i])}
              cy={sy(yi)}
              r={a === i ? 6 : 4.5}
              fill="var(--serie-1)"
              stroke="var(--hoja)"
              strokeWidth="2"
            />
          ))}
          {y.map((yi, i) => (
            <circle
              key={`h${i}`}
              cx={sx(xs[i])}
              cy={sy(yi)}
              r="12"
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`Observación ${i + 1}: y = ${fmt(yi, formato)}, ŷ = ${fmt(yGorro[i], formato)}`}
              onPointerEnter={() => setActivo(i)}
              onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              style={{ cursor: 'pointer', outline: 'none' }}
            />
          ))}
        </svg>
        {a !== null && (
          <div className="globo" style={{ left: `${(sx(xs[a]) / W) * 100}%`, top: `${(sy(y[a]) / H) * 100}%` }}>
            <div>
              <span>Observación</span>
              <b>{a + 1}</b>
            </div>
            {modo === 'simple' && (
              <div>
                <span>x</span>
                <b>{fmt(x[a], formato)}</b>
              </div>
            )}
            <div>
              <span>y</span>
              <b>{fmt(y[a], formato)}</b>
            </div>
            <div>
              <span>ŷ</span>
              <b>{fmt(yGorro[a], formato)}</b>
            </div>
            <div>
              <span>y − ŷ</span>
              <b>{fmt(y[a] - yGorro[a], formato)}</b>
            </div>
          </div>
        )}
      </div>
      <figcaption className="nota">
        {modo === 'simple'
          ? 'Cada línea vertical gris es un residuo. La recta de mínimos cuadrados hace mínima la suma de sus cuadrados (SCE).'
          : 'Cuanto más cerca de la recta y = ŷ quedan los puntos, mayor es R². Las líneas verticales son los residuos.'}
      </figcaption>
    </figure>
  );
}
