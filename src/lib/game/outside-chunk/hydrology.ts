// Stage 2 — hydrology (explicit rivers for the flat playable zone)
//
// Now that the playable zone is near-flat, flow-accumulation no
// longer produces interesting rivers on its own (no gradients). We
// instead carve a few hand-picked river polylines directly through
// the zone — seeded but deterministic — so water always shows up as
// a gameplay obstacle rather than as ocean pools at the mountain foot.

import { cellToWorld } from "./heightmap";
import { createRng, makeNoise2D } from "./rng";
import type { ChunkSize, PolyPath } from "./types";

export interface HydrologyParams {
  size: ChunkSize;
  height: Float32Array; // mutated (carved)
  playable: Uint8Array; // only carve inside
  seedHash: number;
  playableHalfWidth: number;
  playableHalfDepth: number;
  waterLevel: number;
  riverHalfWidth: number; // world units
  riverDepth: number; // how deep to carve below waterLevel
  protectedPoints?: Array<[number, number, number]>; // x, z, clear radius
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
  const rng = createRng(p.seedHash + 0x6a09e667);
  const halfW = size.width * 0.5;
  const halfD = size.depth * 0.5;
  const playW = p.playableHalfWidth;
  const playD = p.playableHalfDepth;

  const pointOnSide = (side: number): [number, number] => {
    const x = (rng() * 2 - 1) * playW * 0.9;
    const z = (rng() * 2 - 1) * playD * 0.9;
    if (side === 0) return [x, -playD * 0.96];
    if (side === 1) return [playW * 0.96, z];
    if (side === 2) return [x, playD * 0.96];
    return [-playW * 0.96, z];
  };
  const distToSegment = (
    px: number,
    pz: number,
    a: [number, number],
    b: [number, number]
  ) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1))
    );
    return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
  };
  const isSafe = (a: [number, number], b: [number, number]) =>
    !(p.protectedPoints ?? []).some(([x, z, r]) => distToSegment(x, z, a, b) < r);

  const rivers: {
    a: [number, number];
    b: [number, number];
    meanderAmp: number;
    noiseOffset: number;
    widthHalf: number;
  }[] = [];
  let mainSide = Math.floor(rng() * 4);
  let mainA = pointOnSide(mainSide);
  let mainB = pointOnSide((mainSide + 2) % 4);
  for (let attempt = 0; attempt < 16 && !isSafe(mainA, mainB); attempt++) {
    mainSide = Math.floor(rng() * 4);
    mainA = pointOnSide(mainSide);
    mainB = pointOnSide((mainSide + 2) % 4);
  }
  const main = {
    a: mainA,
    b: mainB,
    meanderAmp: 8 + rng() * 9,
    noiseOffset: rng() * 100,
    widthHalf: p.riverHalfWidth * (1.05 + rng() * 0.22),
  };
  rivers.push(main);

  for (let i = 0; i < 1 + Math.floor(rng() * 2); i++) {
    let side = (mainSide + 1 + i * 2) % 4;
    let a = pointOnSide(side);
    let b: [number, number] = [0, 0];
    for (let attempt = 0; attempt < 12; attempt++) {
      const joinT = 0.34 + rng() * 0.42;
      b = pointOnRiver(
        joinT,
        main.a[0],
        main.a[1],
        main.b[0],
        main.b[1],
        (x, y) => meanderNoise(x + main.noiseOffset, y),
        main.meanderAmp
      );
      if (isSafe(a, b)) break;
      side = Math.floor(rng() * 4);
      a = pointOnSide(side);
    }
    rivers.push({
      a,
      b,
      meanderAmp: 5 + rng() * 7,
      noiseOffset: rng() * 100,
      widthHalf: p.riverHalfWidth * (0.62 + rng() * 0.22),
    });
  }

  const riverPaths: PolyPath[] = [];
  const samplesPerRiver = 56;

  for (const spec of rivers) {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= samplesPerRiver; i++) {
      const t = i / samplesPerRiver;
      pts.push(
        pointOnRiver(
          t,
          spec.a[0],
          spec.a[1],
          spec.b[0],
          spec.b[1],
          (x, y) => meanderNoise(x + spec.noiseOffset, y),
          spec.meanderAmp
        )
      );
    }
    riverPaths.push({ points: pts, widthHalf: spec.widthHalf });
  }

  // Carve each river: dip terrain below waterLevel within riverHalfWidth.
  const carve = (wx: number, wz: number, widthHalf: number) => {
    if (
      (p.protectedPoints ?? []).some(
        ([x, z, r]) => Math.hypot(x - wx, z - wz) < r
      )
    ) {
      return;
    }
    const carveRadius = widthHalf + 0.8;
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
        const target = p.waterLevel - depth * 0.72; // river bed sits below waterLevel
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
        carve(x, z, river.widthHalf);
      }
    }
  }

  // Tag flooded cells
  for (let i = 0; i < total; i++) {
    if (height[i] < p.waterLevel) water[i] = 1;
  }

  return { flow, water, rivers: riverPaths };
};
