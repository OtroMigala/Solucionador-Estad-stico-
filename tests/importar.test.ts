import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  construirDatos,
  decodificarTexto,
  detectarTabla,
  hojaSugerida,
  leerArchivo,
  nombreVariable,
  parseCsv,
  sugerirRoles,
  type DatosImportados,
  type TablaDetectada,
} from '../src/core/importar';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';

const punto3 = EJEMPLOS_REGRESION.find((e) => e.id === 'taller-3')!;

/** Libro .xlsx mínimo con la estructura que guarda Excel (textos compartidos, celdas con referencia). */
function libro(hojas: { nombre: string; filas: (string | number | null)[][] }[]): Uint8Array {
  const textos: string[] = [];
  const indice = (s: string) => {
    const i = textos.indexOf(s);
    return i >= 0 ? i : textos.push(s) - 1;
  };
  const col = (j: number) => String.fromCharCode(65 + j);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const archivos: Record<string, Uint8Array> = {};
  hojas.forEach((h, n) => {
    const filas = h.filas
      .map((f, i) => {
        const celdas = f
          .map((v, j) => {
            if (v === null) return '';
            const r = `${col(j)}${i + 1}`;
            return typeof v === 'number' ? `<c r="${r}" s="1"><v>${v}</v></c>` : `<c r="${r}" t="s"><v>${indice(v)}</v></c>`;
          })
          .join('');
        return `<row r="${i + 1}">${celdas}</row>`;
      })
      .join('');
    archivos[`xl/worksheets/sheet${n + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filas}</sheetData></worksheet>`,
    );
  });
  archivos['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas
      .map((h, n) => `<sheet name="${esc(h.nombre)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`)
      .join('')}</sheets></workbook>`,
  );
  archivos['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas
      .map((_, n) => `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n + 1}.xml"/>`)
      .join('')}</Relationships>`,
  );
  archivos['xl/sharedStrings.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${textos
      .map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`)
      .join('')}</sst>`,
  );
  archivos['[Content_Types].xml'] = strToU8('<Types/>');
  return zipSync(archivos);
}

const filasPunto3 = () => punto3.y.map((yi, i) => [i + 1, ...punto3.x.map((c) => c[i]), yi]);

function datos(t: TablaDetectada | null): DatosImportados {
  expect(t).not.toBeNull();
  const d = construirDatos(t!, sugerirRoles(t!));
  if ('error' in d) throw new Error(d.error);
  return d;
}

describe('lectura de un libro de Excel', () => {
  const bytes = libro([
    {
      nombre: 'Resumen',
      filas: [['Resumen'], [], ['Estadísticas de la regresión'], ['Coeficiente de determinación R^2', 0.97680211], ['Observaciones', 15]],
    },
    {
      nombre: 'Punto 3',
      filas: [
        ['Taller de regresión · Punto 3'],
        [],
        ['Obs.', 'x1 (Plástico %)', 'x2 (Papel %)', 'x3 (Basura %)', 'x4 (Agua %)', 'y (kcal/kg)'],
        ...filasPunto3(),
        ['Total', null, null, null, null, punto3.y.reduce((s, v) => s + v, 0)],
      ],
    },
  ]);
  const hojas = leerArchivo('punto3.xlsx', bytes);

  it('lee las dos hojas y reconoce el resumen de Excel', () => {
    expect(hojas.map((h) => h.nombre)).toEqual(['Resumen', 'Punto 3']);
    expect(hojas[0].esResumen).toBe(true);
    expect(hojas[1].esResumen).toBe(false);
    expect(hojaSugerida(hojas)).toBe(1);
  });

  it('encuentra la tabla debajo del título y sin la fila de totales', () => {
    const t = hojas[1].tabla!;
    expect(t.filaInicio).toBe(3);
    expect(t.filaFin).toBe(3 + 14);
    expect(t.encabezados[0]).toBe('Obs.');
  });

  it('sugiere y en la última columna, ignora el número de observación y ordena las x', () => {
    const t = hojas[1].tabla!;
    expect(sugerirRoles(t)).toEqual(['ignorar', 'x', 'x', 'x', 'x', 'y']);
    const d = datos(t);
    expect(d.nombreY).toBe('y (kcal/kg)');
    expect(d.nombresX).toEqual(['Plástico %', 'Papel %', 'Basura %', 'Agua %']);
    expect(d.filas.map((f) => f[0])).toEqual(punto3.y);
    expect(d.filas.map((f) => f[1])).toEqual(punto3.x[0]);
    expect(d.filas.map((f) => f[4])).toEqual(punto3.x[3]);
    expect(d.problemas).toEqual([]);
  });

  it('rechaza el formato .xls antiguo con un mensaje claro', () => {
    expect(() => leerArchivo('viejo.xls', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]))).toThrow(/Guardar como/);
  });
});

describe('detección de la tabla', () => {
  it('descarta una fila de sumas sin etiqueta', () => {
    const filas = [
      ['y', 'x'],
      [1, 2],
      [2, 4],
      [3, 7],
      [6, 13],
    ];
    const t = detectarTabla(filas)!;
    expect(t.valores).toHaveLength(3);
  });

  it('marca las celdas vacías o con texto en lugar de descartar la fila', () => {
    const t = detectarTabla([
      ['y', 'x1', 'x2'],
      [1, 2, 3],
      [2, null, 5],
      [3, 'n/a', 4],
      [4, 1, 2],
    ])!;
    expect(t.valores).toHaveLength(4);
    const d = datos(t);
    expect(d.problemas).toEqual(['B3 está vacía', 'B4 no es un número («n/a»)']);
  });

  it('sin encabezados reconocibles, la primera columna es y', () => {
    const t = detectarTabla([
      ['Consumo', 'Temperatura', 'Días'],
      [240, 25, 24],
      [236, 31, 21],
      [290, 45, 24],
    ])!;
    expect(sugerirRoles(t)).toEqual(['y', 'x', 'x']);
  });

  it('ignora las columnas de productos de la hoja de cálculo del taller', () => {
    const t = detectarTabla([
      ['x1', 'x2', 'y', 'x1^2', 'x1*x2', 'x1·y', 'y²'],
      [1, 2, 3, 1, 2, 3, 9],
      [2, 1, 5, 4, 2, 10, 25],
      [3, 4, 4, 9, 12, 12, 16],
    ])!;
    expect(sugerirRoles(t)).toEqual(['x', 'x', 'y', 'ignorar', 'ignorar', 'ignorar', 'ignorar']);
  });
});

describe('CSV y celdas pegadas', () => {
  it('lee un CSV de Excel en español (punto y coma, coma decimal, Windows-1252)', () => {
    const texto = 'Días;Energía\r\n24;240,5\r\n21;236\r\n';
    const bytes = Uint8Array.from([...texto].map((c) => c.charCodeAt(0)));
    const t = detectarTabla(parseCsv(decodificarTexto(bytes)))!;
    expect(t.encabezados).toEqual(['Días', 'Energía']);
    expect(t.valores).toEqual([
      [24, 240.5],
      [21, 236],
    ]);
  });

  it('lee un CSV con coma como separador y comillas', () => {
    const t = detectarTabla(parseCsv('"y","x"\n"1.5",2\n3,4\n'))!;
    expect(t.valores).toEqual([
      [1.5, 2],
      [3, 4],
    ]);
  });

  it('en celdas pegadas la coma es decimal', () => {
    const t = detectarTabla(parseCsv('y\tx\n1,5\t2\n3\t4,25', false))!;
    expect(t.valores).toEqual([
      [1.5, 2],
      [3, 4.25],
    ]);
  });
});

describe('nombres de las variables', () => {
  it.each([
    ['y', ''],
    ['x1', ''],
    ['x₂', ''],
    ['x1 (Temperatura °F)', 'Temperatura °F'],
    ['x2: Días del mes', 'Días del mes'],
    ['Pureza (x3)', 'Pureza'],
    ['y (kcal/kg)', 'y (kcal/kg)'],
    ['x1 (%)', 'x1 (%)'],
    ['Consumo de energía', 'Consumo de energía'],
  ])('%s → «%s»', (h, nombre) => expect(nombreVariable(h)).toBe(nombre));
});
