import type {
  DungeonLayout,
  DungeonRoom,
  DungeonRoomDirection,
} from "$lib/config/dungeon-layout";
import {
  type EnemyTemplate,
  enemyTemplateById,
  type RoomSkinId,
  type RoomTemplate,
  roomTemplateById,
} from "$lib/config/room-templates";
import type { FloorTheme, WallTheme } from "$lib/config/scene-settings";
import { outsidePlan } from "$lib/game/outside-chunk-context";
import type {
  ActiveEnemy,
  ActivePickup,
  DoorMarker,
  DoorSeal,
  RoomHazard,
  RoomPlatform,
  SceneBossGearMount,
  SceneFloorPalette,
  SceneGearTooth,
  SceneTreasureGearMount,
  SceneWallPalette,
  StaticWall,
  Vec3,
  WallStyle,
} from "$lib/types/game";

export const doorwayHalfSpan = 1.2;
export const floorHalfDepth = 9.1;
export const floorHalfWidth = 10.4;
export const roomTransitionInsetX = 9.1;
export const roomTransitionInsetZ = 7.3;
export const roomTeleportX = 8;
export const roomTeleportZ = 6.6;
export const wallHalfHeight = 2.8;
export const wallThickness = 0.25;
export const wallHalfWidth = 9.9;
export const wallHalfDepth = 8.1;
export const wallY = 2.45;
export const wallSegmentHalfDepth = (wallHalfDepth - doorwayHalfSpan) * 0.5;
export const wallSegmentHalfWidth = (wallHalfWidth - doorwayHalfSpan) * 0.5;
export const wallSegmentOffsetDepth = doorwayHalfSpan + wallSegmentHalfDepth;
export const wallSegmentOffsetWidth = doorwayHalfSpan + wallSegmentHalfWidth;
export const enemyFloorY = 0.62;
export const enemyShotRadius = 0.18;
export const enemyShotTtlMs = 2200;
export const damagePopupDurationMs = 760;
export const artifactPickupDurationMs = 2800;
export const bossDeathDurationMs = 1500;
export const bossIntroDurationMs = 2400;
export const floorIntroDurationMs = 3100;
export const playerDeathAnimationMs = 1500;
export const playerDeathOverlayMs = 1100;
export const beamDurationMs = 500;
export const doorOpenDelayMs = 1150;
export const doorOpenDurationMs = 460;
export const floorExitOpenDelayMs = 520;
export const floorExitOpenDurationMs = 2200;
export const floorExitTriggerHalfWidth = 1.35;
export const floorExitTriggerZ = -5.9;
export const hazardTickMs = 420;
export const playerMaxHealth = 6;
export const playerRadius = 0.55;
export const corePrisonSealCenterZ = -5.25;
export const roomTransitionDurationMs = 190;

export interface RoomBounds {
  floorHalfDepth: number;
  floorHalfWidth: number;
  teleportX: number;
  teleportZ: number;
  transitionInsetX: number;
  transitionInsetZ: number;
  wallHalfDepth: number;
  wallHalfWidth: number;
}

export const defaultRoomBounds: RoomBounds = {
  floorHalfDepth,
  floorHalfWidth,
  teleportX: roomTeleportX,
  teleportZ: roomTeleportZ,
  transitionInsetX: roomTransitionInsetX,
  transitionInsetZ: roomTransitionInsetZ,
  wallHalfDepth,
  wallHalfWidth,
};

export const outsideRoomBounds: RoomBounds = {
  floorHalfDepth: 82,
  floorHalfWidth: 36,
  teleportX: 31,
  teleportZ: 76,
  transitionInsetX: 32.5,
  transitionInsetZ: 78,
  wallHalfDepth: 79.5,
  wallHalfWidth: 34,
};

export const outsideGateTriggerHalfWidth = 6.6;
export const outsideGateTriggerZ = -outsideRoomBounds.transitionInsetZ;

export const getRoomBounds = (layout: RoomTemplate["layout"]): RoomBounds =>
  layout === "outside-yard" ? outsideRoomBounds : defaultRoomBounds;

export const getStartRoomSpawnTarget = (
  templateId: string,
  bounds: RoomBounds
): Vec3 => {
  if (templateId === "outside-start") {
    return [0, 1.1, bounds.teleportZ * 0.92];
  }

  if (templateId === "core-prison") {
    return [0, 1.1, corePrisonSealCenterZ];
  }

  return [0, 1.1, 0];
};

export const getRoomEntryTarget = (
  entryDirection: DungeonRoomDirection,
  y: number,
  bounds: RoomBounds
): Vec3 => {
  if (entryDirection === "east") {
    return [bounds.teleportX, y, 0];
  }

  if (entryDirection === "west") {
    return [-bounds.teleportX, y, 0];
  }

  return [
    0,
    y,
    entryDirection === "south" ? bounds.teleportZ : -bounds.teleportZ,
  ];
};

export const floorThemes = {
  check: {
    even: "#2b312f",
    odd: "#191e1d",
    trim: "#44433b",
  },
  ember: {
    even: "#3a3026",
    odd: "#211a14",
    trim: "#61492f",
  },
  steel: {
    even: "#34383a",
    odd: "#202426",
    trim: "#58554d",
  },
} satisfies Record<FloorTheme, SceneFloorPalette>;

export const wallThemes = {
  aqua: {
    horizontal: "#354047",
    vertical: "#222b31",
  },
  brass: {
    horizontal: "#6d5431",
    vertical: "#42321e",
  },
  foundry: {
    horizontal: "#3b3025",
    vertical: "#241d17",
  },
} satisfies Record<WallTheme, SceneWallPalette>;

export interface SceneRoomSkin {
  doorColor: string;
  doorEmissive: string;
  doorSealColor: string;
  floorTheme: FloorTheme;
  trimColor: string;
  wallLamps: boolean;
  wallStyle: WallStyle;
  wallTheme: WallTheme;
}

export const roomSkins = {
  boss: {
    doorColor: "#f0b15f",
    doorEmissive: "#ff8f42",
    doorSealColor: "#ffb35f",
    floorTheme: "ember",
    trimColor: "#6f5532",
    wallLamps: true,
    wallStyle: "mechanic",
    wallTheme: "foundry",
  },
  foundry: {
    doorColor: "#d49a55",
    doorEmissive: "#ff9b46",
    doorSealColor: "#ffc06d",
    floorTheme: "ember",
    trimColor: "#5d4528",
    wallLamps: true,
    wallStyle: "mechanic",
    wallTheme: "foundry",
  },
  outside: {
    doorColor: "#a68a55",
    doorEmissive: "#e0b15e",
    doorSealColor: "#c0a66b",
    floorTheme: "steel",
    trimColor: "#76613a",
    wallLamps: false,
    wallStyle: "mechanic",
    wallTheme: "aqua",
  },
  treasure: {
    doorColor: "#d7a84f",
    doorEmissive: "#ffd166",
    doorSealColor: "#ffd166",
    floorTheme: "steel",
    trimColor: "#7b6430",
    wallLamps: true,
    wallStyle: "mechanic",
    wallTheme: "brass",
  },
} satisfies Record<RoomSkinId, SceneRoomSkin>;

const getDefaultRoomSkinId = (room: DungeonRoom): RoomSkinId => {
  if (room.kind === "boss") {
    return "boss";
  }

  if (room.kind === "treasure") {
    return "treasure";
  }

  return "foundry";
};

export const getRoomSkin = (
  room: DungeonRoom,
  template: RoomTemplate
): SceneRoomSkin => roomSkins[template.skin ?? getDefaultRoomSkinId(room)];

export const gearTeeth: SceneGearTooth[] = Array.from(
  { length: 10 },
  (_, index) => {
    const rotation = (index / 10) * Math.PI * 2;

    return {
      rotation,
      x: Math.cos(rotation),
      y: Math.sin(rotation),
    };
  }
);

export const treasureGearMounts: SceneTreasureGearMount[] = [];

export const bossGearMounts: SceneBossGearMount[] = [
  { color: "#ffd166", position: [-5.4, 3.3, -7.72], size: 1.56 },
  { color: "#ffd166", position: [5.4, 3.3, -7.72], size: 1.56 },
  { color: "#ff9f68", position: [0, 2.55, -7.68], size: 2.05 },
];

export const clampToRoom = (
  position: Vec3,
  radius: number,
  bounds = defaultRoomBounds
): Vec3 => [
  Math.max(
    -bounds.wallHalfWidth + wallThickness + radius,
    Math.min(bounds.wallHalfWidth - wallThickness - radius, position[0])
  ),
  position[1],
  Math.max(
    -bounds.wallHalfDepth + wallThickness + radius,
    Math.min(bounds.wallHalfDepth - wallThickness - radius, position[2])
  ),
];

export const getRoomPlatforms = (
  layout: RoomTemplate["layout"]
): RoomPlatform[] => {
  if (layout === "catwalk") {
    return [
      {
        args: [1.1, 0.18, 4.5],
        color: "#38556f",
        conveyor: [0, 0, 3.74],
        id: "catwalk-center",
        position: [0, 0.18, 0],
      },
      {
        args: [0.9, 0.16, 3.6],
        color: "#31495f",
        conveyor: [0, 0, -3.3],
        id: "catwalk-left",
        position: [-3.8, 0.16, -0.4],
      },
      {
        args: [0.9, 0.16, 3.6],
        color: "#31495f",
        conveyor: [0, 0, -3.3],
        id: "catwalk-right",
        position: [3.8, 0.16, 0.4],
      },
    ];
  }

  if (layout === "lava-lane") {
    return [
      {
        args: [0.72, 0.18, 0.72],
        color: "#476a7d",
        id: "lane-step-left",
        position: [-4.2, 0.18, 0],
      },
      {
        args: [0.72, 0.18, 0.72],
        color: "#476a7d",
        id: "lane-step-right",
        position: [4.2, 0.18, 0],
      },
    ];
  }

  if (layout === "lava-ring") {
    return [
      {
        args: [0.8, 0.18, 0.8],
        color: "#476a7d",
        id: "ring-step-north",
        position: [0, 0.18, -2.8],
      },
      {
        args: [0.8, 0.18, 0.8],
        color: "#476a7d",
        id: "ring-step-south",
        position: [0, 0.18, 2.8],
      },
      {
        args: [0.8, 0.18, 0.8],
        color: "#476a7d",
        id: "ring-step-west",
        position: [-2.8, 0.18, 0],
      },
      {
        args: [0.8, 0.18, 0.8],
        color: "#476a7d",
        id: "ring-step-east",
        position: [2.8, 0.18, 0],
      },
    ];
  }

  if (layout === "lava-bridge") {
    return [
      {
        args: [0.78, 0.18, 0.78],
        color: "#4c6d80",
        id: "bridge-pad-west",
        position: [-4.8, 0.18, 0],
      },
      {
        args: [0.78, 0.18, 0.78],
        color: "#4c6d80",
        id: "bridge-pad-mid",
        position: [0, 0.18, 0],
      },
      {
        args: [0.78, 0.18, 0.78],
        color: "#4c6d80",
        id: "bridge-pad-east",
        position: [4.8, 0.18, 0],
      },
    ];
  }

  if (layout === "lava-cross") {
    return [
      {
        args: [0.88, 0.18, 0.88],
        color: "#4c6d80",
        id: "cross-pad-center",
        position: [0, 0.18, 0],
      },
      {
        args: [0.88, 0.18, 0.88],
        color: "#4c6d80",
        id: "cross-pad-nw",
        position: [-4.6, 0.18, -3.3],
      },
      {
        args: [0.88, 0.18, 0.88],
        color: "#4c6d80",
        id: "cross-pad-ne",
        position: [4.6, 0.18, -3.3],
      },
      {
        args: [0.88, 0.18, 0.88],
        color: "#4c6d80",
        id: "cross-pad-sw",
        position: [-4.6, 0.18, 3.3],
      },
      {
        args: [0.88, 0.18, 0.88],
        color: "#4c6d80",
        id: "cross-pad-se",
        position: [4.6, 0.18, 3.3],
      },
    ];
  }

  if (layout === "zigzag") {
    return [
      {
        args: [1.05, 0.18, 0.7],
        color: "#38556f",
        id: "zigzag-0",
        position: [-4.6, 0.18, -2.6],
      },
      {
        args: [1.05, 0.18, 0.7],
        color: "#38556f",
        id: "zigzag-1",
        position: [-1.6, 0.18, -0.9],
      },
      {
        args: [1.05, 0.18, 0.7],
        color: "#38556f",
        id: "zigzag-2",
        position: [1.3, 0.18, 0.9],
      },
      {
        args: [1.05, 0.18, 0.7],
        color: "#38556f",
        id: "zigzag-3",
        position: [4.3, 0.18, 2.6],
      },
    ];
  }

  if (layout === "lava-gauntlet") {
    return [
      {
        args: [1.1, 0.18, 0.78],
        color: "#476a7d",
        id: "gauntlet-0",
        position: [-5.2, 0.18, -2.9],
      },
      {
        args: [0.92, 0.18, 0.7],
        color: "#476a7d",
        id: "gauntlet-1",
        position: [-1.9, 0.18, -0.9],
      },
      {
        args: [0.96, 0.18, 0.7],
        color: "#476a7d",
        id: "gauntlet-2",
        position: [1.4, 0.18, 0.9],
      },
      {
        args: [1.1, 0.18, 0.78],
        color: "#476a7d",
        id: "gauntlet-3",
        position: [5.1, 0.18, 2.9],
      },
    ];
  }

  if (layout === "blocks") {
    return [
      {
        args: [1.25, 0.55, 1.25],
        color: "#46667c",
        id: "blocks-left",
        position: [-4.8, 0.55, -2.4],
      },
      {
        args: [1.55, 0.95, 1.55],
        color: "#355268",
        id: "blocks-mid",
        position: [0, 0.95, 0],
      },
      {
        args: [1.2, 0.7, 1.2],
        color: "#46667c",
        id: "blocks-right",
        position: [4.8, 0.7, 2.8],
      },
    ];
  }

  if (layout === "hexes") {
    return [
      {
        args: [1.08, 0.46, 1.08],
        color: "#55738a",
        id: "hex-north",
        position: [0, 0.46, -3.2],
        shape: "hex",
      },
      {
        args: [1.16, 0.72, 1.16],
        color: "#3f627a",
        id: "hex-center",
        position: [-3.2, 0.72, 0.2],
        shape: "hex",
      },
      {
        args: [1.16, 0.72, 1.16],
        color: "#3f627a",
        id: "hex-east",
        position: [3.2, 0.72, 0.2],
        shape: "hex",
      },
      {
        args: [1.08, 0.46, 1.08],
        color: "#55738a",
        id: "hex-south",
        position: [0, 0.46, 3.4],
        shape: "hex",
      },
    ];
  }

  if (layout === "boss-foundry") {
    return [
      {
        args: [2.2, 0.2, 1.2],
        color: "#2f4559",
        id: "boss-dais",
        position: [0, 0.2, -5.4],
      },
    ];
  }

  if (layout === "boss-crucible") {
    return [
      {
        args: [1.8, 0.2, 1],
        color: "#425a6a",
        id: "crucible-dais",
        position: [0, 0.2, -5.1],
      },
      {
        args: [1.15, 0.18, 2.2],
        color: "#31495f",
        conveyor: [0, 0, 3.08],
        id: "crucible-left",
        position: [-4.1, 0.18, 1.6],
      },
      {
        args: [1.15, 0.18, 2.2],
        color: "#31495f",
        conveyor: [0, 0, -3.08],
        id: "crucible-right",
        position: [4.1, 0.18, 1.6],
      },
    ];
  }

  return [];
};

export const getConveyorVelocity = (
  platforms: RoomPlatform[],
  position: Vec3,
  radius = 0
): Vec3 | null => {
  for (const platform of platforms) {
    if (!platform.conveyor) {
      continue;
    }

    const top = platform.position[1] + platform.args[1];

    if (
      position[1] < top + 0.1 ||
      position[1] > top + 1.15 ||
      Math.abs(position[0] - platform.position[0]) >
        platform.args[0] + radius ||
      Math.abs(position[2] - platform.position[2]) > platform.args[2] + radius
    ) {
      continue;
    }

    return platform.conveyor;
  }

  return null;
};

export const getRoomHazards = (
  layout: RoomTemplate["layout"]
): RoomHazard[] => {
  if (layout === "lava-lane") {
    return [
      {
        args: [6.5, 0.03, 1.7],
        color: "#ff7b54",
        damage: 1,
        id: "lava-lane-main",
        position: [0, 0.03, 0],
      },
    ];
  }

  if (layout === "lava-bridge") {
    return [
      {
        args: [2.7, 0.03, 5.1],
        color: "#ff7b54",
        damage: 1,
        id: "lava-bridge-left",
        position: [-2.35, 0.03, 0],
      },
      {
        args: [2.7, 0.03, 5.1],
        color: "#ff8f5e",
        damage: 1,
        id: "lava-bridge-right",
        position: [2.35, 0.03, 0],
      },
    ];
  }

  if (layout === "lava-cross") {
    return [
      {
        args: [5.6, 0.03, 1.55],
        color: "#ff7b54",
        damage: 1,
        id: "lava-cross-horizontal",
        position: [0, 0.03, 0],
      },
      {
        args: [1.55, 0.03, 4.9],
        color: "#ff8f5e",
        damage: 1,
        id: "lava-cross-vertical",
        position: [0, 0.03, 0],
      },
    ];
  }

  if (layout === "lava-ring") {
    return [
      {
        args: [4.4, 0.03, 0.95],
        color: "#ff7b54",
        damage: 1,
        id: "lava-ring-horizontal",
        position: [0, 0.03, 0],
      },
      {
        args: [0.95, 0.03, 4.4],
        color: "#ff8f5e",
        damage: 1,
        id: "lava-ring-vertical",
        position: [0, 0.03, 0],
      },
    ];
  }

  if (layout === "boss-foundry") {
    return [
      {
        args: [1.6, 0.03, 4.6],
        color: "#ff8f5e",
        damage: 1,
        id: "boss-lava-left",
        position: [-4.9, 0.03, -0.2],
      },
      {
        args: [1.6, 0.03, 4.6],
        color: "#ff8f5e",
        damage: 1,
        id: "boss-lava-right",
        position: [4.9, 0.03, -0.2],
      },
    ];
  }

  if (layout === "lava-gauntlet") {
    return [
      {
        args: [2.7, 0.03, 2.2],
        color: "#ff7b54",
        damage: 1,
        id: "gauntlet-lava-left",
        position: [-3.1, 0.03, -3.6],
      },
      {
        args: [2.2, 0.03, 2.6],
        color: "#ff8f5e",
        damage: 1,
        id: "gauntlet-lava-mid",
        position: [0.3, 0.03, 0],
      },
      {
        args: [2.8, 0.03, 2.2],
        color: "#ff7b54",
        damage: 1,
        id: "gauntlet-lava-right",
        position: [3.4, 0.03, 3.6],
      },
    ];
  }

  if (layout === "boss-crucible") {
    return [
      {
        args: [1.9, 0.03, 5.2],
        color: "#ff8f5e",
        damage: 1,
        id: "crucible-lava-left",
        position: [-5.2, 0.03, -0.1],
      },
      {
        args: [1.9, 0.03, 5.2],
        color: "#ff8f5e",
        damage: 1,
        id: "crucible-lava-right",
        position: [5.2, 0.03, -0.1],
      },
      {
        args: [2.2, 0.03, 1.4],
        color: "#ff7b54",
        damage: 1,
        id: "crucible-lava-center",
        position: [0, 0.03, 1.9],
      },
    ];
  }

  return [];
};

export const createEnemyPositions = (
  pattern: RoomTemplate["spawnPattern"],
  count: number
): Vec3[] => {
  if (pattern === "outside") {
    // Pull spawn positions from the outside-chunk plan so guards sit
    // at their POI rings and wanderers roam the grasslands. `count`
    // is ignored — the plan decides how many enemies the chunk
    // supports.
    const spawns = outsidePlan().enemySpawns;
    return spawns.map((s) => [s.x, s.y + enemyFloorY, s.z] as Vec3);
  }

  if (pattern === "arc") {
    return Array.from({ length: count }, (_, index) => {
      const spread = count === 1 ? 0 : (index / (count - 1) - 0.5) * 6.8;

      return [spread, enemyFloorY, -6.1 + Math.abs(spread) * 0.24];
    });
  }

  if (pattern === "boss") {
    return [[0, enemyFloorY, -5.6]];
  }

  if (pattern === "crossfire") {
    return [
      [-6.4, enemyFloorY, -4.8],
      [6.4, enemyFloorY, -4.8],
      [-6.4, enemyFloorY, 3.6],
      [6.4, enemyFloorY, 3.6],
    ].slice(0, count) as Vec3[];
  }

  if (pattern === "line") {
    return Array.from({ length: count }, (_, index) => {
      const spread =
        count === 1
          ? 0
          : (index / (count - 1) - 0.5) * Math.min(7, count * 2.2);

      return [spread, enemyFloorY, -5.4];
    });
  }

  if (pattern === "pincer") {
    return [
      [-5.6, enemyFloorY, -4.8],
      [5.6, enemyFloorY, -4.8],
      [-6.4, enemyFloorY, 0],
      [6.4, enemyFloorY, 0],
      [0, enemyFloorY, -6.2],
    ].slice(0, count) as Vec3[];
  }

  return [];
};

export const pushSpawnsFromEntry = (
  positions: Vec3[],
  entryDirection: DungeonRoomDirection
) =>
  positions.map((position) => {
    if (entryDirection === "south" && position[2] > -1.4) {
      return [position[0], position[1], position[2] - 2.8] as Vec3;
    }

    if (entryDirection === "north" && position[2] < 1.4) {
      return [position[0], position[1], position[2] + 2.8] as Vec3;
    }

    if (entryDirection === "west" && position[0] < 1.8) {
      return [position[0] + 3.2, position[1], position[2]] as Vec3;
    }

    if (entryDirection === "east" && position[0] > -1.8) {
      return [position[0] - 3.2, position[1], position[2]] as Vec3;
    }

    return position;
  });

export const createRoomWalls = (
  room: DungeonRoom,
  currentWallPalette: SceneWallPalette,
  skin?: SceneRoomSkin
): StaticWall[] => {
  const walls: StaticWall[] = [];
  const layout = roomTemplateById[room.templateId].layout;
  const bounds = getRoomBounds(layout);
  const outside = layout === "outside-yard";
  const palette = skin ? wallThemes[skin.wallTheme] : currentWallPalette;
  const segmentHalfDepth = (bounds.wallHalfDepth - doorwayHalfSpan) * 0.5;
  const segmentHalfWidth = (bounds.wallHalfWidth - doorwayHalfSpan) * 0.5;
  const segmentOffsetDepth = doorwayHalfSpan + segmentHalfDepth;
  const segmentOffsetWidth = doorwayHalfSpan + segmentHalfWidth;
  const wallSkin = skin
    ? {
        lamp: skin.wallLamps,
        style: skin.wallStyle,
        trimColor: skin.trimColor,
      }
    : {};

  const pushHorizontalWall = (
    id: string,
    x: number,
    z: number,
    opacity = 1
  ) => {
    walls.push({
      args: [segmentHalfWidth, wallHalfHeight, wallThickness],
      color: palette.horizontal,
      facing: z < 0 ? "south" : "north",
      id,
      opacity: outside ? 0 : opacity,
      position: [x, wallY, z],
      ...wallSkin,
    });
  };

  const pushVerticalWall = (id: string, x: number, z: number, opacity = 1) => {
    walls.push({
      args: [wallThickness, wallHalfHeight, segmentHalfDepth],
      color: palette.vertical,
      facing: x < 0 ? "east" : "west",
      id,
      opacity: outside ? 0 : opacity,
      position: [x, wallY, z],
      ...wallSkin,
    });
  };

  if (room.exits.north) {
    pushHorizontalWall(
      "north-west",
      -segmentOffsetWidth,
      -bounds.wallHalfDepth
    );
    pushHorizontalWall("north-east", segmentOffsetWidth, -bounds.wallHalfDepth);
  } else {
    walls.push({
      args: [bounds.wallHalfWidth, wallHalfHeight, wallThickness],
      color: palette.horizontal,
      facing: "south",
      id: "north",
      opacity: outside ? 0 : undefined,
      position: [0, wallY, -bounds.wallHalfDepth],
      ...wallSkin,
    });
  }

  if (room.exits.south) {
    pushHorizontalWall(
      "south-west",
      -segmentOffsetWidth,
      bounds.wallHalfDepth,
      0.2
    );
    pushHorizontalWall(
      "south-east",
      segmentOffsetWidth,
      bounds.wallHalfDepth,
      0.2
    );
  } else {
    walls.push({
      args: [bounds.wallHalfWidth, wallHalfHeight, wallThickness],
      color: palette.horizontal,
      facing: "north",
      id: "south",
      opacity: outside ? 0 : 0.2,
      position: [0, wallY, bounds.wallHalfDepth],
      ...wallSkin,
    });
  }

  if (room.exits.west) {
    pushVerticalWall("west-north", -bounds.wallHalfWidth, -segmentOffsetDepth);
    pushVerticalWall("west-south", -bounds.wallHalfWidth, segmentOffsetDepth);
  } else {
    walls.push({
      args: [wallThickness, wallHalfHeight, bounds.wallHalfDepth],
      color: palette.vertical,
      facing: "east",
      id: "west",
      opacity: outside ? 0 : undefined,
      position: [-bounds.wallHalfWidth, wallY, 0],
      ...wallSkin,
    });
  }

  if (room.exits.east) {
    pushVerticalWall("east-north", bounds.wallHalfWidth, -segmentOffsetDepth);
    pushVerticalWall("east-south", bounds.wallHalfWidth, segmentOffsetDepth);
  } else {
    walls.push({
      args: [wallThickness, wallHalfHeight, bounds.wallHalfDepth],
      color: palette.vertical,
      facing: "west",
      id: "east",
      opacity: outside ? 0 : undefined,
      position: [bounds.wallHalfWidth, wallY, 0],
      ...wallSkin,
    });
  }

  return walls;
};

export const createDoorMarkers = (
  room: DungeonRoom,
  dungeon: DungeonLayout,
  skin?: SceneRoomSkin
): DoorMarker[] =>
  (Object.entries(room.exits) as [DungeonRoomDirection, string][])
    .filter(([, target]) => Boolean(target))
    .map(([direction, target]) => {
      const bounds = getRoomBounds(roomTemplateById[room.templateId].layout);
      const targetRoom = dungeon.rooms[target];
      let position: Vec3;

      if (direction === "north") {
        position = [0, 0.03, -bounds.transitionInsetZ - 0.3];
      } else if (direction === "south") {
        position = [0, 0.03, bounds.transitionInsetZ + 0.3];
      } else if (direction === "west") {
        position = [-bounds.transitionInsetX - 0.3, 0.03, 0];
      } else {
        position = [bounds.transitionInsetX + 0.3, 0.03, 0];
      }

      let color = skin?.doorColor ?? "#8ac6ff";

      if (targetRoom.kind === "boss") {
        color = skin?.doorEmissive ?? "#ffd166";
      } else if (targetRoom.kind === "treasure") {
        color = skin?.doorSealColor ?? "#57d6a5";
      }

      return {
        args:
          direction === "east" || direction === "west"
            ? [0.45, 0.05, 0.95]
            : [0.95, 0.05, 0.45],
        boss: targetRoom.kind === "boss",
        color,
        emissive: skin?.doorEmissive,
        id: `${direction}-door`,
        position,
        style: skin?.wallStyle,
        trimColor: skin?.trimColor,
      };
    });

export const createDoorSeals = (
  room: DungeonRoom,
  skin?: SceneRoomSkin
): DoorSeal[] => {
  const bounds = getRoomBounds(roomTemplateById[room.templateId].layout);

  return (Object.keys(room.exits) as DungeonRoomDirection[]).map(
    (direction) => {
      let position: Vec3;

      if (direction === "north") {
        position = [0, 2.1, -bounds.wallHalfDepth];
      } else if (direction === "south") {
        position = [0, 2.1, bounds.wallHalfDepth];
      } else if (direction === "west") {
        position = [-bounds.wallHalfWidth, 2.1, 0];
      } else {
        position = [bounds.wallHalfWidth, 2.1, 0];
      }

      return {
        args:
          direction === "east" || direction === "west"
            ? [0.16, 2.2, doorwayHalfSpan]
            : [doorwayHalfSpan, 2.2, 0.16],
        color: skin?.doorSealColor ?? "#9dd6ff",
        emissive: skin?.doorEmissive,
        id: `${direction}-seal`,
        position,
        style: skin?.wallStyle,
        trimColor: skin?.trimColor,
      };
    }
  );
};

export const getTransition = (room: DungeonRoom, position: Vec3) => {
  const [x, y, z] = position;
  const bounds = getRoomBounds(roomTemplateById[room.templateId].layout);

  if (
    room.exits.east &&
    x >= bounds.transitionInsetX &&
    Math.abs(z) < doorwayHalfSpan
  ) {
    return {
      roomId: room.exits.east,
      target: [-roomTeleportX, y, 0] as Vec3,
    };
  }

  if (
    room.exits.west &&
    x <= -bounds.transitionInsetX &&
    Math.abs(z) < doorwayHalfSpan
  ) {
    return {
      roomId: room.exits.west,
      target: [roomTeleportX, y, 0] as Vec3,
    };
  }

  if (
    room.exits.north &&
    z <= -bounds.transitionInsetZ &&
    Math.abs(x) < doorwayHalfSpan
  ) {
    return {
      roomId: room.exits.north,
      target: [0, y, roomTeleportZ] as Vec3,
    };
  }

  if (
    room.exits.south &&
    z >= bounds.transitionInsetZ &&
    Math.abs(x) < doorwayHalfSpan
  ) {
    return {
      roomId: room.exits.south,
      target: [0, y, -roomTeleportZ] as Vec3,
    };
  }

  return null;
};

export const getRevealedDoors = (room: DungeonRoom) =>
  Object.keys(room.exits) as DungeonRoomDirection[];

export const createOutsidePickups = (now = performance.now()): ActivePickup[] =>
  [
    {
      createdAt: now,
      id: "outside-gear-south",
      kind: "gear",
      position: [-19, 0.54, 33],
      radius: 0.38,
      value: 2,
    },
    {
      createdAt: now,
      id: "outside-heal-south",
      kind: "heal",
      position: [-13, 0.54, 39],
      radius: 0.46,
      value: 1,
    },
    {
      createdAt: now,
      id: "outside-gear-mid",
      kind: "gear",
      position: [20, 0.54, -16],
      radius: 0.38,
      value: 2,
    },
    {
      createdAt: now,
      id: "outside-heal-mid",
      kind: "heal",
      position: [14, 0.54, -10],
      radius: 0.46,
      value: 1,
    },
    {
      createdAt: now,
      id: "outside-gear-north",
      kind: "gear",
      position: [-18, 0.54, -58],
      radius: 0.38,
      value: 3,
    },
    {
      createdAt: now,
      id: "outside-heal-north",
      kind: "heal",
      position: [-11, 0.54, -64],
      radius: 0.46,
      value: 1,
    },
  ] satisfies ActivePickup[];

export const getEntryDirectionFromTarget = (
  target: Vec3
): DungeonRoomDirection => {
  if (Math.abs(target[0]) > Math.abs(target[2])) {
    return target[0] < 0 ? "west" : "east";
  }

  return target[2] > 0 ? "south" : "north";
};

export const createRoomEnemies = (
  room: DungeonRoom,
  template: RoomTemplate,
  currentEntryDirection: DungeonRoomDirection,
  clearedEnemyRoomSet: Set<string>,
  now = performance.now()
): ActiveEnemy[] => {
  if (
    template.spawnPattern === "none" ||
    !template.enemyTemplateId ||
    clearedEnemyRoomSet.has(room.id)
  ) {
    return [];
  }

  const enemyTemplate = enemyTemplateById[template.enemyTemplateId];
  const basePositions = createEnemyPositions(
    template.spawnPattern,
    template.enemyCount
  );
  const positions =
    template.spawnPattern === "outside"
      ? basePositions
      : pushSpawnsFromEntry(basePositions, currentEntryDirection);
  const initialActionAt = (
    intervalMs: number | undefined,
    initialDelayMs: number | undefined,
    staggerMs: number,
    fallback: number
  ) =>
    typeof intervalMs === "number" && typeof initialDelayMs === "number"
      ? now - intervalMs + initialDelayMs + staggerMs
      : fallback;

  const makeEnemy = (
    nextEnemyTemplate: EnemyTemplate,
    position: Vec3,
    index: number,
    idSuffix = String(index)
  ): ActiveEnemy => {
    const outsidePatrol = template.spawnPattern === "outside";
    const gateKeeper = nextEnemyTemplate.id === "gate-keeper";
    const patrolRadius = gateKeeper ? 1.25 : 2.7 + (index % 3) * 0.9;
    const patrolSpeed = gateKeeper ? 0.000_22 : 0.000_36 + index * 0.000_035;

    return {
      behavior: nextEnemyTemplate.behavior,
      bombArmMs: nextEnemyTemplate.bombArmMs,
      bombColor: nextEnemyTemplate.bombColor,
      bombCooldownMs: nextEnemyTemplate.bombCooldownMs,
      bombCount: nextEnemyTemplate.bombCount,
      bombDamage: nextEnemyTemplate.bombDamage,
      bombDelivery: nextEnemyTemplate.bombDelivery,
      bombExplosionRadius: nextEnemyTemplate.bombExplosionRadius,
      bombHp: nextEnemyTemplate.bombHp,
      bombInitialDelayMs: nextEnemyTemplate.bombInitialDelayMs,
      bombMaxActive: nextEnemyTemplate.bombMaxActive,
      bombRadius: nextEnemyTemplate.bombRadius,
      bombSpeed: nextEnemyTemplate.bombSpeed,
      bombTtlMs: nextEnemyTemplate.bombTtlMs,
      color: nextEnemyTemplate.color,
      hp: nextEnemyTemplate.hp,
      id: `${room.id}-${template.id}-${idSuffix}`,
      knockbackVelocity: [0, 0, 0],
      lastBombAt: initialActionAt(
        nextEnemyTemplate.bombCooldownMs,
        nextEnemyTemplate.bombInitialDelayMs,
        index * 180,
        gateKeeper ? now - 3200 : now - index * 180
      ),
      lastHitAt: 0,
      lastShotAt: initialActionAt(
        nextEnemyTemplate.shotIntervalMs,
        nextEnemyTemplate.shotInitialDelayMs,
        index * 180,
        now - index * 180
      ),
      maxHp: nextEnemyTemplate.hp,
      moveSpeed: nextEnemyTemplate.moveSpeed,
      patrolCenter: outsidePatrol ? position : undefined,
      patrolRadius: outsidePatrol ? patrolRadius : undefined,
      patrolSpeed: outsidePatrol ? patrolSpeed : undefined,
      position,
      preferredRange: nextEnemyTemplate.preferredRange,
      radius: nextEnemyTemplate.radius,
      shotColor: nextEnemyTemplate.shotColor,
      shotDamage: nextEnemyTemplate.shotDamage,
      shotInitialDelayMs: nextEnemyTemplate.shotInitialDelayMs,
      shotIntervalMs: nextEnemyTemplate.shotIntervalMs,
      shotKind: nextEnemyTemplate.shotKind,
      shotMaxActive: nextEnemyTemplate.shotMaxActive,
      shotSpeed: nextEnemyTemplate.shotSpeed,
      stealthMode: nextEnemyTemplate.stealthRevealMs ? "hidden" : undefined,
      stealthMoveSpeed: nextEnemyTemplate.stealthMoveSpeed,
      stealthRevealMs: nextEnemyTemplate.stealthRevealMs,
      stealthWindupMs: nextEnemyTemplate.stealthWindupMs,
      templateId: nextEnemyTemplate.id,
      touchDamage: nextEnemyTemplate.touchDamage,
      touchIntervalMs: nextEnemyTemplate.touchIntervalMs,
    };
  };
  const enemies = positions.map((position, index) =>
    makeEnemy(enemyTemplate, position, index)
  );

  if (template.id === "outside-start") {
    const gateKeeperTemplate = enemyTemplateById["gate-keeper"];
    const gateKeeperPosition: Vec3 = [
      0,
      outsidePlan().sampleHeight(0, -68.5) + enemyFloorY,
      -68.5,
    ];

    enemies.push(
      makeEnemy(
        gateKeeperTemplate,
        gateKeeperPosition,
        enemies.length,
        "gate-keeper"
      )
    );
  }

  return enemies;
};
