import type { Paso } from '../core/steps';
import { REGISTRO } from '../core/steps';
import { Formula } from './Formula';

export function StepView({ paso, n }: { paso: Paso; n: number }) {
  const m = REGISTRO[paso.metodo];
  return (
    <section className="paso">
      <h3>
        {n}. {paso.titulo}
      </h3>
      <Formula latex={paso.latex} textoPlano={paso.textoPlano} />
      {paso.sustitucion && <Formula latex={paso.sustitucion} textoPlano={paso.sustitucion} />}
      {paso.resultado && <p className="resultado">{paso.resultado}</p>}
      <p className="ref">
        {m.presentacion}, diap. {m.diapositiva}
      </p>
    </section>
  );
}
