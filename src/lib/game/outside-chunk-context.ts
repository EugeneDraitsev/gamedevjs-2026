import {
  DEFAULT_CHUNK,
  createOutsideChunkSampler,
  type OutsideChunkSampler,
} from "$lib/game/outside-terrain-noise";

// Single shared sampler so terrain geometry, collider, enemies,
// pickups and decor all agree on the same heights. Anyone that needs
// to know "how tall is the ground at (x, z)" imports this.
let cached: OutsideChunkSampler | null = null;

export const getOutsideChunkSampler = (): OutsideChunkSampler => {
  if (!cached) {
    cached = createOutsideChunkSampler(DEFAULT_CHUNK);
  }
  return cached;
};

export const outsideGroundY = (x: number, z: number): number =>
  getOutsideChunkSampler().heightAt(x, z);
