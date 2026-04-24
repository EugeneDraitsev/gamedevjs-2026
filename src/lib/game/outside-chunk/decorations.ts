// Stage 5 — decorations (trees, bushes, rocks)
//
// Probabilistic scatter per biome. We iterate over grid cells in a
// stable seeded order and decide per-cell whether to plant something
// + what. Spacing is enforced with a simple grid-hash so we don't get
// clumps on top of each other.

import { cellToWorld } from "./heightmap";
import { createRng } from "./rng";
import { biomeIndex, type ChunkDecoration, type ChunkSize } from "./types";

export interface DecorationParams {
  biome: Uint8Array;
  height: Float32Array;
  minBushSpacing: number;
  minRockSpacing: number;
  minTreeSpacing: number; // world units
  playable: Uint8Array;
  seedHash: number;
  size: ChunkSize;
}

export interface DecorationResult {
  bushes: ChunkDecoration[];
  rocks: ChunkDecoration[];
  trees: ChunkDecoration[];
}

// Occupancy grid keyed by world position, coarse cells to keep min-distance.
class OccupancyGrid {
  private readonly cells = new Map<string, [number, number][]>();
  private readonly cellSize: number;
  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }
  private key(x: number, z: number) {
    return `${Math.floor(x / this.cellSize)}|${Math.floor(z / this.cellSize)}`;
  }
  accept(x: number, z: number, minDist: number): boolean {
    const r = Math.ceil(minDist / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const list = this.cells.get(`${cx + dx}|${cz + dz}`);
        if (!list) {
          continue;
        }
        for (const [ox, oz] of list) {
          if ((x - ox) ** 2 + (z - oz) ** 2 < minDist * minDist) {
            return false;
          }
        }
      }
    }
    const k = this.key(x, z);
    const existing = this.cells.get(k) ?? [];
    existing.push([x, z]);
    this.cells.set(k, existing);
    return true;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: scatter rules are intentionally kept together so biome probabilities are easy to tune.
export const buildDecorations = (p: DecorationParams): DecorationResult => {
  const { size, height, biome, seedHash } = p;
  const cols = size.cols + 1;
  const stride = cols;
  const grass = biomeIndex("grassland");
  const forest = biomeIndex("forest");
  const bank = biomeIndex("riverbank");
  const scree = biomeIndex("scree");

  const trees: ChunkDecoration[] = [];
  const bushes: ChunkDecoration[] = [];
  const rocks: ChunkDecoration[] = [];

  const occTree = new OccupancyGrid(p.minTreeSpacing);
  const occBush = new OccupancyGrid(p.minBushSpacing);
  const occRock = new OccupancyGrid(p.minRockSpacing);

  // Walk cells in a seeded order so deterministic across runs.
  // biome-ignore lint/suspicious/noBitwiseOperators: deterministic seed mixing for procedural scatter.
  const rng = createRng(seedHash ^ 0x55_aa_55_aa);

  for (let row = 0; row <= size.rows; row++) {
    for (let col = 0; col <= size.cols; col++) {
      const idx = row * stride + col;
      if (!p.playable[idx]) {
        continue;
      }
      const b = biome[idx];
      const { x, z } = cellToWorld(size, col, row);
      const y = height[idx];

      // Tree probability: high in forest, medium in grass, zero elsewhere
      let pTree = 0;
      if (b === forest) {
        pTree = 0.16;
      } else if (b === grass) {
        pTree = 0.05;
      }
      if (pTree > 0 && rng() < pTree) {
        const jx = x + (rng() - 0.5) * 1.4;
        const jz = z + (rng() - 0.5) * 1.4;
        if (occTree.accept(jx, jz, p.minTreeSpacing)) {
          trees.push({
            id: `tree-${row}-${col}`,
            x: jx,
            z: jz,
            y,
            scale: 0.85 + rng() * 0.45,
            rotationY: rng() * Math.PI * 2,
            variant: Math.floor(rng() * 3),
          });
        }
      }

      // Bush probability: high in grass + bank, some in forest
      let pBush = 0;
      if (b === grass) {
        pBush = 0.09;
      } else if (b === bank) {
        pBush = 0.08;
      } else if (b === forest) {
        pBush = 0.05;
      }
      if (pBush > 0 && rng() < pBush) {
        const jx = x + (rng() - 0.5) * 1.1;
        const jz = z + (rng() - 0.5) * 1.1;
        if (occBush.accept(jx, jz, p.minBushSpacing)) {
          bushes.push({
            id: `bush-${row}-${col}`,
            x: jx,
            z: jz,
            y,
            scale: 0.8 + rng() * 0.6,
            rotationY: rng() * Math.PI * 2,
            variant: Math.floor(rng() * 2),
          });
        }
      }

      // Rocks: scree + cliff foot. Sparse.
      let pRock = 0;
      if (b === scree) {
        pRock = 0.12;
      } else if (b === bank) {
        pRock = 0.03;
      }
      if (pRock > 0 && rng() < pRock) {
        const jx = x + (rng() - 0.5) * 0.8;
        const jz = z + (rng() - 0.5) * 0.8;
        if (occRock.accept(jx, jz, p.minRockSpacing)) {
          rocks.push({
            id: `rock-${row}-${col}`,
            x: jx,
            z: jz,
            y,
            scale: 0.7 + rng() * 1.1,
            rotationY: rng() * Math.PI * 2,
            variant: Math.floor(rng() * 3),
          });
        }
      }
    }
  }

  return { trees, bushes, rocks };
};
