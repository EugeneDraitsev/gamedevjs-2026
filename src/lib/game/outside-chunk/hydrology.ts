// Stage 2 — hydrology (explicit rivers for the flat playable zone)
//
// Now that the playable zone is near-flat, flow-accumulation no
// longer produces interesting rivers on its own (no gradients). We
// instead carve a few hand-picked river polylines directly through
// the zone — seeded but deterministic — so water always shows up as
// a gameplay obstacle rather than as ocean pools at the mountain foot.

import { cellToWorld } from "./heightmap";
import { makeNoise2D } from "./rng";
import type { ChunkSize, PolyPath } from "./types";

export interface HydrologyParams {
  size: ChunkSize;
  height: Float32Array; // mutated (carved)
  playable: Uint8Array; // only carve inside
  seedHash: number;
  waterLevel: number;
  riverHalfWidth: number; // world units
  riverDepth: number; // how deep to carve below waterLevel
}

export interface HydrologyResult {
  flow: Float32Array;
  water: Uint8Array; // 1=flooded (below waterLevel), 2=river-carved
  rivers: PolyPath[];
}

const pointOnRiver = (
  t: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  meanderNoise: (x: number, y: number) => number,
  meanderAmp: number
): [number, number] => {
  // Linear interpolation between endpoints with a perpendicular
  // meander driven by noise along the parametric axis.
  const x = startX + (endX - startX) * t;
  const z = startZ + (endZ - startZ) * t;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  const wave =
    meanderNoise(t * 3, 1.7) * 0.7 + meanderNoise(t * 7, 5.1) * 0.3;
  return [x + nx * wave * meanderAmp, z + nz * wave * meanderAmp];
};

export const buildHydrology = (p: HydrologyParams): HydrologyResult => {
  const { size, height, playable } = p;
  const stride = size.cols + 1;
  const total = (size.cols + 1) * (size.rows + 1);
  const water = new Uint8Array(total);
  const flow = new Float32Array(total);

  const meanderNoise = makeNoise2D(p.seedHash ^ 0x1eadbeef);
  const halfW = size.width * 0.5;
  const halfD = size.depth * 0.5;

  // Pick two rivers: one runs N→S on the east side, another W→E on the
  // south side. Endpoints are chosen well inside the playable zone so
  // rivers always cross the arena rather than hugging the mountain edge.
  const rivers: { a: [number, number]; b: [number, number]; meanderAmp: number }[] = [
    {
      a: [halfW * 0.45, -halfD * 0.6],
      b: [halfW * 0.25, halfD * 0.65],
      meanderAmp: 6,
    },
    {
      a: [-halfW * 0.55, halfD * 0.2],
      b: [halfW * 0.1, halfD * 0.55],
      meanderAmp: 5,
    },
  ];

  const riverPaths: PolyPath[] = [];
  const samplesPerRiver = 56;

  for (const spec of rivers) {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= samplesPerRiver; i++) {
      const t = i / samplesPerRiver;
      pts.push(
        pointOnRiver(t, spec.a[0], spec.a[1], spec.b[0], spec.b[1], meanderNoise, spec.meanderAmp)
      );
    }
    riverPaths.push({ points: pts, widthHalf: p.riverHalfWidth });
  }

  // Carve each river: dip terrain below waterLevel within riverHalfWidth.
  const carveRadius = p.riverHalfWidth + 0.5;
  const carve = (wx: number, wz: number) => {
    const colCenter = ((wx + halfW) / size.width) * size.cols;
    const rowCenter = ((wz + halfD) / size.depth) * size.rows;
    const r = Math.ceil((carveRadius / size.width) * size.cols) + 1;
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const col = Math.round(colCenter + dc);
        const row = Math.round(rowCenter + dr);
        if (col < 0 || col > size.cols || row < 0 || row > size.rows) continue;
        const idx = row * stride + col;
        if (!playable[idx]) continue; // never carve into mountain
        const { x, z } = cellToWorld(size, col, row);
        const d = Math.hypot(x - wx, z - wz);
        if (d > carveRadius) continue;
        const t = 1 - d / carveRadius;
        const depth = Math.pow(t, 1.3) * p.riverDepth;
        const target = p.waterLevel - depth * 0.45; // river bed sits below waterLevel
        if (height[idx] > target) height[idx] = target;
      }
    }
  };

  for (const river of riverPaths) {
    // Walk finely between sampled points so the carving is seamless.
    for (let i = 0; i < river.points.length - 1; i++) {
      const [ax, az] = river.points[i];
      const [bx, bz] = river.points[i + 1];
      const steps = 8;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        carve(x, z);
      }
    }
  }

  // Tag flooded cells
  for (let i = 0; i < total; i++) {
    if (height[i] < p.waterLevel) water[i] = 1;
  }

  return { flow, water, rivers: riverPaths };
};
