import {
  type DungeonRoomKind,
  roomTemplateById,
} from "$lib/config/room-templates";
import {
  type WeaponNodeType,
  weaponNodeTemplates,
} from "$lib/config/weapon-graph";

export type DungeonRoomDirection = "east" | "north" | "south" | "west";

export interface DungeonRoom {
  artifactType?: WeaponNodeType;
  exits: Partial<Record<DungeonRoomDirection, string>>;
  grid: [number, number];
  id: string;
  kind: DungeonRoomKind;
  label: string;
  templateId: string;
}

export interface DungeonLayout {
  floor: number;
  initialModules: WeaponNodeType[];
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

const commonModules = weaponNodeTemplates
  .filter((template) => template.rarity === "common")
  .map((template) => template.type);

const premiumModules = weaponNodeTemplates
  .filter((template) => template.rarity !== "common")
  .map((template) => template.type);
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

export const createDungeonLayout = (seed: string, floor = 1): DungeonLayout => {
  const random = createSeededRandom(seed);
  const rooms: Record<string, DungeonRoom> = {};
  const occupied = new Map<string, string>();
  let roomIndex = 0;

  const createRoom = (
    kind: DungeonRoomKind,
    grid: [number, number],
    templateId: string,
    artifactType?: WeaponNodeType
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

  const normalTemplatePool =
    floor === 1 ? floor1NormalTemplateIds : floor2NormalTemplateIds;
  const sampleNormalTemplateId = () =>
    normalTemplatePool[Math.floor(random() * normalTemplatePool.length)];
  const start = createRoom("polygon", [0, 0], "polygon-training");
  const branches = sampleUnique(directions, 3, random).map((direction) => {
    const firstRoom = createRoom(
      "normal",
      [start.grid[0] + direction.dx, start.grid[1] + direction.dy],
      sampleNormalTemplateId()
    );

    connectRooms(start, firstRoom, direction.key);

    const rooms = [start, firstRoom];

    for (
      let step = 0;
      step < (floor === 1 ? 1 : 3) + Math.floor(random() * 2);
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
    floor === 1 ? "boss-warden" : "boss-bomber",
    premiumModules[Math.floor(random() * premiumModules.length)]
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
    premiumModules[Math.floor(random() * premiumModules.length)]
  );

  connectRooms(treasureAnchor, treasure, treasureDirection.key);

  return {
    floor,
    initialModules: [...commonModules],
    rooms,
    seed,
    startRoomId: start.id,
  };
};
