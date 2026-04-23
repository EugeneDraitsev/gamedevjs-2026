// Orchestrator — runs every pipeline stage in order and returns a
// fully-baked OutsideChunkPlan with sampling helpers.

import { buildBiome } from "./biome";
import { buildDecorations } from "./decorations";
import { buildHeightmap, heightSampler } from "./heightmap";
import { buildHydrology } from "./hydrology";
import { buildPois } from "./pois";
import { hashSeed } from "./rng";
import { buildRoads } from "./roads";
import {
  BIOME_ORDER,
  type BiomeId,
  type ChunkSize,
  type OutsideChunkPlan,
} from "./types";

export interface BuildChunkConfig {
  seed: string;
  size: ChunkSize;
  waterLevel: number;
  mountainPeakHeight: number;
  snowLine: number;
  floorHalfWidth: number;
  axisMeander: number;
  roadWidthHalf: number;
  riverbankRadius: number;
  cliffSlope: number;
  screeSlope: number;
  minTreeSpacing: number;
  minBushSpacing: number;
  minRockSpacing: number;
  minPoiSpacing: number;
  maxCamps: number;
  maxShrines: number;
  maxLandmarks: number;
  spawnPoint: [number, number, number];
}

export const DEFAULT_CHUNK_CONFIG: BuildChunkConfig = {
  seed: "outside-polygon-001",
  size: { width: 112, depth: 196, cols: 96, rows: 168 },
  waterLevel: 0,
  mountainPeakHeight: 55,
  snowLine: 10,
  floorHalfWidth: 16,
  axisMeander: 8,
  roadWidthHalf: 1.9,
  riverbankRadius: 2.6,
  cliffSlope: 0.55,
  screeSlope: 0.22,
  minTreeSpacing: 3.2,
  minBushSpacing: 1.3,
  minRockSpacing: 2.6,
  minPoiSpacing: 18,
  maxCamps: 3,
  maxShrines: 2,
  maxLandmarks: 2,
  spawnPoint: [0, 1, 70],
};

export const buildOutsideChunkPlan = (
  config: BuildChunkConfig = DEFAULT_CHUNK_CONFIG
): OutsideChunkPlan => {
  const seedHash = hashSeed(config.seed);
  const { size } = config;

  // 1) Heightmap (+ slope + axis)
  const { height, slope, axisX } = buildHeightmap({
    seedHash,
    size,
    mountainPeakHeight: config.mountainPeakHeight,
    floorHalfWidth: config.floorHalfWidth,
    axisMeander: config.axisMeander,
  });

  // 2) Hydrology (mutates height, emits water mask + rivers)
  const hydro = buildHydrology({
    size,
    height,
    riverThreshold: (size.cols * size.rows) / 320,
    maxRivers: 3,
    carveDepth: 1.0,
    carveHalfWidth: 2.4,
    waterLevel: config.waterLevel,
  });

  // 3) Biome classification (reads height, slope, water)
  const biome = buildBiome({
    size,
    height,
    slope,
    water: hydro.water,
    waterLevel: config.waterLevel,
    snowLine: config.snowLine,
    cliffSlope: config.cliffSlope,
    screeSlope: config.screeSlope,
    riverbankRadius: config.riverbankRadius,
  });

  // 4) Road network — waypoint list runs south to north along the
  //    canyon floor, offset from the axis so roads don't stomp rivers.
  const halfD = size.depth * 0.5;
  const waypointRows = 6;
  const waypoints: Array<[number, number]> = [];
  for (let i = 0; i < waypointRows; i++) {
    const t = i / (waypointRows - 1);
    const row = Math.round(t * size.rows);
    const z = -halfD + t * size.depth;
    // stand 4 units off-axis, side flips alternately for interest
    const side = i % 2 === 0 ? 1 : -1;
    const x = axisX[Math.min(size.rows, row)] + side * 4.0;
    waypoints.push([x, z]);
  }
  const roads = buildRoads({
    size,
    height,
    slope,
    biome,
    water: hydro.water,
    waypoints,
    widthHalf: config.roadWidthHalf,
  });

  // 5) Decorations (trees, bushes, rocks) per biome
  const decor = buildDecorations({
    size,
    height,
    biome,
    seedHash,
    minTreeSpacing: config.minTreeSpacing,
    minBushSpacing: config.minBushSpacing,
    minRockSpacing: config.minRockSpacing,
  });

  // 6) POIs (camps, shrines, landmarks)
  const pois = buildPois({
    size,
    biome,
    height,
    flow: hydro.flow,
    seedHash,
    maxCamps: config.maxCamps,
    maxShrines: config.maxShrines,
    maxLandmarks: config.maxLandmarks,
    minPoiSpacing: config.minPoiSpacing,
  });

  // Flow is kept on grids for debug / downstream use
  const grids = {
    height,
    slope,
    flow: hydro.flow,
    biome,
    water: hydro.water,
    roadCost: roads.cost,
  };

  const sampleHeight = heightSampler(size, height);
  const stride = size.cols + 1;
  const sampleBiome = (x: number, z: number): BiomeId => {
    const col = Math.max(
      0,
      Math.min(size.cols, Math.round(((x + size.width * 0.5) / size.width) * size.cols))
    );
    const row = Math.max(
      0,
      Math.min(size.rows, Math.round(((z + size.depth * 0.5) / size.depth) * size.rows))
    );
    return BIOME_ORDER[biome[row * stride + col]];
  };
  const isUnderwater = (x: number, z: number) => sampleHeight(x, z) < config.waterLevel;

  // Spawn snaps to ground
  const spawnY = sampleHeight(config.spawnPoint[0], config.spawnPoint[2]);
  const spawn: [number, number, number] = [
    config.spawnPoint[0],
    spawnY + 0.8,
    config.spawnPoint[2],
  ];

  return {
    seed: config.seed,
    size,
    grids,
    rivers: hydro.rivers,
    roads: roads.paths,
    spawn,
    pois,
    trees: decor.trees,
    bushes: decor.bushes,
    rocks: decor.rocks,
    sampleHeight,
    sampleBiome,
    isUnderwater,
  };
};

let cachedPlan: OutsideChunkPlan | null = null;
let cachedKey = "";

export const getOutsideChunkPlan = (
  config: BuildChunkConfig = DEFAULT_CHUNK_CONFIG
): OutsideChunkPlan => {
  const key = `${config.seed}|${config.size.cols}x${config.size.rows}`;
  if (cachedKey !== key) {
    cachedPlan = buildOutsideChunkPlan(config);
    cachedKey = key;
  }
  return cachedPlan!;
};
