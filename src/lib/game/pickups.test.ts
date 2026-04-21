import { describe, expect, it } from "vitest";
import {
  collectPickups,
  createRoomPickups,
  seededUnit,
} from "$lib/game/pickups";
import type { ActivePickup } from "$lib/types/game";

const pickup = (kind: ActivePickup["kind"], value = 1): ActivePickup => ({
  createdAt: 0,
  id: kind,
  kind,
  position: [0.2, 0.54, 0.1],
  radius: 0.4,
  value,
});

describe("seededUnit", () => {
  it("is stable and normalized", () => {
    const value = seededUnit("same");

    expect(seededUnit("same")).toBe(value);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

describe("createRoomPickups", () => {
  it("drops one weighted room pickup", () => {
    const drops = createRoomPickups("boss-room", "iron-warden", 1, 123);
    const drop = drops[0];

    expect(drops).toHaveLength(1);
    expect(drop?.createdAt).toBe(123);
    expect(["gear", "heal"]).toContain(drop?.kind);
    expect(drop?.value).toBe(1);
  });

  it("uses equal gear and heal weights", () => {
    const drops = createRoomPickups("plain-room", "scrap-runner", 4, 0);

    expect(drops).toHaveLength(1);
    expect(["gear", "heal"]).toContain(drops[0].kind);
    expect(drops[0].value).toBe(1);
  });

  it("keeps drops out of hazards and occupied footprints", () => {
    const occupied = pickup("gear");
    const drops = createRoomPickups("blocked-room", "scrap-runner", 4, 0, {
      hazards: [
        {
          args: [4, 0.03, 4],
          color: "#f00",
          damage: 1,
          id: "lava",
          position: [0, 0.03, 0],
        },
      ],
      obstacles: [
        {
          args: [1, 0.2, 1],
          color: "#000",
          id: "block",
          position: [5, 0.2, 0],
        },
      ],
      pickups: [occupied],
    });
    const drop = drops[0];

    expect(drops).toHaveLength(1);
    expect(
      Math.abs(drop.position[0]) > 4 + drop.radius ||
        Math.abs(drop.position[2]) > 4 + drop.radius
    ).toBe(true);
    expect(
      Math.hypot(
        drop.position[0] - occupied.position[0],
        drop.position[2] - occupied.position[2]
      )
    ).toBeGreaterThan(drop.radius + occupied.radius);
  });
});

describe("collectPickups", () => {
  it("collects gears and removes them", () => {
    const result = collectPickups([pickup("gear", 3)], [0, 1, 0], 4, 6);

    expect(result.gearDelta).toBe(3);
    expect(result.healthDelta).toBe(0);
    expect(result.pickups).toEqual([]);
  });

  it("heals only when health is missing", () => {
    const full = collectPickups([pickup("heal", 2)], [0, 1, 0], 6, 6);
    const hurt = collectPickups([pickup("heal", 2)], [0, 1, 0], 5, 6);

    expect(full.healthDelta).toBe(0);
    expect(full.pickups).toHaveLength(1);
    expect(hurt.healthDelta).toBe(1);
    expect(hurt.nextHealth).toBe(6);
    expect(hurt.pickups).toEqual([]);
  });
});
