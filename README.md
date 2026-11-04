# Solucionador Estadístico

Aplicación web que resuelve **paso a paso**, con los métodos y la notación de
las diapositivas del curso, los problemas del taller del tercer corte de
Estadística (Universidad del Cauca): regresión lineal simple y múltiple, y
probabilidad y técnicas de conteo.

Cada paso muestra la fórmula, la sustitución de valores, el resultado, una
explicación de **por qué** se hace y la diapositiva de donde sale el método.
La propuesta completa está en [`docs/propuesta.md`](docs/propuesta.md).

## Cómo se usa (regresión)

1. **Datos.** Arrastra el Excel (.xlsx) o un CSV con la tabla del ejercicio, pega
   las celdas copiadas, escríbelas a mano o abre uno de los puntos del taller.
   El programa busca la tabla dentro de la hoja aunque tenga títulos o una fila
   de totales, ignora la hoja de resumen que genera la herramienta de regresión
   de Excel y sugiere, por los encabezados (y, x1, x₂, «Días (x2)»…), qué columna
   es y y cuáles son las x. Se confirma o corrige antes de seguir.
2. **Ejercicio.** Se marcan los literales que pide el enunciado, en su orden
   (parámetros, tabla ANOVA, prueba de hipótesis con su α, R², predicción con
   los valores de las x…).
3. **Solución.** Un planteamiento (modelo y tabla de sumas) y luego un literal
   por pregunta: a), b), c)…, cada uno con sus pasos y un recuadro con la
   respuesta. Al final, el resumen de respuestas. Se puede imprimir o guardar
   en PDF.

## Qué resuelve

**Regresión lineal** (puntos 1–4 del taller, y los ejemplos de clase de los
camiones diésel, la supervivencia de espermatozoides, sólidos/DQO y Saber Pro):

| Simple (k = 1) | Múltiple (k ≥ 2) |
|---|---|
| Tabla de productos y sumas | Tabla de productos y sumas |
| Medias, covarianza, desviaciones | Ecuaciones normales (k + 1 ecuaciones) |
| Correlación de Pearson e interpretación | Forma matricial X′X y X′y |
| Ecuaciones normales y estimadores β̂₀, β̂₁ | Inversa de X′X por Gauss-Jordan, con cada operación de fila |
| Valores ajustados y residuos | β̂ = (X′X)⁻¹X′y |
| Tabla ANOVA y prueba F | Tabla ANOVA y prueba F |
| R² (y comprobación R² = r²) | R² |
| Predicción | Varianza de los estimadores cᵢᵢS² y predicción |

Incluye diagrama de dispersión con la recta ajustada y los residuos (o
observados contra ajustados en regresión múltiple). Los datos se pueden
escribir, editar o pegar directamente desde Excel (coma o punto decimal).

**Probabilidad y conteo** (los 36 puntos del taller y los ejemplos de clase),
con fracciones exactas:

| Herramienta | Puntos del taller |
|---|---|
| Técnicas de conteo: multiplicación, n!, nPr, circulares, con repetición (incluso desde una palabra), nCr, sumas de casos | 1–15 |
| Probabilidad clásica n(A)/n(S) | 18c, 19, 20, 21, 23, 24, 27, 28 |
| Espacio muestral y eventos (monedas, dados, dominó, urnas, listas; pesos iguales o no) | 17, 18, 22, 26, 33, 34 |
| Reglas de dos eventos (aditiva, complemento, condicional, producto, independencia) y unión de tres | 16 |
| Extracciones sucesivas con o sin reposición | 25, 29, 30 |
| Tabla de contingencia | 31, 32 |
| Probabilidad total y teorema de Bayes | 35, 36 |

## Estructura

```
├── docs/                    # Propuesta del proyecto
├── src/
│   ├── core/                # Matemática pura, sin React
│   │   ├── steps.ts         # Tipos Paso y Solucion; registro de métodos
│   │   ├── formato.ts       # Formato de números (texto y LaTeX)
│   │   ├── racional.ts      # Fracciones exactas (BigInt)
│   │   ├── entrada.ts       # Lectura de números, fracciones y tablas pegadas
│   │   ├── importar/        # Lectura de .xlsx y .csv y detección de la tabla de datos
│   │   ├── latex.ts         # Constructores de fórmulas
│   │   ├── linalg/          # Transpuesta, producto, inversa por Gauss-Jordan
│   │   ├── regresion/       # Regresión simple y múltiple, organización por literales y ejemplos
│   │   ├── combinatoria/    # Técnicas de conteo
│   │   ├── probabilidad/    # Herramientas de probabilidad + 36 puntos del taller
│   │   └── distribuciones/  # Valor crítico de la distribución F
│   ├── components/          # Fórmulas, pasos, controles, gráfica
│   ├── modules/             # Interfaz de regresión y de probabilidad
│   └── App.tsx
├── tests/                   # Pruebas (Vitest)
├── validation/              # Valores de referencia (Python) y fixtures JSON
└── scripts/                 # Utilidades de compilación
```

## Uso

```bash
npm install
npm run dev              # servidor de desarrollo
npm test                 # pruebas
npm run build            # compilación para Vercel / GitHub Pages (carpeta dist/)
npm run build:artifact   # página en un solo archivo HTML (dist-artifact/)
npm run fixtures         # regenera los valores de referencia (requiere Python con scipy y statsmodels)
```

## Validación

- **Regresión:** los 8 ejemplos coinciden con statsmodels y scipy con error
  relativo menor a 10⁻⁶ (coeficientes, SCR, SCE, SCT, F, F crítico, R², diagonal
  de (X′X)⁻¹, varianzas y predicción). El ejemplo de los camiones diésel
  reproduce los valores del Excel del profesor y el punto 1 reproduce las sumas
  de la hoja de cálculo del taller.
- **Probabilidad:** cada uno de los 65 ejercicios (taller y clase) se resuelve
  en Python de forma independiente, enumerando los resultados cuando es
  posible, y la respuesta exacta debe coincidir.
- **Fórmulas:** todas las fórmulas que generan los ejemplos se renderizan con
  KaTeX en modo estricto; si una fallara en la página, se muestra su versión en
  texto plano.

## Pendientes para confirmar con el docente

- Los rangos de interpretación de r (diap. 12–13) no se pudieron leer de la
  presentación; se usan débil (< 0,5), moderada (0,5–0,8) y fuerte (≥ 0,8). Se
  cambian en `RANGOS_PEARSON` (`src/core/regresion/index.ts`).
- Punto 2: los seis primeros valores de x₃ no se pudieron extraer del PDF y se
  tomaron del conjunto de datos original del libro; verificar con el taller.
- Si se espera la prueba t de cada coeficiente (aparece en el Excel de clase).
- Distribuciones discretas y normal (segunda versión).
