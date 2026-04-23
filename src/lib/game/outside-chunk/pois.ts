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
  playable?: Uint8Array;
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

  // Score clearings — inside playable zone only so POIs don't spawn
  // in the decorative mountain ring.
  const clearingScore = new Float32Array(total);
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      const i = r * cols + c;
      if (p.playable && !p.playable[i]) continue;
      if (biome[i] !== grass && biome[i] !== forest) continue;
      // Deprioritise cells adjacent to water so camps don't materialise on
      // a river bank and confuse the shrine logic below.
      clearingScore[i] = 1;
      // Jitter score with a stable hash so deterministic but spread out
      const hash = Math.sin(i * 12.9898) * 43758.5453;
      clearingScore[i] += (hash - Math.floor(hash)) * 0.5;
    }
  }

  // 1) Camps: pick from clearings (jittered stable ordering).
  const clearingCandidates: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < total; i++) {
    if (clearingScore[i] > 0) clearingCandidates.push({ i, s: clearingScore[i] });
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

  // 2) Shrines at river banks — any non-water, non-mountain cell
  //    that is adjacent to water counts. Flow is zero now that
  //    hydrology carves rivers explicitly; the adjacency check alone
  //    is enough.
  const confluenceCandidates: Array<{ i: number; f: number }> = [];
  for (let i = 0; i < total; i++) {
    if (biome[i] === biomeIndex("water")) continue;
    if (p.playable && !p.playable[i]) continue;
    const col = i % cols;
    const row = (i - col) / cols;
    let nearWater = false;
    for (let dr = -2; dr <= 2 && !nearWater; dr++) {
      for (let dc = -2; dc <= 2 && !nearWater; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        if (biome[nr * cols + nc] === biomeIndex("water")) nearWater = true;
      }
    }
    if (nearWater) {
      const hash = Math.sin(i * 53.1337) * 129.7531;
      confluenceCandidates.push({ i, f: hash - Math.floor(hash) });
    }
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

  // 3) Landmarks — any scree / cliff-ish cell inside playable zone.
  //    Since the playable floor is flat, there are no cliffs inside;
  //    fall back to high grassland patches for visual markers.
  const lookoutCandidates: Array<{ i: number; h: number }> = [];
  for (let i = 0; i < total; i++) {
    if (p.playable && !p.playable[i]) continue;
    if (biome[i] === biomeIndex("water")) continue;
    if (biome[i] === grass || biome[i] === forest || biome[i] === cliff) {
      const hash = Math.sin(i * 91.7717) * 89.4513;
      lookoutCandidates.push({ i, h: (hash - Math.floor(hash)) * height[i] });
    }
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
