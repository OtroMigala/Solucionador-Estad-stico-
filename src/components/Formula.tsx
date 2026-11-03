import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Renderiza LaTeX; si falla, muestra el texto plano (RNF-03). */
export function Formula({ latex, textoPlano }: { latex: string; textoPlano: string }) {
  try {
    const html = katex.renderToString(latex, { throwOnError: true, displayMode: true });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <pre>{textoPlano}</pre>;
  }
}
