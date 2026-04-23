// Shared procedural heightmap + scatter sampler for the outside-start
// chunk. Everything here is reproducible from a string seed so the
// terrain, road, water, foliage and mountains all agree on the shape
// of the world.

const hashSeed = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

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
  roadHalfWidth: number;
  // Mountain ring — inner radius where mountains start rising,
  // outer radius where they cap off. Game-play collider sits at
  // inner.
  mountainInnerFactor: number;
  mountainPeakHeight: number;
  snowLineY: number;
}

export const DEFAULT_CHUNK: OutsideChunkParams = {
  seed: "outside-polygon-001",
  width: 112,
  depth: 196,
  waterLevel: 0,
  roadHalfWidth: 4.5,
  // Player's own game-logic wall is roughly 34 units from center on x
  // and 79.5 on z. Ramp the mountain silhouette up right at that wall
  // so the player sees towering peaks pressing in whenever they bump
  // against the invisible boundary.
  // Canyon wall ramps up starting at 45% of half-width (≈x=25) so the
  // cliffs are already imposing by the time the player hits the
  // game-logic boundary at x=34. Peaks tower to ~60 units and the
  // top third of every wall is snow-capped.
  mountainInnerFactor: 0.45,
  mountainPeakHeight: 60,
  snowLineY: 5,
};

export interface ScatterSample {
  x: number;
  z: number;
  y: number;
  slope: number;
  rand: number;
  angle: number;
  scale: number;
}

export const createOutsideChunkSampler = (params: OutsideChunkParams) => {
  const seedHash = hashSeed(params.seed);
  const n1 = makeNoise(seedHash);
  const n2 = makeNoise(seedHash ^ 0x9e3779b9);
  const n3 = makeNoise(seedHash ^ 0x7f4a7c15);
  const nMountain = makeNoise(seedHash ^ 0xdeadbeef);
  const halfW = params.width * 0.5;
  const halfD = params.depth * 0.5;

  // Road follows a gentle seed-driven sine wave so it isn't a straight
  // line down the middle; returned value is the world x-offset of the
  // road centerline at a given z.
  const roadCenterX = (z: number): number => {
    const a = n1(z * 0.012, 3.7) * 5.5;
    const b = n2(z * 0.03, 11.3) * 2.5;
    return a + b;
  };

  // Distance (world units) from a point to the road centerline
  const distToRoad = (x: number, z: number): number =>
    Math.abs(x - roadCenterX(z));

  // Height at world (x, z). Output roughly [-0.6, mountainPeak].
  const heightAt = (x: number, z: number): number => {
    const nx = x * 0.03;
    const nz = z * 0.03;
    let h = 0.45;
    h += n1(nx, nz) * 0.55;
    h += n2(nx * 2.3 + 10, nz * 2.3 + 10) * 0.22;
    h += n3(nx * 6.1 + 50, nz * 6.1 + 50) * 0.1;

    // Carved winding river
    const ridge = 1 - Math.abs(n2(nx * 1.1, nz * 0.9 + 1.7));
    const riverMask = Math.pow(Math.max(0, ridge - 0.72), 2) * 6;
    h -= riverMask * 0.85;

    // Lake basin in lower-left
    const lakeCenter = { x: -20, z: 40 };
    const dLx = x - lakeCenter.x;
    const dLz = z - lakeCenter.z;
    const lakeDist = Math.hypot(dLx / 9, dLz / 8);
    const lake = Math.max(0, 1 - lakeDist) * (0.9 + 0.2 * n3(x * 0.2, z * 0.2));
    h -= Math.pow(lake, 1.3) * 1.2;

    // Secondary pond
    const pondC = { x: 22, z: -20 };
    const pDist = Math.hypot((x - pondC.x) / 6.5, (z - pondC.z) / 5.5);
    const pond = Math.max(0, 1 - pDist);
    h -= Math.pow(pond, 1.4) * 0.9;

    // Canyon walls rise only on the X sides (east + west). The north
    // and south ends stay open so the player can traverse the chunk
    // without getting crushed into a peak at the boundary. The walls
    // are shaped with multi-octave ridged noise so they read as real
    // jagged cliffs instead of a smooth bowl.
    const ex = Math.abs(x) / halfW;
    if (ex > params.mountainInnerFactor) {
      const t = (ex - params.mountainInnerFactor) /
        (1 - params.mountainInnerFactor);

      // Along-canyon undulation: tall peaks vs. lower saddles
      const along =
        0.55 +
        0.28 * nMountain(z * 0.05, 0) +
        0.17 * nMountain(z * 0.12 + 7, 1.3);
      // Ridged noise adds sharp ridge-and-valley carving into each cliff
      const ridge1 = 1 - Math.abs(nMountain(z * 0.07, ex * 2.2));
      const ridge2 = 1 - Math.abs(nMountain(z * 0.2 + 5, ex * 4.4));
      const ridged = ridge1 * 0.7 + ridge2 * 0.3;

      // Very steep ramp near the boundary so the cliff walls come up
      // fast and feel vertical rather than a gentle slope.
      const ramp = Math.pow(t, 0.38);
      const peakShape = along * (0.6 + 0.4 * ridged);
      h += ramp * peakShape * params.mountainPeakHeight;

      // Boulders and outcrops poking out of the cliff face
      const boulder = Math.max(
        0,
        nMountain(z * 0.45, ex * 10) - 0.25
      );
      h += ramp * boulder * params.mountainPeakHeight * 0.4;

      // Occasional saddle gaps so the ridge has passes
      const gap = Math.max(0, 0.55 - Math.abs(nMountain(z * 0.03, 3.7))) * 0.9;
      h -= ramp * gap * params.mountainPeakHeight * 0.3;
    }

    // Distant N/S rise — gentler bluffs at the north and south ends so
    // the chunk still feels enclosed but stays walkable.
    const ez = Math.abs(z) / halfD;
    if (ez > 0.82) {
      const tz = (ez - 0.82) / 0.18;
      const bluffNoise = 0.6 + 0.4 * nMountain(x * 0.06 + 19, z * 0.02);
      h += Math.pow(tz, 1.3) * bluffNoise * params.mountainPeakHeight * 0.35;
    }

    // Flatten road corridor so the winding path stays walkable
    const dRoad = distToRoad(x, z);
    const roadFalloff = Math.max(0, 1 - dRoad / (params.roadHalfWidth + 1.8));
    const flattened = 0.22 + n3(x * 0.5, z * 0.35) * 0.03;
    h = h * (1 - roadFalloff * 0.9) + flattened * roadFalloff * 0.9;

    if (h < -0.6) h = -0.6;
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

  // Scatter up to `target` instances of something, rejecting samples
  // that fail the predicate. Returns grounded positions with their
  // local height, slope, and seeded random attributes.
  interface ScatterOpts {
    target: number;
    seedOffset: number;
    innerBounds?: number; // shrink area by this much from walls
    margin?: number; // min distance from road
    predicate?: (s: ScatterSample) => boolean;
    attempts?: number;
  }

  const scatter = (opts: ScatterOpts): ScatterSample[] => {
    const rng = createRng(seedHash + opts.seedOffset);
    const innerB = opts.innerBounds ?? 2;
    const minFromRoad = opts.margin ?? 2;
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
      const sample: ScatterSample = {
        x,
        z,
        y,
        slope,
        rand: rng(),
        angle: rng() * Math.PI * 2,
        scale: 0.8 + rng() * 0.4,
      };
      if (opts.predicate && !opts.predicate(sample)) continue;
      out.push(sample);
    }
    return out;
  };

  // Mountain-ring sample points for building the mountain ring mesh
  // or collider. Given N angular slices around the chunk boundary,
  // return a point on the peak ridge for each.
  const mountainRing = (slices: number): ScatterSample[] => {
    const rng = createRng(seedHash + 987);
    const out: ScatterSample[] = [];
    for (let i = 0; i < slices; i++) {
      const angle = (i / slices) * Math.PI * 2;
      // Place along rectangular perimeter at the mountain inner factor
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const f = params.mountainInnerFactor + 0.12;
      // Find point where rectangle-aligned ray hits the inner ring
      const tx = f / Math.max(Math.abs(cosA) / halfW, Math.abs(sinA) / halfD);
      const x = cosA * tx;
      const z = sinA * tx;
      const y = heightAt(x, z);
      out.push({
        x,
        z,
        y,
        slope: slopeAt(x, z),
        rand: rng(),
        angle,
        scale: 0.85 + rng() * 0.3,
      });
    }
    return out;
  };

  return {
    heightAt,
    isUnderwater,
    slopeAt,
    roadCenterX,
    distToRoad,
    scatter,
    mountainRing,
    params,
  };
};

export type OutsideChunkSampler = ReturnType<typeof createOutsideChunkSampler>;
