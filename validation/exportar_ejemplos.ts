/**
 * Exporta los datos de los ejemplos de regresión a JSON para que el script de
 * Python calcule los valores de referencia con statsmodels y scipy.
 *
 *   npx vite-node validation/exportar_ejemplos.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EJEMPLOS_REGRESION } from '../src/core/regresion/ejemplos';

const destino = fileURLToPath(new URL('./ejemplos_regresion.json', import.meta.url));
const datos = EJEMPLOS_REGRESION.map(({ id, y, x, alfa, x0 }) => ({ id, y, x, alfa, x0 }));
writeFileSync(destino, JSON.stringify(datos, null, 1) + '\n');
console.log(`Exportados ${datos.length} ejemplos a ${destino}`);
