import {
  createEnemyShots,
  getEnemyMoveIntent,
  getProjectileHitDamage,
  resolveEnemyWallImpact,
} from "$lib/components/game/scene/utils";
import {
  floorHalfDepth,
  floorHalfWidth,
  hazardTickMs,
  playerRadius,
} from "$lib/game/scene-layout";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { RoomStore } from "$lib/stores/room.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";
import type {
  ActiveEnemy,
  ActiveEnemyShot,
  RoomHazard,
  Vec3,
} from "$lib/types/game";

interface StepContext {
  combat: CombatStore;
  currentRoomId: string;
  isCurrentRoomCombat: boolean;
  player: PlayerStore;
  room: RoomStore;
  roomHazards: RoomHazard[];
  timing: TimingStore;
}

const findActiveHazard = (hazards: RoomHazard[], position: Vec3) =>
  hazards.find(
    (hazard) =>
      position[1] < 0.84 &&
      Math.abs(position[0] - hazard.position[0]) <= hazard.args[0] &&
      Math.abs(position[2] - hazard.position[2]) <= hazard.args[2]
  );

const applyProjectileHits = (
  combat: CombatStore,
  enemy: ActiveEnemy,
  position: Vec3,
  knockbackVelocity: Vec3,
  hp: number,
  now: number,
  spentProjectiles: Set<string>
) => {
  let nextHp = hp;
  let nextLastHitAt = enemy.lastHitAt;
  let nextKnockbackVelocity = knockbackVelocity;

  for (const projectile of combat.projectiles) {
    if (spentProjectiles.has(projectile.id)) {
      continue;
    }

    const damage = getProjectileHitDamage(
      projectile,
      combat.projectilePositions.get(projectile.id),
      position,
      enemy.radius
    );

    if (!damage) {
      continue;
    }

    nextHp -= damage;
    nextLastHitAt = now;
    combat.popDamage(
      damage,
      [position[0], position[1] + enemy.radius + 0.34, position[2]],
      "enemy"
    );
    const projectileSpeed =
      Math.hypot(projectile.velocity[0], projectile.velocity[2]) || 1;
    const kick =
      enemy.radius > 1
        ? 0
        : Math.min(
            8.8,
            (projectile.build.mass * 5.4 + projectile.build.knockback * 0.24) /
              Math.max(0.75, enemy.radius * 1.05)
          );

    nextKnockbackVelocity = [
      Math.max(
        -10.5,
        Math.min(
          10.5,
          nextKnockbackVelocity[0] +
            (projectile.velocity[0] / projectileSpeed) * kick
        )
      ),
      0,
      Math.max(
        -10.5,
        Math.min(
          10.5,
          nextKnockbackVelocity[2] +
            (projectile.velocity[2] / projectileSpeed) * kick
        )
      ),
    ];
    spentProjectiles.add(projectile.id);
  }

  return {
    hp: nextHp,
    lastHitAt: nextLastHitAt,
    knockbackVelocity: nextKnockbackVelocity,
  };
};

const stepEnemy = (
  ctx: StepContext,
  enemy: ActiveEnemy,
  delta: number,
  now: number,
  spentProjectiles: Set<string>
) => {
  const { combat, player } = ctx;
  const playerPos = player.lastPosition;
  const dx = playerPos[0] - enemy.position[0];
  const dz = playerPos[2] - enemy.position[2];
  const distance = Math.hypot(dx, dz) || 1;
  const moveIntent = getEnemyMoveIntent(enemy, distance);
  const step = Math.min(distance, enemy.moveSpeed * delta) * moveIntent;
  const strafeStep =
    enemy.radius > 1
      ? Math.sin(now * 0.0042 + enemy.position[0] * 0.18) *
        enemy.moveSpeed *
        delta *
        0.82
      : 0;
  let knockbackVelocity = enemy.knockbackVelocity;
  let position: Vec3 = [
    enemy.position[0] +
      (dx / distance) * step +
      (-dz / distance) * strafeStep +
      knockbackVelocity[0] * delta,
    enemy.position[1],
    enemy.position[2] +
      (dz / distance) * step +
      (dx / distance) * strafeStep +
      knockbackVelocity[2] * delta,
  ];
  let hp = enemy.hp;
  let lastHitAt = enemy.lastHitAt;
  let lastShotAt = enemy.lastShotAt;
  let playerDamage = 0;
  let shots: ActiveEnemyShot[] = [];
  ({ hp, lastHitAt, knockbackVelocity } = applyProjectileHits(
    combat,
    enemy,
    position,
    knockbackVelocity,
    hp,
    now,
    spentProjectiles
  ));

  const knockbackDamping = Math.max(0, 1 - delta * 5.8);
  knockbackVelocity = [
    knockbackVelocity[0] * knockbackDamping,
    0,
    knockbackVelocity[2] * knockbackDamping,
  ];

  if (hp <= 0) {
    return { enemy: null, playerDamage, shots };
  }

  const wallImpact = resolveEnemyWallImpact(
    enemy,
    position,
    knockbackVelocity,
    hp,
    now
  );
  hp = wallImpact.hp;
  knockbackVelocity = wallImpact.knockbackVelocity;
  lastHitAt = wallImpact.lastHitAt ?? lastHitAt;
  position = wallImpact.position;

  if (wallImpact.damage > 0) {
    combat.popDamage(
      wallImpact.damage,
      [position[0], position[1] + enemy.radius + 0.34, position[2]],
      "enemy"
    );
  }

  if (hp <= 0) {
    return { enemy: null, playerDamage, shots };
  }

  if (
    Math.hypot(playerPos[0] - position[0], playerPos[2] - position[2]) <=
      enemy.radius + playerRadius &&
    now - player.lastTouchHitAt >= enemy.touchIntervalMs
  ) {
    player.lastTouchHitAt = now;
    player.lastHitAt = now;
    player.triggerRecover(enemy.touchIntervalMs);
    playerDamage = enemy.touchDamage;
    combat.popDamage(
      enemy.touchDamage,
      [playerPos[0], playerPos[1] + 1.1, playerPos[2]],
      "player"
    );
    player.pushImpact(
      [playerPos[0] - position[0], 0, playerPos[2] - position[2]],
      0.42 + enemy.radius * 0.42 + enemy.moveSpeed * 0.08,
      0.14
    );
  }

  if (
    enemy.behavior === "shooter" &&
    enemy.shotIntervalMs &&
    now - lastShotAt >= enemy.shotIntervalMs &&
    distance <= (enemy.preferredRange ?? 6.5) + 3.2
  ) {
    shots = createEnemyShots(enemy, position, dx, dz);

    if (shots.length > 0) {
      lastShotAt = now;
    }
  }

  return {
    enemy: Object.assign(enemy, {
      hp,
      knockbackVelocity,
      lastHitAt,
      lastShotAt,
      position,
    }),
    playerDamage,
    shots,
  };
};

const applyHazardDamage = (ctx: StepContext, now: number) => {
  const { combat, player, roomHazards, timing } = ctx;
  const hazard = findActiveHazard(roomHazards, player.lastPosition);

  if (!(hazard && now - timing.lastHazardAt >= hazardTickMs)) {
    return 0;
  }

  timing.lastHazardAt = now;
  player.lastHitAt = now;
  player.triggerRecover(hazardTickMs);
  combat.popDamage(
    hazard.damage,
    [
      player.lastPosition[0],
      player.lastPosition[1] + 1.05,
      player.lastPosition[2],
    ],
    "player"
  );
  player.pushImpact(
    [
      player.lastPosition[0] - hazard.position[0],
      0,
      player.lastPosition[2] - hazard.position[2],
    ],
    0.86,
    0.28
  );

  return hazard.damage;
};

const stepEnemyShots = (ctx: StepContext, delta: number, now: number) => {
  const { combat, player } = ctx;
  const playerPos = player.lastPosition;
  let playerDamage = 0;

  combat.enemyShots = combat.enemyShots.filter((shot) => {
    const ttlMs = shot.ttlMs - delta * 1000;
    const position: Vec3 = [
      shot.position[0] + shot.velocity[0] * delta,
      shot.position[1] + shot.velocity[1] * delta,
      shot.position[2] + shot.velocity[2] * delta,
    ];

    if (
      ttlMs <= 0 ||
      Math.abs(position[0]) > floorHalfWidth + 1 ||
      Math.abs(position[2]) > floorHalfDepth + 1
    ) {
      return false;
    }

    if (
      Math.hypot(
        playerPos[0] - position[0],
        playerPos[1] - position[1],
        playerPos[2] - position[2]
      ) <=
      shot.radius + playerRadius
    ) {
      player.lastHitAt = now;
      player.triggerRecover(260);
      playerDamage += shot.damage;
      combat.popDamage(
        shot.damage,
        [playerPos[0], playerPos[1] + 1.05, playerPos[2]],
        "player"
      );
      player.pushImpact(
        shot.velocity,
        0.54 + Math.hypot(shot.velocity[0], shot.velocity[2]) * 0.06,
        0.2
      );
      return false;
    }

    shot.position = position;
    shot.ttlMs = ttlMs;

    return true;
  });

  return playerDamage;
};

const syncRoomDoorState = (
  ctx: StepContext,
  now: number,
  doorOpenDelayMs: number,
  doorOpenDurationMs: number
) => {
  const { currentRoomId, isCurrentRoomCombat, room } = ctx;

  if (!isCurrentRoomCombat || room.releasedSet.has(currentRoomId)) {
    room.doorOpenAmount = 1;
    return;
  }

  if (room.unlockingRoomId === currentRoomId) {
    room.doorOpenAmount = Math.max(
      0,
      Math.min(
        1,
        (now - room.unlockStartedAt - doorOpenDelayMs) / doorOpenDurationMs
      )
    );

    if (room.doorOpenAmount >= 1) {
      room.markReleased(currentRoomId);
      room.unlockingRoomId = "";
    }

    return;
  }

  room.doorOpenAmount = 0;
};

interface StepEnemiesArgs extends StepContext {
  delta: number;
  doorOpenDelayMs: number;
  doorOpenDurationMs: number;
}

export interface StepEnemiesResult {
  nextHealth: number;
  roomCleared: boolean;
}

export const stepEnemies = (args: StepEnemiesArgs): StepEnemiesResult => {
  const {
    combat,
    currentRoomId,
    delta,
    isCurrentRoomCombat,
    player,
    room,
    timing,
  } = args;
  const now = performance.now();
  const enemiesSleeping = now < timing.enemyWakeUntil;
  const spentProjectiles = new Set<string>();
  const spawnedEnemyShots: ActiveEnemyShot[] = [];
  let nextHealth = player.health;

  syncRoomDoorState(args, now, args.doorOpenDelayMs, args.doorOpenDurationMs);

  nextHealth = Math.max(0, nextHealth - applyHazardDamage(args, now));
  nextHealth = Math.max(0, nextHealth - stepEnemyShots(args, delta, now));

  const nextEnemies: ActiveEnemy[] = [];

  for (const enemy of combat.enemies) {
    const result = enemiesSleeping
      ? { enemy, playerDamage: 0, shots: [] }
      : stepEnemy(args, enemy, delta, now, spentProjectiles);

    nextHealth = Math.max(0, nextHealth - result.playerDamage);

    if (result.shots.length > 0) {
      spawnedEnemyShots.push(...result.shots);
    }

    if (result.enemy) {
      nextEnemies.push(result.enemy);
    }
  }

  combat.enemies = nextEnemies;

  if (spawnedEnemyShots.length > 0) {
    combat.enemyShots.push(...spawnedEnemyShots);
  }

  combat.removeProjectiles(spentProjectiles);

  const roomCleared =
    combat.enemies.length === 0 &&
    isCurrentRoomCombat &&
    !room.clearedSet.has(currentRoomId) &&
    !room.releasedSet.has(currentRoomId) &&
    room.unlockingRoomId !== currentRoomId;

  if (roomCleared) {
    room.markCleared(currentRoomId);
    room.beginUnlock(currentRoomId, now);
  }

  return { nextHealth, roomCleared };
};
