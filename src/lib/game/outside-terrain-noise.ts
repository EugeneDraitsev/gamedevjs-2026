// Canyon chunk generator for the outside-start room.
//
// Approach: instead of sampling a plain heightmap, we model a *canyon
// axis* — a meandering spline running along Z — and derive everything
// else from distance to that axis. The canyon floor hugs the axis,
// the walls ramp up with ridged multifractal for realistic jagged
// rock, and a river is carved in the lowest seam of the floor. Roads
// and points-of-interest are then placed deterministically on the
// natural shelves that fall out of the heightmap, so everything is
// seed-driven and reproducible.

const hashSeed = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Classic Perlin-style gradient noise, 2D, output in [-1, 1].
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

const createRng = (seed: number) => {
  let s = seed || 1;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) >>> 0;
    return s / 0x100000000;
  };
};

export interface OutsideChunkParams {
  seed: string;
  width: number;
  depth: number;
  waterLevel: number;
  // How wide the flat canyon floor is (in world units)
  floorHalfWidth: number;
  // Max amplitude the canyon axis meanders by
  axisMeander: number;
  // How tall the canyon walls can get
  mountainPeakHeight: number;
  // Y-height where snow appears
  snowLineY: number;
}

export const DEFAULT_CHUNK: OutsideChunkParams = {
  seed: "outside-polygon-001",
  width: 112,
  depth: 196,
  waterLevel: 0,
  floorHalfWidth: 16,
  axisMeander: 7,
  mountainPeakHeight: 55,
  snowLineY: 10,
};

export interface ScatterSample {
  x: number;
  z: number;
  y: number;
  slope: number;
  distToAxis: number;
  rand: number;
  angle: number;
  scale: number;
}

export const createOutsideChunkSampler = (params: OutsideChunkParams) => {
  const seedHash = hashSeed(params.seed);
  // Layered noise functions for different purposes
  const nBase = makeNoise(seedHash); // primary ground undulation
  const nWarpX = makeNoise(seedHash ^ 0x1a2b3c4d); // domain warp X
  const nWarpZ = makeNoise(seedHash ^ 0x4d3c2b1a); // domain warp Z
  const nRidge = makeNoise(seedHash ^ 0xdeadbeef); // ridged multifractal
  const nAxis = makeNoise(seedHash ^ 0xcafebabe); // canyon axis meander
  const nRiver = makeNoise(seedHash ^ 0x0badf00d); // river width/flow
  const nDetail = makeNoise(seedHash ^ 0x1e1e1e1e); // fine detail

  const halfW = params.width * 0.5;
  const halfD = params.depth * 0.5;

  // --- Canyon axis: a spline running along Z that meanders in X ---
  const canyonAxisX = (z: number): number => {
    // Low-frequency meander so the canyon doesn't thrash
    const m1 = nAxis(z * 0.008, 11.7) * params.axisMeander;
    const m2 = nAxis(z * 0.02, 33.1) * params.axisMeander * 0.35;
    return m1 + m2;
  };

  const distToAxis = (x: number, z: number): number =>
    Math.abs(x - canyonAxisX(z));

  // --- Ridged multifractal: summed octaves of (1 - |noise|)^2 ---
  const ridgedMulti = (x: number, z: number, octaves = 4): number => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let weight = 1;
    for (let o = 0; o < octaves; o++) {
      let signal = 1 - Math.abs(nRidge(x * freq, z * freq));
      signal *= signal;
      signal *= weight;
      weight = Math.max(0, Math.min(1, signal * 2));
      sum += signal * amp;
      freq *= 2.03;
      amp *= 0.55;
    }
    return sum;
  };

  // --- Standard FBM ---
  const fbm = (
    noise: (x: number, z: number) => number,
    x: number,
    z: number,
    octaves = 4
  ): number => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * freq, z * freq) * amp;
      freq *= 2.01;
      amp *= 0.5;
    }
    return sum;
  };

  // Domain-warped coords — shift sample position by a noise vector so
  // the resulting terrain looks less "noise-y" and more organically
  // carved.
  const warp = (x: number, z: number, strength = 4): [number, number] => {
    const wx = nWarpX(x * 0.04, z * 0.04) * strength;
    const wz = nWarpZ(x * 0.04 + 19, z * 0.04 + 7) * strength;
    return [x + wx, z + wz];
  };

  // --- Main height function ---
  const heightAt = (x: number, z: number): number => {
    const d = distToAxis(x, z);
    const dNorm = d / halfW; // 0 at axis, 1 at chunk edge

    // Canyon floor stays flat-ish with gentle domain-warped noise
    const [wx, wz] = warp(x, z, 3.5);
    const floorNoise = fbm(nBase, wx * 0.04, wz * 0.04, 4) * 0.6;

    let h: number;

    if (dNorm < 0.18) {
      // canyon floor — near-flat, slight undulation
      h = 0.2 + floorNoise * 0.35;
    } else if (dNorm < 0.45) {
      // transition slope — gentle rise with some ridging
      const t = (dNorm - 0.18) / 0.27;
      const slopeShape = Math.pow(t, 0.85);
      const cliffDetail = ridgedMulti(x * 0.05, z * 0.05, 3) * 0.5;
      h = 0.2 + floorNoise * 0.3 + slopeShape * (3.5 + cliffDetail * 2.5);
    } else {
      // canyon wall — ridged multifractal + steep ramp
      const t = (dNorm - 0.45) / 0.55;
      const ramp = Math.pow(t, 0.48);
      const ridged = ridgedMulti(x * 0.045, z * 0.045, 5);
      const broadShape =
        0.5 + 0.3 * nBase(z * 0.04, x * 0.04) + 0.2 * nBase(z * 0.1, 7.3);
      const peakShape = broadShape * (0.45 + 0.55 * ridged);
      h = 4.2 + ramp * peakShape * params.mountainPeakHeight;
      // Boulders poking out of cliff face
      const boulder = Math.max(
        0,
        nDetail(z * 0.35, x * 0.32) - 0.2
      );
      h += ramp * boulder * params.mountainPeakHeight * 0.3;
      // Occasional saddle gaps so ridge has natural passes
      const saddle = Math.max(0, 0.5 - Math.abs(nAxis(z * 0.025, 3.1)));
      h -= ramp * saddle * params.mountainPeakHeight * 0.22;
    }

    // --- Carve the river along the axis ---
    // River strength varies along z so the stream widens and narrows
    const riverFlow = 0.55 + 0.45 * nRiver(z * 0.04, 2.1);
    const riverHalfWidth = 3.2 * riverFlow; // world units
    if (d < riverHalfWidth) {
      const dn = d / riverHalfWidth;
      // Deep near axis, shallow at edges. Cubic falloff for soft banks.
      const depth = Math.pow(1 - dn, 1.5) * 1.0;
      h -= depth;
    }

    // --- Far-N/S buffer bluffs so chunk ends don't feel cut off ---
    const ez = Math.abs(z) / halfD;
    if (ez > 0.85) {
      const tz = (ez - 0.85) / 0.15;
      const bluffNoise = 0.6 + 0.4 * nAxis(x * 0.05 + 19, z * 0.02);
      h += Math.pow(tz, 1.3) * bluffNoise * params.mountainPeakHeight * 0.3;
    }

    // Clamp lower bound
    if (h < -0.7) h = -0.7;
    return h;
  };

  const isUnderwater = (x: number, z: number): boolean =>
    heightAt(x, z) < params.waterLevel;

  const slopeAt = (x: number, z: number): number => {
    const eps = 0.6;
    const dx = (heightAt(x + eps, z) - heightAt(x - eps, z)) / (2 * eps);
    const dz = (heightAt(x, z + eps) - heightAt(x, z - eps)) / (2 * eps);
    return Math.hypot(dx, dz);
  };

  // Road runs along the bank of the river (offset from axis) — higher
  // ground but still flat, simulating a natural path walked along
  // the canyon floor.
  const roadCenterX = (z: number): number => {
    const axis = canyonAxisX(z);
    // offset road 4.5 units to one side of the river, side flips with
    // a slow noise so the path occasionally crosses the stream.
    const side = Math.sign(nAxis(z * 0.015 + 7, 3.3)) || 1;
    return axis + side * 4.5;
  };
  const distToRoad = (x: number, z: number): number =>
    Math.abs(x - roadCenterX(z));

  interface ScatterOpts {
    target: number;
    seedOffset: number;
    innerBounds?: number;
    margin?: number;
    predicate?: (s: ScatterSample) => boolean;
    attempts?: number;
  }

  const scatter = (opts: ScatterOpts): ScatterSample[] => {
    const rng = createRng(seedHash + opts.seedOffset);
    const innerB = opts.innerBounds ?? 2;
    const minFromRoad = opts.margin ?? 1.5;
    const maxAttempts = opts.attempts ?? opts.target * 8;
    const out: ScatterSample[] = [];
    let attempts = 0;
    while (out.length < opts.target && attempts < maxAttempts) {
      attempts++;
      const x = -halfW + innerB + rng() * (params.width - innerB * 2);
      const z = -halfD + innerB + rng() * (params.depth - innerB * 2);
      const y = heightAt(x, z);
      const slope = slopeAt(x, z);
      if (distToRoad(x, z) < minFromRoad) continue;
      const s: ScatterSample = {
        x,
        z,
        y,
        slope,
        distToAxis: distToAxis(x, z),
        rand: rng(),
        angle: rng() * Math.PI * 2,
        scale: 0.8 + rng() * 0.4,
      };
      if (opts.predicate && !opts.predicate(s)) continue;
      out.push(s);
    }
    return out;
  };

  return {
    heightAt,
    isUnderwater,
    slopeAt,
    canyonAxisX,
    distToAxis,
    roadCenterX,
    distToRoad,
    scatter,
    params,
  };
};

export type OutsideChunkSampler = ReturnType<typeof createOutsideChunkSampler>;
