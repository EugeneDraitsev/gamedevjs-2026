// Stage 3 — biome classification
//
// Each grid cell gets a biome label based on height, slope and
// distance to water. Later stages (decorations, minimap) read this.

import { type BiomeId, biomeIndex, type ChunkSize } from "./types";

export interface BiomeParams {
  cliffSlope: number;
  height: Float32Array;
  riverbankRadius: number; // world units; cells within this distance of water tagged riverbank
  screeSlope: number;
  size: ChunkSize;
  slope: Float32Array;
  snowLine: number;
  water: Uint8Array;
  waterLevel: number;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: biome classification is a compact grid pass with directional distance sweeps.
export const buildBiome = (p: BiomeParams): Uint8Array => {
  const { size, height, slope, water } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const total = cols * rows;

  // Compute water-distance via a simple two-pass approximation
  // (Manhattan chamfer, good enough for riverbank tagging).
  const MAX_DIST = 9999;
  const dist = new Float32Array(total);
  dist.fill(MAX_DIST);
  for (let i = 0; i < total; i++) {
    if (water[i]) {
      dist[i] = 0;
    }
  }
  const cellD = Math.min(size.width / size.cols, size.depth / size.rows);
  const d1 = cellD;
  const d2 = cellD * Math.SQRT2;
  // forward pass
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      let best = dist[i];
      if (c > 0) {
        best = Math.min(best, dist[i - 1] + d1);
      }
      if (r > 0) {
        best = Math.min(best, dist[i - cols] + d1);
        if (c > 0) {
          best = Math.min(best, dist[i - cols - 1] + d2);
        }
        if (c < cols - 1) {
          best = Math.min(best, dist[i - cols + 1] + d2);
        }
      }
      dist[i] = best;
    }
  }
  // backward pass
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      let best = dist[i];
      if (c < cols - 1) {
        best = Math.min(best, dist[i + 1] + d1);
      }
      if (r < rows - 1) {
        best = Math.min(best, dist[i + cols] + d1);
        if (c > 0) {
          best = Math.min(best, dist[i + cols - 1] + d2);
        }
        if (c < cols - 1) {
          best = Math.min(best, dist[i + cols + 1] + d2);
        }
      }
      dist[i] = best;
    }
  }

  const biome = new Uint8Array(total);
  const waterIdx = biomeIndex("water");
  const bankIdx = biomeIndex("riverbank");
  const grassIdx = biomeIndex("grassland");
  const forestIdx = biomeIndex("forest");
  const screeIdx = biomeIndex("scree");
  const cliffIdx = biomeIndex("cliff");
  const snowIdx = biomeIndex("snow");

  for (let i = 0; i < total; i++) {
    if (water[i]) {
      biome[i] = waterIdx;
      continue;
    }
    const h = height[i];
    const s = slope[i];
    if (h >= p.snowLine) {
      biome[i] = snowIdx;
    } else if (s >= p.cliffSlope) {
      biome[i] = cliffIdx;
    } else if (s >= p.screeSlope) {
      biome[i] = screeIdx;
    } else if (dist[i] <= p.riverbankRadius) {
      biome[i] = bankIdx;
    } else if (h < p.snowLine * 0.4 && s < p.screeSlope * 0.7) {
      // Lush lowland with gentle slope → forest probability zones
      biome[i] = forestIdx;
    } else {
      biome[i] = grassIdx;
    }
  }
  return biome;
};

export const biomeAtCell = (
  size: ChunkSize,
  biome: Uint8Array,
  col: number,
  row: number
): BiomeId => {
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const c = Math.max(0, Math.min(cols - 1, col));
  const r = Math.max(0, Math.min(rows - 1, row));
  return (
    [
      "water",
      "riverbank",
      "grassland",
      "forest",
      "scree",
      "cliff",
      "snow",
      "road",
    ] as BiomeId[]
  )[biome[r * cols + c]];
};
