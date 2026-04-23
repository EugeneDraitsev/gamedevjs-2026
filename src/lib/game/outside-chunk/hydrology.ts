// Stage 2 — hydrology
//
// Simple flow-accumulation pass. For every grid cell we pick the
// steepest-downhill neighbour; each cell contributes 1 unit of rain
// to its descendants (transitively). High-accumulation cells are
// rivers. We then trace the strongest flows into polylines and
// gently carve the heightmap along them so water actually sits in
// channels.

import { cellToWorld } from "./heightmap";
import type { ChunkSize, PolyPath } from "./types";

export interface HydrologyParams {
  size: ChunkSize;
  height: Float32Array; // mutated (carved)
  riverThreshold: number; // min accumulation to be a river
  maxRivers: number;
  carveDepth: number;
  carveHalfWidth: number; // world units
  waterLevel: number;
}

export interface HydrologyResult {
  flow: Float32Array;
  water: Uint8Array; // 1=flooded (below waterLevel), 2=river-carved
  rivers: PolyPath[];
}

export const buildHydrology = (p: HydrologyParams): HydrologyResult => {
  const { size, height } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const total = cols * rows;

  // 1) Sort cells by height descending (BFS from peaks downhill).
  const indices = new Int32Array(total);
  for (let i = 0; i < total; i++) indices[i] = i;
  indices.sort((a, b) => height[b] - height[a]);

  // 2) For each cell compute steepest-descent neighbour (or -1 if sink).
  const next = new Int32Array(total);
  next.fill(-1);
  const nOffsets = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  for (let i = 0; i < total; i++) {
    const col = i % cols;
    const row = (i - col) / cols;
    let bestDrop = 0;
    let bestIdx = -1;
    const hHere = height[i];
    for (const [dx, dz] of nOffsets) {
      const nc = col + dx;
      const nr = row + dz;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const ni = nr * cols + nc;
      const drop = hHere - height[ni];
      if (drop > bestDrop) {
        bestDrop = drop;
        bestIdx = ni;
      }
    }
    next[i] = bestIdx;
  }

  // 3) Flow accumulation — walk peaks → sinks, each cell passes its
  //    accumulated flow to its descendant.
  const flow = new Float32Array(total);
  flow.fill(1); // uniform rain
  for (let k = 0; k < total; k++) {
    const i = indices[k];
    const n = next[i];
    if (n >= 0) flow[n] += flow[i];
  }

  // 4) River tracing — start at cells that exceed the threshold and
  //    don't have an even-stronger descendant, follow next[] downhill.
  const visited = new Uint8Array(total);
  type TraceHead = { index: number; flow: number };
  const heads: TraceHead[] = [];
  for (let i = 0; i < total; i++) {
    if (flow[i] < p.riverThreshold) continue;
    const n = next[i];
    // Head if no descendant or descendant has MUCH larger flow (tributary root)
    if (n < 0 || flow[n] > flow[i] * 1.4) {
      heads.push({ index: i, flow: flow[i] });
    }
  }
  heads.sort((a, b) => b.flow - a.flow);
  const rivers: PolyPath[] = [];
  for (const head of heads) {
    if (rivers.length >= p.maxRivers) break;
    const points: Array<[number, number]> = [];
    let cur = head.index;
    let steps = 0;
    let maxFlow = 0;
    while (cur >= 0 && steps < total && !visited[cur]) {
      visited[cur] = 1;
      const col = cur % cols;
      const row = (cur - col) / cols;
      const { x, z } = cellToWorld(size, col, row);
      points.push([x, z]);
      if (flow[cur] > maxFlow) maxFlow = flow[cur];
      cur = next[cur];
      steps++;
    }
    if (points.length >= 6) {
      const widthHalf = Math.max(
        1.2,
        Math.min(3.6, 0.08 * Math.sqrt(maxFlow))
      );
      rivers.push({ points, widthHalf });
    }
  }

  // 5) Carve the heightmap gently along rivers.
  const water = new Uint8Array(total);
  for (const river of rivers) {
    for (const [wx, wz] of river.points) {
      const radius = river.widthHalf + 0.4;
      const colC = ((wx + size.width * 0.5) / size.width) * size.cols;
      const rowC = ((wz + size.depth * 0.5) / size.depth) * size.rows;
      const r = Math.ceil((radius / size.width) * size.cols) + 1;
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          const col = Math.round(colC + dc);
          const row = Math.round(rowC + dr);
          if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
          const { x, z } = cellToWorld(size, col, row);
          const distWorld = Math.hypot(x - wx, z - wz);
          if (distWorld > radius) continue;
          const t = 1 - distWorld / radius;
          const depth = Math.pow(t, 1.4) * p.carveDepth;
          const i = row * cols + col;
          height[i] -= depth;
          if (height[i] < p.waterLevel) water[i] = 2;
        }
      }
    }
  }

  // 6) Mark any still-below-waterLevel cell as flooded.
  for (let i = 0; i < total; i++) {
    if (water[i] === 0 && height[i] < p.waterLevel) water[i] = 1;
  }

  return { flow, water, rivers };
};
