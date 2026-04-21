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
  it("drops one room pickup near room center", () => {
    const drops = createRoomPickups("boss-room", "iron-warden", 1, 123);
    const drop = drops[0];
    const distance = Math.hypot(
      drop?.position[0] ?? 99,
      drop?.position[2] ?? 99
    );

    expect(drops).toHaveLength(1);
    expect(drop?.createdAt).toBe(123);
    expect(distance).toBeLessThan(1);
  });

  it("falls back to one gear for rooms without a drop table", () => {
    const drops = createRoomPickups("plain-room", "scrap-runner", 4, 0);

    expect(drops).toHaveLength(1);
    expect(drops[0].kind).toBe("gear");
    expect(drops[0].value).toBe(1);
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
