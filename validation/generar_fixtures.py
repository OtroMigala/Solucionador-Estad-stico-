"""
Valores de referencia para las pruebas (solo en desarrollo; no se despliega).

Regresión: statsmodels (OLS) y scipy (distribución F) sobre los datos de
validation/ejemplos_regresion.json.

Probabilidad: cada punto del taller y cada ejemplo de clase se resuelve de
forma independiente al programa, con fracciones exactas y, cuando se puede,
enumerando todos los resultados posibles.

    python validation/generar_fixtures.py
"""

from __future__ import annotations

import itertools
import json
import math
from collections import Counter
from fractions import Fraction as Fr
from pathlib import Path

import numpy as np
import statsmodels.api as sm
from scipy import stats

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / "fixtures"


# ───────────────────────────── regresión ─────────────────────────────

def regresion() -> dict:
    ejemplos = json.loads((AQUI / "ejemplos_regresion.json").read_text(encoding="utf-8"))
    salida = {}
    for e in ejemplos:
        y = np.array(e["y"], dtype=float)
        X = np.column_stack([np.array(c, dtype=float) for c in e["x"]])
        Xc = sm.add_constant(X, has_constant="add")
        m = sm.OLS(y, Xc).fit()
        n, k = X.shape
        inv = np.linalg.inv(Xc.T @ Xc)
        d = {
            "n": n,
            "k": k,
            "beta": m.params.tolist(),
            "SCR": float(m.ess),
            "SCE": float(m.ssr),
            "SCT": float(m.centered_tss),
            "glR": int(m.df_model),
            "glE": int(m.df_resid),
            "CMR": float(m.mse_model),
            "CME": float(m.mse_resid),
            "F": float(m.fvalue),
            "R2": float(m.rsquared),
            "Fcritico": float(stats.f.ppf(1 - e["alfa"], k, n - k - 1)),
            "cii": np.diag(inv).tolist(),
            "varianzas": (m.bse**2).tolist(),
        }
        if e["x0"]:
            d["prediccion"] = float(m.predict(np.array([[1.0, *e["x0"]]]))[0])
        if k == 1:
            x = X[:, 0]
            d["cov"] = float(np.cov(x, y, ddof=0)[0, 1])
            d["r"] = float(stats.pearsonr(x, y)[0])
        salida[e["id"]] = d
    return salida


# ───────────────────────────── probabilidad ─────────────────────────────

C = math.comb
P = math.perm
fact = math.factorial


def letras(palabra: str) -> int:
    r = fact(len(palabra))
    for v in Counter(palabra).values():
        r //= fact(v)
    return r


def prob(evento, espacio, peso=None) -> Fr:
    """Probabilidad de un evento sobre un espacio finito (pesos iguales si no se dan)."""
    espacio = list(espacio)
    if peso is None:
        return Fr(sum(1 for w in espacio if evento(w)), len(espacio))
    total = sum(peso(w) for w in espacio)
    return Fr(sum(peso(w) for w in espacio if evento(w)), total)


def secuencias(objetos: list[str], patrones: list[str]) -> Fr:
    """Enumera todas las extracciones ordenadas sin reposición de objetos etiquetados."""
    largo = len(patrones[0])
    total = favorables = 0
    for orden in itertools.permutations(range(len(objetos)), largo):
        total += 1
        tipo = "".join(objetos[i] for i in orden)
        favorables += tipo in patrones
    return Fr(favorables, total)


def dos_eventos(pa: Fr, pb: Fr, inter: Fr) -> list[Fr | None]:
    return [inter, pa + pb - inter, inter / pa if pa else None, inter / pb if pb else None]


def probabilidad() -> dict:
    dado = range(1, 7)
    dos_dados = list(itertools.product(dado, dado))
    moneda_dado = list(itertools.product("CS", dado))
    domino = [(a, b) for a in range(7) for b in range(a, 7)]

    r: dict[str, list] = {}
    # Conteo (puntos 1–15)
    r["t1a"] = [5 + 3 + 6 + 4]
    r["t1b"] = [5 * 3 * 6 * 4]
    r["t2"] = [4 * 5 * 2]
    r["t3a"] = [12]
    r["t3b"] = [sum(1 for h in range(12) for m in range(12) if h != m)]
    r["t4a"] = [26**2 * 10**2]
    r["t4b"] = [5 * 26 * 10**2]
    r["t5a"] = [sum(1 for _ in itertools.permutations(range(4)))]
    r["t5b"] = [fact(4) // 4]
    familia = "NNNnn"  # N = niño, n = niña (personas distintas)
    filas = list(itertools.permutations(range(5)))
    r["t6a"] = [len(filas)]
    r["t6b"] = [sum(1 for f in filas if "".join(familia[i] for i in f) in ("NNNnn", "nnNNN"))]
    r["t6c"] = [sum(1 for f in filas if "".join(familia[i] for i in f) == "NnNnN")]
    r["t7a"] = [letras("ESTADISTICA")]
    r["t7b"] = [letras("MATEMATICA")]
    r["t8"] = [len(set(itertools.permutations("RRRRAA")))]
    r["t9"] = [fact(7)]
    r["t10a"] = [8**3]
    r["t10b"] = [P(8, 3)]
    r["t11"] = [C(12, 4)]
    r["t12a"] = [C(10, 8)]
    r["t12b"] = [sum(1 for s in itertools.combinations(range(10), 8) if {0, 1, 2} <= set(s))]
    r["t13a"] = [C(10, 4)]
    r["t13b"] = [C(6, 2) * C(4, 2)]
    r["t13c"] = [P(10, 4)]
    r["t14a"] = [C(14, 2)]
    medias = "A" * 7 + "R" * 7
    r["t14b"] = [sum(1 for i, j in itertools.combinations(range(14), 2) if medias[i] == medias[j])]
    r["t15"] = [C(12, 5) * 5]

    # Probabilidad (puntos 16–36)
    r["t16"] = dos_eventos(Fr(30, 80), Fr(20, 80), Fr(10, 80))
    r["t17"] = [
        prob(lambda w: w[0] == "C" and w[1] % 2 == 0, moneda_dado),
        prob(lambda w: w[1] < 3, moneda_dado),
        prob(lambda w: w[0] == "S" and w[1] % 2 == 0, moneda_dado),
    ]
    r["t18a"] = [prob(lambda d: d % 2 == 0, dado)]
    r["t18b"] = [prob(lambda w: "S" in w, itertools.product("CS", repeat=3))]
    r["t18c"] = [prob(lambda b: b == "B", "BBBB" + "RRR" + "AAAAA")]
    r["t19"] = [prob(lambda par: 0 in par, itertools.combinations(range(5), 2))]
    r["t20"] = [Fr(10 // 2, 30)]
    personas = [(p, s) for p in range(6) for s in "HM"]
    pares = list(itertools.combinations(personas, 2))
    r["t21a"] = [prob(lambda q: q[0][0] == q[1][0], pares)]
    r["t21b"] = [prob(lambda q: q[0][1] != q[1][1], pares)]
    r["t22a"] = [prob(lambda d: d % 2 == 1, dado)]
    r["t22b"] = [prob(lambda w: "C" in w, itertools.product("CS", repeat=4))]
    r["t22c"] = [prob(lambda w: w == (4, 4), dos_dados)]
    r["t22d"] = [prob(lambda w: (w[0] == 6) != (w[1] == 6), dos_dados)]
    r["t23"] = [prob(lambda q: q[0][0] != q[1][0], itertools.combinations(["T1", "T2", "T3", "U1", "U2", "U3"], 2))]
    r["t24"] = [prob(lambda q: q[0][0] == q[1][0], itertools.combinations(["B1", "B2", "A1", "A2", "R1", "R2"], 2))]
    r["t25"] = [secuencias(list("DDDD" + "NNNNNNNN"), ["NNN"])]
    A = lambda w: 2 in w
    B = lambda w: sum(w) == 8
    C6 = lambda w: sum(w) == 6
    pA, pC = prob(A, dos_dados), prob(C6, dos_dados)
    pAC = prob(lambda w: A(w) and C6(w), dos_dados)
    r["t26"] = [pA, prob(B, dos_dados), pC, pA + pC - pAC, pAC / pC]
    r["t27"] = [Fr(C(12, 3), C(16, 3))]
    r["t28"] = [Fr(C(13, 5), C(52, 5))]
    r["t29"] = [secuencias(list("RRRRRRR" + "BBB"), ["RRB"])]
    r["t30a"] = [secuencias(list("HHHH" + "MMM"), ["HMHMHMH"])]
    r["t30b"] = [secuencias(list("HHH" + "MMM"), ["HMHMHM", "MHMHMH"])]
    r["t31"] = [Fr(305, 410), Fr(210, 290), Fr(305, 385)]
    r["t32"] = [Fr(15, 45), Fr(20, 45), Fr(45, 45)]
    proporcional = lambda d: d
    r["t33"] = [prob(lambda d: d == 6, dado, proporcional), prob(lambda d: d % 2 == 1, dado, proporcional)]
    mayor9 = lambda f: sum(f) > 9
    mult4 = lambda f: sum(f) > 0 and sum(f) % 4 == 0
    p9, p4 = prob(mayor9, domino), prob(mult4, domino)
    p94 = prob(lambda f: mayor9(f) and mult4(f), domino)
    r["t34"] = [p9, p4, p9 + p4 - p94, p94 / p4]
    ramas = [(Fr(20, 100), Fr(75, 100)), (Fr(20, 100), Fr(50, 100)), (Fr(60, 100), Fr(20, 100))]
    total = sum(a * b for a, b in ramas)
    r["t35"] = [total, ramas[0][0] * ramas[0][1] / total]
    ramas = [(Fr(1, 10), Fr(97, 100)), (Fr(9, 10), Fr(2, 100))]
    total = sum(a * b for a, b in ramas)
    r["t36"] = [total, ramas[1][0] * ramas[1][1] / total]

    # Ejemplos de las diapositivas
    r["c-moneda"] = [prob(lambda w: "C" in w, itertools.product("CS", repeat=2))]
    pares_doble = lambda d: 2 if d % 2 == 0 else 1
    pE = prob(lambda d: d < 4, dado, pares_doble)
    pPar = prob(lambda d: d % 2 == 0, dado, pares_doble)
    p3 = prob(lambda d: d % 3 == 0, dado, pares_doble)
    pPar3 = prob(lambda d: d % 6 == 0, dado, pares_doble)
    r["c-dado-cargado"] = [pE, pPar, p3, pPar + p3 - pPar3, pPar3 / p3]
    pesos = dict(zip(range(3, 9), [Fr(12, 100), Fr(19, 100), Fr(28, 100), Fr(24, 100), Fr(10, 100), Fr(7, 100)]))
    r["c-mecanico"] = [1 - pesos[3] - pesos[4]]
    r["c-carlos"] = dos_eventos(Fr(8, 10), Fr(6, 10), Fr(5, 10))
    p7 = prob(lambda w: sum(w) == 7, dos_dados)
    p11 = prob(lambda w: sum(w) == 11, dos_dados)
    r["c-dados-7-11"] = dos_eventos(p7, p11, prob(lambda w: sum(w) in (7,) and sum(w) in (11,), dos_dados))
    r["c-vuelo"] = dos_eventos(Fr(83, 100), Fr(82, 100), Fr(78, 100))
    r["c-empleo"] = [Fr(460, 600), Fr(460, 500)]
    r["c-fusibles"] = [secuencias(list("D" * 5 + "B" * 15), ["DD"])]
    r["c-bolsas"] = [Fr(3, 7) * Fr(6, 9) + Fr(4, 7) * Fr(5, 9)]
    ramas = [(Fr(30, 100), Fr(2, 100)), (Fr(45, 100), Fr(3, 100)), (Fr(25, 100), Fr(2, 100))]
    total = sum(a * b for a, b in ramas)
    r["c-maquinas"] = [total, ramas[2][0] * ramas[2][1] / total]

    def texto(v):
        if v is None:
            return "indef"
        v = Fr(v)
        return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"

    return {k: [texto(v) for v in vs] for k, vs in r.items()}


def main() -> None:
    SALIDA.mkdir(exist_ok=True)
    reg = regresion()
    (SALIDA / "regresion.json").write_text(json.dumps(reg, indent=1) + "\n", encoding="utf-8")
    pro = probabilidad()
    (SALIDA / "probabilidad.json").write_text(json.dumps(pro, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"regresion.json: {len(reg)} ejemplos; probabilidad.json: {len(pro)} ejemplos")


if __name__ == "__main__":
    main()
