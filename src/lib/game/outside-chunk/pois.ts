// Stage 6 — points of interest
//
// Scan the biome grid for interesting landmarks:
//   • Clearings: larger patches of flat grassland far from water and
//     road  → camp / lookout
//   • Saddle passes: cliff cells flanked by lower terrain on both N/S
//     sides → shrine / landmark
//   • River confluences: cells where flow accumulation jumps sharply
//     → shrine
//
// Each pick has to pass a min-distance check so POIs don't clump.

import { cellToWorld } from "./heightmap";
import { biomeIndex, type ChunkFeature, type ChunkSize } from "./types";
import { createRng } from "./rng";

export interface PoiParams {
  size: ChunkSize;
  biome: Uint8Array;
  height: Float32Array;
  flow: Float32Array;
  seedHash: number;
  maxCamps: number;
  maxShrines: number;
  maxLandmarks: number;
  minPoiSpacing: number;
}

export const buildPois = (p: PoiParams): ChunkFeature[] => {
  const { size, biome, height, flow, seedHash } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const total = cols * rows;
  const grass = biomeIndex("grassland");
  const forest = biomeIndex("forest");
  const cliff = biomeIndex("cliff");
  const rng = createRng(seedHash ^ 0x74737474);

  const placed: ChunkFeature[] = [];
  const accept = (x: number, z: number) => {
    for (const f of placed) {
      if ((f.x - x) ** 2 + (f.z - z) ** 2 < p.minPoiSpacing ** 2) return false;
    }
    return true;
  };

  // Score clearings: grass/forest with low neighbourhood variance
  const clearingScore = new Float32Array(total);
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      const i = r * cols + c;
      if (biome[i] !== grass && biome[i] !== forest) continue;
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const h = height[(r + dr) * cols + (c + dc)];
          sum += h;
          sumSq += h * h;
          count++;
        }
      }
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      clearingScore[i] = 1 / (1 + variance * 8);
    }
  }

  // 1) Camps: best N clearings
  const clearingCandidates: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < total; i++) {
    if (clearingScore[i] > 0.6) clearingCandidates.push({ i, s: clearingScore[i] });
  }
  clearingCandidates.sort((a, b) => b.s - a.s);
  let camps = 0;
  for (const cand of clearingCandidates) {
    if (camps >= p.maxCamps) break;
    const col = cand.i % cols;
    const row = (cand.i - col) / cols;
    const { x, z } = cellToWorld(size, col, row);
    if (!accept(x, z)) continue;
    placed.push({
      id: `camp-${placed.length}`,
      kind: "camp",
      x,
      z,
      y: height[cand.i],
      rotationY: rng() * Math.PI * 2,
      reason: `clearing-score=${cand.s.toFixed(2)}`,
    });
    camps++;
  }

  // 2) Shrines at river confluences (high flow, non-water cell adjacent to water)
  const confluenceCandidates: Array<{ i: number; f: number }> = [];
  for (let i = 0; i < total; i++) {
    if (biome[i] === biomeIndex("water")) continue;
    if (flow[i] < 60) continue;
    // adjacent to water?
    const col = i % cols;
    const row = (i - col) / cols;
    let nearWater = false;
    for (let dr = -1; dr <= 1 && !nearWater; dr++) {
      for (let dc = -1; dc <= 1 && !nearWater; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        if (biome[nr * cols + nc] === biomeIndex("water")) nearWater = true;
      }
    }
    if (nearWater) confluenceCandidates.push({ i, f: flow[i] });
  }
  confluenceCandidates.sort((a, b) => b.f - a.f);
  let shrines = 0;
  for (const cand of confluenceCandidates) {
    if (shrines >= p.maxShrines) break;
    const col = cand.i % cols;
    const row = (cand.i - col) / cols;
    const { x, z } = cellToWorld(size, col, row);
    if (!accept(x, z)) continue;
    placed.push({
      id: `shrine-${placed.length}`,
      kind: "shrine",
      x,
      z,
      y: height[cand.i],
      rotationY: rng() * Math.PI * 2,
      reason: `confluence-flow=${cand.f.toFixed(0)}`,
    });
    shrines++;
  }

  // 3) Landmarks at high lookouts — a cliff cell with good sight lines
  const lookoutCandidates: Array<{ i: number; h: number }> = [];
  for (let i = 0; i < total; i++) {
    if (biome[i] !== cliff) continue;
    lookoutCandidates.push({ i, h: height[i] });
  }
  lookoutCandidates.sort((a, b) => b.h - a.h);
  let landmarks = 0;
  for (const cand of lookoutCandidates) {
    if (landmarks >= p.maxLandmarks) break;
    const col = cand.i % cols;
    const row = (cand.i - col) / cols;
    const { x, z } = cellToWorld(size, col, row);
    if (!accept(x, z)) continue;
    placed.push({
      id: `landmark-${placed.length}`,
      kind: "landmark",
      x,
      z,
      y: height[cand.i],
      rotationY: rng() * Math.PI * 2,
      reason: `cliff-height=${cand.h.toFixed(1)}`,
    });
    landmarks++;
  }

  return placed;
};
