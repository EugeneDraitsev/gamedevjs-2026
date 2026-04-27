import {
  type MachineModuleId,
  machineRewardModuleIds,
} from "$lib/config/machine-modules";
import {
  type DungeonRoomKind,
  roomTemplateById,
} from "$lib/config/room-templates";
import {
  initialDungeonFloor,
  normalizeRunFloorIndex,
  outsideFloor,
} from "$lib/config/run-floor";

export type DungeonRoomDirection = "east" | "north" | "south" | "west";

export interface DungeonRoom {
  artifactType?: MachineModuleId;
  exits: Partial<Record<DungeonRoomDirection, string>>;
  grid: [number, number];
  id: string;
  kind: DungeonRoomKind;
  label: string;
  templateId: string;
}

export interface DungeonLayout {
  floor: number;
  initialModules: MachineModuleId[];
  rooms: Record<string, DungeonRoom>;
  seed: string;
  startRoomId: string;
}

const directions = [
  { dx: 1, dy: 0, key: "east" },
  { dx: 0, dy: -1, key: "north" },
  { dx: 0, dy: 1, key: "south" },
  { dx: -1, dy: 0, key: "west" },
] as const satisfies {
  dx: number;
  dy: number;
  key: DungeonRoomDirection;
}[];

const oppositeDirection: Record<DungeonRoomDirection, DungeonRoomDirection> = {
  east: "west",
  north: "south",
  south: "north",
  west: "east",
};

export const floor1NormalTemplateIds = [
  "normal-line",
  "normal-pincer",
  "normal-crossfire",
  "normal-arc",
  "normal-lava-lane",
  "normal-lava-ring",
  "normal-lava-bridge",
  "normal-lava-cross",
  "normal-catwalk",
  "normal-zigzag",
  "normal-ricochet",
] as const;
export const floor2NormalTemplateIds = [
  "normal-furnace",
  "normal-relay",
  "normal-gauntlet",
  "normal-blocks",
  "normal-hexes",
  "normal-ricochet",
  "normal-veil",
  "normal-bombers",
  "normal-lava-bridge",
  "normal-lava-cross",
  "normal-zigzag",
] as const;
export const floor2RequiredNormalTemplateIds = [
  "normal-ricochet",
  "normal-veil",
  "normal-bombers",
] as const;

const getCellKey = ([x, y]: [number, number]) => `${x}:${y}`;
const dungeonFloorSeedSuffixPattern = /-f-?\d+$/;

const createSeededRandom = (seed: string) => {
  let state =
    seed.split("").reduce((total, char, index) => {
      return total + char.charCodeAt(0) * (index + 1);
    }, 1) || 1;

  return () => {
    const value = Math.sin(state) * 10_000;

    state += 1;

    return value - Math.floor(value);
  };
};

const sampleUnique = <T>(items: T[], count: number, random: () => number) => {
  const pool = [...items];
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  return picked;
};

const connectRoomsViaExits = (
  left: DungeonRoom,
  right: DungeonRoom,
  direction: DungeonRoomDirection
) => {
  left.exits[direction] = right.id;
  right.exits[oppositeDirection[direction]] = left.id;
};

interface FillerRoomCandidate {
  grid: [number, number];
  neighborCount: number;
}

interface FloorShape {
  branchCount: number;
  branchLengthBase: number;
  branchLengthVariance: number;
  fillerRoomMax: number;
  fillerRoomMin: number;
  straightPreference: number;
}

const getFloorShape = (runFloor: number): FloorShape => {
  if (runFloor === initialDungeonFloor) {
    // First dungeon floor stays compact and tutorial-shaped — short
    // branches, mostly straight, just a hint of filler. Targets ~12-15
    // rooms total (start + polygon + boss + treasure + shop + branches
    // + filler).
    return {
      branchCount: 3,
      branchLengthBase: 1,
      branchLengthVariance: 1,
      fillerRoomMax: 2,
      fillerRoomMin: 1,
      straightPreference: 0.85,
    };
  }

  // Subsequent floors feel like a small dungeon: three meaningful
  // branches that turn about half the time and a modest sprinkle of
  // filler so the connect-adjacent pass still produces real loops
  // without ballooning the layout. Targets ~17-21 rooms total.
  return {
    branchCount: 3,
    branchLengthBase: 2,
    branchLengthVariance: 2,
    fillerRoomMax: 3,
    fillerRoomMin: 2,
    straightPreference: 0.55,
  };
};

const collectFillerCandidates = (
  rooms: Record<string, DungeonRoom>,
  occupied: Map<string, string>
) => {
  const candidates = new Map<string, FillerRoomCandidate>();

  for (const room of Object.values(rooms)) {
    if (room.kind === "polygon") {
      continue;
    }

    for (const direction of directions) {
      const cell: [number, number] = [
        room.grid[0] + direction.dx,
        room.grid[1] + direction.dy,
      ];
      const cellKey = getCellKey(cell);

      if (occupied.has(cellKey) || candidates.has(cellKey)) {
        continue;
      }

      const neighborCount = directions.filter((other) =>
        occupied.has(getCellKey([cell[0] + other.dx, cell[1] + other.dy]))
      ).length;

      candidates.set(cellKey, { grid: cell, neighborCount });
    }
  }

  return candidates;
};

const populateFillerRooms = (
  rooms: Record<string, DungeonRoom>,
  occupied: Map<string, string>,
  random: () => number,
  fillerRoomCount: number,
  spawnFiller: (grid: [number, number]) => void
) => {
  for (let filler = 0; filler < fillerRoomCount; filler += 1) {
    const candidates = collectFillerCandidates(rooms, occupied);

    if (candidates.size === 0) {
      break;
    }

    const sorted = [...candidates.values()].sort(
      (left, right) => right.neighborCount - left.neighborCount
    );
    const topHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
    const pick = topHalf[Math.floor(random() * topHalf.length)];

    spawnFiller(pick.grid);
  }
};

const connectAdjacentRooms = (
  rooms: Record<string, DungeonRoom>,
  occupied: Map<string, string>
) => {
  for (const room of Object.values(rooms)) {
    if (room.kind === "polygon") {
      continue;
    }

    for (const direction of directions) {
      if (room.exits[direction.key]) {
        continue;
      }

      const neighborId = occupied.get(
        getCellKey([room.grid[0] + direction.dx, room.grid[1] + direction.dy])
      );

      if (!neighborId) {
        continue;
      }

      const neighbor = rooms[neighborId];

      if (neighbor.kind === "polygon") {
        continue;
      }

      connectRoomsViaExits(room, neighbor, direction.key);
    }
  }
};

export const createDungeonLayout = (
  seed: string,
  floor = initialDungeonFloor
): DungeonLayout => {
  const runFloor = normalizeRunFloorIndex(floor);
  const random = createSeededRandom(seed);
  const rewardRandom = createSeededRandom(
    seed.replace(dungeonFloorSeedSuffixPattern, "")
  );
  const rewardModules = sampleUnique(
    machineRewardModuleIds,
    machineRewardModuleIds.length,
    rewardRandom
  );
  const rewardOffset = (runFloor - initialDungeonFloor) * 2;
  const rooms: Record<string, DungeonRoom> = {};
  const occupied = new Map<string, string>();
  let roomIndex = 0;

  const createRoom = (
    kind: DungeonRoomKind,
    grid: [number, number],
    templateId: string,
    artifactType?: MachineModuleId
  ) => {
    if (kind !== "polygon") {
      roomIndex += 1;
    }

    const id = kind === "polygon" ? "polygon" : `${kind}-${roomIndex}`;
    const template = roomTemplateById[templateId];

    rooms[id] = {
      artifactType,
      exits: {},
      grid,
      id,
      kind,
      label: template.label,
      templateId,
    };
    occupied.set(getCellKey(grid), id);

    return rooms[id];
  };

  const getFreeDirections = ([x, y]: [number, number]) =>
    directions.filter(
      ({ dx, dy }) => !occupied.has(getCellKey([x + dx, y + dy]))
    );

  const connectRooms = connectRoomsViaExits;

  if (runFloor === outsideFloor) {
    const outside = createRoom("normal", [0, 0], "outside-start");

    return {
      floor: runFloor,
      initialModules: [],
      rooms,
      seed,
      startRoomId: outside.id,
    };
  }

  const normalTemplatePool =
    runFloor === initialDungeonFloor
      ? floor1NormalTemplateIds
      : floor2NormalTemplateIds;
  const priorityNormalTemplateIds =
    runFloor === initialDungeonFloor
      ? []
      : sampleUnique(
          [...floor2RequiredNormalTemplateIds],
          floor2RequiredNormalTemplateIds.length,
          random
        );
  const sampleNormalTemplateId = () =>
    priorityNormalTemplateIds.shift() ??
    normalTemplatePool[Math.floor(random() * normalTemplatePool.length)];
  createRoom("polygon", [0, 1], "polygon-training");
  const start = createRoom(
    "normal",
    [0, 0],
    runFloor === initialDungeonFloor ? "core-prison" : "normal-empty"
  );

  const shape = getFloorShape(runFloor);
  const branches = sampleUnique(
    getFreeDirections(start.grid),
    shape.branchCount,
    random
  ).map((direction) => {
    const firstRoom = createRoom(
      "normal",
      [start.grid[0] + direction.dx, start.grid[1] + direction.dy],
      sampleNormalTemplateId()
    );

    connectRooms(start, firstRoom, direction.key);

    const rooms = [start, firstRoom];
    const stepCount =
      shape.branchLengthBase +
      Math.floor(random() * (shape.branchLengthVariance + 1));

    for (let step = 0; step < stepCount; step += 1) {
      const previous = rooms.at(-1) ?? firstRoom;
      const options = getFreeDirections(previous.grid);

      if (options.length === 0) {
        break;
      }

      const straight = options.find(
        (candidate) => candidate.key === direction.key
      );
      // Only take the straight option when the random roll says so AND
      // the option is actually available — otherwise pick any free
      // direction so branches snake through the grid instead of
      // shooting off in a single line.
      const nextDirection =
        straight && random() < shape.straightPreference
          ? straight
          : options[Math.floor(random() * options.length)];
      const nextRoom = createRoom(
        "normal",
        [
          previous.grid[0] + nextDirection.dx,
          previous.grid[1] + nextDirection.dy,
        ],
        sampleNormalTemplateId()
      );

      connectRooms(previous, nextRoom, nextDirection.key);
      rooms.push(nextRoom);
    }

    return { direction: direction.key, rooms };
  });
  const mainBranch = [...branches].sort(
    (left, right) => right.rooms.length - left.rooms.length
  )[0];
  const mainPath = mainBranch.rooms;

  const bossAnchor = mainPath.at(-1) ?? start;
  const bossOptions = getFreeDirections(bossAnchor.grid);
  const previousMainRoom = mainPath.at(-2) ?? start;
  const forwardDx = bossAnchor.grid[0] - previousMainRoom.grid[0];
  const forwardDy = bossAnchor.grid[1] - previousMainRoom.grid[1];
  const bossDirection =
    bossOptions.find(
      (option) => option.dx === forwardDx && option.dy === forwardDy
    ) ?? bossOptions[Math.floor(random() * bossOptions.length)];
  const boss = createRoom(
    "boss",
    [
      bossAnchor.grid[0] + bossDirection.dx,
      bossAnchor.grid[1] + bossDirection.dy,
    ],
    runFloor === initialDungeonFloor ? "boss-warden" : "boss-bomber",
    rewardModules[rewardOffset % rewardModules.length]
  );

  connectRooms(bossAnchor, boss, bossDirection.key);

  const sideBranches = branches.filter((branch) => branch !== mainBranch);
  const treasureAnchor =
    sampleUnique(sideBranches, sideBranches.length, random)
      .flatMap((branch) => [...branch.rooms].reverse())
      .find((room) => getFreeDirections(room.grid).length) ?? bossAnchor;
  const treasureOptions = getFreeDirections(treasureAnchor.grid);
  const treasureDirection =
    treasureOptions[Math.floor(random() * treasureOptions.length)];
  const treasure = createRoom(
    "treasure",
    [
      treasureAnchor.grid[0] + treasureDirection.dx,
      treasureAnchor.grid[1] + treasureDirection.dy,
    ],
    "treasure-artifact",
    rewardModules[(rewardOffset + 1) % rewardModules.length]
  );

  connectRooms(treasureAnchor, treasure, treasureDirection.key);

  const shopCandidates = sampleUnique(sideBranches, sideBranches.length, random)
    .flatMap((branch) => [...branch.rooms].reverse())
    .filter(
      (room) => room !== treasureAnchor && getFreeDirections(room.grid).length
    );
  const shopAnchor =
    shopCandidates[0] ??
    [...mainPath].reverse().find((room) => getFreeDirections(room.grid).length);

  if (shopAnchor) {
    const shopOptions = getFreeDirections(shopAnchor.grid);
    const shopDirection =
      shopOptions[Math.floor(random() * shopOptions.length)];
    const shop = createRoom(
      "shop",
      [
        shopAnchor.grid[0] + shopDirection.dx,
        shopAnchor.grid[1] + shopDirection.dy,
      ],
      "shop-empty"
    );

    connectRooms(shopAnchor, shop, shopDirection.key);
  }

  // Fill in a handful of extra rooms in cells that already touch multiple
  // existing rooms so the dungeon feels less like a few thin tendrils and
  // more like a connected complex. Floor -1 gets the bigger sprinkle.
  const fillerRoomCount =
    shape.fillerRoomMin +
    Math.floor(random() * (shape.fillerRoomMax - shape.fillerRoomMin + 1));
  populateFillerRooms(rooms, occupied, random, fillerRoomCount, (grid) => {
    createRoom("normal", grid, sampleNormalTemplateId());
  });

  // Connect every pair of grid-adjacent rooms that isn't already linked,
  // turning the branch tree into a graph with cycles so every room with
  // a neighbour has a doorway to it.
  connectAdjacentRooms(rooms, occupied);

  return {
    floor: runFloor,
    initialModules: [],
    rooms,
    seed,
    startRoomId: start.id,
  };
};
