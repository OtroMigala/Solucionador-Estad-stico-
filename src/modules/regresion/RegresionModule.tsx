import { useDeferredValue, useMemo, useState } from 'react';
import { useFormato } from '../../contexto';
import { parseNumero } from '../../core/entrada';
import { fmt, fmtPct, subindice } from '../../core/formato';
import { EJEMPLOS_REGRESION, type EjemploRegresion } from '../../core/regresion/ejemplos';
import { ecuacionTex, interpretarPearson, resolverRegresion } from '../../core/regresion';
import { Campo, MensajeError, SelectorEjemplo } from '../../components/Controles';
import { FormulaEnLinea } from '../../components/Formula';
import { GraficoDispersion } from '../../components/GraficoDispersion';
import { Procedimiento } from '../../components/Pasos';
import { type DatosTabla, TablaDatos } from './TablaDatos';

interface Estado {
  ejemplo: EjemploRegresion | null;
  modificado: boolean;
  tabla: DatosTabla;
  alfa: string;
  x0: string[];
}

const ALFAS = ['0.01', '0.025', '0.05', '0.10'];

function aTexto(v: number, coma: boolean) {
  const s = String(v);
  return coma ? s.replace('.', ',') : s;
}

function desdeEjemplo(e: EjemploRegresion, coma: boolean): Estado {
  return {
    ejemplo: e,
    modificado: false,
    tabla: {
      nombreY: e.nombreY,
      nombresX: [...e.nombresX],
      celdas: e.y.map((yi, i) => [aTexto(yi, coma), ...e.x.map((c) => aTexto(c[i], coma))]),
    },
    alfa: aTexto(e.alfa, coma),
    x0: e.x0 ? e.x0.map((v) => aTexto(v, coma)) : e.nombresX.map(() => ''),
  };
}

function leerAlfa(s: string): number {
  const t = s.trim();
  return t.endsWith('%') ? parseNumero(t.slice(0, -1)) / 100 : parseNumero(t);
}

export function RegresionModule() {
  const { formato } = useFormato();
  const [estado, setEstado] = useState<Estado>(() => desdeEjemplo(EJEMPLOS_REGRESION[0], formato.coma));
  const diferido = useDeferredValue(estado);
  const k = estado.tabla.nombresX.length;

  const cambiar = (parcial: Partial<Estado>) => setEstado((s) => ({ ...s, ...parcial, modificado: s.ejemplo !== null }));

  const calculo = useMemo(() => {
    const { tabla, alfa, x0 } = diferido;
    const filas = tabla.celdas.filter((f) => f.some((c) => c.trim() !== ''));
    const nums = filas.map((f) => f.map(parseNumero));
    const kk = tabla.nombresX.length;
    const valoresX0 = x0.slice(0, kk).map((v) => v.trim());
    const llenos = valoresX0.filter((v) => v !== '').length;
    if (llenos > 0 && llenos < kk) {
      return { ok: false as const, error: `Para predecir escribe los ${kk} valores de las variables x, o deja todos vacíos.` };
    }
    return resolverRegresion(
      {
        y: nums.map((f) => f[0]),
        x: Array.from({ length: kk }, (_, j) => nums.map((f) => f[j + 1])),
        nombreY: tabla.nombreY.trim() || undefined,
        nombresX: tabla.nombresX.map((s) => s.trim()),
      },
      { alfa: leerAlfa(alfa), x0: llenos === kk ? valoresX0.map(parseNumero) : null, formato },
    );
  }, [diferido, formato]);

  const r = calculo.ok ? calculo.solucion.resultado : null;
  const xs = useMemo(() => {
    if (!r) return [];
    return diferido.tabla.celdas.filter((f) => f.some((c) => c.trim() !== '')).map((f) => parseNumero(f[1]));
  }, [r, diferido]);
  const ys = useMemo(() => {
    if (!r) return [];
    return diferido.tabla.celdas.filter((f) => f.some((c) => c.trim() !== '')).map((f) => parseNumero(f[0]));
  }, [r, diferido]);
  const nombreY = diferido.tabla.nombreY.trim() || 'y';
  const alfaNum = leerAlfa(diferido.alfa);

  return (
    <div className="trabajo">
      <div className="entrada">
        <SelectorEjemplo
          id="ejemplo-regresion"
          ejemplos={EJEMPLOS_REGRESION}
          actual={estado.ejemplo}
          modificado={estado.modificado}
          onElegir={(e) => setEstado(desdeEjemplo(e, formato.coma))}
        />
        <TablaDatos
          datos={estado.tabla}
          onCambio={(tabla) => {
            const x0 = Array.from({ length: tabla.nombresX.length }, (_, j) => estado.x0[j] ?? '');
            cambiar({ tabla, x0 });
          }}
        />
        <section className="tarjeta" aria-label="Opciones">
          <div className="tarjeta-titulo">
            <h2>Prueba y predicción</h2>
          </div>
          <Campo etiqueta="Nivel de significancia α">
            <input
              id="alfa"
              className="dato"
              value={estado.alfa}
              inputMode="decimal"
              aria-invalid={!(alfaNum > 0 && alfaNum < 1) || undefined}
              onChange={(e) => cambiar({ alfa: e.target.value })}
            />
          </Campo>
          <div className="botones">
            {ALFAS.map((a) => (
              <button key={a} type="button" className="boton mini" onClick={() => cambiar({ alfa: formato.coma ? a.replace('.', ',') : a })}>
                {formato.coma ? a.replace('.', ',') : a}
              </button>
            ))}
          </div>
          <p className="nota">Valores para predecir ŷ (déjalos vacíos si no se pide predicción):</p>
          <div className="fila-campos">
            {estado.tabla.nombresX.map((nom, j) => (
              <Campo key={j} etiqueta={`${k > 1 ? `x${subindice(j + 1)}` : 'x'}${nom ? ` · ${nom}` : ''}`}>
                <input
                  id={`x0-${j}`}
                  className="dato"
                  inputMode="decimal"
                  value={estado.x0[j] ?? ''}
                  aria-invalid={(estado.x0[j] ?? '').trim() !== '' && Number.isNaN(parseNumero(estado.x0[j])) ? true : undefined}
                  onChange={(e) => {
                    const x0 = [...estado.x0];
                    x0[j] = e.target.value;
                    cambiar({ x0 });
                  }}
                />
              </Campo>
            ))}
          </div>
        </section>
      </div>

      <div className="salida" aria-live="polite">
        {!calculo.ok && <MensajeError texto={calculo.error} />}
        {calculo.ok && r && (
          <>
            <div className="cifras">
              <div className="cifra ancha">
                <span className="cifra-etiqueta">Modelo ajustado</span>
                <div className="formula">
                  <FormulaEnLinea latex={ecuacionTex(r.beta, { ...formato, decimales: Math.max(formato.decimales, r.k > 1 ? 6 : 4) }, r.k === 1)} />
                </div>
              </div>
              <div className="cifra">
                <span className="cifra-etiqueta">Coeficiente de determinación</span>
                <span className="cifra-valor">R² = {fmt(r.R2, formato)}</span>
                <span className="cifra-detalle">Explica el {fmtPct(r.R2, formato)} de la variabilidad de {nombreY}</span>
              </div>
              <div className="cifra">
                <span className="cifra-etiqueta">Prueba F con α = {fmt(alfaNum, { ...formato, decimales: 6 })}</span>
                <span className="cifra-valor">
                  F<sub>c</sub> = {fmt(r.F, formato)}
                </span>
                <span className="cifra-detalle">
                  F de tabla = {fmt(r.Fcritico, formato)} (gl {r.glR} y {r.glE})
                </span>
                <span className={`ficha ${r.rechazaH0 ? 'afirmativo' : 'negativo'}`}>{r.rechazaH0 ? 'Se rechaza H₀' : 'No se rechaza H₀'}</span>
              </div>
              {r.simple && (
                <div className="cifra">
                  <span className="cifra-etiqueta">Correlación de Pearson</span>
                  <span className="cifra-valor">r = {fmt(r.simple.r, formato)}</span>
                  <span className="cifra-detalle">{interpretarPearson(r.simple.r)}</span>
                </div>
              )}
              {r.prediccion !== null && (
                <div className="cifra">
                  <span className="cifra-etiqueta">Predicción</span>
                  <span className="cifra-valor">ŷ₀ = {fmt(r.prediccion, formato)}</span>
                  <span className="cifra-detalle">
                    con {diferido.x0.slice(0, r.k).map((v, j) => `${r.k > 1 ? `x${subindice(j + 1)}` : 'x'} = ${v}`).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <GraficoDispersion
              modo={r.k === 1 ? 'simple' : 'ajustados'}
              x={xs}
              y={ys}
              yGorro={r.yGorro}
              beta={r.beta}
              etiquetaX={diferido.tabla.nombresX[0]?.trim() || 'x'}
              etiquetaY={nombreY}
              formato={formato}
            />
            <Procedimiento pasos={calculo.solucion.pasos} titulo={r.k === 1 ? 'Regresión lineal simple' : `Regresión lineal múltiple con k = ${r.k}`} />
          </>
        )}
      </div>
    </div>
  );
}
