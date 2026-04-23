// Stage 1 — heightmap
//
// Build a canyon-biome heightmap on a regular grid. The canyon has:
//   • A meandering central axis (low-freq noise)
//   • Flat floor along the axis
//   • Transition slopes
//   • Steep ridged-multifractal walls
//   • Snow-capped peaks above altitude
//
// Output: height[row * cols + col] in world-up units.

import { fbm2, makeNoise2D, ridged2 } from "./rng";
import type { ChunkSize } from "./types";

export interface HeightmapParams {
  seedHash: number;
  size: ChunkSize;
  mountainPeakHeight: number;
  floorHalfWidth: number;
  axisMeander: number;
}

export interface HeightmapResult {
  height: Float32Array;
  slope: Float32Array;
  axisX: Float32Array; // axisX[row] — canyon axis X for each row
}

const cellToWorld = (size: ChunkSize, col: number, row: number) => {
  const x = -size.width * 0.5 + (col / size.cols) * size.width;
  const z = -size.depth * 0.5 + (row / size.rows) * size.depth;
  return { x, z };
};

export const buildHeightmap = (p: HeightmapParams): HeightmapResult => {
  const { size, mountainPeakHeight } = p;
  const nBase = makeNoise2D(p.seedHash);
  const nWarp = makeNoise2D(p.seedHash ^ 0x1a2b3c4d);
  const nRidge = makeNoise2D(p.seedHash ^ 0xdeadbeef);
  const nAxis = makeNoise2D(p.seedHash ^ 0xcafebabe);
  const nDetail = makeNoise2D(p.seedHash ^ 0x1e1e1e1e);

  const halfW = size.width * 0.5;
  const halfD = size.depth * 0.5;

  // 1) Compute canyon axis X(row) — smooth meander along Z
  const axisX = new Float32Array(size.rows + 1);
  for (let row = 0; row <= size.rows; row++) {
    const z = -halfD + (row / size.rows) * size.depth;
    const m1 = nAxis(z * 0.008, 11.7) * p.axisMeander;
    const m2 = nAxis(z * 0.021, 33.1) * p.axisMeander * 0.4;
    axisX[row] = m1 + m2;
  }

  const height = new Float32Array((size.cols + 1) * (size.rows + 1));
  // 2) Height function evaluated per vertex
  for (let row = 0; row <= size.rows; row++) {
    const z = -halfD + (row / size.rows) * size.depth;
    const cAxis = axisX[row];
    for (let col = 0; col <= size.cols; col++) {
      const x = -halfW + (col / size.cols) * size.width;

      const d = Math.abs(x - cAxis);
      const dNorm = d / halfW;

      // Domain-warped coords for organic carving
      const wx = x + nWarp(x * 0.04, z * 0.04) * 3.2;
      const wz = z + nWarp(x * 0.04 + 19, z * 0.04 + 7) * 3.2;
      const floorNoise = fbm2(nBase, wx * 0.04, wz * 0.04, 4) * 0.6;

      let h: number;
      if (dNorm < 0.18) {
        // Flat canyon floor
        h = 0.2 + floorNoise * 0.3;
      } else if (dNorm < 0.45) {
        // Transition — gentle slope
        const t = (dNorm - 0.18) / 0.27;
        const shape = Math.pow(t, 0.85);
        const cliffDetail = ridged2(nRidge, x * 0.05, z * 0.05, 3) * 0.6;
        h = 0.25 + floorNoise * 0.25 + shape * (3.5 + cliffDetail * 2.5);
      } else {
        // Canyon wall — steep with ridged multifractal
        const t = (dNorm - 0.45) / 0.55;
        const ramp = Math.pow(t, 0.5);
        const r = ridged2(nRidge, x * 0.045, z * 0.045, 5);
        const broad =
          0.5 +
          0.3 * nBase(z * 0.04, x * 0.04) +
          0.2 * nBase(z * 0.1, 7.3);
        const peakShape = broad * (0.45 + 0.55 * r);
        h = 4.2 + ramp * peakShape * mountainPeakHeight;
        const boulder = Math.max(0, nDetail(z * 0.35, x * 0.32) - 0.2);
        h += ramp * boulder * mountainPeakHeight * 0.3;
        const saddle = Math.max(0, 0.5 - Math.abs(nAxis(z * 0.025, 3.1)));
        h -= ramp * saddle * mountainPeakHeight * 0.22;
      }

      // Softer bluffs at N/S chunk ends
      const ez = Math.abs(z) / halfD;
      if (ez > 0.85) {
        const tz = (ez - 0.85) / 0.15;
        const bluff = 0.6 + 0.4 * nAxis(x * 0.05 + 19, z * 0.02);
        h += Math.pow(tz, 1.3) * bluff * mountainPeakHeight * 0.28;
      }

      if (h < -0.8) h = -0.8;
      height[row * (size.cols + 1) + col] = h;
    }
  }

  // 3) Slope magnitude via central differences
  const slope = new Float32Array((size.cols + 1) * (size.rows + 1));
  const cellDx = size.width / size.cols;
  const cellDz = size.depth / size.rows;
  for (let row = 0; row <= size.rows; row++) {
    for (let col = 0; col <= size.cols; col++) {
      const i = row * (size.cols + 1) + col;
      const hCenter = height[i];
      const hL = col > 0 ? height[i - 1] : hCenter;
      const hR = col < size.cols ? height[i + 1] : hCenter;
      const hU = row > 0 ? height[i - (size.cols + 1)] : hCenter;
      const hD = row < size.rows ? height[i + (size.cols + 1)] : hCenter;
      const dx = (hR - hL) / (2 * cellDx);
      const dz = (hD - hU) / (2 * cellDz);
      slope[i] = Math.hypot(dx, dz);
    }
  }

  return { height, slope, axisX };
};

// Bilinear height sampler at any world-space (x, z)
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
