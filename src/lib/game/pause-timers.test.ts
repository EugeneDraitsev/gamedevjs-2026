import { describe, expect, it, vi } from "vitest";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";
import type { ActiveBomb, ActiveStealthBeam, Vec3 } from "$lib/types/game";
import { pauseGameSceneTimers } from "./pause-timers";

describe("pauseGameSceneTimers", () => {
  it("slides enemy, bomb, beam, player, and timing timestamps forward", () => {
    const bomb: ActiveBomb = {
      armAt: 1500,
      color: "#ffb24d",
      damage: 1,
      expiresAt: 5000,
      explosionRadius: 2,
      hp: 3,
      id: "bomb",
      lastHitAt: 1200,
      maxHp: 3,
      originId: "veil",
      position: [0, 0.62, 0],
      radius: 0.42,
      spawnedAt: 1000,
      velocity: [0, 0, 0],
    };
    const beam: ActiveStealthBeam = {
      color: "#8beeff",
      core: "#f5feff",
      createdAt: 1600,
      fadeMs: 180,
      fireMs: 120,
      id: "beam",
      length: 8,
      originId: "veil",
      position: [0, 0.62, 0],
      rotationY: 0,
      telegraphMs: 900,
      width: 0.26,
    };
    const combat = {
      beams: [
        {
          createdAt: 2500,
        },
      ],
      bombs: [bomb],
      damagePopups: [
        {
          createdAt: 2600,
        },
      ],
      deflectBursts: [
        {
          createdAt: 2700,
        },
      ],
      enemies: [
        {
          id: "veil",
          lastBombAt: 2000,
          lastHitAt: 2100,
          lastShotAt: 2200,
          position: [0, 0.62, 0] as Vec3,
        },
      ],
      enemyShots: [
        {
          color: "#ffd6a0",
          damage: 1,
          id: "shot",
          lastHitAt: 2300,
          position: [0, 0.62, 0] as Vec3,
          radius: 0.18,
          ttlMs: 1000,
          velocity: [0, 0, 1] as Vec3,
        },
      ],
      gateLasers: [
        {
          createdAt: 2400,
        },
      ],
      healBursts: [
        {
          createdAt: 2800,
        },
      ],
      pauseEnemyTimedActors: vi.fn((deltaMs: number) => {
        bomb.armAt += deltaMs;
        bomb.expiresAt += deltaMs;
        bomb.lastHitAt += deltaMs;
        bomb.spawnedAt += deltaMs;
        beam.createdAt += deltaMs;
      }),
      projectileImpactBursts: [
        {
          createdAt: 2900,
        },
      ],
      stealthBeams: [beam],
    } as unknown as CombatStore;
    const player = {
      lastHitAt: 3000,
      lastPositionAt: 3100,
      lastTouchHitAt: 3200,
      recoverUntil: 3300,
      reloadStartedAt: 3400,
      reloadUntil: 3600,
    } as unknown as PlayerStore;
    const timing = {
      bossDeathStartedAt: 4000,
      bossIntroStartedAt: 4100,
      enemyWakeUntil: 4200,
      floorIntroStartedAt: 4300,
      lastHazardAt: 4400,
      pickedArtifactAt: 4500,
      roomTransitionStartedAt: 4600,
    } as unknown as TimingStore;

    pauseGameSceneTimers({ combat, deltaMs: 250, player, timing });

    expect(combat.pauseEnemyTimedActors).toHaveBeenCalledWith(250);
    expect(bomb).toMatchObject({
      armAt: 1750,
      expiresAt: 5250,
      lastHitAt: 1450,
      spawnedAt: 1250,
    });
    expect(beam.createdAt).toBe(1850);
    expect(combat.enemies[0]).toMatchObject({
      lastBombAt: 2250,
      lastHitAt: 2350,
      lastShotAt: 2450,
    });
    expect(combat.beams[0]?.createdAt).toBe(2750);
    expect(combat.damagePopups[0]?.createdAt).toBe(2850);
    expect(combat.deflectBursts[0]?.createdAt).toBe(2950);
    expect(combat.healBursts[0]?.createdAt).toBe(3050);
    expect(combat.projectileImpactBursts[0]?.createdAt).toBe(3150);
    expect(player).toMatchObject({
      lastHitAt: 3250,
      lastPositionAt: 3350,
      lastTouchHitAt: 3450,
      recoverUntil: 3550,
      reloadStartedAt: 3650,
      reloadUntil: 3850,
    });
    expect(timing).toMatchObject({
      bossDeathStartedAt: 4250,
      bossIntroStartedAt: 4350,
      enemyWakeUntil: 4450,
      floorIntroStartedAt: 4550,
      lastHazardAt: 4650,
      pickedArtifactAt: 4750,
      roomTransitionStartedAt: 4850,
    });
  });
});
