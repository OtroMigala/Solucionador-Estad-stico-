/** Separa un párrafo en texto y fórmulas en línea escritas entre \( y \). */
export type Segmento = { tipo: 'texto'; valor: string } | { tipo: 'formula'; valor: string };

export function segmentar(texto: string): Segmento[] {
  const salida: Segmento[] = [];
  const re = /\\\((.+?)\\\)/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index! > ultimo) salida.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) });
    salida.push({ tipo: 'formula', valor: m[1] });
    ultimo = m.index! + m[0].length;
  }
  if (ultimo < texto.length) salida.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  return salida;
}
