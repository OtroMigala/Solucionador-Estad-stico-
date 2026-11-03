import { useState } from 'react';
import { RegresionModule } from './modules/regresion/RegresionModule';
import { ProbabilidadModule } from './modules/probabilidad/ProbabilidadModule';

type Pestana = 'regresion' | 'probabilidad';

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('regresion');
  return (
    <main>
      <h1>Solucionador Estadístico</h1>
      <nav>
        <button aria-pressed={pestana === 'regresion'} onClick={() => setPestana('regresion')}>
          Regresión lineal
        </button>
        <button aria-pressed={pestana === 'probabilidad'} onClick={() => setPestana('probabilidad')}>
          Probabilidad y conteo
        </button>
      </nav>
      {pestana === 'regresion' ? <RegresionModule /> : <ProbabilidadModule />}
    </main>
  );
}
