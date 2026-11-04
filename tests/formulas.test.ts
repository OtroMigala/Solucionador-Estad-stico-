/**
 * Renderiza con KaTeX en modo estricto todas las fórmulas que generan los
 * ejemplos, para que ningún error de LaTeX llegue a la página.
 */
import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';
import { resolverRegresion } from '../src/core/regresion';
import { literalesDisponibles, respuestaLiteral } from '../src/core/regresion/literales';
import { EJEMPLOS_PROBABILIDAD, formInicial } from '../src/core/probabilidad/ejemplos';
import { type Herramienta, resolverHerramienta } from '../src/core/probabilidad/formularios';
import type { Bloque, Paso } from '../src/core/steps';
import { REGISTRO } from '../src/core/steps';
import { segmentar } from '../src/core/textoRico';
import { OPCIONES_KATEX } from '../src/core/latex';
import { datosSinteticos } from './sinteticos';
import type { Formato } from '../src/core/formato';

function formulas(bloques: Bloque[]): string[] {
  const out: string[] = [];
  for (const bl of bloques) {
    if (bl.tipo === 'formula' || bl.tipo === 'resultado') out.push(bl.latex);
    if (bl.tipo === 'texto') segmentar(bl.texto).forEach((s) => s.tipo === 'formula' && out.push(s.valor));
    if (bl.tipo === 'tabla') [...bl.filas.flat(), ...(bl.pie ?? [])].forEach((c) => typeof c !== 'string' && out.push(c.latex));
    if (bl.tipo === 'detalles') out.push(...formulas(bl.bloques));
  }
  return out;
}

function revisar(pasos: Paso[]) {
  let total = 0;
  for (const p of pasos) {
    expect(REGISTRO[p.metodo], `método fuera del registro: ${p.metodo}`).toBeDefined();
    for (const latex of formulas(p.bloques)) {
      expect(() => katex.renderToString(latex, { ...OPCIONES_KATEX, throwOnError: true, strict: 'error', displayMode: true }), latex).not.toThrow();
      total++;
    }
  }
  return total;
}

const FORMATOS: Formato[] = [
  { decimales: 4, coma: true },
  { decimales: 2, coma: false },
];

describe('todas las fórmulas se renderizan con KaTeX estricto', () => {
  for (const f of FORMATOS) {
    it(`regresión (${f.decimales} decimales, ${f.coma ? 'coma' : 'punto'})`, () => {
      let n = 0;
      for (const e of EJEMPLOS_REGRESION) {
        const op = { alfa: e.alfa, x0: e.x0, formato: f };
        const r = resolverRegresion({ y: e.y, x: e.x, nombreY: e.nombreY, nombresX: e.nombresX }, op);
        if (!r.ok) throw new Error(r.error);
        n += revisar(r.solucion.pasos);
        // Recuadros de respuesta de cada literal
        for (const l of literalesDisponibles(e.x.length)) {
          n += revisar([{ titulo: l.titulo, metodo: 'r2', bloques: respuestaLiteral(l.id, r.solucion.resultado, op) }]);
        }
      }
      expect(n).toBeGreaterThan(100);
    });

    it(`regresión con 16 variables (${f.decimales} decimales, ${f.coma ? 'coma' : 'punto'})`, () => {
      const { y, x } = datosSinteticos(40, 16);
      const op = { alfa: 0.05, x0: x.map((c) => c[0]), formato: f };
      const r = resolverRegresion({ y, x }, op);
      if (!r.ok) throw new Error(r.error);
      let n = revisar(r.solucion.pasos);
      for (const l of literalesDisponibles(16)) {
        n += revisar([{ titulo: l.titulo, metodo: 'r2', bloques: respuestaLiteral(l.id, r.solucion.resultado, op) }]);
      }
      expect(n).toBeGreaterThan(50);
    });

    it(`probabilidad (${f.decimales} decimales, ${f.coma ? 'coma' : 'punto'})`, () => {
      let n = 0;
      for (const e of EJEMPLOS_PROBABILIDAD) {
        const r = resolverHerramienta(e.herramienta, e.form as never, f);
        if (!r.ok) throw new Error(`${e.id}: ${r.error}`);
        n += revisar(r.solucion.pasos);
      }
      const tres = formInicial('reglas');
      const r = resolverHerramienta('reglas', { ...tres, modo: 'tres', tres: ['0.5', '0.4', '0.3', '0.2', '0.15', '0.1', '0.05'] }, f);
      if (!r.ok) throw new Error(r.error);
      n += revisar(r.solucion.pasos);
      expect(n).toBeGreaterThan(100);
    });
  }

  it('cada herramienta tiene un formulario inicial que se resuelve', () => {
    const herramientas: Herramienta[] = ['conteo', 'clasica', 'espacio', 'reglas', 'sucesivas', 'contingencia', 'bayes'];
    for (const h of herramientas) {
      const r = resolverHerramienta(h, formInicial(h) as never, FORMATOS[0]);
      expect(r.ok, h).toBe(true);
    }
  });
});
