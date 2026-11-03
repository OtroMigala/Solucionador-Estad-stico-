/**
 * Los 36 puntos del taller de probabilidad y los ejemplos de la presentación
 * «Principios de probabilidad», cada uno con su planteamiento en la
 * herramienta que lo resuelve y la respuesta esperada (usada en las pruebas).
 */
import type { TipoTermino } from '../combinatoria';
import { type ModoPesos, type Punto, type TipoEspacio, idsDonde } from './espacio';
import {
  type BayesForm,
  type ClasicaForm,
  type ConteoForm,
  type ContingenciaForm,
  type EspacioForm,
  type FormPorHerramienta,
  type Herramienta,
  type ReglasForm,
  type SucesivasForm,
  type TerminoForm,
  configDeForm,
  terminoVacio,
} from './formularios';
import type { TipoRelacion } from './reglas';

export interface Ejemplo<H extends Herramienta = Herramienta> {
  id: string;
  herramienta: H;
  /** «Punto 7a», «Diapositivas»… */
  etiqueta: string;
  fuente: 'taller' | 'clase';
  enunciado: string;
  form: FormPorHerramienta[H];
  /** Respuestas exactas esperadas, en el orden de los valores principales («indef» si no existe). */
  respuestas: string[];
  nota?: string;
}

export type EjemploProbabilidad = { [H in Herramienta]: Ejemplo<H> }[Herramienta];

/* ── atajos ── */
const t = (tipo: TipoTermino, p: Partial<TerminoForm> = {}) => terminoVacio(tipo, p);
const num = (n: number, descripcion = '') => t('numero', { n: String(n), descripcion });
const prod = (f: number[], descripcion = '') => t('producto', { factores: f.join(', '), descripcion });
const pot = (n: number, r: number, descripcion = '') => t('potencia', { n: String(n), r: String(r), descripcion });
const fact = (n: number, descripcion = '') => t('factorial', { n: String(n), descripcion });
const perm = (n: number, r: number, descripcion = '') => t('permutacion', { n: String(n), r: String(r), descripcion });
const circ = (n: number, descripcion = '') => t('circular', { n: String(n), descripcion });
const comb = (n: number, r: number, descripcion = '') => t('combinacion', { n: String(n), r: String(r), descripcion });
const palabra = (p: string) => t('repeticion', { palabra: p });
const grupos = (g: string, descripcion = '') => t('repeticion', { grupos: g, descripcion });
const uno = (...terminos: TerminoForm[]): ConteoForm => ({ casos: [{ descripcion: '', terminos }] });
const casos = (...cs: [string, TerminoForm[]][]): ConteoForm => ({ casos: cs.map(([descripcion, terminos]) => ({ descripcion, terminos })) });

function conteo(id: string, etiqueta: string, enunciado: string, form: ConteoForm, respuesta: string, nota?: string): Ejemplo<'conteo'> {
  return { id, herramienta: 'conteo', etiqueta, fuente: 'taller', enunciado, form, respuestas: [respuesta], nota };
}

function clasica(
  id: string,
  etiqueta: string,
  enunciado: string,
  evento: string,
  favorables: ConteoForm,
  totales: ConteoForm,
  respuesta: string,
): Ejemplo<'clasica'> {
  const form: ClasicaForm = { evento, favorables, totales };
  return { id, herramienta: 'clasica', etiqueta, fuente: 'taller', enunciado, form, respuestas: [respuesta] };
}

interface EventoDef {
  nombre: string;
  descripcion: string;
  cond: (p: Punto) => boolean;
}

function espacio(
  tipo: TipoEspacio,
  cantidad: number,
  eventos: EventoDef[],
  par: [number, number] | null = null,
  pesos: ModoPesos = 'uniforme',
  extra: Partial<EspacioForm> = {},
): EspacioForm {
  const form: EspacioForm = {
    tipo,
    cantidad: String(cantidad),
    categorias: [],
    elementos: '',
    pesos,
    pesosPersonalizados: [],
    eventos: [],
    par,
    ...extra,
  };
  const config = configDeForm(form);
  form.eventos = eventos.map((e) => ({ nombre: e.nombre, descripcion: e.descripcion, ids: idsDonde(config, e.cond) }));
  return form;
}

function reglas(
  simA: string,
  descA: string,
  pA: string,
  simB: string,
  descB: string,
  pB: string,
  relacion: TipoRelacion,
  valor = '',
): ReglasForm {
  return { modo: 'dos', simA, descA, pA, simB, descB, pB, relacion, valor, tres: ['', '', '', '', '', '', ''] };
}

const cat = (nombre: string, simbolo: string, cantidad: number) => ({ nombre, simbolo, cantidad: String(cantidad) });

/* ───────────────────────── Taller: conteo (1–15) ───────────────────────── */

const TALLER_CONTEO: Ejemplo<'conteo'>[] = [
  conteo(
    't1a',
    'Punto 1a',
    'Una biblioteca tiene 5 textos de sistemas, 3 de cálculo, 6 de estadística y 4 de circuitos. ¿De cuántas formas puede un estudiante escoger uno de los textos?',
    casos(['sistemas', [num(5)]], ['cálculo', [num(3)]], ['estadística', [num(6)]], ['circuitos', [num(4)]]),
    '18',
  ),
  conteo('t1b', 'Punto 1b', 'Con la misma biblioteca, ¿de cuántas formas puede escoger uno de cada tipo de texto?', uno(prod([5, 3, 6, 4])), '360'),
  conteo('t2', 'Punto 2', 'Un menú tiene 4 aperitivos, 5 entradas y 2 postres. ¿De cuántas formas se puede ordenar un aperitivo, una entrada y un postre?', uno(prod([4, 5, 2])), '40'),
  conteo(
    't3a',
    'Punto 3a',
    'En una fiesta hay 12 parejas casadas. ¿De cuántas formas se puede escoger un hombre y una mujer que estén casados entre sí?',
    uno(num(12, 'Basta escoger una de las 12 parejas: el hombre y la mujer quedan determinados.')),
    '12',
  ),
  conteo(
    't3b',
    'Punto 3b',
    'Con las mismas 12 parejas, ¿de cuántas formas se puede escoger un hombre y una mujer que no estén casados entre sí?',
    uno(prod([12, 11], 'Hay 12 hombres y, por cada uno, 11 mujeres que no son su esposa.')),
    '132',
  ),
  conteo(
    't4a',
    'Punto 4a',
    'Una clave tiene 4 caracteres: las 2 primeras son letras del alfabeto (26) y las 2 últimas son dígitos. ¿Cuántas claves hay?',
    uno(prod([26, 26, 10, 10], 'Letras y dígitos se pueden repetir.')),
    '67600',
  ),
  conteo('t4b', 'Punto 4b', '¿Cuántas de esas claves empiezan por vocal?', uno(prod([5, 26, 10, 10], 'La primera letra es una de las 5 vocales.')), '13000'),
  conteo('t5a', 'Punto 5a', '¿De cuántas formas pueden sentarse 4 personas en una fila de 4 sillas?', uno(fact(4)), '24'),
  conteo('t5b', 'Punto 5b', '¿De cuántas formas pueden sentarse 4 personas alrededor de una mesa redonda?', uno(circ(4)), '6'),
  conteo('t6a', 'Punto 6a', 'Una familia tiene 3 niños y 2 niñas. ¿De cuántas formas pueden sentarse en una fila?', uno(fact(5)), '120'),
  conteo(
    't6b',
    'Punto 6b',
    '¿De cuántas formas, si los niños deben sentarse separados de las niñas (niños juntos y niñas juntas)?',
    uno(fact(2, 'Orden de los dos bloques: niños–niñas o niñas–niños.'), fact(3, 'Orden de los 3 niños dentro de su bloque.'), fact(2, 'Orden de las 2 niñas dentro de su bloque.')),
    '24',
  ),
  conteo(
    't6c',
    'Punto 6c',
    '¿De cuántas formas, si se sientan intercalados (niño, niña, niño, niña, niño)?',
    uno(fact(3, 'Los 3 niños ocupan los puestos 1, 3 y 5.'), fact(2, 'Las 2 niñas ocupan los puestos 2 y 4.')),
    '12',
  ),
  conteo('t7a', 'Punto 7a', 'Número de permutaciones que se pueden formar con las letras de ESTADISTICA.', uno(palabra('ESTADISTICA')), '2494800'),
  conteo('t7b', 'Punto 7b', 'Número de permutaciones que se pueden formar con las letras de MATEMATICA.', uno(palabra('MATEMATICA')), '151200'),
  conteo(
    't8',
    'Punto 8',
    'Número de señales diferentes de 6 banderas en línea vertical que pueden formarse con 4 banderas rojas y 2 azules.',
    uno(grupos('rojas: 4, azules: 2')),
    '15',
  ),
  conteo('t9', 'Punto 9', '¿De cuántas formas pueden sentarse 7 personas en una fila de 7 sillas?', uno(fact(7)), '5040'),
  conteo('t10a', 'Punto 10a', 'Una clase tiene 8 estudiantes. Número de muestras ordenadas de tamaño 3 con reposición.', uno(pot(8, 3)), '512'),
  conteo('t10b', 'Punto 10b', 'Número de muestras ordenadas de tamaño 3 sin reposición.', uno(perm(8, 3)), '336'),
  conteo('t11', 'Punto 11', 'Hay 12 estudiantes elegibles. ¿De cuántas formas puede conformarse una delegación de 4?', uno(comb(12, 4)), '495'),
  conteo('t12a', 'Punto 12a', 'Un estudiante debe responder 8 de 10 preguntas. ¿De cuántas formas puede elegirlas?', uno(comb(10, 8)), '45'),
  conteo(
    't12b',
    'Punto 12b',
    '¿Y si debe responder obligatoriamente las 3 primeras preguntas?',
    uno(comb(7, 5, 'Las 3 primeras ya están elegidas: faltan 5 preguntas entre las 7 restantes.')),
    '21',
  ),
  conteo('t13a', 'Punto 13a', 'Una clase tiene 6 hombres y 4 mujeres. ¿De cuántas formas se puede formar un comité de 4 miembros?', uno(comb(10, 4)), '210'),
  conteo(
    't13b',
    'Punto 13b',
    '¿De cuántas formas se puede formar un comité de 4 miembros con 2 hombres y 2 mujeres?',
    uno(comb(6, 2, 'Los 2 hombres, entre 6.'), comb(4, 2, 'Las 2 mujeres, entre 4.')),
    '90',
  ),
  conteo(
    't13c',
    'Punto 13c',
    '¿De cuántas formas se pueden elegir presidente, vicepresidente, tesorero y secretario?',
    uno(perm(10, 4, 'Los cargos son distintos, así que importa el orden.')),
    '5040',
  ),
  conteo('t14a', 'Punto 14a', 'Una caja tiene 7 medias azules y 7 rojas. ¿De cuántas formas se pueden sacar dos medias de cualquier color?', uno(comb(14, 2)), '91'),
  conteo(
    't14b',
    'Punto 14b',
    '¿De cuántas formas se pueden sacar dos medias del mismo color?',
    casos(['ambas azules', [comb(7, 2)]], ['ambas rojas', [comb(7, 2)]]),
    '42',
  ),
  conteo(
    't15',
    'Punto 15',
    'Número de comités de 5 personas, entre un grupo de 12, que tengan un presidente.',
    uno(num(12, 'Se elige el presidente entre las 12 personas.'), comb(11, 4, 'Los otros 4 miembros, entre las 11 restantes.')),
    '3960',
  ),
];

/* ───────────────────────── Taller: probabilidad (16–36) ───────────────────────── */

const TALLER_PROB: EjemploProbabilidad[] = [
  {
    id: 't16',
    herramienta: 'reglas',
    etiqueta: 'Punto 16',
    fuente: 'taller',
    enunciado:
      'De 80 estudiantes, 30 toman matemática, 20 química y 10 matemática y química. Si se elige uno al azar, ¿cuál es la probabilidad de que tome matemática (M) o química (Q)?',
    form: reglas('M', 'toma matemática', '30/80', 'Q', 'toma química', '20/80', 'interseccion', '10/80'),
    respuestas: ['1/8', '1/2', '1/3', '1/2'],
  },
  {
    id: 't17',
    herramienta: 'espacio',
    etiqueta: 'Punto 17',
    fuente: 'taller',
    enunciado:
      'Se lanzan una moneda y un dado. a) Encuentre el espacio muestral. Exprese por extensión: b) A = {aparecen cara y un número par}; c) B = {aparece un número menor que tres}; d) C = {aparecen sello y un número par}.',
    form: espacio('moneda-dado', 1, [
      { nombre: 'A', descripcion: 'aparecen cara y un número par', cond: (p) => p.a.cara === 1 && p.a.dado % 2 === 0 },
      { nombre: 'B', descripcion: 'aparece un número menor que tres', cond: (p) => p.a.dado < 3 },
      { nombre: 'C', descripcion: 'aparecen sello y un número par', cond: (p) => p.a.cara === 0 && p.a.dado % 2 === 0 },
    ]),
    respuestas: ['1/4', '1/3', '1/4'],
  },
  {
    id: 't18a',
    herramienta: 'espacio',
    etiqueta: 'Punto 18a',
    fuente: 'taller',
    enunciado: 'A = {al lanzar un dado aparece un número par}. Determine P(A).',
    form: espacio('dados', 1, [{ nombre: 'A', descripcion: 'aparece un número par', cond: (p) => p.a.d1 % 2 === 0 }]),
    respuestas: ['1/2'],
  },
  {
    id: 't18b',
    herramienta: 'espacio',
    etiqueta: 'Punto 18b',
    fuente: 'taller',
    enunciado: 'B = {al lanzar tres monedas aparece al menos un sello}. Determine P(B).',
    form: espacio('monedas', 3, [{ nombre: 'B', descripcion: 'aparece al menos un sello', cond: (p) => p.a.sellos >= 1 }]),
    respuestas: ['7/8'],
  },
  clasica(
    't18c',
    'Punto 18c',
    'C = {al sacar al azar una bola de una bolsa con 4 blancas, 3 rojas y 5 azules, aparece una bola blanca}. Determine P(C).',
    'C',
    uno(num(4, 'Bolas blancas.')),
    uno(num(12, 'Total de bolas: 4 + 3 + 5.')),
    '1/3',
  ),
  clasica(
    't19',
    'Punto 19',
    'Hay 5 caballos en una carrera. Juanes escoge 2 al azar y les apuesta. ¿Cuál es la probabilidad de que escoja al ganador?',
    'G',
    uno(num(4, 'Parejas que incluyen al ganador: el ganador con cualquiera de los otros 4 caballos.')),
    uno(comb(5, 2, 'Todas las parejas posibles de caballos.')),
    '2/5',
  ),
  clasica(
    't20',
    'Punto 20',
    'Una clase tiene 10 hombres y 20 mujeres; la mitad de los hombres y la mitad de las mujeres tienen ojos cafés. ¿Probabilidad de que una persona elegida al azar sea hombre y tenga ojos cafés?',
    'H∩C',
    uno(num(5, 'Hombres con ojos cafés: la mitad de 10.')),
    uno(num(30, 'Total de estudiantes.')),
    '1/6',
  ),
  clasica(
    't21a',
    'Punto 21a',
    'Seis parejas de casados están en una habitación y se eligen 2 personas al azar. ¿Probabilidad de que estén casados entre sí?',
    'C',
    uno(num(6, 'Las 6 parejas casadas.')),
    uno(comb(12, 2, 'Formas de elegir 2 de las 12 personas.')),
    '1/11',
  ),
  clasica(
    't21b',
    'Punto 21b',
    '¿Probabilidad de que uno sea hombre y la otra mujer?',
    'HM',
    uno(comb(6, 1, 'Un hombre entre 6.'), comb(6, 1, 'Una mujer entre 6.')),
    uno(comb(12, 2)),
    '6/11',
  ),
  {
    id: 't22a',
    herramienta: 'espacio',
    etiqueta: 'Punto 22a',
    fuente: 'taller',
    enunciado: 'A: al lanzar un dado equilibrado aparece un número impar.',
    form: espacio('dados', 1, [{ nombre: 'A', descripcion: 'aparece un número impar', cond: (p) => p.a.d1 % 2 === 1 }]),
    respuestas: ['1/2'],
  },
  {
    id: 't22b',
    herramienta: 'espacio',
    etiqueta: 'Punto 22b',
    fuente: 'taller',
    enunciado: 'B: al lanzar 4 monedas aparece una o más caras.',
    form: espacio('monedas', 4, [{ nombre: 'B', descripcion: 'aparece una o más caras', cond: (p) => p.a.caras >= 1 }]),
    respuestas: ['15/16'],
  },
  {
    id: 't22c',
    herramienta: 'espacio',
    etiqueta: 'Punto 22c',
    fuente: 'taller',
    enunciado: 'C: al lanzar dos dados ambos números son 4.',
    form: espacio('dados', 2, [{ nombre: 'C', descripcion: 'ambos números son 4', cond: (p) => p.a.d1 === 4 && p.a.d2 === 4 }]),
    respuestas: ['1/36'],
  },
  {
    id: 't22d',
    herramienta: 'espacio',
    etiqueta: 'Punto 22d',
    fuente: 'taller',
    enunciado: 'D: aparece exactamente un 6 al lanzar dos dados.',
    form: espacio('dados', 2, [{ nombre: 'D', descripcion: 'aparece exactamente un 6', cond: (p) => (p.a.d1 === 6) !== (p.a.d2 === 6) }]),
    respuestas: ['5/18'],
  },
  clasica(
    't23',
    'Punto 23',
    'Hay 3 tornillos y 3 tuercas en una caja y se escogen 2 partes al azar. ¿Probabilidad de que una sea tornillo y la otra tuerca?',
    'A',
    uno(comb(3, 1, 'Un tornillo entre 3.'), comb(3, 1, 'Una tuerca entre 3.')),
    uno(comb(6, 2, 'Formas de escoger 2 de las 6 partes.')),
    '3/5',
  ),
  clasica(
    't24',
    'Punto 24',
    'Una caja tiene 2 medias blancas, 2 azules y 2 rojas. Se sacan dos al azar. ¿Probabilidad de que sean pareja (del mismo color)?',
    'P',
    casos(['blancas', [comb(2, 2)]], ['azules', [comb(2, 2)]], ['rojas', [comb(2, 2)]]),
    uno(comb(6, 2)),
    '1/5',
  ),
  {
    id: 't25',
    herramienta: 'sucesivas',
    etiqueta: 'Punto 25',
    fuente: 'taller',
    enunciado:
      'Un lote tiene 12 artículos, de los cuales 4 son defectuosos. Se sacan 3 al azar, uno tras otro. ¿Probabilidad de que ninguno de los 3 sea defectuoso?',
    form: { categorias: [cat('defectuosos', 'D', 4), cat('no defectuosos', 'N', 8)], secuencias: 'N N N', reemplazo: false },
    respuestas: ['14/55'],
  },
  {
    id: 't26',
    herramienta: 'espacio',
    etiqueta: 'Punto 26',
    fuente: 'taller',
    enunciado:
      'Se lanza un par de dados. a) Enumere S. b) A: el 2 aparece en al menos un dado. c) B: la suma es 8. d) Probabilidad de que uno de los dados sea 2, si la suma es 6.',
    form: espacio(
      'dados',
      2,
      [
        { nombre: 'A', descripcion: 'el 2 aparece en al menos un dado', cond: (p) => p.a.d1 === 2 || p.a.d2 === 2 },
        { nombre: 'B', descripcion: 'la suma es 8', cond: (p) => p.a.suma === 8 },
        { nombre: 'C', descripcion: 'la suma es 6', cond: (p) => p.a.suma === 6 },
      ],
      [0, 2],
    ),
    respuestas: ['11/36', '5/36', '5/36', '7/18', '2/5'],
  },
  clasica(
    't27',
    'Punto 27',
    'Una clase tiene 12 hombres y 4 mujeres. Se seleccionan 3 estudiantes al azar. ¿Probabilidad de que todos sean hombres?',
    'H',
    uno(comb(12, 3, 'Grupos de 3 formados solo por hombres.')),
    uno(comb(16, 3, 'Grupos de 3 entre los 16 estudiantes.')),
    '11/28',
  ),
  clasica(
    't28',
    'Punto 28',
    'Se reparten 5 cartas de un naipe corriente de 52. ¿Probabilidad de que todas sean picas?',
    'P',
    uno(comb(13, 5, 'Manos de 5 cartas con solo picas (hay 13 picas).')),
    uno(comb(52, 5, 'Todas las manos de 5 cartas.')),
    '33/66640',
  ),
  {
    id: 't29',
    herramienta: 'sucesivas',
    etiqueta: 'Punto 29',
    fuente: 'taller',
    enunciado:
      'Una caja tiene 7 bolas rojas y 3 blancas. Se sacan 3 bolas, una después de otra. ¿Probabilidad de que las 2 primeras sean rojas y la tercera blanca?',
    form: { categorias: [cat('rojas', 'R', 7), cat('blancas', 'B', 3)], secuencias: 'R R B', reemplazo: false },
    respuestas: ['7/40'],
  },
  {
    id: 't30a',
    herramienta: 'sucesivas',
    etiqueta: 'Punto 30a',
    fuente: 'taller',
    enunciado:
      'Se seleccionan estudiantes al azar, uno después de otro. ¿Probabilidad de que alternen hombres y mujeres si la clase tiene 4 hombres y 3 mujeres?',
    form: { categorias: [cat('hombres', 'H', 4), cat('mujeres', 'M', 3)], secuencias: 'H M H M H M H', reemplazo: false },
    respuestas: ['1/35'],
    nota: 'Con 4 hombres y 3 mujeres, la única forma de alternar es empezar y terminar con hombre.',
  },
  {
    id: 't30b',
    herramienta: 'sucesivas',
    etiqueta: 'Punto 30b',
    fuente: 'taller',
    enunciado: '¿Y si la clase tiene 3 hombres y 3 mujeres?',
    form: { categorias: [cat('hombres', 'H', 3), cat('mujeres', 'M', 3)], secuencias: 'H M H M H M\nM H M H M H', reemplazo: false },
    respuestas: ['1/10'],
    nota: 'Se puede alternar empezando por hombre o por mujer: son dos secuencias mutuamente excluyentes.',
  },
  {
    id: 't31',
    herramienta: 'contingencia',
    etiqueta: 'Punto 31',
    fuente: 'taller',
    enunciado:
      'Entre 700 empleados, se clasifica a hombres y mujeres según ganen menos de $20 000 o $20 000 o más. Se elige uno al azar: a) gana $20 000 o más, dado que es hombre; b) gana menos de $20 000, dado que es mujer; c) es hombre, dado que gana $20 000 o más.',
    form: {
      filas: [
        { nombre: 'Mujeres', simbolo: 'M' },
        { nombre: 'Hombres', simbolo: 'H' },
      ],
      columnas: [
        { nombre: 'Menos de $20 000', simbolo: 'B' },
        { nombre: '$20 000 o más', simbolo: 'A' },
      ],
      conteos: [
        ['210', '80'],
        ['105', '305'],
      ],
      consultas: [
        { a: { eje: 'columna', i: 1 }, op: 'dado', b: { eje: 'fila', i: 1 } },
        { a: { eje: 'columna', i: 0 }, op: 'dado', b: { eje: 'fila', i: 0 } },
        { a: { eje: 'fila', i: 1 }, op: 'dado', b: { eje: 'columna', i: 1 } },
      ],
    },
    respuestas: ['61/82', '21/29', '61/77'],
  },
  {
    id: 't32',
    herramienta: 'contingencia',
    etiqueta: 'Punto 32',
    fuente: 'taller',
    enunciado:
      'En una clase hay 10 alumnas rubias, 20 morenas, 5 alumnos rubios y 10 morenos. Probabilidad de que un estudiante: a) sea hombre; b) sea mujer morena; c) sea hombre o mujer.',
    form: {
      filas: [
        { nombre: 'Mujeres', simbolo: 'M' },
        { nombre: 'Hombres', simbolo: 'H' },
      ],
      columnas: [
        { nombre: 'Rubios', simbolo: 'R' },
        { nombre: 'Morenos', simbolo: 'O' },
      ],
      conteos: [
        ['10', '20'],
        ['5', '10'],
      ],
      consultas: [
        { a: { eje: 'fila', i: 1 }, op: 'sola' },
        { a: { eje: 'fila', i: 0 }, op: 'y', b: { eje: 'columna', i: 1 } },
        { a: { eje: 'fila', i: 1 }, op: 'o', b: { eje: 'fila', i: 0 } },
      ],
    },
    respuestas: ['1/3', '4/9', '1'],
  },
  {
    id: 't33',
    herramienta: 'espacio',
    etiqueta: 'Punto 33',
    fuente: 'taller',
    enunciado:
      'Un dado está trucado de forma que la probabilidad de cada cara es proporcional a su número. Halle: a) la probabilidad de obtener 6; b) la probabilidad de obtener un número impar.',
    form: espacio(
      'dados',
      1,
      [
        { nombre: 'A', descripcion: 'sale 6', cond: (p) => p.a.d1 === 6 },
        { nombre: 'B', descripcion: 'sale un número impar', cond: (p) => p.a.d1 % 2 === 1 },
      ],
      null,
      'proporcional',
    ),
    respuestas: ['2/7', '3/7'],
  },
  {
    id: 't34',
    herramienta: 'espacio',
    etiqueta: 'Punto 34',
    fuente: 'taller',
    enunciado: 'Probabilidad de que al levantar una ficha de dominó se obtenga un número de puntos mayor que 9 o que sea múltiplo de 4.',
    form: espacio(
      'domino',
      1,
      [
        { nombre: 'A', descripcion: 'más de 9 puntos', cond: (p) => p.a.suma > 9 },
        { nombre: 'B', descripcion: 'los puntos son múltiplo de 4 (4, 8 o 12)', cond: (p) => p.a.suma > 0 && p.a.suma % 4 === 0 },
      ],
      [0, 1],
    ),
    respuestas: ['1/7', '1/4', '5/14', '1/7'],
    nota: 'La ficha 0|0 (0 puntos) no se cuenta como múltiplo de 4, como es usual en este ejercicio.',
  },
  {
    id: 't35',
    herramienta: 'bayes',
    etiqueta: 'Punto 35',
    fuente: 'taller',
    enunciado:
      'El 20 % de los empleados son ingenieros y otro 20 % economistas. El 75 % de los ingenieros ocupa un puesto directivo, el 50 % de los economistas también, y de los demás solo el 20 %. ¿Probabilidad de que un directivo elegido al azar sea ingeniero?',
    form: {
      evento: { simbolo: 'D', descripcion: 'ocupa un puesto directivo' },
      ramas: [
        { simbolo: 'I', descripcion: 'ingeniero', prior: '20%', verosimilitud: '75%' },
        { simbolo: 'E', descripcion: 'economista', prior: '20%', verosimilitud: '50%' },
        { simbolo: 'O', descripcion: 'ni ingeniero ni economista', prior: '60%', verosimilitud: '20%' },
      ],
      objetivo: 0,
    },
    respuestas: ['37/100', '15/37'],
  },
  {
    id: 't36',
    herramienta: 'bayes',
    etiqueta: 'Punto 36',
    fuente: 'taller',
    enunciado:
      'La probabilidad de un incidente en una fábrica con alarma es 0,1. La alarma suena con probabilidad 0,97 si hay incidente y 0,02 si no lo hay. Si la alarma sonó, ¿cuál es la probabilidad de que no haya habido incidente?',
    form: {
      evento: { simbolo: 'S', descripcion: 'la alarma suena' },
      ramas: [
        { simbolo: 'I', descripcion: 'hay un incidente', prior: '0.1', verosimilitud: '0.97' },
        { simbolo: "I'", descripcion: 'no hay incidente', prior: '0.9', verosimilitud: '0.02' },
      ],
      objetivo: 1,
    },
    respuestas: ['23/200', '18/115'],
  },
];

/* ───────────────────────── Ejemplos de las diapositivas ───────────────────────── */

const CLASE: EjemploProbabilidad[] = [
  {
    id: 'c-moneda',
    herramienta: 'espacio',
    etiqueta: 'Moneda lanzada dos veces',
    fuente: 'clase',
    enunciado: 'Una moneda se lanza dos veces. ¿Cuál es la probabilidad de que ocurra al menos una cara?',
    form: espacio('monedas', 2, [{ nombre: 'A', descripcion: 'ocurre al menos una cara', cond: (p) => p.a.caras >= 1 }]),
    respuestas: ['3/4'],
  },
  {
    id: 'c-dado-cargado',
    herramienta: 'espacio',
    etiqueta: 'Dado cargado',
    fuente: 'clase',
    enunciado:
      'Un dado se carga para que un número par tenga el doble de probabilidad que uno impar. E: sale un número menor que 4. A: sale un número par. B: sale un número divisible entre 3. Calcule P(E), P(A ∪ B) y P(A ∩ B).',
    form: espacio(
      'dados',
      1,
      [
        { nombre: 'E', descripcion: 'sale un número menor que 4', cond: (p) => p.a.d1 < 4 },
        { nombre: 'A', descripcion: 'sale un número par', cond: (p) => p.a.d1 % 2 === 0 },
        { nombre: 'B', descripcion: 'sale un número divisible entre 3', cond: (p) => p.a.d1 % 3 === 0 },
      ],
      [1, 2],
      'pares-doble',
    ),
    respuestas: ['4/9', '2/3', '1/3', '7/9', '2/3'],
  },
  {
    id: 'c-mecanico',
    herramienta: 'espacio',
    etiqueta: 'Mecánico automotriz',
    fuente: 'clase',
    enunciado:
      'Las probabilidades de que un mecánico atienda 3, 4, 5, 6, 7, 8 o más vehículos en un día son 0,12; 0,19; 0,28; 0,24; 0,10 y 0,07. ¿Probabilidad de que atienda al menos 5 vehículos?',
    form: espacio(
      'lista',
      0,
      [{ nombre: 'E', descripcion: 'atiende al menos 5 vehículos', cond: (p) => p.a.indice >= 3 }],
      null,
      'personalizado',
      { elementos: '3, 4, 5, 6, 7, 8 o más', pesosPersonalizados: ['0.12', '0.19', '0.28', '0.24', '0.10', '0.07'] },
    ),
    respuestas: ['69/100'],
  },
  {
    id: 'c-carlos',
    herramienta: 'reglas',
    etiqueta: 'Ofertas de empleo',
    fuente: 'clase',
    enunciado:
      'Carlos tiene probabilidad 0,8 de recibir oferta de la empresa A y 0,6 de la empresa B; la de recibir ambas es 0,5. ¿Probabilidad de obtener al menos una oferta?',
    form: reglas('A', 'oferta de la empresa A', '0.8', 'B', 'oferta de la empresa B', '0.6', 'interseccion', '0.5'),
    respuestas: ['1/2', '9/10', '5/8', '5/6'],
  },
  {
    id: 'c-dados-7-11',
    herramienta: 'reglas',
    etiqueta: 'Total de 7 u 11 con dos dados',
    fuente: 'clase',
    enunciado: '¿Probabilidad de obtener un total de 7 u 11 al lanzar un par de dados? A: total 7 (6 de 36 puntos); B: total 11 (2 de 36).',
    form: reglas('A', 'el total es 7', '6/36', 'B', 'el total es 11', '2/36', 'excluyentes'),
    respuestas: ['0', '2/9', '0', '0'],
  },
  {
    id: 'c-vuelo',
    herramienta: 'reglas',
    etiqueta: 'Vuelo a tiempo',
    fuente: 'clase',
    enunciado:
      'P(D) = 0,83 de que un vuelo salga a tiempo, P(A) = 0,82 de que llegue a tiempo y P(D ∩ A) = 0,78. Calcule la probabilidad de que a) llegue a tiempo dado que salió a tiempo; b) haya salido a tiempo dado que llegó a tiempo.',
    form: reglas('D', 'sale a tiempo', '0.83', 'A', 'llega a tiempo', '0.82', 'interseccion', '0.78'),
    respuestas: ['39/50', '87/100', '78/83', '39/41'],
  },
  {
    id: 'c-empleo',
    herramienta: 'contingencia',
    etiqueta: 'Empleo en Popayán',
    fuente: 'clase',
    enunciado:
      'Se elige al azar una de 900 personas para promover nuevas industrias en Popayán. H: se elige un hombre; E: el elegido tiene empleo. Calcule P(H | E) y P(E | H).',
    form: {
      filas: [
        { nombre: 'Hombre', simbolo: 'H' },
        { nombre: 'Mujer', simbolo: 'M' },
      ],
      columnas: [
        { nombre: 'Empleado', simbolo: 'E' },
        { nombre: 'Desempleado', simbolo: "E'" },
      ],
      conteos: [
        ['460', '40'],
        ['140', '260'],
      ],
      consultas: [
        { a: { eje: 'fila', i: 0 }, op: 'dado', b: { eje: 'columna', i: 0 } },
        { a: { eje: 'columna', i: 0 }, op: 'dado', b: { eje: 'fila', i: 0 } },
      ],
    },
    respuestas: ['23/30', '23/25'],
  },
  {
    id: 'c-fusibles',
    herramienta: 'sucesivas',
    etiqueta: 'Caja de fusibles',
    fuente: 'clase',
    enunciado:
      'Una caja tiene 20 fusibles, 5 defectuosos. Se sacan 2 al azar, uno después del otro y sin reemplazo. ¿Probabilidad de que ambos sean defectuosos?',
    form: { categorias: [cat('defectuosos', 'D', 5), cat('buenos', 'B', 15)], secuencias: 'D D', reemplazo: false },
    respuestas: ['1/19'],
  },
  {
    id: 'c-bolsas',
    herramienta: 'bayes',
    etiqueta: 'Dos bolsas',
    fuente: 'clase',
    enunciado:
      'La bolsa 1 tiene 4 bolas blancas y 3 negras; la bolsa 2, 3 blancas y 5 negras. Se pasa una bola de la bolsa 1 a la 2 sin verla. ¿Probabilidad de sacar ahora una bola negra de la bolsa 2?',
    form: {
      evento: { simbolo: 'N2', descripcion: 'sale una bola negra de la bolsa 2' },
      ramas: [
        { simbolo: 'N1', descripcion: 'se pasó una bola negra (la bolsa 2 queda con 6 negras de 9)', prior: '3/7', verosimilitud: '6/9' },
        { simbolo: 'B1', descripcion: 'se pasó una bola blanca (la bolsa 2 queda con 5 negras de 9)', prior: '4/7', verosimilitud: '5/9' },
      ],
      objetivo: null,
    },
    respuestas: ['38/63'],
  },
  {
    id: 'c-maquinas',
    herramienta: 'bayes',
    etiqueta: 'Tres máquinas de ensamble',
    fuente: 'clase',
    enunciado:
      'Las máquinas B₁, B₂ y B₃ montan el 30 %, 45 % y 25 % de los productos, y el 2 %, 3 % y 2 % de lo que ensambla cada una es defectuoso. a) ¿Probabilidad de que un producto esté defectuoso? b) Si está defectuoso, ¿probabilidad de que lo haya ensamblado B₃?',
    form: {
      evento: { simbolo: 'A', descripcion: 'el producto está defectuoso' },
      ramas: [
        { simbolo: 'B1', descripcion: 'ensamblado por la máquina B₁', prior: '30%', verosimilitud: '2%' },
        { simbolo: 'B2', descripcion: 'ensamblado por la máquina B₂', prior: '45%', verosimilitud: '3%' },
        { simbolo: 'B3', descripcion: 'ensamblado por la máquina B₃', prior: '25%', verosimilitud: '2%' },
      ],
      objetivo: 2,
    },
    respuestas: ['49/2000', '10/49'],
  },
];

/** Todos los ejemplos, en el orden del taller y luego los de clase. */
export const EJEMPLOS_PROBABILIDAD: EjemploProbabilidad[] = [...TALLER_CONTEO, ...TALLER_PROB, ...CLASE];

export function ejemplosDe<H extends Herramienta>(h: H): Ejemplo<H>[] {
  return EJEMPLOS_PROBABILIDAD.filter((e) => e.herramienta === h) as unknown as Ejemplo<H>[];
}

/** Formularios iniciales de cada herramienta: el primer ejemplo del taller que la usa. */
export function formInicial<H extends Herramienta>(h: H): FormPorHerramienta[H] {
  const e = ejemplosDe(h)[0];
  if (e) return structuredClone(e.form);
  return structuredClone(FORM_VACIO[h]);
}

const FORM_VACIO: FormPorHerramienta = {
  conteo: uno(comb(10, 3)),
  clasica: { evento: 'A', favorables: uno(num(1)), totales: uno(num(2)) },
  espacio: espacio('dados', 1, []),
  reglas: reglas('A', '', '0.5', 'B', '', '0.4', 'interseccion', '0.2'),
  sucesivas: { categorias: [cat('rojas', 'R', 5), cat('blancas', 'B', 5)], secuencias: 'R B', reemplazo: false },
  contingencia: {
    filas: [
      { nombre: 'Fila 1', simbolo: 'A' },
      { nombre: 'Fila 2', simbolo: 'B' },
    ],
    columnas: [
      { nombre: 'Columna 1', simbolo: 'C' },
      { nombre: 'Columna 2', simbolo: 'D' },
    ],
    conteos: [
      ['10', '20'],
      ['30', '40'],
    ],
    consultas: [{ a: { eje: 'fila', i: 0 }, op: 'dado', b: { eje: 'columna', i: 0 } }],
  },
  bayes: {
    evento: { simbolo: 'A', descripcion: '' },
    ramas: [
      { simbolo: 'B1', descripcion: '', prior: '0.5', verosimilitud: '0.1' },
      { simbolo: 'B2', descripcion: '', prior: '0.5', verosimilitud: '0.2' },
    ],
    objetivo: 0,
  },
};

/** Valores por defecto de la regla aditiva de tres eventos (ejemplo ilustrativo, no es del taller). */
export const TRES_EVENTOS_EJEMPLO: ReglasForm['tres'] = ['0.5', '0.4', '0.3', '0.2', '0.15', '0.1', '0.05'];

export type { ContingenciaForm, BayesForm, SucesivasForm, EspacioForm, ClasicaForm, ConteoForm };
