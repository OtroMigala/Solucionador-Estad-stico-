/**
 * Números racionales exactos (BigInt). La probabilidad trabaja con fracciones
 * exactas para mostrar resultados como 2/9 en lugar de 0,2222…
 */
import { type Formato, fmtEntero, fmtEnteroTex, fmtTex, fmt } from './formato';

function mcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export class Racional {
  readonly num: bigint;
  readonly den: bigint;

  constructor(num: bigint, den: bigint = 1n) {
    if (den === 0n) throw new Error('División por cero');
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = mcd(num, den);
    this.num = num / g;
    this.den = den / g;
  }

  static entero(n: number | bigint): Racional {
    return new Racional(BigInt(n));
  }

  static de(num: number | bigint, den: number | bigint = 1): Racional {
    return new Racional(BigInt(num), BigInt(den));
  }

  static readonly CERO = new Racional(0n);
  static readonly UNO = new Racional(1n);

  mas(o: Racional): Racional {
    return new Racional(this.num * o.den + o.num * this.den, this.den * o.den);
  }
  menos(o: Racional): Racional {
    return new Racional(this.num * o.den - o.num * this.den, this.den * o.den);
  }
  por(o: Racional): Racional {
    return new Racional(this.num * o.num, this.den * o.den);
  }
  entre(o: Racional): Racional {
    if (o.num === 0n) throw new Error('División por cero');
    return new Racional(this.num * o.den, this.den * o.num);
  }
  complemento(): Racional {
    return Racional.UNO.menos(this);
  }
  cmp(o: Racional): number {
    const d = this.num * o.den - o.num * this.den;
    return d === 0n ? 0 : d > 0n ? 1 : -1;
  }
  igual(o: Racional): boolean {
    return this.cmp(o) === 0;
  }
  esCero(): boolean {
    return this.num === 0n;
  }
  esEntero(): boolean {
    return this.den === 1n;
  }
  enRango01(): boolean {
    return this.num >= 0n && this.num <= this.den;
  }

  aNumero(): number {
    const bits = Math.max(this.num.toString(2).length, this.den.toString(2).length);
    if (bits <= 1000) return Number(this.num) / Number(this.den);
    const s = BigInt(bits - 1000);
    return Number(this.num >> s) / Number(this.den >> s);
  }

  /** ¿Tiene una expansión decimal exacta con a lo sumo `d` cifras? */
  decimalExacto(d: number): boolean {
    let den = this.den;
    let pasos = 0;
    while (den % 2n === 0n) {
      den /= 2n;
      pasos++;
    }
    let pasos5 = 0;
    while (den % 5n === 0n) {
      den /= 5n;
      pasos5++;
    }
    return den === 1n && Math.max(pasos, pasos5) <= d;
  }

  /** Fracción en LaTeX: \frac{3}{8}, -\frac{1}{2}, 5. */
  aLatex(): string {
    if (this.den === 1n) return fmtEnteroTex(this.num);
    const neg = this.num < 0n;
    return `${neg ? '-' : ''}\\frac{${fmtEnteroTex(neg ? -this.num : this.num)}}{${fmtEnteroTex(this.den)}}`;
  }

  /** Fracción en texto: 3/8 */
  aTexto(): string {
    return this.den === 1n ? fmtEntero(this.num) : `${fmtEntero(this.num)}/${fmtEntero(this.den)}`;
  }
}

const DEN_MAX_FRACCION = 10n ** 9n;

/**
 * Probabilidad en LaTeX: fracción y decimal. «\frac{2}{9} \approx 0{,}2222»,
 * «\frac{3}{4} = 0{,}75», «1».
 */
export function probTex(p: Racional, f: Formato): string {
  if (p.den === 1n) return fmtEnteroTex(p.num);
  const dec = fmtTex(p.aNumero(), f);
  if (p.den > DEN_MAX_FRACCION) return `\\approx ${dec}`;
  return `${p.aLatex()} ${p.decimalExacto(f.decimales) ? '=' : '\\approx'} ${dec}`;
}

export function probTexto(p: Racional, f: Formato): string {
  if (p.den === 1n) return fmtEntero(p.num);
  const dec = fmt(p.aNumero(), f);
  if (p.den > DEN_MAX_FRACCION) return `≈ ${dec}`;
  return `${p.aTexto()} ${p.decimalExacto(f.decimales) ? '=' : '≈'} ${dec}`;
}
