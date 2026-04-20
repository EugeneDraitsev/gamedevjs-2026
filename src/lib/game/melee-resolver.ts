import {
  isPointInSwing,
  type SwingParams,
  swingKnockbackDirection,
} from "$lib/combat/melee-swing";
import type { WeaponBuild } from "$lib/config/weapon-graph";
import { cheats } from "$lib/stores/cheats.svelte";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type {
  ActiveEnemy,
  ActiveEnemyShot,
  DeflectBurst,
  MeleeFrame,
} from "$lib/types/game";

const buildHitboxConfig = (
  baseConfig: SwingParams,
  hitboxPadding: number
): SwingParams => ({
  ...baseConfig,
  reach: baseConfig.reach + hitboxPadding,
});

export const handleMeleeFrame = (combat: CombatStore, frame: MeleeFrame) => {
  if (frame.ended) {
    combat.meleeHitEnemies.delete(frame.swingId);
    combat.currentMeleeFrame = null;
    return;
  }

  combat.currentMeleeFrame = frame;

  if (!combat.meleeHitEnemies.has(frame.swingId)) {
    combat.meleeHitEnemies.set(frame.swingId, new Set());
  }
};

interface ApplyMeleeArgs {
  combat: CombatStore;
  frame: MeleeFrame;
  hitboxPadding: number;
  meleeParams: SwingParams;
}

export const applyMeleeDeflects = ({
  combat,
  frame,
  hitboxPadding,
  meleeParams,
}: ApplyMeleeArgs) => {
  if (!(frame.active && combat.enemyShots.length > 0)) {
    return;
  }

  const swingConfig = buildHitboxConfig(meleeParams, hitboxPadding);
  const now = performance.now();
  const survivors: ActiveEnemyShot[] = [];
  const newBursts: DeflectBurst[] = [];

  for (const shot of combat.enemyShots) {
    if (
      isPointInSwing(
        shot.position,
        frame.t,
        frame.center,
        frame.facingYaw,
        swingConfig
      )
    ) {
      newBursts.push({
        color: shot.color,
        createdAt: now,
        id: crypto.randomUUID(),
        position: shot.position,
        radius: shot.radius,
      });
    } else {
      survivors.push(shot);
    }
  }

  if (newBursts.length > 0) {
    combat.enemyShots = survivors;
    combat.deflectBursts.push(...newBursts);
  }
};

interface ApplyMeleeHitsArgs extends ApplyMeleeArgs {
  weaponBuild: WeaponBuild;
}

export const applyMeleeHitsToEnemies = ({
  combat,
  frame,
  hitboxPadding,
  meleeParams,
  weaponBuild,
}: ApplyMeleeHitsArgs) => {
  if (!frame.active) {
    return;
  }

  const hitSet = combat.meleeHitEnemies.get(frame.swingId);

  if (!hitSet) {
    return;
  }

  const swingConfig: SwingParams = {
    ...meleeParams,
    damage: weaponBuild.meleeDamage,
    reach: meleeParams.reach + hitboxPadding,
  };
  const now = performance.now();
  const nextEnemies: ActiveEnemy[] = [];

  for (const enemy of combat.enemies) {
    if (
      hitSet.has(enemy.id) ||
      enemy.radius > 1 ||
      !isPointInSwing(
        enemy.position,
        frame.t,
        frame.center,
        frame.facingYaw,
        swingConfig
      )
    ) {
      nextEnemies.push(enemy);
      continue;
    }

    hitSet.add(enemy.id);

    const damage = cheats.oneHitKill ? enemy.hp : swingConfig.damage;
    const [kx, kz] = swingKnockbackDirection(
      enemy.position,
      frame.center,
      swingConfig
    );
    const kick = Math.min(10, swingConfig.impulse * 1.6);

    combat.popDamage(
      damage,
      [
        enemy.position[0],
        enemy.position[1] + enemy.radius + 0.34,
        enemy.position[2],
      ],
      "enemy"
    );

    enemy.hp -= damage;
    enemy.knockbackVelocity = [
      Math.max(-10.5, Math.min(10.5, kx * kick)),
      0,
      Math.max(-10.5, Math.min(10.5, kz * kick)),
    ];
    enemy.lastHitAt = now;

    if (enemy.hp > 0) {
      nextEnemies.push(enemy);
    }
  }

  combat.enemies = nextEnemies;
};
