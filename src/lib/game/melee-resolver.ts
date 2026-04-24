import {
  isPointInSwing,
  type SwingParams,
  swingKnockbackDirection,
} from "$lib/combat/melee-swing";
import type { WeaponBuild } from "$lib/config/weapon-graph";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type {
  ActiveBomb,
  ActiveEnemy,
  ActiveEnemyShot,
  ActiveProjectile,
  DeflectBurst,
  MeleeFrame,
  Vec3,
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

const pushEnemyDeathBurst = (
  combat: CombatStore,
  enemy: ActiveEnemy,
  now: number
) => {
  combat.deflectBursts.push({
    color: enemy.color,
    createdAt: now,
    id: crypto.randomUUID(),
    position: [
      enemy.position[0],
      enemy.position[1] + enemy.radius * 0.28,
      enemy.position[2],
    ],
    radius: enemy.radius > 1 ? enemy.radius * 2.2 : enemy.radius * 1.4,
  });
};

interface ApplyMeleeArgs {
  combat: CombatStore;
  frame: MeleeFrame;
  hitboxPadding: number;
  meleeParams: SwingParams;
}

interface ApplyMeleeDeflectArgs extends ApplyMeleeArgs {
  reflectedShotsSeekEnemies?: boolean;
  weaponBuild: WeaponBuild;
}

const findNearestEnemy = (position: Vec3, enemies: ActiveEnemy[]) => {
  let nearestEnemy: ActiveEnemy | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of enemies) {
    const distance = Math.hypot(
      enemy.position[0] - position[0],
      enemy.position[2] - position[2]
    );

    if (distance >= nearestDistance) {
      continue;
    }

    nearestEnemy = enemy;
    nearestDistance = distance;
  }

  return nearestEnemy;
};

const createReflectedProjectile = (
  shot: ActiveEnemyShot,
  enemies: ActiveEnemy[],
  weaponBuild: WeaponBuild
): ActiveProjectile => {
  const target = findNearestEnemy(shot.position, enemies);
  const direction: Vec3 = target
    ? [
        target.position[0] - shot.position[0],
        0,
        target.position[2] - shot.position[2],
      ]
    : [-shot.velocity[0], 0, -shot.velocity[2]];
  const directionLength = Math.hypot(direction[0], direction[2]) || 1;
  const incomingSpeed = Math.hypot(shot.velocity[0], shot.velocity[2]);
  const speed = Math.max(incomingSpeed * 1.55, weaponBuild.speed * 1.1, 18);
  const damage = Math.max(weaponBuild.damage, weaponBuild.meleeDamage);

  return {
    build: {
      ...weaponBuild,
      attackMode: "projectile",
      burstDamage: damage,
      colors: {
        ...weaponBuild.colors,
        core: "#fff7ed",
        glow: shot.color,
        shell: shot.color,
      },
      curve: 0,
      damage,
      drag: Math.min(weaponBuild.drag, 0.02),
      gravity: 0,
      homingTurn: target ? Math.max(weaponBuild.homingTurn, 5.5) : 0,
      pelletCount: 1,
      radius: Math.max(shot.radius * 0.88, Math.min(weaponBuild.radius, 0.24)),
      speed,
      spread: 0,
      ttlMs: Math.min(Math.max(weaponBuild.ttlMs, 900), 1400),
    },
    id: crypto.randomUUID(),
    position: [...shot.position],
    velocity: [
      (direction[0] / directionLength) * speed,
      0,
      (direction[2] / directionLength) * speed,
    ],
  };
};

export const applyMeleeDeflects = ({
  combat,
  frame,
  hitboxPadding,
  meleeParams,
  reflectedShotsSeekEnemies = false,
  weaponBuild,
}: ApplyMeleeDeflectArgs) => {
  if (!(frame.active && combat.enemyShots.length > 0)) {
    return;
  }

  const swingConfig = buildHitboxConfig(meleeParams, hitboxPadding);
  const now = performance.now();
  const survivors: ActiveEnemyShot[] = [];
  const newBursts: DeflectBurst[] = [];
  const reflectedProjectiles: ActiveProjectile[] = [];

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
      if (reflectedShotsSeekEnemies) {
        reflectedProjectiles.push(
          createReflectedProjectile(shot, combat.enemies, weaponBuild)
        );
      }
    } else {
      survivors.push(shot);
    }
  }

  if (newBursts.length > 0) {
    combat.enemyShots = survivors;
    combat.deflectBursts.push(...newBursts);
    combat.addProjectiles(reflectedProjectiles);
  }
};

interface ApplyMeleeHitsArgs extends ApplyMeleeArgs {
  oneHitKill?: boolean;
  weaponBuild: WeaponBuild;
}

export const applyMeleeHitsToBombs = ({
  combat,
  frame,
  hitboxPadding,
  meleeParams,
  oneHitKill = false,
  weaponBuild,
}: ApplyMeleeHitsArgs) => {
  if (!frame.active || combat.bombs.length === 0) {
    return;
  }

  const swingConfig: SwingParams = {
    ...meleeParams,
    damage: weaponBuild.meleeDamage,
    reach: meleeParams.reach + hitboxPadding,
  };
  const now = performance.now();
  const survivors: ActiveBomb[] = [];

  for (const bomb of combat.bombs) {
    const armed = now >= bomb.armAt;

    if (
      armed ||
      !isPointInSwing(
        bomb.position,
        frame.t,
        frame.center,
        frame.facingYaw,
        swingConfig
      )
    ) {
      survivors.push(bomb);
      continue;
    }

    const damage = oneHitKill ? bomb.hp : swingConfig.damage;

    combat.popDamage(
      damage,
      [
        bomb.position[0],
        bomb.position[1] + bomb.radius + 0.28,
        bomb.position[2],
      ],
      "enemy"
    );

    const remaining = bomb.hp - damage;

    if (remaining <= 0) {
      combat.deflectBursts.push({
        color: bomb.color,
        createdAt: now,
        id: crypto.randomUUID(),
        position: bomb.position,
        radius: bomb.radius * 1.4,
      });
      continue;
    }

    survivors.push({ ...bomb, hp: remaining, lastHitAt: now });
  }

  combat.bombs = survivors;
};

export const applyMeleeHitsToEnemies = ({
  combat,
  frame,
  hitboxPadding,
  meleeParams,
  oneHitKill = false,
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

    const damage = oneHitKill ? enemy.hp : swingConfig.damage;
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
    } else {
      pushEnemyDeathBurst(combat, enemy, now);
    }
  }

  combat.enemies = nextEnemies;
};
