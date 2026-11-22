import { useDeferredValue, useMemo, useState } from 'react';
import { useFormato } from '../../contexto';
import { probTex } from '../../core/racional';
import { EJEMPLOS_PROBABILIDAD, type Ejemplo, ejemplosDe } from '../../core/probabilidad/ejemplos';
import { type FormPorHerramienta, type Herramienta, resolverHerramienta } from '../../core/probabilidad/formularios';
import { MensajeError, SelectorEjemplo } from '../../components/Controles';
import { FormulaEnLinea } from '../../components/Formula';
import { Procedimiento } from '../../components/Pasos';
import { enteroTex } from '../../core/combinatoria';
import { FormBinomial, FormHipergeometrica, FormMultinomial, FormPoisson } from './FormulariosDistribuciones';
import { probTexP } from '../../core/probabilidad/distribuciones';
import { FormBayes, FormClasica, FormConteo, FormContingencia, FormEspacio, FormReglas, FormSucesivas } from './Formularios';

/**
 * Distribuciones discretas (binomial, hipergeométrica, Poisson y multinomial):
 * desactivadas por ahora, porque el tema se acaba de empezar en clase y no está
 * en el taller. El código, los ejemplos y las pruebas siguen completos; para
 * volver a mostrarlas basta con poner esto en true.
 */
const DISTRIBUCIONES_ACTIVAS = false;

/**
 * Tabla de contingencia: activa. La diap. 31 presenta la tabla de ejemplo y la
 * diap. 30 da la probabilidad condicional con la que se resuelve (puntos 31 y
 * 32 del taller). Para ocultarla basta con poner esto en false.
 */
const CONTINGENCIA_ACTIVA = true;

const TODAS_LAS_HERRAMIENTAS: { id: Herramienta; nombre: string; distribucion?: true }[] = [
  { id: 'conteo', nombre: 'Técnicas de conteo' },
  { id: 'clasica', nombre: 'Probabilidad clásica' },
  { id: 'espacio', nombre: 'Espacio muestral' },
  { id: 'reglas', nombre: 'Reglas de probabilidad' },
  { id: 'sucesivas', nombre: 'Extracciones sucesivas' },
  { id: 'contingencia', nombre: 'Tabla de contingencia' },
  { id: 'bayes', nombre: 'Probabilidad total y Bayes' },
  { id: 'binomial', nombre: 'Binomial', distribucion: true },
  { id: 'hipergeometrica', nombre: 'Hipergeométrica', distribucion: true },
  { id: 'poisson', nombre: 'Poisson', distribucion: true },
  { id: 'multinomial', nombre: 'Multinomial', distribucion: true },
];

/** Herramientas que se muestran (y a las que se puede llegar por la dirección, #conteo, #bayes…). */
export const HERRAMIENTAS = TODAS_LAS_HERRAMIENTAS.filter(
  (h) => (DISTRIBUCIONES_ACTIVAS || !h.distribucion) && (CONTINGENCIA_ACTIVA || h.id !== 'contingencia'),
);

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
  for (const { id } of TODAS_LAS_HERRAMIENTAS) {
    const ej = ejemplosDe(id)[0] ?? null;
    e[id] = { ejemplo: ej, modificado: false, form: structuredClone(ej.form) };
  }
  return e as Estados;
}

export function ProbabilidadModule({ herramienta, onHerramienta }: { herramienta: Herramienta; onHerramienta: (h: Herramienta) => void }) {
  const { formato } = useFormato();
  const [estados, setEstados] = useState<Estados>(inicial);
  const actual = estados[herramienta];
  // La herramienta y su formulario se aplazan juntos: si se aplazara solo el formulario, al cambiar de
  // herramienta se resolvería un instante la nueva con el formulario de la anterior.
  const planteamiento = useMemo(() => ({ h: herramienta, form: actual.form }), [herramienta, actual.form]);
  const diferido = useDeferredValue(planteamiento);

  const setForm = <H extends Herramienta>(h: H, form: FormPorHerramienta[H]) =>
    setEstados((s) => ({ ...s, [h]: { ...s[h], form, modificado: s[h].ejemplo !== null } }));
  const elegir = <H extends Herramienta>(h: H, e: Ejemplo<H>) =>
    setEstados((s) => ({ ...s, [h]: { ejemplo: e, modificado: false, form: structuredClone(e.form) } }));

  const r = useMemo(() => {
    try {
      return resolverHerramienta(diferido.h, diferido.form as never, formato);
    } catch {
      // Un error inesperado del cálculo no debe dejar la página en blanco.
      return { ok: false as const, error: 'No se pudo resolver con estos datos. Revisa los valores del planteamiento.' };
    }
  }, [diferido, formato]);
  const herramientaResuelta = diferido.h;

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
      case 'binomial':
        return <FormBinomial form={estados.binomial.form} onCambio={(f) => setForm('binomial', f)} />;
      case 'hipergeometrica':
        return <FormHipergeometrica form={estados.hipergeometrica.form} onCambio={(f) => setForm('hipergeometrica', f)} />;
      case 'poisson':
        return <FormPoisson form={estados.poisson.form} onCambio={(f) => setForm('poisson', f)} />;
      case 'multinomial':
        return <FormMultinomial form={estados.multinomial.form} onCambio={(f) => setForm('multinomial', f)} />;
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
                      {v.valor === null && v.aprox !== undefined ? (
                        <FormulaEnLinea latex={probTexP({ exacto: null, valor: v.aprox }, formato)} />
                      ) : v.valor === null ? (
                        'no definida'
                      ) : (
                        <FormulaEnLinea latex={herramientaResuelta === 'conteo' ? enteroTex(v.valor.num) : probTex(v.valor, formato)} />
                      )}
                    </span>
                    {herramientaResuelta === 'conteo' && <span className="cifra-detalle">formas posibles</span>}
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
