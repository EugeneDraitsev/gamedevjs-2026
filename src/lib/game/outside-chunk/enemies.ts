// Stage 7 — enemy placement
//
// Two pools:
//   • Guards: a cluster around every POI (a ring of N enemies).
//   • Wanderers: ambient scatter across grassland / forest away from
//     the spawn point.

import { createRng } from "./rng";
import {
  biomeIndex,
  type ChunkFeature,
  type ChunkSize,
  type EnemySpawn,
} from "./types";

export interface EnemyParams {
  size: ChunkSize;
  seedHash: number;
  pois: ChunkFeature[];
  height: Float32Array;
  biome: Uint8Array;
  water: Uint8Array;
  playable: Uint8Array;
  sampleHeight: (x: number, z: number) => number;
  spawn: [number, number, number];
  guardsPerCamp: number;
  guardsPerShrine: number;
  guardsPerLandmark: number;
  wandererCount: number;
  minWandererDistFromSpawn: number;
}

export const buildEnemySpawns = (p: EnemyParams): EnemySpawn[] => {
  const { size, pois, biome, water, playable, spawn, sampleHeight } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const out: EnemySpawn[] = [];
  const rng = createRng(p.seedHash ^ 0xee0f0f0e);

  const cellAt = (x: number, z: number) => {
    const col = Math.max(
      0,
      Math.min(cols - 1, Math.round(((x + size.width * 0.5) / size.width) * size.cols))
    );
    const row = Math.max(
      0,
      Math.min(rows - 1, Math.round(((z + size.depth * 0.5) / size.depth) * size.rows))
    );
    return { col, row, idx: row * cols + col };
  };

  // 1) Guard rings around POIs
  for (const poi of pois) {
    const guardsForKind =
      poi.kind === "camp"
        ? p.guardsPerCamp
        : poi.kind === "shrine"
          ? p.guardsPerShrine
          : p.guardsPerLandmark;
    const ringR = 3.6 + rng() * 1.2;
    for (let i = 0; i < guardsForKind; i++) {
      const angle = (i / guardsForKind) * Math.PI * 2 + rng() * 0.3;
      const r = ringR * (0.85 + rng() * 0.4);
      const x = poi.x + Math.cos(angle) * r;
      const z = poi.z + Math.sin(angle) * r;
      const { idx } = cellAt(x, z);
      if (!playable[idx]) continue;
      if (water[idx]) continue;
      if (biome[idx] === biomeIndex("cliff") || biome[idx] === biomeIndex("snow")) continue;
      out.push({
        id: `enemy-guard-${poi.id}-${i}`,
        x,
        y: sampleHeight(x, z),
        z,
        role: "guard",
        poiId: poi.id,
        patrolRadius: 2.4 + rng() * 1.2,
      });
    }
  }

  // 2) Wanderers — uniform sampling inside playable zone
  const minDistSq = p.minWandererDistFromSpawn ** 2;
  let placed = 0;
  let attempts = 0;
  const maxAttempts = p.wandererCount * 30;
  while (placed < p.wandererCount && attempts < maxAttempts) {
    attempts++;
    const x = -size.width * 0.5 + rng() * size.width;
    const z = -size.depth * 0.5 + rng() * size.depth;
    if ((x - spawn[0]) ** 2 + (z - spawn[2]) ** 2 < minDistSq) continue;
    const { idx } = cellAt(x, z);
    if (!playable[idx]) continue;
    if (water[idx]) continue;
    const b = biome[idx];
    if (
      b === biomeIndex("cliff") ||
      b === biomeIndex("snow") ||
      b === biomeIndex("scree")
    )
      continue;
    out.push({
      id: `enemy-wander-${placed}`,
      x,
      y: sampleHeight(x, z),
      z,
      role: "wanderer",
      patrolRadius: 3.2 + rng() * 1.5,
    });
    placed++;
  }

  return out;
};
