import { describe, expect, it, vi } from "vitest";
import {
  computeMachineStats,
  createDefaultMachineLoadout,
} from "$lib/config/machine-modules";
import { roomTemplateById } from "$lib/config/room-templates";
import { createRoomEnemies } from "$lib/game/scene-layout";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PickupStore } from "$lib/stores/pickups.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { RoomStore } from "$lib/stores/room.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";
import type {
  ActiveBomb,
  ActiveEnemyShot,
  ActiveProjectile,
  Vec3,
} from "$lib/types/game";
import { stepEnemies } from "./enemy-stepper";

vi.mock("$lib/audio/sfx", () => ({
  gameSfx: {
    playEnemyDeath: vi.fn(),
  },
}));

const createRoomStub = () => {
  const room = {
    clearedEnemyIds: [] as string[],
    doorOpenAmount: 1,
    releasedIds: [] as string[],
    unlockingRoomId: "",
    unlockStartedAt: 0,
    get clearedSet() {
      return new Set(this.clearedEnemyIds);
    },
    get releasedSet() {
      return new Set(this.releasedIds);
    },
    beginUnlock(id: string, now: number) {
      this.unlockingRoomId = id;
      this.unlockStartedAt = now;
      this.doorOpenAmount = 0;
    },
    markCleared(id: string) {
      this.clearedEnemyIds = [...this.clearedEnemyIds, id];
    },
    markReleased(id: string) {
      this.releasedIds = [...this.releasedIds, id];
    },
  };

  return room as unknown as RoomStore;
};

describe("stepEnemies outside gate clear", () => {
  it("opens the outside gate when Gate Keeper was removed before enemy stepping", () => {
    const template = roomTemplateById["outside-start"];
    const currentRoomId = "outside-room";
    const room = createRoomStub();
    const enemies = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Outside",
        templateId: "outside-start",
      },
      template,
      "south",
      new Set(),
      1000
    ).filter((enemy) => enemy.templateId !== "gate-keeper");
    const combat = {
      beams: [],
      bombs: [
        {
          armAt: Number.POSITIVE_INFINITY,
          color: "#ffb24d",
          damage: 1,
          expiresAt: Number.POSITIVE_INFINITY,
          explosionRadius: 2.4,
          hp: 3,
          id: "gate-bomb",
          lastHitAt: 0,
          maxHp: 3,
          originId: "outside-room-outside-start-gate-keeper",
          position: [18, 0.62, -56],
          radius: 0.42,
          spawnedAt: 1000,
          velocity: [0, 0, 0],
        },
      ],
      damagePopups: [],
      deflectBursts: [],
      enemies,
      enemyShots: [
        {
          color: "#ffd6a0",
          damage: 1,
          id: "gate-shot",
          position: [99, 0.62, 99],
          radius: 0.18,
          ttlMs: 1000,
          velocity: [0, 0, 1],
        },
      ],
      gateLasers: [
        {
          arcSpan: Math.PI,
          center: [0, 0.62, -68.5],
          color: "#ffb24d",
          core: "#fff8d7",
          createdAt: Number.POSITIVE_INFINITY,
          damage: 1,
          fadeMs: 240,
          id: "gate-laser",
          originId: "outside-room-outside-start-gate-keeper",
          radius: 8,
          startAngle: 0,
          sweepMs: 1100,
          telegraphMs: 850,
          width: 0.35,
        },
      ],
      healBursts: [],
      projectiles: [] as ActiveProjectile[],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [0, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: Number.POSITIVE_INFINITY,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    const result = stepEnemies({
      combat,
      currentRoomId,
      currentRoomTemplate: template,
      delta: 0.016,
      doorOpenDelayMs: 120,
      doorOpenDurationMs: 520,
      isCurrentRoomCombat: true,
      pickups,
      player,
      room,
      roomHazards: [],
      roomPlatforms: [],
      timing,
    });

    expect(result.roomCleared).toBe(true);
    expect(room.clearedSet.has(currentRoomId)).toBe(true);
    expect(room.unlockingRoomId).toBe(currentRoomId);
    expect(
      combat.enemies.some((enemy) => enemy.templateId === "gate-keeper")
    ).toBe(false);
    expect(combat.bombs).toHaveLength(1);
    expect(combat.bombs[0]?.damage).toBe(0);
    expect(combat.enemyShots.every((shot) => shot.damage === 0)).toBe(true);
    expect(combat.enemyShots.every((shot) => shot.velocity[2] === 0)).toBe(
      true
    );
    expect(combat.gateLasers).toHaveLength(1);
    expect(combat.gateLasers[0]?.damage).toBe(0);
  });

  it("applies one-hit kill to projectile hits on Gate Keeper", () => {
    const template = roomTemplateById["boss-gate-keeper"];
    const currentRoomId = "boss-room";
    const room = createRoomStub();
    const [gateKeeper] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "boss",
        label: "Gate Keeper",
        templateId: "boss-gate-keeper",
      },
      template,
      "south",
      new Set(),
      1000
    );
    const weaponBuild = computeMachineStats(
      createDefaultMachineLoadout()
    ).weaponBuild;
    const projectile: ActiveProjectile = {
      build: { ...weaponBuild, damage: 1, radius: 10 },
      id: "kill-shot",
      position: [0, 0.62, -5.6],
      velocity: [0, 0, 1],
    };
    const combat = {
      beams: [],
      bombs: [],
      damagePopups: [],
      deflectBursts: [],
      enemies: [{ ...gateKeeper }],
      enemyShots: [
        {
          color: "#ffd6a0",
          damage: 1,
          id: "gate-shot",
          position: [0, 0.62, -3],
          radius: 0.18,
          ttlMs: 1000,
          velocity: [0, 0, 1],
        },
      ],
      gateLasers: [
        {
          arcSpan: Math.PI,
          center: [0, 0.62, -5.6],
          color: "#ffb24d",
          core: "#fff8d7",
          createdAt: performance.now(),
          damage: 1,
          fadeMs: 420,
          id: "gate-laser",
          originId: gateKeeper?.id ?? "",
          radius: 8,
          startAngle: 0,
          sweepMs: 1100,
          telegraphMs: 850,
          width: 0.35,
        },
      ],
      healBursts: [],
      projectilePositions: new Map([["kill-shot", [0, 0.62, -5.6] as Vec3]]),
      projectiles: [projectile],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [0, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    const result = stepEnemies({
      combat,
      currentRoomId,
      currentRoomTemplate: template,
      delta: 0.016,
      doorOpenDelayMs: 120,
      doorOpenDurationMs: 520,
      isCurrentRoomCombat: true,
      oneHitKill: true,
      pickups,
      player,
      room,
      roomHazards: [],
      roomPlatforms: [],
      timing,
    });

    expect(result.roomCleared).toBe(true);
    expect(combat.enemies).toHaveLength(0);
    expect(combat.popDamage).toHaveBeenCalledWith(
      gateKeeper?.hp,
      expect.any(Array),
      "enemy"
    );
    expect(combat.enemyShots[0]?.damage).toBe(0);
    expect(combat.enemyShots[0]?.velocity).toEqual([0, 0, 0]);
    expect(combat.gateLasers).toHaveLength(1);
    expect(combat.gateLasers[0]?.damage).toBe(0);
    expect(combat.gateLasers[0]?.fadeMs).toBeLessThanOrEqual(260);
  });
});

describe("stepEnemies ranged shot caps", () => {
  it("limits wheel-slinger to two active wheel shots per enemy", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const template = {
      ...roomTemplateById["normal-line"],
      enemyCount: 1,
      enemyTemplateId: "wheel-slinger",
    };
    const currentRoomId = "wheel-room";
    const room = createRoomStub();
    const [enemy] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Wheel Room",
        templateId: "normal-line",
      },
      template,
      "south",
      new Set(),
      0
    );
    const wheelShot = (id: string): ActiveEnemyShot => ({
      color: "#cfd8dc",
      damage: 1,
      id,
      kind: "wheel",
      originId: enemy?.id,
      position: [8, 0.42, 8],
      radius: 0.34,
      ttlMs: 60_000,
      velocity: [0, 0, 0],
    });
    const combat = {
      beams: [],
      bombs: [],
      damagePopups: [],
      deflectBursts: [],
      enemies: [{ ...enemy, lastShotAt: 0, position: [0, 0.62, 0] }],
      enemyShots: [wheelShot("existing-wheel")],
      gateLasers: [],
      healBursts: [],
      projectiles: [] as ActiveProjectile[],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [4, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    try {
      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 0,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        isCurrentRoomCombat: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

      expect(combat.enemyShots).toHaveLength(2);

      if (combat.enemies[0]) {
        combat.enemies[0].lastShotAt = 0;
      }

      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 0,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        isCurrentRoomCombat: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

      expect(combat.enemyShots).toHaveLength(2);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("stepEnemies debug and pause handling", () => {
  it("applies one-hit kill to veil-stalker projectile hits", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const template = roomTemplateById["normal-veil"];
    const currentRoomId = "veil-room";
    const room = createRoomStub();
    const [veilStalker] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Veil",
        templateId: "normal-veil",
      },
      template,
      "south",
      new Set(),
      9000
    );
    const weaponBuild = computeMachineStats(
      createDefaultMachineLoadout()
    ).weaponBuild;
    const projectile: ActiveProjectile = {
      build: { ...weaponBuild, damage: 1, radius: 10 },
      id: "veil-kill-shot",
      position: [0, 0.62, 0],
      velocity: [0, 0, 1],
    };
    const combat = {
      beams: [],
      bombs: [],
      damagePopups: [],
      deflectBursts: [],
      enemies: [{ ...veilStalker, position: [0, 0.62, 0] as Vec3 }],
      enemyShots: [],
      gateLasers: [],
      healBursts: [],
      projectilePositions: new Map([["veil-kill-shot", [0, 0.62, 0] as Vec3]]),
      projectiles: [projectile],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [6, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    try {
      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 0.016,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        isCurrentRoomCombat: true,
        oneHitKill: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

      expect(combat.enemies).toHaveLength(0);
      expect(combat.popDamage).toHaveBeenCalledWith(
        veilStalker?.hp,
        expect.any(Array),
        "enemy"
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("freezes enemy shots and bombs while enemy simulation is paused", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const template = {
      ...roomTemplateById["normal-line"],
      enemyCount: 1,
      enemyTemplateId: "blast-runner",
    };
    const currentRoomId = "paused-room";
    const room = createRoomStub();
    const [enemy] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Paused",
        templateId: "normal-line",
      },
      template,
      "south",
      new Set(),
      5000
    );
    const bomb: ActiveBomb = {
      armAt: 9000,
      color: "#ffb24d",
      damage: 1,
      expiresAt: 11_000,
      explosionRadius: 2.4,
      hp: 3,
      id: "paused-bomb",
      lastHitAt: 0,
      maxHp: 3,
      originId: enemy?.id ?? "",
      position: [0, 0.62, 0],
      radius: 0.42,
      spawnedAt: 8000,
      velocity: [12, 0, 0],
    };
    const shot: ActiveEnemyShot = {
      color: "#ffd6a0",
      damage: 1,
      id: "paused-shot",
      position: [0, 1, 0],
      radius: 0.18,
      ttlMs: 1000,
      velocity: [0, 0, 12],
    };
    const combat = {
      beams: [],
      bombs: [bomb],
      damagePopups: [],
      deflectBursts: [],
      enemies: [
        {
          ...enemy,
          lastBombAt: 5000,
          lastShotAt: 4000,
          position: [6, 0.62, 0] as Vec3,
        },
      ],
      enemyShots: [shot],
      gateLasers: [],
      healBursts: [],
      projectiles: [] as ActiveProjectile[],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [0, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    try {
      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 1,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        enemyAiPaused: true,
        isCurrentRoomCombat: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

      expect(player.health).toBe(6);
      expect(player.triggerRecover).not.toHaveBeenCalled();
      expect(combat.enemyShots[0]).toMatchObject({
        position: [0, 1, 0],
        ttlMs: 1000,
      });
      expect(combat.bombs[0]).toMatchObject({
        armAt: 9000,
        expiresAt: 11_000,
        position: [0, 0.62, 0],
      });
      expect(combat.enemies[0]).toMatchObject({
        lastBombAt: 6000,
        lastShotAt: 5000,
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("does not let veil-stalker finish its shot windup while paused", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const template = roomTemplateById["normal-veil"];
    const currentRoomId = "paused-veil-room";
    const room = createRoomStub();
    const [enemy] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Paused Veil",
        templateId: "normal-veil",
      },
      template,
      "south",
      new Set(),
      5000
    );
    const combat = {
      beams: [],
      bombs: [],
      damagePopups: [],
      deflectBursts: [],
      enemies: [
        {
          ...enemy,
          lastBombAt: 8000,
          lastShotAt: 5000,
          position: [0, 0.62, 0] as Vec3,
          stealthAimYaw: 0,
          stealthMode: "aiming" as const,
        },
      ],
      enemyShots: [],
      gateLasers: [],
      healBursts: [],
      projectiles: [] as ActiveProjectile[],
      stealthBeams: [],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [0, 1, 4] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;

    try {
      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 1,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        enemyAiPaused: true,
        isCurrentRoomCombat: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

      expect(player.health).toBe(6);
      expect(player.triggerRecover).not.toHaveBeenCalled();
      expect(combat.stealthBeams).toHaveLength(0);
      expect(combat.enemies[0]).toMatchObject({
        lastBombAt: 9000,
        lastShotAt: 6000,
        stealthMode: "aiming",
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});

describe("stepEnemies bomber caps", () => {
  it("lets blast-runner keep two active bombs per enemy", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(10_520);
    const template = {
      ...roomTemplateById["normal-line"],
      enemyCount: 1,
      enemyTemplateId: "blast-runner",
    };
    const currentRoomId = "blast-room";
    const room = createRoomStub();
    const [enemy] = createRoomEnemies(
      {
        exits: {},
        grid: [0, 0],
        id: currentRoomId,
        kind: "normal",
        label: "Blast Room",
        templateId: "normal-line",
      },
      template,
      "south",
      new Set(),
      10_000
    );
    const combat = {
      beams: [],
      bombs: [],
      damagePopups: [],
      deflectBursts: [],
      enemies: [{ ...enemy, position: [0, 0.62, 0] }],
      enemyShots: [],
      gateLasers: [],
      healBursts: [],
      projectiles: [] as ActiveProjectile[],
      popDamage: vi.fn(),
      popProjectileImpact: vi.fn(),
      removeProjectiles: vi.fn(),
    } as unknown as CombatStore;
    const player = {
      health: 6,
      lastHitAt: 0,
      lastPosition: [4, 1, 0] as Vec3,
      lastTouchHitAt: 0,
      pushImpact: vi.fn(),
      triggerRecover: vi.fn(),
      velocity: [0, 0, 0] as Vec3,
    } as unknown as PlayerStore;
    const pickups = {
      dropRoom: vi.fn(() => 0),
    } as unknown as PickupStore;
    const timing = {
      enemyWakeUntil: 0,
      lastHazardAt: 0,
    } as unknown as TimingStore;
    const stepBlastRunner = () =>
      stepEnemies({
        combat,
        currentRoomId,
        currentRoomTemplate: template,
        delta: 0,
        doorOpenDelayMs: 120,
        doorOpenDurationMs: 520,
        isCurrentRoomCombat: true,
        pickups,
        player,
        room,
        roomHazards: [],
        roomPlatforms: [],
        timing,
      });

    try {
      stepBlastRunner();
      expect(combat.bombs).toHaveLength(1);

      player.lastPosition = [-4, 1, 0];
      nowSpy.mockReturnValue(13_020);
      stepBlastRunner();
      expect(combat.bombs).toHaveLength(2);

      if (combat.enemies[0]) {
        combat.enemies[0].lastBombAt = 10_520;
      }

      nowSpy.mockReturnValue(13_021);
      stepBlastRunner();
      expect(combat.bombs).toHaveLength(2);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
