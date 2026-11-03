import { useDeferredValue, useMemo, useState } from 'react';
import { useFormato } from '../../contexto';
import { probTex } from '../../core/racional';
import { EJEMPLOS_PROBABILIDAD, type Ejemplo, ejemplosDe } from '../../core/probabilidad/ejemplos';
import { type FormPorHerramienta, type Herramienta, resolverHerramienta } from '../../core/probabilidad/formularios';
import { MensajeError, SelectorEjemplo } from '../../components/Controles';
import { FormulaEnLinea } from '../../components/Formula';
import { Procedimiento } from '../../components/Pasos';
import { enteroTex } from '../../core/combinatoria';
import { FormBayes, FormClasica, FormConteo, FormContingencia, FormEspacio, FormReglas, FormSucesivas } from './Formularios';

export const HERRAMIENTAS: { id: Herramienta; nombre: string }[] = [
  { id: 'conteo', nombre: 'Técnicas de conteo' },
  { id: 'clasica', nombre: 'Probabilidad clásica' },
  { id: 'espacio', nombre: 'Espacio muestral' },
  { id: 'reglas', nombre: 'Reglas de probabilidad' },
  { id: 'sucesivas', nombre: 'Extracciones sucesivas' },
  { id: 'contingencia', nombre: 'Tabla de contingencia' },
  { id: 'bayes', nombre: 'Probabilidad total y Bayes' },
];

/** Puntos del taller que resuelve cada herramienta, para mostrarlos en el selector. */
export function puntosTaller(h: Herramienta): string {
  const nums = [
    ...new Set(
      EJEMPLOS_PROBABILIDAD.filter((e) => e.herramienta === h && e.fuente === 'taller').map((e) => Number(/Punto (\d+)/.exec(e.etiqueta)?.[1])),
    ),
  ].sort((a, b) => a - b);
  if (nums.length === 0) return '';
  if (nums.length === 1) return `punto ${nums[0]}`;
  const rangos: string[] = [];
  let ini = nums[0];
  let ant = nums[0];
  for (const n of [...nums.slice(1), Infinity]) {
    if (n !== ant + 1) {
      rangos.push(ini === ant ? `${ini}` : `${ini}–${ant}`);
      ini = n;
    }
    ant = n;
  }
  return rangos.length > 2 ? `${nums.length} puntos` : `puntos ${rangos.join(', ')}`;
}

type EstadoHerramienta<H extends Herramienta> = { ejemplo: Ejemplo<H> | null; modificado: boolean; form: FormPorHerramienta[H] };
type Estados = { [H in Herramienta]: EstadoHerramienta<H> };

function inicial(): Estados {
  const e = {} as Record<Herramienta, EstadoHerramienta<Herramienta>>;
  for (const { id } of HERRAMIENTAS) {
    const ej = ejemplosDe(id)[0] ?? null;
    e[id] = { ejemplo: ej, modificado: false, form: structuredClone(ej.form) };
  }
  return e as Estados;
}

export function ProbabilidadModule({ herramienta, onHerramienta }: { herramienta: Herramienta; onHerramienta: (h: Herramienta) => void }) {
  const { formato } = useFormato();
  const [estados, setEstados] = useState<Estados>(inicial);
  const actual = estados[herramienta];
  const diferido = useDeferredValue(actual.form);

  const setForm = <H extends Herramienta>(h: H, form: FormPorHerramienta[H]) =>
    setEstados((s) => ({ ...s, [h]: { ...s[h], form, modificado: s[h].ejemplo !== null } }));
  const elegir = <H extends Herramienta>(h: H, e: Ejemplo<H>) =>
    setEstados((s) => ({ ...s, [h]: { ejemplo: e, modificado: false, form: structuredClone(e.form) } }));

  const r = useMemo(() => resolverHerramienta(herramienta, diferido as never, formato), [herramienta, diferido, formato]);

  const formulario = (() => {
    switch (herramienta) {
      case 'conteo':
        return <FormConteo form={estados.conteo.form} onCambio={(f) => setForm('conteo', f)} />;
      case 'clasica':
        return <FormClasica form={estados.clasica.form} onCambio={(f) => setForm('clasica', f)} />;
      case 'espacio':
        return <FormEspacio form={estados.espacio.form} onCambio={(f) => setForm('espacio', f)} />;
      case 'reglas':
        return <FormReglas form={estados.reglas.form} onCambio={(f) => setForm('reglas', f)} />;
      case 'sucesivas':
        return <FormSucesivas form={estados.sucesivas.form} onCambio={(f) => setForm('sucesivas', f)} />;
      case 'contingencia':
        return <FormContingencia form={estados.contingencia.form} onCambio={(f) => setForm('contingencia', f)} />;
      case 'bayes':
        return <FormBayes form={estados.bayes.form} onCambio={(f) => setForm('bayes', f)} />;
    }
  })();

  return (
    <>
      <nav className="herramientas" aria-label="Herramientas de probabilidad">
        {HERRAMIENTAS.map((h) => {
          const p = puntosTaller(h.id);
          return (
            <button key={h.id} type="button" className="herramienta-btn" aria-pressed={h.id === herramienta} onClick={() => onHerramienta(h.id)}>
              {h.nombre}
              {p && <small>{p}</small>}
            </button>
          );
        })}
      </nav>
      <div className="trabajo">
        <div className="entrada">
          <SelectorEjemplo
            id={`ejemplo-${herramienta}`}
            ejemplos={ejemplosDe(herramienta) as Ejemplo<Herramienta>[]}
            actual={actual.ejemplo as Ejemplo<Herramienta> | null}
            modificado={actual.modificado}
            onElegir={(e) => elegir(herramienta, e as never)}
          />
          {formulario}
        </div>
        <div className="salida" aria-live="polite">
          {!r.ok && <MensajeError texto={r.error} />}
          {r.ok && (
            <>
              <div className="cifras">
                {r.solucion.resultado.valores.map((v, i) => (
                  <div key={i} className="cifra">
                    <span className="cifra-etiqueta">{v.etiqueta}</span>
                    <span className="cifra-valor">
                      {v.valor === null ? (
                        'no definida'
                      ) : (
                        <FormulaEnLinea latex={herramienta === 'conteo' ? enteroTex(v.valor.num) : probTex(v.valor, formato)} />
                      )}
                    </span>
                    {herramienta === 'conteo' && <span className="cifra-detalle">formas posibles</span>}
                  </div>
                ))}
              </div>
              <Procedimiento pasos={r.solucion.pasos} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
