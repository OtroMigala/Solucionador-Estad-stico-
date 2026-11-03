import { memo, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function render(latex: string, display: boolean): string | null {
  try {
    return katex.renderToString(latex, { throwOnError: true, displayMode: display, strict: 'ignore', output: 'html' });
  } catch {
    return null;
  }
}

/** Fórmula en bloque; si KaTeX falla, muestra la versión en texto plano (RNF-03). */
export const Formula = memo(function Formula({ latex, texto }: { latex: string; texto: string }) {
  const html = useMemo(() => render(latex, true), [latex]);
  if (html === null) return <p className="formula-texto">{texto}</p>;
  return <div className="formula" aria-label={texto} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Fórmula dentro de una línea de texto. */
export const FormulaEnLinea = memo(function FormulaEnLinea({ latex }: { latex: string }) {
  const html = useMemo(() => render(latex, false), [latex]);
  if (html === null) return <code>{latex}</code>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
});
