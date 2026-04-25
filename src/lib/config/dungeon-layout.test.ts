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
});
