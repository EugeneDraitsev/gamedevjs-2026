// Thin facade over the outside-chunk pipeline. Holds an active seed
// that the game sets from its URL-derived dungeon seed, then every
// consumer (terrain mesh, road ribbon, foliage, enemy spawn, minimap)
// reads the cached plan for that seed.

import {
  DEFAULT_CHUNK_CONFIG,
  getOutsideChunkPlan,
} from "$lib/game/outside-chunk/plan";
import type { OutsideChunkPlan } from "$lib/game/outside-chunk/types";

let activeSeed = DEFAULT_CHUNK_CONFIG.seed;

export const setOutsideChunkSeed = (seed: string) => {
  if (!seed) return;
  activeSeed = seed;
};

export const getOutsideChunkSeed = (): string => activeSeed;

export const outsidePlan = (): OutsideChunkPlan =>
  getOutsideChunkPlan({ ...DEFAULT_CHUNK_CONFIG, seed: activeSeed });

export const outsideGroundY = (x: number, z: number): number =>
  outsidePlan().sampleHeight(x, z);
