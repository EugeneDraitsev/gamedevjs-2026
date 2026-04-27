import { describe, expect, it } from "vitest";
import {
  createDungeonLayout,
  floor1NormalTemplateIds,
  floor2NormalTemplateIds,
  floor2RequiredNormalTemplateIds,
} from "$lib/config/dungeon-layout";
import { roomTemplateById } from "$lib/config/room-templates";

describe("dungeon layout floors", () => {
  it("starts the run on floor -2 inside the dungeon", () => {
    const dungeon = createDungeonLayout("test-seed-f-2", -2);
    const boss = Object.values(dungeon.rooms).find(
      (room) => room.kind === "boss"
    );

    expect(dungeon.floor).toBe(-2);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe("core-prison");
    expect(dungeon.rooms.polygon.templateId).toBe("polygon-training");
    expect(dungeon.rooms.polygon.exits).toEqual({});
    expect(boss?.templateId).toBe("boss-warden");
    expect(
      Object.values(dungeon.rooms).some(
        (room) => room.templateId === "outside-start"
      )
    ).toBe(false);
  });

  it("uses the second boss on floor -1", () => {
    const dungeon = createDungeonLayout("test-seed-f-1", -1);
    const boss = Object.values(dungeon.rooms).find(
      (room) => room.kind === "boss"
    );
    const hasCorePrison = Object.values(dungeon.rooms).some(
      (room) => room.templateId === "core-prison"
    );

    expect(dungeon.floor).toBe(-1);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe("normal-empty");
    expect(roomTemplateById["normal-empty"].spawnPattern).toBe("none");
    expect(roomTemplateById["normal-empty"].enemyCount).toBe(0);
    expect(hasCorePrison).toBe(false);
    expect(dungeon.rooms.polygon.templateId).toBe("polygon-training");
    expect(dungeon.rooms.polygon.exits).toEqual({});
    expect(boss?.templateId).toBe("boss-bomber");
  });

  it("uses outside as floor 0", () => {
    const dungeon = createDungeonLayout("test-seed-f0", 0);

    expect(dungeon.floor).toBe(0);
    expect(Object.values(dungeon.rooms)).toHaveLength(1);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe("outside-start");
  });

  it("includes new enemy rooms in normal generation pools", () => {
    expect(floor1NormalTemplateIds).toContain("normal-ricochet");
    expect(floor2RequiredNormalTemplateIds).toEqual([
      "normal-ricochet",
      "normal-veil",
      "normal-bombers",
    ]);
    expect(floor2NormalTemplateIds).toEqual(
      expect.arrayContaining([
        "normal-ricochet",
        "normal-veil",
        "normal-bombers",
      ])
    );
    expect(roomTemplateById["normal-ricochet"].enemyTemplateId).toBe(
      "wheel-slinger"
    );
    expect(roomTemplateById["normal-veil"].enemyTemplateId).toBe(
      "veil-stalker"
    );
    expect(roomTemplateById["normal-bombers"].enemyTemplateId).toBe(
      "blast-runner"
    );
  });

  it("guarantees new enemy rooms on floor -1", () => {
    const dungeon = createDungeonLayout("test-seed-f-1", -1);
    const templateIds = Object.values(dungeon.rooms).map(
      (room) => room.templateId
    );

    expect(templateIds).toEqual(
      expect.arrayContaining([
        "normal-ricochet",
        "normal-veil",
        "normal-bombers",
      ])
    );
  });

  it("connects every grid-adjacent pair of dungeon rooms", () => {
    const dungeon = createDungeonLayout("test-seed-connections-f-2", -2);
    const cellToRoom = new Map<string, string>();

    for (const room of Object.values(dungeon.rooms)) {
      cellToRoom.set(`${room.grid[0]}:${room.grid[1]}`, room.id);
    }

    const adjacency: {
      direction: "east" | "north" | "south" | "west";
      dx: number;
      dy: number;
      opposite: "east" | "north" | "south" | "west";
    }[] = [
      { direction: "east", dx: 1, dy: 0, opposite: "west" },
      { direction: "north", dx: 0, dy: -1, opposite: "south" },
      { direction: "south", dx: 0, dy: 1, opposite: "north" },
      { direction: "west", dx: -1, dy: 0, opposite: "east" },
    ];

    for (const room of Object.values(dungeon.rooms)) {
      // The polygon training room is intentionally unreachable from the
      // dungeon, so its neighbours must not punch a doorway into it.
      if (room.id === "polygon") {
        expect(room.exits).toEqual({});
        continue;
      }

      for (const { direction, dx, dy, opposite } of adjacency) {
        const neighborId = cellToRoom.get(
          `${room.grid[0] + dx}:${room.grid[1] + dy}`
        );

        if (!neighborId || neighborId === "polygon") {
          continue;
        }

        expect(room.exits[direction]).toBe(neighborId);
        expect(dungeon.rooms[neighborId].exits[opposite]).toBe(room.id);
      }
    }
  });

  it("keeps floor sizes inside the expected room budget", () => {
    const seeds = [
      "alpha",
      "beta",
      "gamma",
      "delta",
      "epsilon",
      "zeta",
      "eta",
      "theta",
      "iota",
      "kappa",
    ];

    for (const seed of seeds) {
      const floor1Size = Object.keys(
        createDungeonLayout(`${seed}-f-2`, -2).rooms
      ).length;
      const floor2Size = Object.keys(
        createDungeonLayout(`${seed}-f-1`, -1).rooms
      ).length;

      // Floor -2 (tutorial) targets 12-15 rooms; allow a 1-room slack
      // either way for the random filler / branch-length combinations.
      expect(floor1Size).toBeGreaterThanOrEqual(12);
      expect(floor1Size).toBeLessThanOrEqual(16);
      // Floor -1 targets 17-21 rooms; same 1-room slack.
      expect(floor2Size).toBeGreaterThanOrEqual(16);
      expect(floor2Size).toBeLessThanOrEqual(22);
      // The second floor should still feel meaningfully bigger than the
      // first one even with the trimmed budget.
      expect(floor2Size).toBeGreaterThan(floor1Size);
    }
  });

  it("gives most non-special rooms more than a single doorway", () => {
    const dungeon = createDungeonLayout("test-seed-multi-door-f-2", -2);
    const normalRooms = Object.values(dungeon.rooms).filter(
      (room) => room.kind === "normal" && room.id !== dungeon.startRoomId
    );
    const multiExitNormalRooms = normalRooms.filter(
      (room) => Object.keys(room.exits).length >= 2
    );

    // With the connect-adjacent pass the dungeon is no longer a thin tree;
    // most regular combat rooms should sit between two or more neighbours.
    expect(multiExitNormalRooms.length).toBeGreaterThan(normalRooms.length / 2);
  });
});
