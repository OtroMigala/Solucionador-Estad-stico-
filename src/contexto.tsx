import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { FORMATO_BASE, type Formato } from './core/formato';

interface ContextoFormato {
  formato: Formato;
  setFormato: (f: Formato) => void;
}

const Ctx = createContext<ContextoFormato>({ formato: FORMATO_BASE, setFormato: () => {} });

const CLAVE = 'solucionador:formato';

function leerGuardado(): Formato {
  try {
    const s = localStorage.getItem(CLAVE);
    if (!s) return FORMATO_BASE;
    const f = JSON.parse(s) as Partial<Formato>;
    return {
      decimales: typeof f.decimales === 'number' && f.decimales >= 2 && f.decimales <= 8 ? f.decimales : FORMATO_BASE.decimales,
      coma: typeof f.coma === 'boolean' ? f.coma : FORMATO_BASE.coma,
    };
  } catch {
    return FORMATO_BASE;
  }
}

export function ProveedorFormato({ children }: { children: ReactNode }) {
  const [formato, setFormato] = useState<Formato>(leerGuardado);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(formato));
    } catch {
      /* almacenamiento no disponible: se usa el valor en memoria */
    }
  }, [formato]);
  return <Ctx.Provider value={{ formato, setFormato }}>{children}</Ctx.Provider>;
}

export const useFormato = () => useContext(Ctx);
