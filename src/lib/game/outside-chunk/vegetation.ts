// Stage 5b — vegetation
//
// Data-driven scatter with a kind registry. Each VegetationKind
// declares which biomes it prefers, how densely it should pack, what
// scale range it comes in and (optionally) what physics shape the
// renderer should spawn alongside the mesh. The scatter pass picks
// one kind per accepted cell using biome-weighted sampling + an
// occupancy grid for min-spacing.

import { cellToWorld } from "./heightmap";
import { createRng } from "./rng";
import {
  BIOME_ORDER,
  type BiomeId,
  type ChunkSize,
  type VegetationColliderSpec,
  type VegetationInstance,
  type VegetationKindId,
} from "./types";

export type VegetationCategory = "tree" | "shrub" | "rock";

export interface VegetationKind {
  // How dense the overall attempt rate is (combined with biomeWeights
  // to produce the final per-cell probability).
  baseRate: number;
  // Biomes where this kind is allowed, with a multiplier.
  biomeWeights: Partial<Record<BiomeId, number>>;
  category: VegetationCategory;
  collider?: VegetationColliderSpec;
  id: VegetationKindId;
  minSpacing: number;
  scaleMax: number;
  scaleMin: number;
}

export const VEGETATION_REGISTRY: VegetationKind[] = [
  {
    id: "conifer",
    category: "tree",
    biomeWeights: { forest: 1.6, grassland: 0.2 },
    baseRate: 0.08,
    minSpacing: 3.3,
    scaleMin: 0.85,
    scaleMax: 1.45,
    collider: { shape: "cylinder", radius: 0.4, height: 3.2, yOffset: 1.6 },
  },
  {
    id: "broadleaf",
    category: "tree",
    biomeWeights: { forest: 1.2, grassland: 0.55 },
    baseRate: 0.08,
    minSpacing: 3.0,
    scaleMin: 0.9,
    scaleMax: 1.35,
    collider: { shape: "cylinder", radius: 0.45, height: 2.6, yOffset: 1.3 },
  },
  {
    id: "deadwood",
    category: "tree",
    biomeWeights: { grassland: 0.25, scree: 0.35, forest: 0.1 },
    baseRate: 0.025,
    minSpacing: 4.5,
    scaleMin: 0.9,
    scaleMax: 1.3,
    collider: { shape: "cylinder", radius: 0.3, height: 2.4, yOffset: 1.2 },
  },
  {
    id: "fern",
    category: "shrub",
    biomeWeights: { forest: 1.2 },
    baseRate: 0.11,
    minSpacing: 1.2,
    scaleMin: 0.65,
    scaleMax: 1.1,
  },
  {
    id: "bush-small",
    category: "shrub",
    biomeWeights: { grassland: 1.0, riverbank: 1.3, forest: 0.3 },
    baseRate: 0.09,
    minSpacing: 1.3,
    scaleMin: 0.7,
    scaleMax: 1.05,
  },
  {
    id: "bush-large",
    category: "shrub",
    biomeWeights: { forest: 0.7, grassland: 0.5 },
    baseRate: 0.04,
    minSpacing: 1.9,
    scaleMin: 0.9,
    scaleMax: 1.3,
  },
  {
    id: "rock-sm",
    category: "rock",
    biomeWeights: { grassland: 0.3, scree: 0.9, riverbank: 0.5 },
    baseRate: 0.035,
    minSpacing: 1.5,
    scaleMin: 0.5,
    scaleMax: 0.95,
  },
  {
    id: "rock-med",
    category: "rock",
    biomeWeights: { scree: 1.0, grassland: 0.18 },
    baseRate: 0.025,
    minSpacing: 2.5,
    scaleMin: 0.9,
    scaleMax: 1.35,
    collider: { shape: "ball", radius: 0.7, yOffset: 0.4 },
  },
  {
    id: "rock-lg",
    category: "rock",
    biomeWeights: { scree: 0.7 },
    baseRate: 0.015,
    minSpacing: 4,
    scaleMin: 1.25,
    scaleMax: 1.95,
    collider: { shape: "ball", radius: 1.25, yOffset: 0.7 },
  },
];

export interface VegetationParams {
  avoid: [number, number, number][]; // world positions to keep clear (POIs, etc)
  avoidRadius: number;
  biome: Uint8Array;
  height: Float32Array;
  playable: Uint8Array;
  sampleHeight: (x: number, z: number) => number;
  seedHash: number;
  size: ChunkSize;
}

export interface VegetationResult {
  instances: VegetationInstance[];
  perKind: Record<VegetationKindId, VegetationInstance[]>;
}

class OccupancyGrid {
  private readonly cells = new Map<string, [number, number][]>();
  private readonly cellSize: number;
  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }
  accept(x: number, z: number, minDist: number): boolean {
    const r = Math.ceil(minDist / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const minDist2 = minDist * minDist;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const list = this.cells.get(`${cx + dx}|${cz + dz}`);
        if (!list) {
          continue;
        }
        for (const [ox, oz] of list) {
          if ((x - ox) ** 2 + (z - oz) ** 2 < minDist2) {
            return false;
          }
        }
      }
    }
    const k = `${cx}|${cz}`;
    const list = this.cells.get(k) ?? [];
    list.push([x, z]);
    this.cells.set(k, list);
    return true;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: vegetation scatter keeps weighted biome picks and occupancy checks in one deterministic pass.
export const buildVegetation = (p: VegetationParams): VegetationResult => {
  const { size, biome, playable } = p;
  const stride = size.cols + 1;
  // biome-ignore lint/suspicious/noBitwiseOperators: deterministic seed mixing for vegetation scatter.
  const rng = createRng(p.seedHash ^ 0x6b_6f_67_e7);

  // Global occupancy (so bush-small can't sit exactly inside a conifer)
  const occAny = new OccupancyGrid(1.1);
  // Per-kind occupancy (so trees of the same kind don't clump)
  const occByKind: Record<string, OccupancyGrid> = {};
  for (const k of VEGETATION_REGISTRY) {
    occByKind[k.id] = new OccupancyGrid(Math.max(1, k.minSpacing * 0.9));
  }

  const instances: VegetationInstance[] = [];
  const perKind = Object.fromEntries(
    VEGETATION_REGISTRY.map((k) => [k.id, [] as VegetationInstance[]])
  ) as Record<VegetationKindId, VegetationInstance[]>;

  const avoidR2 = p.avoidRadius * p.avoidRadius;

  for (let row = 0; row <= size.rows; row++) {
    for (let col = 0; col <= size.cols; col++) {
      const idx = row * stride + col;
      if (!playable[idx]) {
        continue;
      }
      const b = BIOME_ORDER[biome[idx]];
      if (b === "water" || b === "cliff" || b === "snow" || b === "road") {
        continue;
      }

      const { x: cx, z: cz } = cellToWorld(size, col, row);

      // avoid list
      let avoided = false;
      for (const [ax, , az] of p.avoid) {
        if ((ax - cx) ** 2 + (az - cz) ** 2 < avoidR2) {
          avoided = true;
          break;
        }
      }
      if (avoided) {
        continue;
      }

      // Build cumulative distribution of eligible kinds for this cell
      let total = 0;
      const probs: { kind: VegetationKind; w: number }[] = [];
      for (const kind of VEGETATION_REGISTRY) {
        const bw = kind.biomeWeights[b] ?? 0;
        if (bw <= 0) {
          continue;
        }
        const w = kind.baseRate * bw;
        probs.push({ kind, w });
        total += w;
      }
      if (total <= 0) {
        continue;
      }

      // Bernoulli gate on total rate
      if (rng() > total) {
        continue;
      }

      // Choose kind by weighted pick
      let r = rng() * total;
      let chosen = probs[0].kind;
      for (const pr of probs) {
        r -= pr.w;
        if (r <= 0) {
          chosen = pr.kind;
          break;
        }
      }

      const jx = cx + (rng() - 0.5) * 1.1;
      const jz = cz + (rng() - 0.5) * 1.1;

      if (!occByKind[chosen.id].accept(jx, jz, chosen.minSpacing)) {
        continue;
      }
      // also enforce a tiny global spacing so different kinds don't overlap
      if (!occAny.accept(jx, jz, 0.9)) {
        continue;
      }

      const scale =
        chosen.scaleMin + rng() * (chosen.scaleMax - chosen.scaleMin);
      const inst: VegetationInstance = {
        id: `veg-${chosen.id}-${row}-${col}`,
        kind: chosen.id,
        x: jx,
        z: jz,
        y: p.sampleHeight(jx, jz),
        rotationY: rng() * Math.PI * 2,
        scale,
        variant: Math.floor(rng() * 3),
        biome: b,
        collider: chosen.collider,
      };
      instances.push(inst);
      perKind[chosen.id].push(inst);
    }
  }

  return { instances, perKind };
};
