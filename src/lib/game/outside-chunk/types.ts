// Data model for the outside-chunk procedural pipeline.
//
// The chunk is generated in a strict order so later stages can read
// earlier stages' output:
//
//   heightmap → hydrology → biome → roads → decorations → pois
//
// Each stage produces data, not Three.js objects. A separate
// rendering layer reads the finished plan and builds meshes / colliders
// / minimap tiles.

export type BiomeId =
  | "water"
  | "riverbank"
  | "grassland"
  | "forest"
  | "scree"
  | "cliff"
  | "snow"
  | "road";

export interface ChunkSize {
  width: number; // world units along X
  depth: number; // world units along Z
  cols: number; // grid columns (cell = width / cols units)
  rows: number; // grid rows
}

export interface ChunkGrids {
  // Per-cell (row-major) arrays
  height: Float32Array;
  slope: Float32Array;
  flow: Float32Array; // water accumulation
  biome: Uint8Array; // indices into BIOME_ORDER
  // Mask of cells that have been carved by a river (1) or flooded (2)
  water: Uint8Array;
  // 1 where the player can actually be (flat zone), 0 on mountains.
  playable: Uint8Array;
  // Road cost grid used by A* (higher = worse to traverse)
  roadCost: Float32Array;
}

export interface PolyPath {
  // World-space (x, z) points along the path
  points: Array<[number, number]>;
  widthHalf: number;
}

export interface ChunkFeature {
  id: string;
  kind: "camp" | "shrine" | "landmark" | "lookout";
  x: number;
  z: number;
  y: number;
  rotationY: number;
  reason: string; // why this landmark exists (debug)
}

export interface ChunkDecoration {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
  rotationY: number;
  variant: number;
}

export interface EnemySpawn {
  id: string;
  x: number;
  y: number;
  z: number;
  // How aggressive a guard is vs. a casual wanderer
  role: "guard" | "wanderer";
  // If this is a guard attached to a POI, this is the POI's id
  poiId?: string;
  patrolRadius: number;
}

export interface OutsideChunkPlan {
  seed: string;
  size: ChunkSize;
  grids: ChunkGrids;
  rivers: PolyPath[];
  roads: PolyPath[];
  spawn: [number, number, number];
  pois: ChunkFeature[];
  enemySpawns: EnemySpawn[];
  trees: ChunkDecoration[];
  bushes: ChunkDecoration[];
  rocks: ChunkDecoration[];
  // Sampling helpers bound to this plan's heightmap — reading a
  // continuous height anywhere in world space via bilinear lerp.
  sampleHeight(x: number, z: number): number;
  sampleBiome(x: number, z: number): BiomeId;
  isUnderwater(x: number, z: number): boolean;
}

export const BIOME_ORDER: BiomeId[] = [
  "water",
  "riverbank",
  "grassland",
  "forest",
  "scree",
  "cliff",
  "snow",
  "road",
];
export const biomeIndex = (b: BiomeId): number => BIOME_ORDER.indexOf(b);

// Shared colour lookup used by the minimap and any debug overlay.
export const BIOME_COLORS: Record<BiomeId, string> = {
  water: "#3a6d93",
  riverbank: "#a6906b",
  grassland: "#6d7f48",
  forest: "#3a5130",
  scree: "#877d68",
  cliff: "#6a6258",
  snow: "#eef0f5",
  road: "#8e7553",
};
