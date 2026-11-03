# Solucionador Estadístico

Aplicación web que resuelve **paso a paso**, con los métodos y la notación de
las diapositivas del curso, los problemas del taller del tercer corte de
Estadística (Universidad del Cauca): regresión lineal simple y múltiple, y
probabilidad y técnicas de conteo.

La propuesta completa está en [`docs/propuesta.md`](docs/propuesta.md)
(original en `.docx` en la misma carpeta).

## Estructura

```
├── docs/                 # Propuesta del proyecto
├── src/
│   ├── core/             # Matemática pura, sin React
│   │   ├── steps.ts      # Tipos Paso y Solucion; registro de métodos
│   │   ├── latex.ts      # Constructores de fórmulas (frac, sum, num)
│   │   ├── linalg/       # Transpuesta, producto, inversa por Gauss-Jordan
│   │   ├── regresion/    # Ajuste, ANOVA, prueba F, R², predicción
│   │   ├── combinatoria/ # Multiplicación, nPr, circulares, repetición, nCr
│   │   ├── probabilidad/ # Aditiva, complemento, condicional, total, Bayes
│   │   └── distribuciones/ # Distribución F
│   ├── modules/          # Una sección de la interfaz por tema
│   ├── components/       # StepView, Formula, DataGrid, gráficas
│   └── App.tsx
├── tests/                # Comparan core/ contra los fixtures
└── validation/           # Scripts de Python y fixtures JSON
```

## Uso

```bash
npm install
npm run dev     # servidor de desarrollo
npm test        # pruebas (Vitest)
npm run build   # compilación para Vercel / GitHub Pages
```

## Plan de trabajo

1. **Núcleo y regresión** — motor de pasos, LaTeX, álgebra matricial, regresión simple y múltiple.
2. **Probabilidad y conteo** — módulo completo, validado con los 36 puntos del taller.
3. **Interfaz y despliegue** — ejemplos precargados, gráficas y publicación en Vercel.
