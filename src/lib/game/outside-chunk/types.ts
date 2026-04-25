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
  cols: number; // grid columns (cell = width / cols units)
  depth: number; // world units along Z
  rows: number; // grid rows
  width: number; // world units along X
}

export interface ChunkGrids {
  biome: Uint8Array; // indices into BIOME_ORDER
  flow: Float32Array; // water accumulation
  // Per-cell (row-major) arrays
  height: Float32Array;
  // 1 where the player can actually be (flat zone), 0 on mountains.
  playable: Uint8Array;
  // Road cost grid used by A* (higher = worse to traverse)
  roadCost: Float32Array;
  slope: Float32Array;
  // Mask of cells that have been carved by a river (1) or flooded (2)
  water: Uint8Array;
}

export interface PolyPath {
  // World-space (x, z) points along the path
  points: [number, number][];
  widthHalf: number;
}

export interface ChunkFeature {
  id: string;
  kind: "camp" | "shrine" | "landmark" | "lookout";
  reason: string; // why this landmark exists (debug)
  rotationY: number;
  x: number;
  y: number;
  z: number;
}

export interface ChunkDecoration {
  id: string;
  rotationY: number;
  scale: number;
  variant: number;
  x: number;
  y: number;
  z: number;
}

export interface EnemySpawn {
  id: string;
  patrolRadius: number;
  // If this is a guard attached to a POI, this is the POI's id
  poiId?: string;
  // How aggressive a guard is vs. a casual wanderer
  role: "guard" | "wanderer";
  x: number;
  y: number;
  z: number;
}

export type VegetationKindId =
  | "conifer"
  | "broadleaf"
  | "deadwood"
  | "fern"
  | "bush-small"
  | "bush-large"
  | "rock-sm"
  | "rock-med"
  | "rock-lg";

export interface VegetationColliderSpec {
  height?: number;
  radius: number;
  shape: "cylinder" | "ball";
  yOffset?: number;
}

export interface VegetationInstance {
  biome: BiomeId;
  collider?: VegetationColliderSpec;
  id: string;
  kind: VegetationKindId;
  rotationY: number;
  scale: number;
  variant: number;
  x: number;
  y: number;
  z: number;
}

export interface ShopkeeperLocation {
  rotationY: number;
  x: number;
  y: number;
  z: number;
}

export interface OutsideChunkPlan {
  enemySpawns: EnemySpawn[];
  grids: ChunkGrids;
  isUnderwater(x: number, z: number): boolean;
  pois: ChunkFeature[];
  rivers: PolyPath[];
  roads: PolyPath[];
  sampleBiome(x: number, z: number): BiomeId;
  // Sampling helpers bound to this plan's heightmap — reading a
  // continuous height anywhere in world space via bilinear lerp.
  sampleHeight(x: number, z: number): number;
  seed: string;
  shopkeeper: ShopkeeperLocation | null;
  size: ChunkSize;
  spawn: [number, number, number];
  // Vegetation is grouped by kind so the renderer can make one
  // InstancedMesh per kind and spawn colliders for the heavy stuff.
  vegetation: {
    instances: VegetationInstance[];
    perKind: Record<VegetationKindId, VegetationInstance[]>;
  };
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
