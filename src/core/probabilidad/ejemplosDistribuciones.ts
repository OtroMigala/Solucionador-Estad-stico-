/**
 * Ejemplos y ejercicios de la presentación «Distribuciones discretas de
 * probabilidad», con su planteamiento y los valores de referencia calculados
 * con scipy (usados en las pruebas).
 */
import type { TipoConsulta } from './distribuciones';
import {
  type BinomialForm,
  type ConsultaForm,
  type HipergeometricaForm,
  type MultinomialForm,
  type OpcionesForm,
  type PoissonForm,
  consultaVacia,
} from './formulariosDistribuciones';

export type HerramientaDistribucion = 'binomial' | 'hipergeometrica' | 'poisson' | 'multinomial';

export interface FormDistribucion {
  binomial: BinomialForm;
  hipergeometrica: HipergeometricaForm;
  poisson: PoissonForm;
  multinomial: MultinomialForm;
}

export interface EjemploDistribucion<H extends HerramientaDistribucion = HerramientaDistribucion> {
  id: string;
  herramienta: H;
  etiqueta: string;
  fuente: 'clase';
  enunciado: string;
  form: FormDistribucion[H];
  /** Valores de la salida, en orden, calculados con scipy. */
  esperados: number[];
  /** Respuestas exactas conocidas (fracciones), cuando las hay. */
  respuestas: string[];
  nota?: string;
}

const q = (tipo: TipoConsulta, a: number, etiqueta = '', b?: number): ConsultaForm => consultaVacia(tipo, String(a), etiqueta, b === undefined ? '' : String(b));
const opciones = (exito: string, consultas: ConsultaForm[], extra: Partial<OpcionesForm> = {}): OpcionesForm => ({
  exito,
  consultas,
  momentos: false,
  tchebycheff: false,
  tabla: false,
  ...extra,
});

function binomial(id: string, etiqueta: string, enunciado: string, n: number, pi: string, o: OpcionesForm, esperados: number[], respuestas: string[] = [], nota?: string): EjemploDistribucion<'binomial'> {
  return { id, herramienta: 'binomial', etiqueta, fuente: 'clase', enunciado, form: { ...o, n: String(n), pi }, esperados, respuestas, nota };
}
function hiper(id: string, etiqueta: string, enunciado: string, N: number, n: number, k: number, o: OpcionesForm, esperados: number[], respuestas: string[] = []): EjemploDistribucion<'hipergeometrica'> {
  return { id, herramienta: 'hipergeometrica', etiqueta, fuente: 'clase', enunciado, form: { ...o, N: String(N), n: String(n), k: String(k) }, esperados, respuestas };
}
function poissonTasa(id: string, etiqueta: string, enunciado: string, tasa: string, unidades: string, unidad: string, o: OpcionesForm, esperados: number[]): EjemploDistribucion<'poisson'> {
  return { id, herramienta: 'poisson', etiqueta, fuente: 'clase', enunciado, form: { ...o, modo: 'tasa', tasa, unidades, unidad, n: '', pi: '' }, esperados, respuestas: [] };
}
function poissonNp(id: string, etiqueta: string, enunciado: string, n: number, pi: string, o: OpcionesForm, esperados: number[]): EjemploDistribucion<'poisson'> {
  return { id, herramienta: 'poisson', etiqueta, fuente: 'clase', enunciado, form: { ...o, modo: 'np', tasa: '', unidades: '', unidad: '', n: String(n), pi }, esperados, respuestas: [] };
}

export const EJEMPLOS_DISTRIBUCIONES: EjemploDistribucion[] = [
  binomial(
    'bin-tabla',
    'Ejemplo 1 · Artículos defectuosos (diap. 6)',
    'Se seleccionan 3 artículos al azar de un proceso de producción que produce 25 % de artículos defectuosos. Un artículo defectuoso es un éxito. Encuentre la función de probabilidad de X, el número de defectuosos.',
    3,
    '0,25',
    opciones('artículo defectuoso', [], { tabla: true }),
    [],
    [],
  ),
  binomial(
    'bin-ej1',
    'Ejercicio 1 · Prueba de choque (diap. 8)',
    'La probabilidad de que cierta clase de componente sobreviva a una prueba de choque es de 3/4. Calcule la probabilidad de que sobrevivan exactamente 2 de los siguientes 4 componentes que se prueben.',
    4,
    '3/4',
    opciones('el componente sobrevive', [q('igual', 2)]),
    [0.2109375],
    ['27/128'],
  ),
  binomial(
    'bin-ej2a',
    'Ejercicio 2a · Dispositivos defectuosos (diap. 9)',
    'La tasa de dispositivos defectuosos es de 3 %. El inspector elige 20 artículos al azar de un cargamento. ¿Cuál es la probabilidad de que haya al menos un artículo defectuoso entre estos 20?',
    20,
    '0,03',
    opciones('dispositivo defectuoso', [q('al-menos', 1, 'a')]),
    [0.456205657073253],
  ),
  binomial(
    'bin-ej2b',
    'Ejercicio 2b · Cargamentos con defectuosos (diap. 9)',
    'El detallista recibe 10 cargamentos en un mes y el inspector prueba 20 dispositivos por cargamento. ¿Cuál es la probabilidad de que haya exactamente tres cargamentos que contengan al menos un dispositivo defectuoso?',
    10,
    '0,4562',
    opciones('cargamento con al menos un defectuoso', [q('igual', 3, 'b')]),
    [0.16022176500851],
    [],
    'Cada cargamento es un ensayo; su probabilidad de éxito es la respuesta del literal a), P(X ≥ 1) = 0,4562.',
  ),
  binomial(
    'bin-pozos',
    'Ejercicio 3 · Pozos con impurezas (diap. 10)',
    'Se conjetura que hay impurezas en 30 % de los pozos de agua de una comunidad rural. Se eligen 10 al azar. a) Probabilidad de que exactamente 3 tengan impurezas. b) Probabilidad de que más de 3 tengan impurezas. c) Media y varianza; interprete el intervalo μ ± 2σ con el teorema de Tchebycheff.',
    10,
    '0,3',
    opciones('pozo con impurezas', [q('igual', 3, 'a'), q('mas-de', 3, 'b')], { momentos: true, tchebycheff: true }),
    [0.266827932, 0.3503892816, 3, 2.1],
  ),
  binomial(
    'bin-ej8',
    'Ejemplo 8 · Accidentes, con la binomial (diap. 21)',
    'La probabilidad de un accidente en cualquier día es 0,005 y los accidentes son independientes. En un periodo de 400 días: a) ¿probabilidad de que ocurra un accidente en un día? b) ¿probabilidad de que ocurra un accidente a lo sumo en tres días?',
    400,
    '0,005',
    opciones('día con accidente', [q('igual', 1, 'a'), q('a-lo-sumo', 3, 'b')]),
    [0.270669433017113, 0.857576654225488],
  ),
  hiper(
    'hip-lotes',
    'Ejemplo 3 · Lotes de 40 componentes (diap. 14)',
    'Lotes de 40 componentes con 3 o más defectuosos son inaceptables. Se seleccionan 5 componentes al azar. ¿Cuál es la probabilidad de encontrar exactamente un componente defectuoso si en el lote hay 3 defectuosos? Calcule la media y la varianza e interprete μ ± 2σ con el teorema de Tchebycheff.',
    40,
    5,
    3,
    opciones('componente defectuoso', [q('igual', 1)], { momentos: true, tchebycheff: true }),
    [0.301113360323887, 0.375, 0.311298076923077],
  ),
  hiper(
    'hip-inyeccion',
    'Ejercicio · Plan de muestreo de inyectores (diap. 15)',
    'Una parte se vende en lotes de 10; el lote es aceptable si no tiene más de un defectuoso. Se prueban 3 de cada 10 partes y, si ninguna está defectuosa, se acepta el lote. ¿Con qué probabilidad se acepta un lote que en realidad tiene 2 defectuosas?',
    10,
    3,
    2,
    opciones('parte defectuosa', [q('igual', 0)]),
    [0.466666666666667],
    ['7/15'],
  ),
  hiper(
    'hip-ej4',
    'Ejemplo 4 · Plan de muestreo (diap. 16–17)',
    'Se obtiene una muestra de 10 artículos de un lote de 100, en el que 12 están defectuosos. ¿Cuál es la probabilidad de que haya por lo menos 3 defectuosos en la muestra?',
    100,
    10,
    12,
    opciones('artículo defectuoso', [q('al-menos', 3)]),
    [0.0981011267970273],
  ),
  hiper(
    'hip-ej5',
    'Ejercicio 5 · Neumáticos manchados (diap. 17)',
    'De un cargamento de 5000 neumáticos, 1000 están ligeramente manchados. Si se compran al azar 10, ¿cuál es la probabilidad de que al menos 3 estén manchados?',
    5000,
    10,
    1000,
    opciones('neumático manchado', [q('al-menos', 3)]),
    [0.32213992890471],
  ),
  poissonTasa(
    'poi-ej6',
    'Ejemplo 6 · Partículas radiactivas (diap. 20)',
    'El número promedio de partículas radiactivas que pasan por un contador en un milisegundo es 4. ¿Cuál es la probabilidad de que entren 6 partículas en un milisegundo dado?',
    '4',
    '1',
    'milisegundo',
    opciones('partículas que entran al contador', [q('igual', 6)]),
    [0.104195634567021],
  ),
  poissonTasa(
    'poi-ej7',
    'Ejemplo 7 · Camiones en el puerto (diap. 20)',
    'El número promedio de camiones que llega cada día a una ciudad portuaria es 10. Las instalaciones pueden alojar a lo sumo 15 camiones por día. ¿Cuál es la probabilidad de que en un día lleguen más de 15 camiones?',
    '10',
    '1',
    'día',
    opciones('camiones que llegan', [q('mas-de', 15)]),
    [0.0487404033039787],
  ),
  poissonNp(
    'poi-ej8',
    'Ejemplo 8 · Accidentes, con Poisson (diap. 21)',
    'La probabilidad de un accidente en cualquier día es 0,005. En un periodo de 400 días, con la aproximación de Poisson (λ = nπ): a) probabilidad de un accidente en un día; b) probabilidad de un accidente a lo sumo en tres días.',
    400,
    '0,005',
    opciones('días con accidente', [q('igual', 1, 'a'), q('a-lo-sumo', 3, 'b')]),
    [0.270670566473225, 0.857123460498547],
  ),
  poissonNp(
    'poi-ej9',
    'Ejercicio 9 · Burbujas en vidrio (diap. 22)',
    'En promedio, 1 de cada 1000 artículos de vidrio tiene una o más burbujas. ¿Cuál es la probabilidad de que una muestra aleatoria de 8000 tenga menos de 7 artículos con burbujas?',
    8000,
    '1/1000',
    opciones('artículos con burbujas', [q('menos-de', 7)]),
    [0.313374277536398],
  ),
  poissonTasa(
    'poi-ej10a',
    'Ejercicio 10a · Llamadas en medio minuto (diap. 23)',
    'A un conmutador le entran 12 llamadas en promedio por minuto. ¿Cuál es la probabilidad de que entren 3 llamadas en medio minuto?',
    '12',
    '0,5',
    'minuto',
    opciones('llamadas', [q('igual', 3, 'a')]),
    [0.0892350783599889],
  ),
  poissonTasa(
    'poi-ej10b',
    'Ejercicio 10b · Llamadas en 2 minutos (diap. 23)',
    'A un conmutador le entran 12 llamadas en promedio por minuto. ¿Cuál es la probabilidad de que entren al menos 3 llamadas en 2 minutos?',
    '12',
    '2',
    'minuto',
    opciones('llamadas', [q('al-menos', 3, 'b')]),
    [0.999999988183829],
  ),
  poissonTasa(
    'poi-ej10c',
    'Ejercicio 10c · Llamadas en 1 minuto (diap. 23)',
    'A un conmutador le entran 12 llamadas en promedio por minuto. ¿Cuál es la probabilidad de que entren a lo sumo 3 llamadas en 1 minuto?',
    '12',
    '1',
    'minuto',
    opciones('llamadas', [q('a-lo-sumo', 3, 'c')]),
    [0.00229179120779142],
  ),
  {
    id: 'mul-aviones',
    herramienta: 'multinomial',
    etiqueta: 'Ejemplo · Pistas de un aeropuerto (diap. 11–12)',
    fuente: 'clase',
    enunciado:
      'Un aeropuerto tiene 3 pistas, utilizadas por un avión que llega al azar con probabilidades 2/9, 1/6 y 11/18. ¿Cuál es la probabilidad de que 6 aviones que llegan al azar se distribuyan así: pista 1, 2 aviones; pista 2, 1 avión; pista 3, 3 aviones?',
    form: {
      categorias: [
        { nombre: 'Pista 1', pi: '2/9', x: '2' },
        { nombre: 'Pista 2', pi: '1/6', x: '1' },
        { nombre: 'Pista 3', pi: '11/18', x: '3' },
      ],
    },
    esperados: [0.112703009365104],
    respuestas: [],
  },
];
