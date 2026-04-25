import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SWING } from "$lib/combat/melee-swing";
import {
  computeMachineStats,
  createDefaultMachineLoadout,
} from "$lib/config/machine-modules";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { ActiveEnemy, ActiveProjectile } from "$lib/types/game";
import { applyMeleeDeflects } from "./melee-resolver";

vi.mock("$lib/stores/cheats.svelte", () => ({
  cheats: { oneHitKill: false },
}));

const createCombatStub = () => {
  const combat = {
    deflectBursts: [],
    enemies: [
      {
        id: "enemy-1",
        position: [0, 0.9, 4],
        radius: 0.6,
      } as ActiveEnemy,
    ],
    enemyShots: [
      {
        color: "#ffd6a0",
        damage: 1,
        id: "shot-1",
        position: [0, 0.9, 1.1],
        radius: 0.18,
        ttlMs: 1000,
        velocity: [0, 0, -8],
      },
    ],
    projectiles: [] as ActiveProjectile[],
    addProjectiles(projectiles: ActiveProjectile[]) {
      this.projectiles = [...this.projectiles, ...projectiles];
    },
  };

  return combat as unknown as CombatStore;
};

describe("applyMeleeDeflects", () => {
  it("turns deflected shots into homing player projectiles when enabled", () => {
    const combat = createCombatStub();
    const weaponBuild = computeMachineStats({
      ...createDefaultMachineLoadout(),
      "utility-c": "cleaver-axe-head",
    }).weaponBuild;

    applyMeleeDeflects({
      combat,
      frame: {
        active: true,
        center: [0, 0.9, 0],
        ended: false,
        facingYaw: 0,
        swingId: 1,
        t: 0.5,
      },
      hitboxPadding: 0,
      meleeParams: DEFAULT_SWING,
      reflectedShotsSeekEnemies: true,
      weaponBuild,
    });

    expect(combat.enemyShots).toHaveLength(0);
    expect(combat.projectiles).toHaveLength(1);
    expect(combat.projectiles[0].build.homingTurn).toBeGreaterThan(0);
    expect(combat.projectiles[0].velocity[2]).toBeGreaterThan(0);
  });
});
