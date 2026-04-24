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

const floor1NormalTemplateIds = [
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
] as const;
const floor2NormalTemplateIds = [
  "normal-furnace",
  "normal-relay",
  "normal-gauntlet",
  "normal-blocks",
  "normal-hexes",
  "normal-lava-bridge",
  "normal-lava-cross",
  "normal-zigzag",
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

  const connectRooms = (
    left: DungeonRoom,
    right: DungeonRoom,
    direction: DungeonRoomDirection
  ) => {
    left.exits[direction] = right.id;
    right.exits[oppositeDirection[direction]] = left.id;
  };

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
  const sampleNormalTemplateId = () =>
    normalTemplatePool[Math.floor(random() * normalTemplatePool.length)];
  createRoom("polygon", [0, 1], "polygon-training");
  const start = createRoom(
    "normal",
    [0, 0],
    runFloor === initialDungeonFloor ? "core-prison" : "normal-empty"
  );

  const branches = sampleUnique(getFreeDirections(start.grid), 3, random).map(
    (direction) => {
      const firstRoom = createRoom(
        "normal",
        [start.grid[0] + direction.dx, start.grid[1] + direction.dy],
        sampleNormalTemplateId()
      );

      connectRooms(start, firstRoom, direction.key);

      const rooms = [start, firstRoom];

      for (
        let step = 0;
        step <
        (runFloor === initialDungeonFloor ? 1 : 3) + Math.floor(random() * 2);
        step += 1
      ) {
        const previous = rooms.at(-1) ?? firstRoom;
        const options = getFreeDirections(previous.grid);

        if (options.length === 0) {
          break;
        }

        const nextDirection =
          options.find((candidate) => candidate.key === direction.key) ??
          options[Math.floor(random() * options.length)];
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
    }
  );
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

  const treasureAnchor =
    sampleUnique(
      branches.filter((branch) => branch !== mainBranch),
      branches.length,
      random
    )
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

  return {
    floor: runFloor,
    initialModules: [],
    rooms,
    seed,
    startRoomId: start.id,
  };
};
