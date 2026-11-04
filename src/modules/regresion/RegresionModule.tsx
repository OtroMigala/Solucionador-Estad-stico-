import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useFormato } from '../../contexto';
import { MensajeError } from '../../components/Controles';
import { CargaDatos, type Lectura } from './CargaDatos';
import { EjercicioRegresion } from './Ejercicio';
import { SolucionRegresion } from './Solucion';
import { type Ejercicio, calcular, desdeDatos, desdeEjemplo } from './estado';

type Etapa = 'datos' | 'ejercicio' | 'solucion';

const ETAPAS: { id: Etapa; titulo: string; detalle: string }[] = [
  { id: 'datos', titulo: 'Datos', detalle: 'Sube tu Excel o abre un ejercicio' },
  { id: 'ejercicio', titulo: 'Ejercicio', detalle: 'Qué pide y con qué valores' },
  { id: 'solucion', titulo: 'Solución', detalle: 'Paso a paso, por literales' },
];

export function RegresionModule() {
  const { formato } = useFormato();
  const [etapa, setEtapa] = useState<Etapa>('datos');
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [abrirTabla, setAbrirTabla] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  const diferido = useDeferredValue(ejercicio);
  const calculo = useMemo(() => (diferido ? calcular(diferido, formato) : null), [diferido, formato]);

  const ir = (e: Etapa) => {
    setEtapa(e);
    requestAnimationFrame(() => {
      const el = raiz.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
    });
  };

  const empezar = (e: Ejercicio, tablaAbierta = false) => {
    setEjercicio(e);
    setAbrirTabla(tablaAbierta);
    ir('ejercicio');
  };

  const alcanzable = (e: Etapa) => e === 'datos' || (e === 'ejercicio' && ejercicio !== null) || (e === 'solucion' && calculo?.ok === true);

  return (
    <div className="regresion" ref={raiz}>
      <ol className="etapas" aria-label="Etapas">
        {ETAPAS.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              className="etapa"
              aria-current={etapa === e.id ? 'step' : undefined}
              disabled={!alcanzable(e.id)}
              onClick={() => ir(e.id)}
            >
              <span className="etapa-num">{i + 1}</span>
              <span className="etapa-texto">
                <strong>{e.titulo}</strong>
                <small>{e.detalle}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {etapa === 'datos' && (
        <CargaDatos
          lectura={lectura}
          onLectura={setLectura}
          onUsar={(tabla, archivo) => empezar(desdeDatos(tabla, archivo, formato.coma))}
          onEjemplo={(e) => empezar(desdeEjemplo(e, formato.coma))}
          onManual={() =>
            empezar(
              desdeDatos({ nombreY: '', nombresX: [''], celdas: Array.from({ length: 5 }, () => ['', '']) }, null, formato.coma),
              true,
            )
          }
        />
      )}

      {etapa === 'ejercicio' && ejercicio && (
        <EjercicioRegresion
          ejercicio={ejercicio}
          onCambio={setEjercicio}
          error={calculo && !calculo.ok ? calculo.error : null}
          abrirTabla={abrirTabla}
          onResolver={() => ir('solucion')}
          onCambiarDatos={() => ir('datos')}
        />
      )}

      {etapa === 'solucion' && calculo && !calculo.ok && (
        <div className="botones">
          <MensajeError texto={calculo.error} />
          <button type="button" className="boton" onClick={() => ir('ejercicio')}>
            ← Volver al ejercicio
          </button>
        </div>
      )}
      {etapa === 'solucion' && ejercicio && calculo?.ok && (
        <SolucionRegresion
          ejercicio={ejercicio}
          solucion={calculo.solucion}
          datos={calculo.datos}
          op={calculo.op}
          literales={calculo.literales}
          onEditar={() => ir('ejercicio')}
        />
      )}
    </div>
  );
}
