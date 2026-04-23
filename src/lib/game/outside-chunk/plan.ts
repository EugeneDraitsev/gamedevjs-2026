// Orchestrator — runs every pipeline stage in order and returns a
// fully-baked OutsideChunkPlan with sampling helpers.

import { buildBiome } from "./biome";
import { buildDecorations } from "./decorations";
import { buildEnemySpawns } from "./enemies";
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
  guardsPerCamp: number;
  guardsPerShrine: number;
  guardsPerLandmark: number;
  wandererCount: number;
  minWandererDistFromSpawn: number;
}

export const DEFAULT_CHUNK_CONFIG: BuildChunkConfig = {
  seed: "outside-polygon-001",
  // Square-ish chunk so roads can branch in all directions; still
  // slightly taller than wide because the game-logic room wall is.
  size: { width: 168, depth: 168, cols: 144, rows: 144 },
  waterLevel: 0,
  mountainPeakHeight: 55,
  snowLine: 10,
  floorHalfWidth: 22,
  axisMeander: 10,
  roadWidthHalf: 1.9,
  riverbankRadius: 2.8,
  cliffSlope: 0.55,
  screeSlope: 0.22,
  minTreeSpacing: 3.2,
  minBushSpacing: 1.3,
  minRockSpacing: 2.6,
  minPoiSpacing: 22,
  maxCamps: 4,
  maxShrines: 3,
  maxLandmarks: 3,
  spawnPoint: [0, 1, 60],
  guardsPerCamp: 4,
  guardsPerShrine: 3,
  guardsPerLandmark: 2,
  wandererCount: 10,
  minWandererDistFromSpawn: 18,
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

  // 4) Roads — build POIs FIRST so we can route branches to them.
  //    We need the POI coordinates before pathfinding, but the POI
  //    stage reads biome; roads mutate biome. Order: pois → roads.
  const poisEarly = buildPois({
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

  // Main spine — south spawn corridor to north exit corridor, offset
  // from the river axis on alternating sides.
  const halfD = size.depth * 0.5;
  const spineRows = 5;
  const spine: Array<[number, number]> = [];
  for (let i = 0; i < spineRows; i++) {
    const t = i / (spineRows - 1);
    const row = Math.round(t * size.rows);
    const z = -halfD + t * size.depth;
    const side = i % 2 === 0 ? 1 : -1;
    const x = axisX[Math.min(size.rows, row)] + side * 5.0;
    spine.push([x, z]);
  }

  // Branch routes — straight from the nearest spine waypoint to each POI.
  const branches: Array<Array<[number, number]>> = [];
  for (const poi of poisEarly) {
    let nearest = spine[0];
    let nearestD2 = Number.POSITIVE_INFINITY;
    for (const wp of spine) {
      const d2 = (wp[0] - poi.x) ** 2 + (wp[1] - poi.z) ** 2;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = wp;
      }
    }
    branches.push([nearest, [poi.x, poi.z]]);
  }

  const roads = buildRoads({
    size,
    height,
    slope,
    biome,
    water: hydro.water,
    routes: [spine, ...branches],
    widthHalf: config.roadWidthHalf,
    branchWidthHalf: config.roadWidthHalf * 0.7,
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

  // 6) POIs were computed early so roads could branch to them. Reuse.
  const pois = poisEarly;

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

  // 7) Enemy spawns — guard rings around POIs + ambient wanderers
  const enemySpawns = buildEnemySpawns({
    size,
    seedHash,
    pois,
    height,
    biome,
    water: hydro.water,
    spawn,
    guardsPerCamp: config.guardsPerCamp,
    guardsPerShrine: config.guardsPerShrine,
    guardsPerLandmark: config.guardsPerLandmark,
    wandererCount: config.wandererCount,
    minWandererDistFromSpawn: config.minWandererDistFromSpawn,
  });

  return {
    seed: config.seed,
    size,
    grids,
    rivers: hydro.rivers,
    roads: roads.paths,
    spawn,
    pois,
    enemySpawns,
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
