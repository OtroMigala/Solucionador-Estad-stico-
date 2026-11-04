/**
 * Escritura de libros de Excel (.xlsx) en el navegador. Un .xlsx es un ZIP
 * con XML: el libro, una hoja por pestaña y una tabla de estilos. Las
 * fórmulas se guardan con su valor ya calculado, para que se vean igual en
 * Excel, LibreOffice o Google Sheets, y Excel las recalcula al abrir.
 */
import { strToU8, zipSync } from 'fflate';
import { letraColumna } from '../importar';

export type Estilo = 'normal' | 'negrita' | 'titulo' | 'encabezado' | 'resaltado' | 'porcentaje' | 'resaltadoPorcentaje' | 'nota';

export interface Celda {
  v: string | number | null;
  /** Fórmula sin el signo igual, con nombres de función en inglés (SUM), como las guarda Excel. */
  f?: string;
  e?: Estilo;
}

export type ValorCelda = Celda | string | number | null | undefined;

export interface Hoja {
  nombre: string;
  filas: ValorCelda[][];
  /** Ancho de cada columna, en caracteres. */
  anchos?: number[];
}

const INDICE_ESTILO: Record<Estilo, number> = {
  normal: 0,
  negrita: 1,
  titulo: 2,
  encabezado: 3,
  resaltado: 4,
  porcentaje: 5,
  resaltadoPorcentaje: 6,
  nota: 7,
};

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="10" fontId="1" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const escapar = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caracteres de control que XML no admite
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Referencia de celda: (0, 0) → «A1». */
export const ref = (fila: number, col: number) => `${letraColumna(col)}${fila + 1}`;

function celdaXml(c: ValorCelda, fila: number, col: number): string {
  if (c === null || c === undefined || c === '') return '';
  const celda: Celda = typeof c === 'object' ? c : { v: c };
  const r = ref(fila, col);
  const s = celda.e && celda.e !== 'normal' ? ` s="${INDICE_ESTILO[celda.e]}"` : '';
  const formula = celda.f ? `<f>${escapar(celda.f)}</f>` : '';
  const v = celda.v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return `<c r="${r}"${s} t="inlineStr"><is><t>${Number.isNaN(v) ? '' : v > 0 ? '∞' : '−∞'}</t></is></c>`;
    return `<c r="${r}"${s}>${formula}<v>${v}</v></c>`;
  }
  if (v === null) return formula ? `<c r="${r}"${s}>${formula}</c>` : s ? `<c r="${r}"${s}/>` : '';
  if (formula) return `<c r="${r}"${s} t="str">${formula}<v>${escapar(v)}</v></c>`;
  return `<c r="${r}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(v)}</t></is></c>`;
}

function hojaXml(h: Hoja, activa: boolean): string {
  const filas = h.filas
    .map((f, i) => {
      const celdas = f.map((c, j) => celdaXml(c, i, j)).join('');
      return celdas ? `<row r="${i + 1}">${celdas}</row>` : '';
    })
    .join('');
  const cols = h.anchos?.length
    ? `<cols>${h.anchos.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${activa ? ' tabSelected="1"' : ''}/></sheetViews>${cols}<sheetData>${filas}</sheetData></worksheet>`;
}

/** Nombre de pestaña válido en Excel: sin []:*?/\ y de 31 caracteres como máximo. */
const nombreHoja = (s: string) => s.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Hoja';

/** Escribe el libro; `activa` es la pestaña que se ve al abrirlo. */
export function escribirXlsx(hojas: Hoja[], activa = 0): Uint8Array {
  const archivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="${activa}"/></bookViews><sheets>${hojas
        .map((h, i) => `<sheet name="${escapar(nombreHoja(h.nombre))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/styles.xml': strToU8(ESTILOS),
  };
  hojas.forEach((h, i) => {
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(hojaXml(h, i === activa));
  });
  return zipSync(archivos, { level: 6 });
}
