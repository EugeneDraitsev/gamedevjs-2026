import {
  type WeaponNodeType,
  weaponNodeTemplates,
} from "$lib/config/weapon-graph";

export type DungeonRoomDirection = "east" | "north" | "south" | "west";
export type DungeonRoomKind =
  | "boss"
  | "challenge"
  | "normal"
  | "polygon"
  | "secret"
  | "shop"
  | "treasure";

export interface DungeonRoom {
  artifactType?: WeaponNodeType;
  exits: Partial<Record<DungeonRoomDirection, string>>;
  grid: [number, number];
  id: string;
  kind: DungeonRoomKind;
  label: string;
}

export interface DungeonLayout {
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

export const createDungeonLayout = (seed: string): DungeonLayout => {
  const random = createSeededRandom(seed);
  const rooms: Record<string, DungeonRoom> = {};
  const occupied = new Map<string, string>();
  let roomIndex = 0;

  const createRoom = (
    kind: DungeonRoomKind,
    label: string,
    grid: [number, number],
    artifactType?: WeaponNodeType
  ) => {
    if (kind !== "polygon") {
      roomIndex += 1;
    }

    const id = kind === "polygon" ? "polygon" : `${kind}-${roomIndex}`;

    rooms[id] = {
      artifactType,
      exits: {},
      grid,
      id,
      kind,
      label,
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

  const start = createRoom("polygon", "Polygon", [0, 0]);
  const mainPath = [start];
  let cursor = start;

  for (let step = 0; step < 2 + Math.floor(random() * 2); step += 1) {
    const options = getFreeDirections(cursor.grid);

    if (options.length === 0) {
      break;
    }

    const direction = options[Math.floor(random() * options.length)];
    const next = createRoom("normal", "Chamber", [
      cursor.grid[0] + direction.dx,
      cursor.grid[1] + direction.dy,
    ]);

    connectRooms(cursor, next, direction.key);
    mainPath.push(next);
    cursor = next;
  }

  const bossAnchor =
    [...mainPath]
      .reverse()
      .find((room) => getFreeDirections(room.grid).length) ?? start;
  const bossOptions = getFreeDirections(bossAnchor.grid);
  const bossDirection = bossOptions[Math.floor(random() * bossOptions.length)];
  const boss = createRoom("boss", "Boss", [
    bossAnchor.grid[0] + bossDirection.dx,
    bossAnchor.grid[1] + bossDirection.dy,
  ]);

  connectRooms(bossAnchor, boss, bossDirection.key);

  const treasureAnchor =
    sampleUnique(
      mainPath.filter((room) => getFreeDirections(room.grid).length),
      mainPath.length,
      random
    )[0] ?? bossAnchor;
  const treasureOptions = getFreeDirections(treasureAnchor.grid);
  const treasureDirection =
    treasureOptions[Math.floor(random() * treasureOptions.length)];
  const treasure = createRoom(
    "treasure",
    "Treasure",
    [
      treasureAnchor.grid[0] + treasureDirection.dx,
      treasureAnchor.grid[1] + treasureDirection.dy,
    ],
    premiumModules[Math.floor(random() * premiumModules.length)]
  );

  connectRooms(treasureAnchor, treasure, treasureDirection.key);

  return {
    initialModules: sampleUnique(commonModules, 2, random),
    rooms,
    seed,
    startRoomId: start.id,
  };
};
