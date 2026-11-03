import { useEffect, useState } from 'react';
import { ProveedorFormato, useFormato } from './contexto';
import { Segmentado } from './components/Controles';
import { RegresionModule } from './modules/regresion/RegresionModule';
import { HERRAMIENTAS, ProbabilidadModule } from './modules/probabilidad/ProbabilidadModule';
import type { Herramienta } from './core/probabilidad/formularios';

type Vista = 'regresion' | Herramienta;
const VISTAS: Vista[] = ['regresion', ...HERRAMIENTAS.map((h) => h.id)];

function vistaDelHash(): Vista {
  const h = window.location.hash.replace('#', '') as Vista;
  return VISTAS.includes(h) ? h : 'regresion';
}

function Ajustes() {
  const { formato, setFormato } = useFormato();
  return (
    <div className="ajustes">
      <label className="campo">
        <span>Decimales</span>
        <select id="decimales" value={formato.decimales} onChange={(e) => setFormato({ ...formato, decimales: Number(e.target.value) })}>
          {[2, 3, 4, 5, 6, 8].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <div className="campo">
        <span>Separador decimal</span>
        <Segmentado
          etiqueta="Separador decimal"
          valor={formato.coma ? 'coma' : 'punto'}
          onCambio={(v) => setFormato({ ...formato, coma: v === 'coma' })}
          opciones={[
            { valor: 'coma', texto: '0,25' },
            { valor: 'punto', texto: '0.25' },
          ]}
        />
      </div>
    </div>
  );
}

function Contenido() {
  const [vista, setVista] = useState<Vista>(vistaDelHash);
  const [ultimaHerramienta, setUltimaHerramienta] = useState<Herramienta>(() => {
    const v = vistaDelHash();
    return v === 'regresion' ? 'conteo' : v;
  });
  const { formato } = useFormato();

  useEffect(() => {
    const alCambiar = () => setVista(vistaDelHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const ir = (v: Vista) => {
    setVista(v);
    if (v !== 'regresion') setUltimaHerramienta(v);
    try {
      history.replaceState(null, '', `#${v}`);
    } catch {
      /* el marco puede no permitir cambiar la dirección */
    }
  };

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <div className="marca-simbolo" aria-hidden="true">
            Σ
          </div>
          <div>
            <span className="ceja">Estadística · Taller del tercer corte</span>
            <h1>Solucionador Estadístico</h1>
            <p>Regresión lineal y probabilidad resueltas paso a paso, con los métodos de las diapositivas del curso.</p>
          </div>
        </div>
        <Ajustes />
      </header>

      <nav className="modulos" aria-label="Tema">
        <button type="button" className="modulo-btn" aria-pressed={vista === 'regresion'} onClick={() => ir('regresion')}>
          <strong>Regresión lineal</strong>
          <span>Simple y múltiple · puntos 1–4 del taller</span>
        </button>
        <button type="button" className="modulo-btn" aria-pressed={vista !== 'regresion'} onClick={() => ir(ultimaHerramienta)}>
          <strong>Probabilidad y conteo</strong>
          <span>Siete herramientas · puntos 1–36 del taller</span>
        </button>
      </nav>

      <main>
        <div hidden={vista !== 'regresion'}>
          <RegresionModule />
        </div>
        <div hidden={vista === 'regresion'} style={{ display: vista === 'regresion' ? 'none' : 'flex', flexDirection: 'column', gap: 16 }}>
          <ProbabilidadModule herramienta={vista === 'regresion' ? ultimaHerramienta : vista} onHerramienta={ir} />
        </div>
      </main>

      <footer className="pie">
        <span>
          Los cálculos usan precisión completa; los valores se muestran con {formato.decimales} decimales (o cifras significativas si son muy pequeños).
        </span>
        <span>Resultados validados contra scipy y statsmodels con error menor a 10⁻⁶.</span>
        <span>Las probabilidades se calculan con fracciones exactas.</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ProveedorFormato>
      <Contenido />
    </ProveedorFormato>
  );
}
