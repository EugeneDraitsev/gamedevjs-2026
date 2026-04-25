import { describe, expect, it } from "vitest";
import { DEFAULT_SWING } from "$lib/combat/melee-swing";
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
  it("collects gears after the pickup animation", () => {
    const result = collectPickups([pickup("gear", 3)], [0, 1, 0], 4, 6, 100);

    expect(result.gearDelta).toBe(3);
    expect(result.healthDelta).toBe(0);
    expect(result.keyDelta).toBe(0);
    expect(result.pickups[0].collectedAt).toBe(100);
    expect(
      collectPickups(result.pickups, [0, 1, 0], 4, 6, 500).pickups
    ).toEqual([]);
  });

  it("collects gears hit by the sword", () => {
    const result = collectPickups(
      [
        {
          ...pickup("gear", 3),
          position: [0, 0.54, 1.3],
          radius: 0.2,
        },
      ],
      [0, 1, 0],
      4,
      6,
      100,
      {
        meleeFrame: {
          active: true,
          center: [0, 1, 0],
          ended: false,
          facingYaw: 0,
          swingId: 1,
          t: 0.5,
        },
        meleeParams: DEFAULT_SWING,
      }
    );

    expect(result.gearDelta).toBe(3);
    expect(result.pickups[0].collectedAt).toBe(100);
  });

  it("collects gate keys without changing gear or health", () => {
    const result = collectPickups([pickup("key")], [0, 1, 0], 4, 6, 100);

    expect(result.gearDelta).toBe(0);
    expect(result.healthDelta).toBe(0);
    expect(result.keyDelta).toBe(1);
    expect(result.pickups[0].collectedAt).toBe(100);
  });

  it("heals only when health is missing", () => {
    const full = collectPickups([pickup("heal", 2)], [0, 1, 0], 6, 6, 100);
    const hurt = collectPickups([pickup("heal", 2)], [0, 1, 0], 5, 6, 100);

    expect(full.healthDelta).toBe(0);
    expect(full.pickups).toHaveLength(1);
    expect(full.pickups[0].position[0]).toBeGreaterThan(0.2);
    expect(hurt.healthDelta).toBe(1);
    expect(hurt.nextHealth).toBe(6);
    expect(hurt.pickups[0].collectedAt).toBe(100);
  });

  it("does not push full-health heals into platforms", () => {
    const full = collectPickups([pickup("heal")], [0, 1, 0], 6, 6, 100, {
      obstacles: [
        {
          args: [0.2, 0.2, 0.4],
          color: "#000",
          id: "block",
          position: [0.52, 0.2, 0.1],
        },
      ],
    });

    expect(full.pickups[0].position).toEqual([0.2, 0.54, 0.1]);
  });
});
