// Orchestrator — runs every pipeline stage in order and returns a
// fully-baked OutsideChunkPlan with sampling helpers.

import { buildBiome } from "./biome";
import { buildEnemySpawns } from "./enemies";
import { buildHeightmap, cellToWorld, heightSampler } from "./heightmap";
import { buildHydrology } from "./hydrology";
import { buildPois } from "./pois";
import { createRng, hashSeed } from "./rng";
import { buildRoads } from "./roads";
import {
  BIOME_ORDER,
  type BiomeId,
  biomeIndex,
  type ChunkFeature,
  type ChunkSize,
  type OutsideChunkPlan,
  type ShopkeeperLocation,
} from "./types";
import { buildVegetation } from "./vegetation";

interface ShopkeeperSearchParams {
  biome: Uint8Array;
  height: Float32Array;
  playable: Uint8Array;
  pois: ChunkFeature[];
  roadCost: Float32Array;
  seedHash: number;
  size: ChunkSize;
  water: Uint8Array;
  waterLevel: number;
}

const SHOPKEEPER_MIN_POI_DISTANCE = 16;
const SHOPKEEPER_MIDDLE_HALF_DEPTH = 22;
const SHOPKEEPER_MIDDLE_HALF_WIDTH = 24;
const SHOPKEEPER_FALLBACK_HALF_DEPTH = 54;
const SHOPKEEPER_FALLBACK_HALF_WIDTH = 28;
const SHOP_OFFER_CLEARANCE_RADIUS = 0.82;
const SHOP_OFFER_FORWARD_DISTANCE = 3.1;
const SHOP_OFFER_SIDE_OFFSETS = [-5.4, -1.8, 1.8, 5.4] as const;

interface ShopkeeperCandidateLayout {
  offerPositions: [number, number, number][];
  rotationY: number;
  score: number;
}

const worldToGridIndex = (
  { size }: ShopkeeperSearchParams,
  worldX: number,
  worldZ: number
) => {
  const col = Math.round(
    ((worldX + size.width * 0.5) / size.width) * size.cols
  );
  const row = Math.round(
    ((worldZ + size.depth * 0.5) / size.depth) * size.rows
  );

  if (col < 0 || col > size.cols || row < 0 || row > size.rows) {
    return null;
  }

  return row * (size.cols + 1) + col;
};

const isDryPlayablePoint = (
  params: ShopkeeperSearchParams,
  worldX: number,
  worldZ: number
) => {
  const index = worldToGridIndex(params, worldX, worldZ);

  if (index === null) {
    return false;
  }

  return (
    params.playable[index] !== 0 &&
    params.water[index] === 0 &&
    params.height[index] >= params.waterLevel + 0.05
  );
};

const isDryPlayableArea = (
  params: ShopkeeperSearchParams,
  worldX: number,
  worldZ: number,
  radius: number
) =>
  [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
  ].every(([dx, dz]) => isDryPlayablePoint(params, worldX + dx, worldZ + dz));

const getGridHeight = (
  params: ShopkeeperSearchParams,
  worldX: number,
  worldZ: number
) => {
  const index = worldToGridIndex(params, worldX, worldZ);

  return index === null ? params.waterLevel : params.height[index];
};

const findShopkeeperLayout = (
  params: ShopkeeperSearchParams,
  worldX: number,
  worldZ: number
): ShopkeeperCandidateLayout | null => {
  const baseHeight = getGridHeight(params, worldX, worldZ);
  const offerPositions = SHOP_OFFER_SIDE_OFFSETS.map((sideOffset) => {
    const x = worldX + sideOffset;
    const z = worldZ + SHOP_OFFER_FORWARD_DISTANCE;

    return [x, getGridHeight(params, x, z), z] as [number, number, number];
  });

  if (
    !offerPositions.every(([x, y, z]) => {
      const closeToShopkeeperHeight = Math.abs(y - baseHeight) < 0.72;

      return (
        closeToShopkeeperHeight &&
        isDryPlayableArea(params, x, z, SHOP_OFFER_CLEARANCE_RADIUS)
      );
    })
  ) {
    return null;
  }

  const averageHeightDelta =
    offerPositions.reduce(
      (total, [, y]) => total + Math.abs(y - baseHeight),
      0
    ) / offerPositions.length;
  const centerBias = 1 - Math.min(1, Math.hypot(worldX, worldZ) / 72);

  return {
    offerPositions,
    rotationY: 0,
    score: centerBias - averageHeightDelta * 0.8,
  };
};

const isShopkeeperCellEligible = (
  params: ShopkeeperSearchParams,
  index: number,
  worldX: number,
  worldZ: number,
  forestId: number,
  grassId: number
): boolean => {
  const { biome, height, pois, playable, roadCost, water, waterLevel } = params;
  if (!playable[index]) {
    return false;
  }
  if (water[index] !== 0) {
    return false;
  }
  if (height[index] < waterLevel + 0.05) {
    return false;
  }
  const b = biome[index];
  if (b !== forestId && b !== grassId) {
    return false;
  }
  if (roadCost[index] > 60) {
    return false;
  }
  if (Math.abs(worldX) > SHOPKEEPER_MIDDLE_HALF_WIDTH) {
    return false;
  }
  if (Math.abs(worldZ) > SHOPKEEPER_MIDDLE_HALF_DEPTH) {
    return false;
  }
  return !pois.some(
    (poi) =>
      (poi.x - worldX) ** 2 + (poi.z - worldZ) ** 2 <
      SHOPKEEPER_MIN_POI_DISTANCE ** 2
  );
};

const isShopkeeperFallbackCellEligible = (
  params: ShopkeeperSearchParams,
  index: number,
  worldX: number,
  worldZ: number
) => {
  const { height, playable, roadCost, water, waterLevel } = params;

  if (!playable[index] || water[index] !== 0) {
    return false;
  }
  if (height[index] < waterLevel + 0.05) {
    return false;
  }
  if (roadCost[index] > 140) {
    return false;
  }
  if (Math.abs(worldX) > SHOPKEEPER_FALLBACK_HALF_WIDTH) {
    return false;
  }
  if (Math.abs(worldZ) > SHOPKEEPER_FALLBACK_HALF_DEPTH) {
    return false;
  }
  return true;
};

interface ShopkeeperSearchCandidate {
  i: number;
  layout: ShopkeeperCandidateLayout;
  score: number;
}

const makeShopkeeperJitter = (seedHash: number) => (i: number) => {
  const h = Math.sin((i + seedHash + 0x11_22_33) * 12.9898) * 43_758.5453;

  return h - Math.floor(h);
};

const collectStrictShopkeeperCandidates = (
  params: ShopkeeperSearchParams,
  jitter: (i: number) => number,
  forest: number,
  grass: number
) => {
  const { biome, size } = params;
  const stride = size.cols + 1;
  const candidates: ShopkeeperSearchCandidate[] = [];

  for (let row = 1; row < size.rows; row += 1) {
    for (let col = 1; col < size.cols; col += 1) {
      const i = row * stride + col;
      const { x, z } = cellToWorld(size, col, row);
      if (!isShopkeeperCellEligible(params, i, x, z, forest, grass)) {
        continue;
      }
      const layout = findShopkeeperLayout(params, x, z);
      if (!layout) {
        continue;
      }
      const distFromCenter = Math.hypot(x, z);
      const forestBonus = biome[i] === forest ? 1.4 : 0.6;
      const score =
        forestBonus * (1 - distFromCenter / 60) +
        layout.score +
        jitter(i) * 0.4;

      candidates.push({ i, layout, score });
    }
  }

  return candidates;
};

const collectFallbackShopkeeperCandidates = (
  params: ShopkeeperSearchParams,
  jitter: (i: number) => number
) => {
  const { size } = params;
  const stride = size.cols + 1;
  const candidates: ShopkeeperSearchCandidate[] = [];

  for (let row = 1; row < size.rows; row += 1) {
    for (let col = 1; col < size.cols; col += 1) {
      const i = row * stride + col;
      const { x, z } = cellToWorld(size, col, row);
      if (!isShopkeeperFallbackCellEligible(params, i, x, z)) {
        continue;
      }
      const layout = findShopkeeperLayout(params, x, z);
      if (!layout) {
        continue;
      }
      const distFromCenter = Math.hypot(x, z);
      const score =
        0.8 * (1 - distFromCenter / 80) + layout.score + jitter(i) * 0.25;

      candidates.push({ i, layout, score });
    }
  }

  return candidates;
};

const candidateToShopkeeperLocation = (
  params: ShopkeeperSearchParams,
  candidate: ShopkeeperSearchCandidate
): ShopkeeperLocation => {
  const { height, size } = params;
  const stride = size.cols + 1;
  const col = candidate.i % stride;
  const row = (candidate.i - col) / stride;
  const { x, z } = cellToWorld(size, col, row);

  return {
    offerPositions: candidate.layout.offerPositions,
    rotationY: candidate.layout.rotationY,
    x,
    y: height[candidate.i],
    z,
  };
};

const pickEmergencyShopkeeperLocation = (
  params: ShopkeeperSearchParams
): ShopkeeperLocation | null => {
  const { height } = params;
  const emergencyLocations: [number, number][] = [
    [0, 22],
    [0, -22],
    [-12, 16],
    [12, 16],
    [-12, -16],
    [12, -16],
    [0, 0],
  ];

  for (const [x, z] of emergencyLocations) {
    const index = worldToGridIndex(params, x, z);
    const layout = findShopkeeperLayout(params, x, z);

    if (
      index !== null &&
      layout &&
      isDryPlayableArea(params, x, z, SHOP_OFFER_CLEARANCE_RADIUS)
    ) {
      return {
        offerPositions: layout.offerPositions,
        rotationY: layout.rotationY,
        x,
        y: height[index],
        z,
      };
    }
  }

  return null;
};

const pickShopkeeperLocation = (
  params: ShopkeeperSearchParams
): ShopkeeperLocation | null => {
  const jitter = makeShopkeeperJitter(params.seedHash);
  const forest = biomeIndex("forest");
  const grass = biomeIndex("grassland");
  const candidates = collectStrictShopkeeperCandidates(
    params,
    jitter,
    forest,
    grass
  );
  const fallbackCandidates =
    candidates.length > 0
      ? candidates
      : collectFallbackShopkeeperCandidates(params, jitter);

  if (fallbackCandidates.length === 0) {
    return pickEmergencyShopkeeperLocation(params);
  }

  fallbackCandidates.sort((a, b) => b.score - a.score);
  return candidateToShopkeeperLocation(params, fallbackCandidates[0]);
};

export interface BuildChunkConfig {
  cliffSlope: number;
  groundY: number;
  guardsPerCamp: number;
  guardsPerLandmark: number;
  guardsPerShrine: number;
  maxCamps: number;
  maxLandmarks: number;
  maxShrines: number;
  minBushSpacing: number;
  minPoiSpacing: number;
  minRockSpacing: number;
  minTreeSpacing: number;
  minWandererDistFromSpawn: number;
  mountainPeakHeight: number;
  platformDensity: number;
  platformPeakHeight: number;
  playableHalfDepth: number;
  // Playable zone (flat area) extents. Outside this rectangle the
  // terrain ramps up into the decorative mountain ring.
  playableHalfWidth: number;
  riverbankRadius: number;
  riverDepth: number;
  riverHalfWidth: number;
  roadWidthHalf: number;
  screeSlope: number;
  seed: string;
  size: ChunkSize;
  snowLine: number;
  spawnPoint: [number, number, number];
  transitionBand: number;
  wandererCount: number;
  waterLevel: number;
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
  spawnPoint: [0, 1, 70],
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
  const protectedPoints: [number, number, number][] = [
    [config.spawnPoint[0], config.spawnPoint[2], 12],
    [0, -config.playableHalfDepth * 0.985, 9],
  ];

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
    playableHalfWidth: config.playableHalfWidth,
    playableHalfDepth: config.playableHalfDepth,
    waterLevel: config.waterLevel,
    riverHalfWidth: config.riverHalfWidth,
    riverDepth: config.riverDepth,
    protectedPoints,
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
    protectedPoints,
  });

  // Main spine — south spawn corridor to north exit corridor. The
  // shape is seed-driven so each run feels distinct: vary waypoint
  // count, wiggle frequency, amplitude, phase, and harmonics so
  // spines can be nearly straight, gently curving, or strongly
  // meandering depending on the seed.
  const gateZ = -config.playableHalfDepth * 0.985;
  const spawnZ = config.spawnPoint[2];
  const spineRng = createRng(seedHash + 0x5a_db_07_15);
  const spineRows = 5 + Math.floor(spineRng() * 5); // 5..9
  const wiggleAmp = 3 + spineRng() * 10; // 3..13
  const wigglePhase = spineRng() * Math.PI * 2;
  const wiggleFreq = 0.7 + spineRng() * 1.6; // 0.7..2.3
  const harmonicAmp = spineRng() * 3.2; // 0..3.2
  const harmonicFreq = 2.1 + spineRng() * 1.9; // 2.1..4.0
  const maxAbsX = config.playableHalfWidth - 6;
  const spine: [number, number][] = [];
  for (let i = 0; i < spineRows; i++) {
    const t = i / (spineRows - 1);
    const z = gateZ + t * (spawnZ - gateZ);
    const primary =
      Math.sin(wigglePhase + t * Math.PI * wiggleFreq) * wiggleAmp;
    const harmonic =
      Math.sin(wigglePhase * 0.7 + t * Math.PI * harmonicFreq) * harmonicAmp;
    const wiggle =
      i === 0 || i === spineRows - 1
        ? 0
        : Math.max(-maxAbsX, Math.min(maxAbsX, primary + harmonic));
    spine.push([wiggle, z]);
  }

  // Branch routes — straight from the nearest spine waypoint to each POI.
  const branches: [number, number][][] = [];
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
    seedHash,
  });

  // 5) Vegetation (data-driven kind registry) — replaces the old
  //    decorations stage. Emits per-kind instance buckets so the
  //    renderer can spin up one InstancedMesh per kind plus colliders
  //    for the heavy stuff (trees, big rocks).
  const sampleHeightForVeg = heightSampler(size, height);
  const pois = poisEarly;
  const shopkeeper = pickShopkeeperLocation({
    biome,
    height,
    pois,
    playable,
    roadCost: roads.cost,
    seedHash,
    size,
    water: hydro.water,
    waterLevel: config.waterLevel,
  });
  const shopAvoidPoints: [number, number, number][] = shopkeeper
    ? [
        [shopkeeper.x, 0, shopkeeper.z],
        ...shopkeeper.offerPositions.map(
          ([x, , z]) => [x, 0, z] as [number, number, number]
        ),
      ]
    : [];
  const vegetationAvoidRadius = shopAvoidPoints.length > 0 ? 4.6 : 3.2;
  const vegetation = buildVegetation({
    size,
    seedHash,
    height,
    biome,
    playable,
    avoid: [
      ...pois.map((p) => [p.x, 0, p.z] as [number, number, number]),
      ...shopAvoidPoints,
    ],
    avoidRadius: vegetationAvoidRadius,
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
      Math.min(
        size.cols,
        Math.round(((x + size.width * 0.5) / size.width) * size.cols)
      )
    );
    const row = Math.max(
      0,
      Math.min(
        size.rows,
        Math.round(((z + size.depth * 0.5) / size.depth) * size.rows)
      )
    );
    return BIOME_ORDER[biome[row * stride + col]];
  };
  const isUnderwater = (x: number, z: number) =>
    sampleHeight(x, z) < config.waterLevel;

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
    shopkeeper,
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
  if (!cachedPlan) {
    throw new Error("Outside chunk plan failed to build");
  }
  return cachedPlan;
};
