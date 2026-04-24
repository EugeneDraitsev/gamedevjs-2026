// Deterministic helpers used by every stage of the chunk pipeline.

export const hashSeed = (seed: string): number => {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: FNV-style hashing requires xor mixing.
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: coerce hash to an unsigned 32-bit seed.
  return h >>> 0;
};

export type Rng = () => number;
export const createRng = (seed: number): Rng => {
  let s = seed || 1;
  return () => {
    // biome-ignore lint/suspicious/noBitwiseOperators: coerce LCG state to an unsigned 32-bit seed.
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 0x1_00_00_00_00;
  };
};

// Gradient Perlin-style 2D noise in [-1, 1].
export const makeNoise2D = (seed: number) => {
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  const rng = createRng(seed);
  for (let i = 0; i < 256; i++) {
    const a = rng() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) {
    perm[i + 256] = perm[i];
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number) => {
    // biome-ignore lint/suspicious/noBitwiseOperators: Perlin lattice lookup wraps to the 256-entry permutation table.
    const xi = Math.floor(x) & 255;
    // biome-ignore lint/suspicious/noBitwiseOperators: Perlin lattice lookup wraps to the 256-entry permutation table.
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[xi + perm[yi]];
    const ab = perm[xi + perm[yi + 1]];
    const ba = perm[xi + 1 + perm[yi]];
    const bb = perm[xi + 1 + perm[yi + 1]];
    const d = (ix: number, fx: number, fy: number) => gx[ix] * fx + gy[ix] * fy;
    const n00 = d(aa, xf, yf);
    const n10 = d(ba, xf - 1, yf);
    const n01 = d(ab, xf, yf - 1);
    const n11 = d(bb, xf - 1, yf - 1);
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  };
};

export type Noise2D = ReturnType<typeof makeNoise2D>;

export const fbm2 = (
  noise: Noise2D,
  x: number,
  y: number,
  octaves = 4
): number => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp;
    freq *= 2.01;
    amp *= 0.5;
  }
  return sum;
};

export const ridged2 = (
  noise: Noise2D,
  x: number,
  y: number,
  octaves = 4
): number => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let weight = 1;
  for (let o = 0; o < octaves; o++) {
    let s = 1 - Math.abs(noise(x * freq, y * freq));
    // biome-ignore lint/suspicious/noMisrefactoredShorthandAssign: squaring the signal and applying weight is the intended ridged fbm shape.
    s *= s * weight;
    weight = Math.max(0, Math.min(1, s * 2));
    sum += s * amp;
    freq *= 2.03;
    amp *= 0.55;
  }
  return sum;
};
