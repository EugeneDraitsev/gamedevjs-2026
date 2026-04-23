// Stage 1 — heightmap
//
// The world uses three functional tiers inside a **rectangular
// playable zone** and a decorative mountain ring around it:
//
//   Tier 0 (water):     y < waterLevel   — sparse river channels
//   Tier 1 (ground):    y ≈ 0.28         — flat walkable plane
//   Tier 2 (platform):  y ≈ 0.9–1.4      — scattered raised stones
//   Mountains:          y ≫ waterLevel   — outside the playable zone,
//                                          unreachable, purely visual
//
// This keeps gameplay on a near-flat surface (bumpy terrain was
// breaking the roll-ball character), while water and platform stones
// give verticality and natural obstacles.

import { fbm2, makeNoise2D, ridged2 } from "./rng";
import type { ChunkSize } from "./types";

export interface HeightmapParams {
  seedHash: number;
  size: ChunkSize;
  playableHalfWidth: number; // world units — flat zone half-extent X
  playableHalfDepth: number; // world units — flat zone half-extent Z
  groundY: number; // flat walkable height
  mountainPeakHeight: number; // canyon rim amplitude
  transitionBand: number; // distance over which flat → mountain ramp
  platformDensity: number; // 0..1 probability-like knob
  platformPeakHeight: number; // max local rise for a platform
}

export interface HeightmapResult {
  height: Float32Array;
  slope: Float32Array;
  // Mask: 1 inside playable zone, 0 outside. Roads / scatter / POIs
  // consult this so they stay on flat ground.
  playable: Uint8Array;
}

const cellToWorld = (size: ChunkSize, col: number, row: number) => {
  const x = -size.width * 0.5 + (col / size.cols) * size.width;
  const z = -size.depth * 0.5 + (row / size.rows) * size.depth;
  return { x, z };
};

export const buildHeightmap = (p: HeightmapParams): HeightmapResult => {
  const { size, mountainPeakHeight, transitionBand } = p;
  const nBase = makeNoise2D(p.seedHash);
  const nWarp = makeNoise2D(p.seedHash ^ 0x1a2b3c4d);
  const nRidge = makeNoise2D(p.seedHash ^ 0xdeadbeef);
  const nAxis = makeNoise2D(p.seedHash ^ 0xcafebabe);
  const nPlatform = makeNoise2D(p.seedHash ^ 0x9c1fca2e);

  const stride = size.cols + 1;
  const totalVerts = (size.cols + 1) * (size.rows + 1);
  const height = new Float32Array(totalVerts);
  const playable = new Uint8Array(totalVerts);

  // How far "inside" the playable zone we are. 1 at very edge, 0 well
  // inside, negative outside (used to compute the mountain ramp).
  const insideT = (x: number, z: number): number => {
    const tx = Math.abs(x) / p.playableHalfWidth;
    const tz = Math.abs(z) / p.playableHalfDepth;
    return Math.max(tx, tz);
  };

  for (let row = 0; row <= size.rows; row++) {
    const z = -size.depth * 0.5 + (row / size.rows) * size.depth;
    for (let col = 0; col <= size.cols; col++) {
      const x = -size.width * 0.5 + (col / size.cols) * size.width;
      const idx = row * stride + col;

      const t = insideT(x, z); // <1 inside, >1 outside
      const inside = t < 1;
      if (inside) playable[idx] = 1;

      // --- Platform stones — Poisson-like via noise peaks ---
      // Only raise the ground where nPlatform peaks above a threshold.
      // Gives discrete stone-shaped plateaus scattered through the
      // flat zone so the arena isn't a featureless pancake.
      const pNoise =
        nPlatform(x * 0.12, z * 0.12) * 0.55 +
        nPlatform(x * 0.35 + 3.1, z * 0.35 + 7.2) * 0.45;
      const platformMask = Math.max(0, pNoise - (1 - p.platformDensity));
      const platformShape =
        platformMask > 0
          ? Math.pow(platformMask / Math.max(0.0001, p.platformDensity), 1.5)
          : 0;
      const platformH = platformShape * p.platformPeakHeight;

      let groundH: number;
      if (inside) {
        // Flat ground with subtle micro-texture so shadows catch.
        const micro = nBase(x * 0.4, z * 0.4) * 0.03;
        groundH = p.groundY + micro + platformH;
      } else {
        // Outside the playable zone — ramp up to mountain silhouette.
        const tBand = Math.min(1, (t - 1) / transitionBand);
        // Steep-ish ramp so walls read as cliffs, softened by an
        // along-perimeter undulation so it's not a clean box.
        const ramp = Math.pow(tBand, 0.45);

        // Domain-warped ridged noise for actual rocky silhouette
        const wx = x + nWarp(x * 0.03, z * 0.03) * 4;
        const wz = z + nWarp(x * 0.03 + 17, z * 0.03 + 9) * 4;
        const r = ridged2(nRidge, wx * 0.045, wz * 0.045, 5);
        const broad =
          0.55 +
          0.25 * nBase(z * 0.04, x * 0.04) +
          0.2 * nAxis(x * 0.06, z * 0.02);
        const peakShape = broad * (0.45 + 0.55 * r);
        const mountainH = 4 + ramp * peakShape * mountainPeakHeight;

        // Blend between flat edge and mountain to avoid a visible
        // step right at the zone boundary.
        const flatEdge = p.groundY + platformH;
        const mixT = Math.pow(Math.min(1, (t - 1) / 0.18), 1.2);
        groundH = flatEdge * (1 - mixT) + mountainH * mixT;
      }

      height[idx] = groundH;
    }
  }

  // Slope via central differences (cheap, good enough for cost grid)
  const slope = new Float32Array(totalVerts);
  const cellDx = size.width / size.cols;
  const cellDz = size.depth / size.rows;
  for (let row = 0; row <= size.rows; row++) {
    for (let col = 0; col <= size.cols; col++) {
      const i = row * stride + col;
      const hC = height[i];
      const hL = col > 0 ? height[i - 1] : hC;
      const hR = col < size.cols ? height[i + 1] : hC;
      const hU = row > 0 ? height[i - stride] : hC;
      const hD = row < size.rows ? height[i + stride] : hC;
      const dx = (hR - hL) / (2 * cellDx);
      const dz = (hD - hU) / (2 * cellDz);
      slope[i] = Math.hypot(dx, dz);
    }
  }

  return { height, slope, playable };
};

export const heightSampler = (size: ChunkSize, height: Float32Array) => {
  const halfW = size.width * 0.5;
  const halfD = size.depth * 0.5;
  const stride = size.cols + 1;
  return (x: number, z: number): number => {
    const fx = ((x + halfW) / size.width) * size.cols;
    const fz = ((z + halfD) / size.depth) * size.rows;
    const x0 = Math.max(0, Math.min(size.cols - 1, Math.floor(fx)));
    const z0 = Math.max(0, Math.min(size.rows - 1, Math.floor(fz)));
    const tx = fx - x0;
    const tz = fz - z0;
    const h00 = height[z0 * stride + x0];
    const h10 = height[z0 * stride + (x0 + 1)];
    const h01 = height[(z0 + 1) * stride + x0];
    const h11 = height[(z0 + 1) * stride + (x0 + 1)];
    const a = h00 * (1 - tx) + h10 * tx;
    const b = h01 * (1 - tx) + h11 * tx;
    return a * (1 - tz) + b * tz;
  };
};

export { cellToWorld };
