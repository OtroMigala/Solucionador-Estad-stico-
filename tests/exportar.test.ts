import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';
import { resolverRegresion, type OpcionesRegresion } from '../src/core/regresion';
import { FORMATO_BASE } from '../src/core/formato';
import { estadisticasExcel, libroRegresion } from '../src/core/exportar/regresion';
import { escribirXlsx } from '../src/core/exportar/xlsx';
import { leerXlsx, type Valor } from '../src/core/importar/xlsx';
import { datosSinteticos } from './sinteticos';

function cerca(a: number, b: number, tol = 1e-6) {
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));
}

function resolver(id: string) {
  const e = EJEMPLOS_REGRESION.find((x) => x.id === id)!;
  const datos = { y: e.y, x: e.x, nombreY: e.nombreY, nombresX: e.nombresX };
  const op: OpcionesRegresion = { alfa: e.alfa, x0: e.x0, formato: FORMATO_BASE };
  const r = resolverRegresion(datos, op);
  if (!r.ok) throw new Error(r.error);
  return { e, datos, op, resultado: r.solucion.resultado };
}

/** Fila de la hoja cuya primera celda es `etiqueta`. */
const fila = (celdas: Valor[][], etiqueta: string) => celdas.find((f) => f[0] === etiqueta)!;

describe('estadísticas de la herramienta de regresión de Excel', () => {
  it('punto 3 coincide con la hoja «Resumen» del taller', () => {
    const { resultado } = resolver('taller-3');
    const s = estadisticasExcel(resultado);
    cerca(s.rMultiple, 0.988332995, 1e-8);
    cerca(s.r2Ajustado, 0.967522953, 1e-8);
    cerca(s.errorTipico, 36.10117174, 1e-8);
    cerca(s.valorPF, 3.9529e-8, 1e-4);
    const excel = [
      [2395.513094, 336.8247274, 7.112046413, 3.24834e-5, 1645.020833, 3146.005356],
      [26.30905948, 6.045372797, 4.351933348, 0.001439212, 12.83912947, 39.77898948],
      [5.41378241, 4.290869678, 1.261698167, 0.235692341, -4.14687103, 14.97443585],
      [5.279808555, 2.962357983, 1.782299298, 0.105033903, -1.320736361, 11.88035347],
      [-38.91851608, 2.84264695, -13.69094255, 8.38063e-8, -45.25232819, -32.58470397],
    ];
    s.coeficientes.forEach((co, j) => {
      const [v, err, t, p, inf, sup] = excel[j];
      cerca(co.valor, v, 1e-8);
      cerca(co.errorTipico, err, 1e-8);
      cerca(co.t, t, 1e-8);
      // El valor t de tabla de Excel y el de jStat difieren en la octava cifra; se exige 1e-6 (RNF-02).
      cerca(co.p, p, 1e-6);
      cerca(co.inferior, inf);
      cerca(co.superior, sup);
    });
  });
});

describe('libro exportado', () => {
  const { e, datos, op, resultado } = resolver('taller-3');
  const { hojas, activa } = libroRegresion({ datos, resultado, op, literales: e.literales, titulo: e.etiqueta, enunciado: e.enunciado });
  const bytes = escribirXlsx(hojas, activa);
  const leidas = leerXlsx(bytes);
  const hoja = (nombre: string) => leidas.find((h) => h.nombre === nombre)!.celdas;

  it('tiene las cinco hojas en el orden del procedimiento y abre en «Resumen»', () => {
    expect(leidas.map((h) => h.nombre)).toEqual(['Datos', 'Tabla de sumas', 'Matrices', 'Resumen', 'Respuestas']);
    const libro = strFromU8(unzipSync(bytes)['xl/workbook.xml']);
    expect(libro).toContain('activeTab="3"');
  });

  it('la tabla de sumas usa fórmulas y su fila Σ coincide con X\'X y X\'y', () => {
    const xml = strFromU8(unzipSync(bytes)['xl/worksheets/sheet2.xml']);
    expect(xml).toContain('<f>B5*B5</f>');
    expect(xml).toContain('<f>SUM(B5:B19)</f>');
    const suma = fila(hoja('Tabla de sumas'), 'Σ');
    cerca(suma[1] as number, resultado.XtX[0][1]); // Σx1
    cerca(suma[5] as number, resultado.Xty[0]); // Σy
    cerca(suma[6] as number, resultado.XtX[1][1]); // Σx1²
  });

  it('el resumen trae ANOVA, prueba, R² y predicción', () => {
    const r = hoja('Resumen');
    cerca(fila(r, 'Regresión')[4] as number, 105.2684201, 1e-8);
    cerca(fila(r, 'F calculado')[1] as number, 105.2684201, 1e-8);
    cerca(fila(r, 'F tabla F(α; k, n−k−1)')[1] as number, 3.478049691, 1e-8);
    expect(fila(r, 'Decisión')[1]).toBe('Se rechaza H0');
    cerca(fila(r, 'R^2 = SCR/SCT')[1] as number, 0.97680211, 1e-7);
    cerca(fila(r, 'ŷ')[1] as number, 1125.967485, 1e-8);
  });

  it('las respuestas siguen los literales del enunciado', () => {
    const titulos = hoja('Respuestas')
      .map((f) => f[0])
      .filter((v): v is string => typeof v === 'string' && /^[a-e]\) /.test(v));
    expect(titulos).toEqual([
      'a) Estimación de los parámetros por el método matricial',
      'b) Tabla ANOVA',
      'c) Prueba de hipótesis',
      'd) Coeficiente de determinación R²',
      'e) Predicción',
    ]);
  });

  it('funciona con regresión simple y con 16 variables', () => {
    const simple = resolver('clase-dqo');
    expect(() =>
      leerXlsx(escribirXlsx(libroRegresion({ ...simple, literales: ['correlacion', 'parametros'], titulo: 'DQO' }).hojas)),
    ).not.toThrow();
    const { y, x } = datosSinteticos(40, 16);
    const op16 = { alfa: 0.05, x0: null, formato: FORMATO_BASE };
    const r16 = resolverRegresion({ y, x }, op16);
    if (!r16.ok) throw new Error(r16.error);
    const libro = libroRegresion({ datos: { y, x }, resultado: r16.solucion.resultado, op: op16, literales: ['parametros', 'anova'], titulo: 'k = 16' });
    const sumas = leerXlsx(escribirXlsx(libro.hojas)).find((h) => h.nombre === 'Tabla de sumas')!.celdas;
    // i + 16 x + y + 136 cuadrados y productos entre x + 16 productos con y + y²
    expect(sumas[3].length).toBe(1 + 16 + 1 + 136 + 16 + 1);
  });
});
