/**
 * Ejercicios precargados: los cuatro puntos del taller de regresión del tercer
 * corte y los ejemplos resueltos en las presentaciones del curso.
 */

export interface EjemploRegresion {
  id: string;
  etiqueta: string;
  fuente: 'taller' | 'clase';
  enunciado: string;
  nombreY: string;
  nombresX: string[];
  y: number[];
  x: number[][];
  alfa: number;
  x0: number[] | null;
  nota?: string;
}

export const EJEMPLOS_REGRESION: EjemploRegresion[] = [
  {
    id: 'taller-1',
    etiqueta: 'Punto 1 · Energía de una planta química',
    fuente: 'taller',
    enunciado:
      'La energía eléctrica que consume cada mes una planta química se relaciona con la temperatura ambiental promedio x₁, los días del mes x₂, la pureza promedio del producto x₃ y las toneladas fabricadas x₄. a) Estime los parámetros. b) Tabla ANOVA. c) Prueba de hipótesis con α = 0,025. d) Coeficiente de determinación. e) Prediga y para x₁ = 75 °F, x₂ = 24 días, x₃ = 90 %, x₄ = 98 t.',
    nombreY: 'Consumo de energía eléctrica',
    nombresX: ['Temperatura (°F)', 'Días del mes', 'Pureza (%)', 'Toneladas fabricadas'],
    y: [240, 236, 290, 274, 301, 316, 300, 296, 267, 276, 288, 261],
    x: [
      [25, 31, 45, 60, 65, 72, 80, 84, 75, 60, 50, 38],
      [24, 21, 24, 25, 25, 26, 25, 25, 24, 25, 25, 23],
      [91, 90, 88, 87, 91, 94, 87, 86, 88, 91, 90, 89],
      [100, 95, 110, 88, 94, 99, 97, 96, 110, 105, 100, 98],
    ],
    alfa: 0.025,
    x0: [75, 24, 90, 98],
  },
  {
    id: 'taller-2',
    etiqueta: 'Punto 2 · Ganancia hFE de un semiconductor',
    fuente: 'taller',
    enunciado:
      'Un ingeniero modela la ganancia hFE de un dispositivo (y) con la RS del emisor (x₁), la RS de la base (x₂) y la RS del emisor a la base (x₃). a) Estime los parámetros. b) Tabla ANOVA. c) Prueba de hipótesis con α = 0,05. d) Prediga hFE para x₁ = 14, x₂ = 220, x₃ = 5. e) Coeficiente de determinación.',
    nombreY: 'Ganancia hFE',
    nombresX: ['RS del emisor', 'RS de la base', 'RS emisor-base'],
    y: [128.4, 52.62, 113.9, 98.01, 139.9, 102.6, 48.14, 109.6, 82.68, 112.6, 97.52, 59.06, 111.8, 89.09, 171.9, 66.8],
    x: [
      [14.62, 15.63, 14.62, 15.0, 14.5, 15.25, 16.12, 15.13, 15.5, 15.13, 15.5, 16.12, 15.13, 15.63, 15.38, 15.5],
      [226.0, 220.0, 217.4, 220.0, 226.5, 224.1, 220.5, 223.5, 217.6, 228.5, 230.2, 226.5, 226.6, 225.6, 234.0, 230.0],
      [7.0, 3.375, 6.375, 6.0, 7.625, 6.0, 3.375, 6.125, 5.0, 6.625, 5.75, 3.75, 6.125, 5.375, 8.875, 4.0],
    ],
    alfa: 0.05,
    x0: [14, 220, 5],
    nota:
      'Los seis primeros valores de x₃ (7; 3,375; 6,375; 6; 7,625; 6) no se pudieron leer del PDF del taller y se tomaron del conjunto de datos original del libro de texto. Compáralos con tu copia impresa del taller.',
  },
  {
    id: 'taller-3',
    etiqueta: 'Punto 3 · Contenido energético de desechos',
    fuente: 'taller',
    enunciado:
      'y = contenido energético (kcal/kg); x₁ = % de plástico, x₂ = % de papel, x₃ = % de basura y x₄ = % de humedad, en especímenes de desechos municipales. a) Estime los parámetros. b) Tabla ANOVA. c) Prueba de hipótesis con α = 0,05. d) Coeficiente de determinación. e) Prediga y para x₁ = 23,3, x₂ = 24,53, x₃ = 38,45, x₄ = 57.',
    nombreY: 'Contenido energético (kcal/kg)',
    nombresX: ['Plástico (%)', 'Papel (%)', 'Basura (%)', 'Agua (%)'],
    y: [947, 1407, 1452, 1553, 989, 1162, 1466, 1656, 1254, 1336, 1097, 1266, 1401, 1223, 1216],
    x: [
      [18.69, 19.43, 19.24, 22.64, 16.54, 21.44, 19.53, 23.97, 21.45, 20.34, 17.03, 21.03, 20.49, 20.45, 18.81],
      [15.65, 23.51, 24.23, 22.2, 23.56, 23.65, 24.45, 19.39, 23.84, 26.5, 23.46, 26.99, 19.87, 23.03, 22.62],
      [45.01, 39.69, 43.16, 35.76, 41.2, 35.56, 40.18, 44.11, 35.41, 34.21, 32.45, 38.19, 41.35, 43.59, 42.2],
      [58.21, 46.31, 46.63, 45.85, 55.14, 54.24, 47.2, 43.82, 51.01, 49.06, 53.23, 51.78, 46.69, 53.57, 52.98],
    ],
    alfa: 0.05,
    x0: [23.3, 24.53, 38.45, 57],
  },
  {
    id: 'taller-4',
    etiqueta: 'Punto 4 · Desgaste de una conexión',
    fuente: 'taller',
    enunciado:
      'Relación entre el desgaste y, la viscosidad del aceite x₁ y la carga x₂. a) Estime los parámetros. b) Tabla ANOVA. c) Prueba de hipótesis con α = 0,05. d) Coeficiente de determinación. e) Prediga y para una viscosidad de 20 y una carga de 1200.',
    nombreY: 'Desgaste',
    nombresX: ['Viscosidad del aceite', 'Carga'],
    y: [193, 172, 113, 230, 91, 125],
    x: [
      [1.6, 22.0, 33.0, 15.5, 43.0, 40.0],
      [851, 1058, 1357, 816, 1201, 1115],
    ],
    alfa: 0.05,
    x0: [20, 1200],
    nota: 'En el PDF el nivel de significancia aparece como «005»; se usa α = 0,05.',
  },
  {
    id: 'clase-diesel',
    etiqueta: 'Diapositivas · Camiones diésel',
    fuente: 'clase',
    enunciado:
      'Se probó un grupo de camiones ligeros con motor diésel para saber si la humedad (x₁), la temperatura del aire (x₂) y la presión barométrica (x₃) influyen en la cantidad de óxido nitroso que emiten (y, en ppm). Estime el modelo con las ecuaciones normales y con matrices.',
    nombreY: 'Óxido nitroso (ppm)',
    nombresX: ['Humedad', 'Temperatura del aire', 'Presión barométrica'],
    y: [0.9, 0.91, 0.96, 0.89, 1.0, 1.1, 1.15, 1.03, 0.77, 1.07, 1.07, 0.94, 1.1, 1.1, 1.1, 0.91, 0.87, 0.78, 0.82, 0.95],
    x: [
      [72.4, 41.6, 34.3, 35.1, 10.7, 12.9, 8.3, 20.1, 72.2, 24.0, 23.2, 47.4, 31.5, 10.6, 11.2, 73.3, 75.4, 96.6, 107.4, 54.9],
      [76.3, 70.3, 77.1, 68.0, 79.0, 67.4, 66.8, 76.9, 77.7, 67.7, 76.8, 86.6, 76.9, 86.3, 86.0, 76.3, 77.9, 78.7, 86.8, 70.9],
      [29.18, 29.35, 29.24, 29.27, 29.78, 29.39, 29.69, 29.48, 29.09, 29.6, 29.38, 29.35, 29.63, 29.56, 29.48, 29.4, 29.28, 29.29, 29.03, 29.37],
    ],
    alfa: 0.05,
    x0: null,
    nota: 'Resultado de Excel del profesor: β̂₀ = −3,507778; β̂₁ = −0,002625; β̂₂ = 0,000799; β̂₃ = 0,154155; R² = 0,800463.',
  },
  {
    id: 'clase-supervivencia',
    etiqueta: 'Diapositivas · Supervivencia de espermatozoides',
    fuente: 'clase',
    enunciado:
      'Se midió el porcentaje de supervivencia de espermatozoides de cierto semen animal, almacenado con distintas concentraciones (% en peso) de tres materiales. Obtenga el modelo de regresión lineal múltiple y construya la tabla ANOVA.',
    nombreY: 'Supervivencia (%)',
    nombresX: ['Material 1 (% peso)', 'Material 2 (% peso)', 'Material 3 (% peso)'],
    y: [25.5, 31.2, 25.9, 38.4, 18.4, 26.7, 26.4, 25.9, 32.0, 25.2, 39.7, 35.7, 26.5],
    x: [
      [1.74, 6.32, 6.22, 10.52, 1.19, 1.22, 4.1, 6.32, 4.08, 4.15, 10.15, 1.72, 1.7],
      [5.3, 5.42, 8.41, 4.63, 11.6, 5.85, 6.62, 8.72, 4.42, 7.6, 4.83, 3.12, 5.3],
      [10.8, 9.4, 7.2, 8.5, 9.4, 9.9, 8.0, 9.1, 8.7, 9.2, 9.4, 7.6, 8.2],
    ],
    alfa: 0.05,
    x0: null,
  },
  {
    id: 'clase-dqo',
    etiqueta: 'Diapositivas · Sólidos y demanda química de oxígeno',
    fuente: 'clase',
    enunciado:
      'Se registraron x, la reducción porcentual de los sólidos totales, y y, el porcentaje de disminución de la demanda química de oxígeno. Ajuste la recta de regresión, construya la tabla ANOVA y determine si la variable regresora aporta al modelo.',
    nombreY: 'Reducción de la demanda de oxígeno (%)',
    nombresX: ['Reducción de sólidos (%)'],
    y: [5, 11, 21, 16, 16, 28, 27, 25, 35, 30, 40, 32, 34, 32, 34, 37, 38, 34, 36, 38, 37, 36, 45, 39, 41, 40, 44, 37, 44, 46, 46, 49, 51],
    x: [[3, 7, 11, 15, 18, 27, 29, 30, 30, 31, 31, 32, 33, 33, 34, 36, 36, 36, 37, 38, 39, 39, 39, 40, 41, 42, 42, 43, 44, 45, 46, 47, 50]],
    alfa: 0.05,
    x0: null,
  },
  {
    id: 'clase-saber',
    etiqueta: 'Diapositivas · Saber Pro y nota de matemáticas',
    fuente: 'clase',
    enunciado:
      'Puntaje del examen de matemáticas (Saber Pro) de 30 estudiantes (x) y nota final de su primer curso de matemáticas (y). Calcule la covarianza y el coeficiente de correlación de Pearson.',
    nombreY: 'Nota del primer curso de matemáticas',
    nombresX: ['Examen de matemáticas (Saber Pro)'],
    y: [2.4, 2.6, 3, 3.9, 3.6, 3, 3.1, 2.8, 2.2, 2.9, 1.9, 2.2, 3.1, 2.6, 2.8, 2.7, 2.4, 3, 3.3, 1.8, 2.8, 3.2, 1.8, 2.7, 2.1, 1.7, 1.7, 2.3, 2.6, 2.7],
    x: [[3, 2.4, 3.7, 3.6, 3.8, 2.9, 3.5, 3, 2.3, 3, 2.9, 2.7, 3.7, 2.7, 3.3, 2.8, 3.1, 2.8, 3, 2.2, 3.1, 3.3, 2.7, 3.5, 2.9, 2.7, 2.9, 3.2, 3.4, 2.5]],
    alfa: 0.05,
    x0: null,
  },
];
