# Validación

Scripts de Python (solo para desarrollo, no se despliegan) que calculan cada
caso de prueba con scipy y statsmodels y guardan entradas y resultados
esperados en `fixtures/*.json`. Las pruebas de Vitest (`tests/`) exigen que el
núcleo reproduzca esos valores con error menor a 1e-6 (RNF-02).

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
