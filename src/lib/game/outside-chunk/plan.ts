// Orchestrator — runs every pipeline stage in order and returns a
// fully-baked OutsideChunkPlan with sampling helpers.

import { buildBiome } from "./biome";
import { buildEnemySpawns } from "./enemies";
import { buildHeightmap, heightSampler } from "./heightmap";
import { buildHydrology } from "./hydrology";
import { buildPois } from "./pois";
import { hashSeed } from "./rng";
import { buildRoads } from "./roads";
import { buildVegetation } from "./vegetation";
import {
  BIOME_ORDER,
  type BiomeId,
  type ChunkSize,
  type OutsideChunkPlan,
} from "./types";

export interface BuildChunkConfig {
  seed: string;
  size: ChunkSize;
  // Playable zone (flat area) extents. Outside this rectangle the
  // terrain ramps up into the decorative mountain ring.
  playableHalfWidth: number;
  playableHalfDepth: number;
  groundY: number;
  platformDensity: number;
  platformPeakHeight: number;
  transitionBand: number;
  waterLevel: number;
  mountainPeakHeight: number;
  snowLine: number;
  riverHalfWidth: number;
  riverDepth: number;
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
  // Full chunk (including mountain ring). Playable rectangle sits
  // inside this and matches the game-logic room bounds.
  size: { width: 180, depth: 180, cols: 144, rows: 144 },
  playableHalfWidth: 34,
  playableHalfDepth: 80,
  groundY: 0.28,
  platformDensity: 0.12,
  platformPeakHeight: 1.3,
  transitionBand: 0.35,
  waterLevel: 0,
  mountainPeakHeight: 55,
  snowLine: 10,
  riverHalfWidth: 2.6,
  riverDepth: 0.9,
  roadWidthHalf: 2.1,
  riverbankRadius: 2.8,
  cliffSlope: 0.55,
  screeSlope: 0.22,
  minTreeSpacing: 3.2,
  minBushSpacing: 1.3,
  minRockSpacing: 2.6,
  minPoiSpacing: 18,
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

  // 1) Heightmap — flat playable rectangle + decorative mountain ring.
  const { height, slope, playable } = buildHeightmap({
    seedHash,
    size,
    playableHalfWidth: config.playableHalfWidth,
    playableHalfDepth: config.playableHalfDepth,
    groundY: config.groundY,
    platformDensity: config.platformDensity,
    platformPeakHeight: config.platformPeakHeight,
    transitionBand: config.transitionBand,
    mountainPeakHeight: config.mountainPeakHeight,
  });

  // 2) Hydrology — explicit river channels carved inside playable zone
  const hydro = buildHydrology({
    size,
    height,
    playable,
    seedHash,
    waterLevel: config.waterLevel,
    riverHalfWidth: config.riverHalfWidth,
    riverDepth: config.riverDepth,
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
    playable,
    seedHash,
    maxCamps: config.maxCamps,
    maxShrines: config.maxShrines,
    maxLandmarks: config.maxLandmarks,
    minPoiSpacing: config.minPoiSpacing,
  });

  // Main spine — south spawn corridor to north exit corridor along
  // the centre of the playable zone with a slight wiggle driven by
  // the chunk seed.
  const halfD = config.playableHalfDepth * 0.95;
  const spineRows = 5;
  const spine: Array<[number, number]> = [];
  for (let i = 0; i < spineRows; i++) {
    const t = i / (spineRows - 1);
    const z = -halfD + t * halfD * 2;
    // gentle wiggle — keep well inside playable rect
    const wiggle = Math.sin((t + seedHash / 1e9) * Math.PI * 1.3) * 6;
    spine.push([wiggle, z]);
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
    playable,
    routes: [spine, ...branches],
    widthHalf: config.roadWidthHalf,
    branchWidthHalf: config.roadWidthHalf * 0.7,
  });

  // 5) Vegetation (data-driven kind registry) — replaces the old
  //    decorations stage. Emits per-kind instance buckets so the
  //    renderer can spin up one InstancedMesh per kind plus colliders
  //    for the heavy stuff (trees, big rocks).
  const sampleHeightForVeg = heightSampler(size, height);
  const pois = poisEarly;
  const vegetation = buildVegetation({
    size,
    seedHash,
    height,
    biome,
    playable,
    avoid: pois.map((p) => [p.x, 0, p.z] as [number, number, number]),
    avoidRadius: 3.2,
    sampleHeight: sampleHeightForVeg,
  });

  // Flow is kept on grids for debug / downstream use
  const grids = {
    height,
    slope,
    flow: hydro.flow,
    biome,
    water: hydro.water,
    playable,
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
    playable,
    sampleHeight,
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
    vegetation,
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
