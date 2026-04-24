import { describe, expect, it } from "vitest";
import { createDungeonLayout } from "$lib/config/dungeon-layout";

describe("dungeon layout floors", () => {
  it("starts the run on floor -2 inside the dungeon", () => {
    const dungeon = createDungeonLayout("test-seed-f-2", -2);
    const boss = Object.values(dungeon.rooms).find(
      (room) => room.kind === "boss"
    );

    expect(dungeon.floor).toBe(-2);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe(
      "polygon-training"
    );
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

    expect(dungeon.floor).toBe(-1);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe(
      "polygon-training"
    );
    expect(boss?.templateId).toBe("boss-bomber");
  });

  it("uses outside as floor 0", () => {
    const dungeon = createDungeonLayout("test-seed-f0", 0);

    expect(dungeon.floor).toBe(0);
    expect(Object.values(dungeon.rooms)).toHaveLength(1);
    expect(dungeon.rooms[dungeon.startRoomId].templateId).toBe("outside-start");
  });
});
