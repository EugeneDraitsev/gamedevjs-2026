import { describe, expect, it } from "vitest";
import type { DungeonLayout, DungeonRoom } from "../config/dungeon-layout";
import { roomTemplateById } from "../config/room-templates";
import {
  clampToRoom,
  createDoorMarkers,
  createOutsidePickups,
  createRoomEnemies,
  getConveyorVelocity,
  getRoomPlatforms,
  getTransition,
  playerRadius,
  roomTransitionInsetX,
  roomTransitionInsetZ,
} from "./scene-layout";

const roomWithDoors: DungeonRoom = {
  exits: {
    east: "east-room",
    north: "north-room",
    south: "south-room",
    west: "west-room",
  },
  grid: [0, 0],
  id: "center",
  kind: "normal",
  label: "Center",
  templateId: "normal-line",
};

describe("clampToRoom", () => {
  it("still allows reaching east and west transition thresholds", () => {
    expect(clampToRoom([99, 1, 0], playerRadius)[0]).toBeCloseTo(
      roomTransitionInsetX,
      6
    );
    expect(clampToRoom([-99, 1, 0], playerRadius)[0]).toBeCloseTo(
      -roomTransitionInsetX,
      6
    );
  });

  it("still allows reaching north and south transition thresholds", () => {
    expect(clampToRoom([0, 1, 99], playerRadius)[2]).toBeCloseTo(
      roomTransitionInsetZ,
      6
    );
    expect(clampToRoom([0, 1, -99], playerRadius)[2]).toBeCloseTo(
      -roomTransitionInsetZ,
      6
    );
  });
});

describe("getConveyorVelocity", () => {
  it("returns catwalk conveyor velocity on top of a conveyor", () => {
    expect(
      getConveyorVelocity(getRoomPlatforms("catwalk"), [0, 0.7, 0])
    ).toEqual([0, 0, 3.74]);
  });

  it("ignores points below the conveyor top", () => {
    expect(
      getConveyorVelocity(getRoomPlatforms("catwalk"), [0, 0.38, 0])
    ).toBeNull();
  });
});

describe("getTransition", () => {
  it("can transition after clamping at an east doorway", () => {
    const position = clampToRoom([99, 1, 0], playerRadius);

    expect(getTransition(roomWithDoors, position)?.roomId).toBe("east-room");
  });

  it("can transition after clamping at a north doorway", () => {
    const position = clampToRoom([0, 1, -99], playerRadius);

    expect(getTransition(roomWithDoors, position)?.roomId).toBe("north-room");
  });
});

describe("createDoorMarkers", () => {
  it("renders exit markers for normal and special destination rooms", () => {
    const layout: DungeonLayout = {
      floor: -1,
      initialModules: [],
      rooms: {
        boss: {
          exits: {},
          grid: [0, -1],
          id: "boss",
          kind: "boss",
          label: "Boss",
          templateId: "boss-bomber",
        },
        center: {
          exits: {
            east: "treasure",
            north: "boss",
            south: "normal",
          },
          grid: [0, 0],
          id: "center",
          kind: "normal",
          label: "Center",
          templateId: "normal-line",
        },
        normal: {
          exits: {},
          grid: [0, 1],
          id: "normal",
          kind: "normal",
          label: "Normal",
          templateId: "normal-line",
        },
        treasure: {
          artifactType: "rivet-press-core",
          exits: {},
          grid: [1, 0],
          id: "treasure",
          kind: "treasure",
          label: "Treasure",
          templateId: "treasure-artifact",
        },
      },
      seed: "door-marker-test",
      startRoomId: "center",
    };

    expect(
      createDoorMarkers(layout.rooms.center, layout).map((door) => door.id)
    ).toEqual(["east-door", "north-door", "south-door"]);
  });
});

describe("createOutsidePickups", () => {
  it("keeps outside pickups focused on gear and healing", () => {
    expect(
      createOutsidePickups(100).every((pickup) => pickup.kind !== "key")
    ).toBe(true);
  });
});

describe("createRoomEnemies", () => {
  it("adds the Gate Keeper to the outside entrance", () => {
    const outsideRoom: DungeonRoom = {
      exits: {},
      grid: [0, 0],
      id: "outside",
      kind: "normal",
      label: "Outside",
      templateId: "outside-start",
    };
    const enemies = createRoomEnemies(
      outsideRoom,
      roomTemplateById["outside-start"],
      "south",
      new Set(),
      100
    );

    expect(enemies.some((enemy) => enemy.templateId === "gate-keeper")).toBe(
      true
    );
  });

  it("uses a fast first wheel-slinger shot before the long ricochet cooldown", () => {
    const spawnNow = 10_000;
    const enemies = createRoomEnemies(
      roomWithDoors,
      {
        ...roomTemplateById["normal-line"],
        enemyCount: 1,
        enemyTemplateId: "wheel-slinger",
      },
      "south",
      new Set(),
      spawnNow
    );

    expect(enemies[0]?.lastShotAt).toBe(spawnNow - 3600 + 520);
  });

  it("uses a fast first blast-runner bomb before the long bomb cooldown", () => {
    const spawnNow = 10_000;
    const enemies = createRoomEnemies(
      roomWithDoors,
      {
        ...roomTemplateById["normal-line"],
        enemyCount: 1,
        enemyTemplateId: "blast-runner",
      },
      "south",
      new Set(),
      spawnNow
    );

    expect(enemies[0]?.lastBombAt).toBe(spawnNow - 2500 + 520);
  });
});
