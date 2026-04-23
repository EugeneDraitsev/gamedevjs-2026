// Shared procedural heightmap for the outside-start chunk.
// Both the terrain geometry and the water/scatter placement sample
// this so they stay consistent: water sits in real low points, grass
// and rocks settle on moderate slopes, trees cluster where it's flat
// and dry. The whole chunk is reproducible from a string seed.

const hashSeed = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Fast value-noise that lets us cache a couple of gradient tables per seed.
const makeNoise = (seed: number) => {
  const gx = new Float32Array(256);
  const gy = new Float32Array(256);
  let s = seed || 1;
  const rand = () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = 0; i < 256; i++) {
    const a = rand() * Math.PI * 2;
    gx[i] = Math.cos(a);
    gy[i] = Math.sin(a);
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

  // 2D gradient (Perlin-style) noise in [-1, 1]
  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[xi + perm[yi]];
    const ab = perm[xi + perm[yi + 1]];
    const ba = perm[xi + 1 + perm[yi]];
    const bb = perm[xi + 1 + perm[yi + 1]];

    const d = (ix: number, fx: number, fy: number) =>
      gx[ix] * fx + gy[ix] * fy;

    const n00 = d(aa, xf, yf);
    const n10 = d(ba, xf - 1, yf);
    const n01 = d(ab, xf, yf - 1);
    const n11 = d(bb, xf - 1, yf - 1);

    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  };
};

export interface OutsideChunkParams {
  seed: string;
  width: number;
  depth: number;
  // y level where the water sits (terrain below this is flooded)
  waterLevel: number;
  // safe corridor along x=0 where the main path runs: terrain is flattened
  roadHalfWidth: number;
}

export const DEFAULT_CHUNK: OutsideChunkParams = {
  seed: "outside-polygon-001",
  width: 112,
  depth: 196,
  waterLevel: 0,
  roadHalfWidth: 4,
};

export const createOutsideChunkSampler = (params: OutsideChunkParams) => {
  const seedHash = hashSeed(params.seed);
  const n1 = makeNoise(seedHash);
  const n2 = makeNoise(seedHash ^ 0x9e3779b9);
  const n3 = makeNoise(seedHash ^ 0x7f4a7c15);

  const halfW = params.width * 0.5;
  const halfD = params.depth * 0.5;

  // Height at world (x, z). Output range roughly [-0.5, 1.6].
  // Keeps the same global shape as codex's flat chunk but adds
  // seed-driven swells, a carved river and a shallow lake so water
  // actually sits in real depressions.
  const heightAt = (x: number, z: number): number => {
    const nx = x * 0.03;
    const nz = z * 0.03;
    // Start above the water line so most of the chunk is dry land,
    // and only the explicitly carved basins dip below zero.
    let h = 0.45;
    // broad undulation
    h += n1(nx, nz) * 0.55;
    // medium detail
    h += n2(nx * 2.3 + 10, nz * 2.3 + 10) * 0.22;
    // fine bumps
    h += n3(nx * 6.1 + 50, nz * 6.1 + 50) * 0.1;

    // Carved winding river basin (ridged noise)
    const ridge = 1 - Math.abs(n2(nx * 1.1, nz * 0.9 + 1.7));
    const riverMask = Math.pow(Math.max(0, ridge - 0.72), 2) * 6;
    h -= riverMask * 0.85;

    // Shallow lake basin in the lower-left quadrant
    const lakeCenter = { x: -20, z: 40 };
    const dLx = x - lakeCenter.x;
    const dLz = z - lakeCenter.z;
    const lakeDist = Math.hypot(dLx / 9, dLz / 8);
    const lake = Math.max(0, 1 - lakeDist) * (0.9 + 0.2 * n3(x * 0.2, z * 0.2));
    h -= Math.pow(lake, 1.3) * 1.2;

    // Small secondary pond mid-right
    const pondC = { x: 22, z: -20 };
    const pDist = Math.hypot((x - pondC.x) / 6.5, (z - pondC.z) / 5.5);
    const pond = Math.max(0, 1 - pDist);
    h -= Math.pow(pond, 1.4) * 0.9;

    // Edge rim rise (chunk feels enclosed but not canyon-high —
    // codex already has a canyon-cliff prop layer around the border)
    const ex = Math.abs(x) / halfW;
    const ez = Math.abs(z) / halfD;
    const edge = Math.max(ex, ez);
    const rim = Math.max(0, edge - 0.72);
    h += Math.pow(rim, 1.6) * 2.4;

    // Flatten the central corridor so the main path stays walkable
    const roadFalloff = Math.max(
      0,
      1 - Math.abs(x) / (params.roadHalfWidth + 1.5)
    );
    const flattened = 0.22 + n3(x * 0.5, z * 0.35) * 0.03;
    h = h * (1 - roadFalloff * 0.9) + flattened * roadFalloff * 0.9;

    // Clamp so nothing tunnels absurdly deep
    if (h < -0.55) h = -0.55;
    return h;
  };

  const isUnderwater = (x: number, z: number): boolean =>
    heightAt(x, z) < params.waterLevel;

  // Slope in world units per unit — cheap central difference
  const slopeAt = (x: number, z: number): number => {
    const eps = 0.6;
    const dx = (heightAt(x + eps, z) - heightAt(x - eps, z)) / (2 * eps);
    const dz = (heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
    return Math.hypot(dx, dz);
  };

  return { heightAt, isUnderwater, slopeAt, params };
};

export type OutsideChunkSampler = ReturnType<typeof createOutsideChunkSampler>;
