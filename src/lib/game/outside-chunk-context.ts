import {
  DEFAULT_CHUNK_CONFIG,
  getOutsideChunkPlan,
} from "$lib/game/outside-chunk/plan";
import type { OutsideChunkPlan } from "$lib/game/outside-chunk/types";

export const outsidePlan = (): OutsideChunkPlan =>
  getOutsideChunkPlan(DEFAULT_CHUNK_CONFIG);

export const outsideGroundY = (x: number, z: number): number =>
  outsidePlan().sampleHeight(x, z);
