import { gameSfx } from "$lib/audio/sfx";
import {
  createBombs,
  createEnemyShots,
  getEnemyMoveIntent,
  getProjectileHitDamage,
  resolveEnemyWallImpact,
} from "$lib/components/game/scene/utils";
import type { RoomTemplate } from "$lib/config/room-templates";
import { outsidePlan } from "$lib/game/outside-chunk-context";
import {
  clampToRoom,
  getConveyorVelocity,
  getRoomBounds,
  hazardTickMs,
  playerRadius,
} from "$lib/game/scene-layout";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PickupStore } from "$lib/stores/pickups.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { RoomStore } from "$lib/stores/room.svelte";
import type { TimingStore } from "$lib/stores/timing.svelte";
import type {
  ActiveBomb,
  ActiveEnemy,
  ActiveEnemyShot,
  ActiveGateLaser,
  RoomHazard,
  RoomPlatform,
  Vec3,
} from "$lib/types/game";

interface StepContext {
  combat: CombatStore;
  currentRoomId: string;
  currentRoomTemplate: RoomTemplate;
  enemyAiPaused?: boolean;
  isCurrentRoomCombat: boolean;
  obstacles: SolidObstacle[];
  pickups: PickupStore;
  player: PlayerStore;
  room: RoomStore;
  roomHazards: RoomHazard[];
  roomPlatforms: RoomPlatform[];
  timing: TimingStore;
}

interface SolidObstacle {
  radius: number;
  x: number;
  z: number;
}

let obstacleSeed = "";
let outsideObstacles: SolidObstacle[] = [];

const getSolidObstacles = (layout: RoomTemplate["layout"]): SolidObstacle[] => {
  if (layout !== "outside-yard") {
    return [];
  }

  const plan = outsidePlan();
  if (plan.seed !== obstacleSeed) {
    obstacleSeed = plan.seed;
    outsideObstacles = plan.vegetation.instances.flatMap((inst) =>
      inst.collider
        ? [
            {
              radius: inst.collider.radius * inst.scale,
              x: inst.x,
              z: inst.z,
            },
          ]
        : []
    );
  }

  return outsideObstacles;
};

const getWaterSpeedFactor = (
  layout: RoomTemplate["layout"],
  x: number,
  z: number,
  radius: number
) =>
  layout === "outside-yard" &&
  Math.min(
    outsidePlan().sampleHeight(x, z),
    outsidePlan().sampleHeight(x + radius, z),
    outsidePlan().sampleHeight(x - radius, z),
    outsidePlan().sampleHeight(x, z + radius),
    outsidePlan().sampleHeight(x, z - radius)
  ) < -0.04
    ? 0.5
    : 1;

const resolveObstacleImpact = (
  position: Vec3,
  radius: number,
  obstacles: SolidObstacle[]
) => {
  let hit = false;
  let x = position[0];
  let z = position[2];

  for (const obstacle of obstacles) {
    const minDistance = radius + obstacle.radius;
    const dx = x - obstacle.x;
    const dz = z - obstacle.z;
    const distance = Math.hypot(dx, dz);

    if (distance >= minDistance) {
      continue;
    }

    hit = true;
    if (distance <= 0.001) {
      x += minDistance;
      continue;
    }

    x += (dx / distance) * (minDistance - distance);
    z += (dz / distance) * (minDistance - distance);
  }

  return {
    hit,
    position: [x, position[1], z] as Vec3,
  };
};

const shotHitsObstacle = (
  from: Vec3,
  to: Vec3,
  radius: number,
  obstacles: SolidObstacle[]
) => {
  const moveX = to[0] - from[0];
  const moveZ = to[2] - from[2];
  const moveLength2 = moveX * moveX + moveZ * moveZ || 1;

  for (const obstacle of obstacles) {
    const t = Math.max(
      0,
      Math.min(
        1,
        ((obstacle.x - from[0]) * moveX + (obstacle.z - from[2]) * moveZ) /
          moveLength2
      )
    );
    const dx = from[0] + moveX * t - obstacle.x;
    const dz = from[2] + moveZ * t - obstacle.z;

    if (Math.hypot(dx, dz) <= radius + obstacle.radius) {
      return true;
    }
  }

  return false;
};

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

const getEnemyConveyorVelocity = (ctx: StepContext, enemy: ActiveEnemy): Vec3 =>
  getConveyorVelocity(
    ctx.roomPlatforms,
    enemy.position,
    enemy.radius * 0.2
  ) ?? [0, 0, 0];

const countActiveBombs = (combat: CombatStore, originId: string) => {
  let count = 0;

  for (const bomb of combat.bombs) {
    if (bomb.originId === originId) {
      count += 1;
    }
  }

  return count;
};

const gateKeeperLaserCooldownMs = 5400;
const gateKeeperLaserTelegraphMs = 720;
const gateKeeperLaserSweepMs = 1320;
const gateKeeperLaserFadeMs = 420;
const gateKeeperLaserArcSpan = 1.96;
const gateKeeperLaserWidth = 0.46;
const gateKeeperLaserMaxRange = 22;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));

const getDistanceToSegment2D = (
  pointX: number,
  pointZ: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number
) => {
  const segmentX = endX - startX;
  const segmentZ = endZ - startZ;
  const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;

  if (segmentLengthSq <= 0.0001) {
    return {
      distance: Math.hypot(pointX - startX, pointZ - startZ),
      nearestX: startX,
      nearestZ: startZ,
      t: 0,
    };
  }

  const t = clamp(
    ((pointX - startX) * segmentX + (pointZ - startZ) * segmentZ) /
      segmentLengthSq,
    0,
    1
  );
  const nearestX = startX + segmentX * t;
  const nearestZ = startZ + segmentZ * t;

  return {
    distance: Math.hypot(pointX - nearestX, pointZ - nearestZ),
    nearestX,
    nearestZ,
    t,
  };
};

const getGroundY = (layout: RoomTemplate["layout"], x: number, z: number) =>
  layout === "outside-yard" ? outsidePlan().sampleHeight(x, z) : 0;

const createGateKeeperLaser = (
  ctx: StepContext,
  enemy: ActiveEnemy,
  position: Vec3,
  playerPos: Vec3,
  now: number
): ActiveGateLaser => {
  const dx = playerPos[0] - position[0];
  const dz = playerPos[2] - position[2];
  const distance = Math.hypot(dx, dz) || 1;
  const targetYaw = Math.atan2(dx, dz);
  const sweepDirection = Math.sin(now * 0.0017 + position[0]) >= 0 ? 1 : -1;
  const arcSpan = gateKeeperLaserArcSpan * sweepDirection;

  return {
    arcSpan,
    center: [
      position[0],
      getGroundY(ctx.currentRoomTemplate.layout, position[0], position[2]) +
        0.1,
      position[2],
    ],
    color: "#ff8f38",
    core: "#ffe0a0",
    createdAt: now,
    damage: 2,
    fadeMs: gateKeeperLaserFadeMs,
    id: crypto.randomUUID(),
    originId: enemy.id,
    radius: clamp(distance + 1.8, 7.2, 16.5),
    startAngle: targetYaw - arcSpan * 0.5,
    sweepMs: gateKeeperLaserSweepMs,
    telegraphMs: gateKeeperLaserTelegraphMs,
    width: gateKeeperLaserWidth,
  };
};

const createEnemyRangedAttacks = (
  ctx: StepContext,
  enemy: ActiveEnemy,
  position: Vec3,
  playerPos: Vec3,
  playerDistance: number,
  lastBombAt: number,
  lastShotAt: number,
  now: number
) => {
  const isGateKeeper = enemy.templateId === "gate-keeper";
  let nextLastBombAt = lastBombAt;
  let nextLastShotAt = lastShotAt;
  let shots: ActiveEnemyShot[] = [];
  let bombs: ActiveBomb[] = [];
  let gateLasers: ActiveGateLaser[] = [];

  if (
    isGateKeeper &&
    now - nextLastBombAt >= gateKeeperLaserCooldownMs &&
    playerDistance <= gateKeeperLaserMaxRange
  ) {
    gateLasers = [createGateKeeperLaser(ctx, enemy, position, playerPos, now)];
    nextLastBombAt = now;
  }

  const gateKeeperLaserRecovering =
    isGateKeeper && now - nextLastBombAt < gateKeeperLaserTelegraphMs + 520;

  if (
    (enemy.behavior === "shooter" || enemy.behavior === "bomber") &&
    enemy.shotIntervalMs &&
    now - nextLastShotAt >= enemy.shotIntervalMs &&
    playerDistance <= (enemy.preferredRange ?? 6.5) + 3.2 &&
    !gateKeeperLaserRecovering
  ) {
    shots = createEnemyShots(
      enemy,
      position,
      playerPos[0] - position[0],
      playerPos[2] - position[2]
    );

    if (shots.length > 0) {
      nextLastShotAt = now;
    }
  }

  if (
    enemy.behavior === "bomber" &&
    enemy.bombCooldownMs &&
    enemy.bombMaxActive &&
    now - nextLastBombAt >= enemy.bombCooldownMs &&
    countActiveBombs(ctx.combat, enemy.id) + (enemy.bombCount ?? 0) <=
      enemy.bombMaxActive
  ) {
    bombs = createBombs(
      enemy,
      position,
      playerPos[0] - position[0],
      playerPos[2] - position[2],
      now
    );

    if (bombs.length > 0) {
      nextLastBombAt = now;
    }
  }

  return {
    bombs,
    gateLasers,
    lastBombAt: nextLastBombAt,
    lastShotAt: nextLastShotAt,
    shots,
  };
};

const getEnemyTarget = (ctx: StepContext, enemy: ActiveEnemy, now: number) => {
  const playerPos = ctx.player.lastPosition;
  const playerDx = playerPos[0] - enemy.position[0];
  const playerDz = playerPos[2] - enemy.position[2];
  const playerDistance = Math.hypot(playerDx, playerDz) || 1;
  const patrolCenter = enemy.patrolCenter;
  const patrolling =
    ctx.currentRoomTemplate.layout === "outside-yard" &&
    !!patrolCenter &&
    playerDistance > 13;
  const patrolAngle = now * (enemy.patrolSpeed ?? 0) + enemy.radius;
  const targetX = patrolling
    ? patrolCenter[0] + Math.cos(patrolAngle) * (enemy.patrolRadius ?? 0)
    : playerPos[0];
  const targetZ = patrolling
    ? patrolCenter[2] + Math.sin(patrolAngle) * (enemy.patrolRadius ?? 0)
    : playerPos[2];
  const dx = targetX - enemy.position[0];
  const dz = targetZ - enemy.position[2];
  const distance = Math.hypot(dx, dz) || 1;

  return {
    distance,
    dx,
    dz,
    moveIntent: patrolling ? 0.62 : getEnemyMoveIntent(enemy, playerDistance),
    playerDistance,
    playerPos,
  };
};

const pushEnemyDeathBurst = (
  combat: CombatStore,
  enemy: ActiveEnemy,
  position: Vec3,
  now: number
) => {
  combat.deflectBursts.push({
    color: enemy.color,
    createdAt: now,
    id: crypto.randomUUID(),
    position: [position[0], position[1] + enemy.radius * 0.28, position[2]],
    radius: enemy.radius > 1 ? enemy.radius * 2.2 : enemy.radius * 1.4,
  });
  gameSfx.playEnemyDeath(enemy.radius - 0.4);
};

const pushEnemyFromPlatforms = (
  position: Vec3,
  radius: number,
  platforms: RoomPlatform[],
  bounds: ReturnType<typeof getRoomBounds>
): Vec3 => {
  let next = position;

  for (const platform of platforms) {
    const dx = next[0] - platform.position[0];
    const dz = next[2] - platform.position[2];
    const xOverlap = platform.args[0] + radius - Math.abs(dx);
    const zOverlap = platform.args[2] + radius - Math.abs(dz);

    if (xOverlap <= 0 || zOverlap <= 0) {
      continue;
    }

    next =
      xOverlap < zOverlap
        ? [
            platform.position[0] +
              Math.sign(dx || 1) * (platform.args[0] + radius),
            next[1],
            next[2],
          ]
        : [
            next[0],
            next[1],
            platform.position[2] +
              Math.sign(dz || 1) * (platform.args[2] + radius),
          ];
  }

  return clampToRoom(next, radius, bounds);
};

const getEnemyBlockingPlatforms = (
  enemy: ActiveEnemy,
  platforms: RoomPlatform[]
) =>
  enemy.radius > 1
    ? platforms.filter((platform) => !platform.id.includes("dais"))
    : platforms;

const stepEnemy = (
  ctx: StepContext,
  enemy: ActiveEnemy,
  delta: number,
  now: number,
  spentProjectiles: Set<string>
) => {
  const { combat, player } = ctx;
  const { distance, dx, dz, moveIntent, playerDistance, playerPos } =
    getEnemyTarget(ctx, enemy, now);
  const waterSpeedFactor = getWaterSpeedFactor(
    ctx.currentRoomTemplate.layout,
    enemy.position[0],
    enemy.position[2],
    enemy.radius
  );
  const step =
    Math.min(distance, enemy.moveSpeed * delta) * moveIntent * waterSpeedFactor;
  const strafeStep =
    enemy.radius > 1
      ? Math.sin(now * 0.0042 + enemy.position[0] * 0.18) *
        enemy.moveSpeed *
        delta *
        0.82 *
        waterSpeedFactor
      : 0;
  const conveyor = getEnemyConveyorVelocity(ctx, enemy);
  let knockbackVelocity = enemy.knockbackVelocity;
  let position: Vec3 = [
    enemy.position[0] +
      (dx / distance) * step +
      (-dz / distance) * strafeStep +
      (knockbackVelocity[0] + conveyor[0]) * delta,
    enemy.position[1],
    enemy.position[2] +
      (dz / distance) * step +
      (dx / distance) * strafeStep +
      (knockbackVelocity[2] + conveyor[2]) * delta,
  ];
  let hp = enemy.hp;
  let lastBombAt = enemy.lastBombAt ?? 0;
  let lastHitAt = enemy.lastHitAt;
  let lastShotAt = enemy.lastShotAt;
  let playerDamage = 0;
  let shots: ActiveEnemyShot[] = [];
  let bombs: ActiveBomb[] = [];
  let gateLasers: ActiveGateLaser[] = [];
  let gateKeeperDefeated = false;
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
    gateKeeperDefeated = enemy.templateId === "gate-keeper";
    pushEnemyDeathBurst(combat, enemy, position, now);
    return {
      enemy: null,
      gateKeeperDefeated,
      playerDamage,
      shots,
      bombs,
      gateLasers,
    };
  }

  const bounds = getRoomBounds(ctx.currentRoomTemplate.layout);
  const wallImpact = resolveEnemyWallImpact(
    enemy,
    position,
    knockbackVelocity,
    hp,
    now,
    bounds
  );
  hp = wallImpact.hp;
  knockbackVelocity = wallImpact.knockbackVelocity;
  lastHitAt = wallImpact.lastHitAt ?? lastHitAt;
  position = wallImpact.position;

  const obstacleImpact = resolveObstacleImpact(
    position,
    enemy.radius,
    ctx.obstacles
  );
  position = obstacleImpact.position;

  if (obstacleImpact.hit) {
    knockbackVelocity = [
      knockbackVelocity[0] * 0.25,
      0,
      knockbackVelocity[2] * 0.25,
    ];
  }

  if (wallImpact.damage > 0) {
    combat.popDamage(
      wallImpact.damage,
      [position[0], position[1] + enemy.radius + 0.34, position[2]],
      "enemy"
    );
  }

  if (hp <= 0) {
    gateKeeperDefeated = enemy.templateId === "gate-keeper";
    pushEnemyDeathBurst(combat, enemy, position, now);
    return {
      enemy: null,
      gateKeeperDefeated,
      playerDamage,
      shots,
      bombs,
      gateLasers,
    };
  }

  position = pushEnemyFromPlatforms(
    position,
    enemy.radius,
    getEnemyBlockingPlatforms(enemy, ctx.roomPlatforms),
    bounds
  );

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

  ({ bombs, gateLasers, lastBombAt, lastShotAt, shots } =
    createEnemyRangedAttacks(
      ctx,
      enemy,
      position,
      playerPos,
      playerDistance,
      lastBombAt,
      lastShotAt,
      now
    ));

  return {
    enemy: Object.assign(enemy, {
      hp,
      knockbackVelocity,
      lastBombAt,
      lastHitAt,
      lastShotAt,
      position,
    }),
    gateKeeperDefeated,
    playerDamage,
    shots,
    bombs,
    gateLasers,
  };
};

const stepPausedEnemy = (
  ctx: StepContext,
  enemy: ActiveEnemy,
  now: number,
  spentProjectiles: Set<string>
) => {
  const { combat } = ctx;
  const position = enemy.position;
  let hp = enemy.hp;
  let lastHitAt = enemy.lastHitAt;

  ({ hp, lastHitAt } = applyProjectileHits(
    combat,
    enemy,
    position,
    [0, 0, 0],
    hp,
    now,
    spentProjectiles
  ));

  if (hp <= 0) {
    pushEnemyDeathBurst(combat, enemy, position, now);
    return null;
  }

  return Object.assign(enemy, {
    hp,
    knockbackVelocity: [0, 0, 0] as Vec3,
    lastHitAt,
    position,
  });
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

const stepGateLasers = (ctx: StepContext, now: number) => {
  const { combat, player, timing } = ctx;
  const playerPos = player.lastPosition;
  let playerDamage = 0;

  combat.gateLasers = combat.gateLasers.filter((laser) => {
    const age = now - laser.createdAt;
    const duration = laser.telegraphMs + laser.sweepMs + laser.fadeMs;

    if (age >= duration) {
      return false;
    }

    if (
      age < laser.telegraphMs ||
      age > laser.telegraphMs + laser.sweepMs ||
      now - timing.lastHazardAt < hazardTickMs
    ) {
      return true;
    }

    const sweepT = clamp((age - laser.telegraphMs) / laser.sweepMs, 0, 1);
    const sweepAngle = laser.startAngle + laser.arcSpan * sweepT;
    const dx = playerPos[0] - laser.center[0];
    const dz = playerPos[2] - laser.center[2];
    const distance = Math.hypot(dx, dz);
    const beamPoint: Vec3 = [
      laser.center[0] + Math.sin(sweepAngle) * laser.radius,
      laser.center[1],
      laser.center[2] + Math.cos(sweepAngle) * laser.radius,
    ];
    const radialHit =
      Math.abs(distance - laser.radius) <= laser.width + playerRadius;
    const angle = Math.atan2(dx, dz);
    const angleHit =
      Math.abs(normalizeAngle(angle - sweepAngle)) <=
      Math.max(0.14, (laser.width + playerRadius) / Math.max(1, laser.radius));
    const beamHit = getDistanceToSegment2D(
      playerPos[0],
      playerPos[2],
      laser.center[0],
      laser.center[2],
      beamPoint[0],
      beamPoint[2]
    );
    const lineHit =
      beamHit.t >= 0.08 &&
      beamHit.distance <= laser.width * 0.82 + playerRadius;
    const playerGroundY = getGroundY(
      ctx.currentRoomTemplate.layout,
      playerPos[0],
      playerPos[2]
    );
    const jumpedOverLaser = playerPos[1] - playerGroundY > 1.12;
    const headHit = radialHit && angleHit;

    if (!((headHit || lineHit) && !jumpedOverLaser)) {
      return true;
    }
    const impactSource: Vec3 = headHit
      ? beamPoint
      : [beamHit.nearestX, laser.center[1], beamHit.nearestZ];

    timing.lastHazardAt = now;
    player.lastHitAt = now;
    player.triggerRecover(hazardTickMs);
    playerDamage += laser.damage;
    combat.popDamage(
      laser.damage,
      [playerPos[0], playerPos[1] + 1.05, playerPos[2]],
      "player"
    );
    player.pushImpact(
      [playerPos[0] - impactSource[0], 0, playerPos[2] - impactSource[2]],
      0.9,
      0.34
    );

    return true;
  });

  return playerDamage;
};

const applyProjectileHitsToBomb = (
  combat: CombatStore,
  bomb: ActiveBomb,
  position: Vec3,
  now: number,
  spentProjectiles: Set<string>
) => {
  let hp = bomb.hp;
  let lastHitAt = bomb.lastHitAt;

  for (const projectile of combat.projectiles) {
    if (spentProjectiles.has(projectile.id)) {
      continue;
    }

    const projectilePosition = combat.projectilePositions.get(projectile.id);

    if (!projectilePosition) {
      continue;
    }

    const hitDistance = Math.hypot(
      projectilePosition[0] - position[0],
      projectilePosition[1] - position[1],
      projectilePosition[2] - position[2]
    );

    if (hitDistance > bomb.radius + projectile.build.radius) {
      continue;
    }

    hp -= 1;
    lastHitAt = now;
    combat.popDamage(
      1,
      [position[0], position[1] + bomb.radius + 0.28, position[2]],
      "enemy"
    );
    spentProjectiles.add(projectile.id);

    if (hp <= 0) {
      break;
    }
  }

  return { hp, lastHitAt };
};

const detonateBomb = (
  combat: CombatStore,
  bomb: ActiveBomb,
  position: Vec3,
  playerPos: Vec3,
  player: PlayerStore,
  now: number
) => {
  player.lastHitAt = now;
  player.triggerRecover(320);
  combat.popDamage(
    bomb.damage,
    [playerPos[0], playerPos[1] + 1.05, playerPos[2]],
    "player"
  );
  player.pushImpact(
    [playerPos[0] - position[0], 0, playerPos[2] - position[2]],
    0.78 + bomb.explosionRadius * 0.32,
    0.26
  );
  combat.deflectBursts.push({
    color: bomb.color,
    createdAt: now,
    id: crypto.randomUUID(),
    position,
    radius: bomb.explosionRadius,
  });
};

const stepBombs = (
  ctx: StepContext,
  delta: number,
  now: number,
  spentProjectiles: Set<string>
) => {
  const { combat, player } = ctx;
  const playerPos = player.lastPosition;
  const bounds = getRoomBounds(ctx.currentRoomTemplate.layout);
  let playerDamage = 0;

  const survivors: ActiveBomb[] = [];

  for (const bomb of combat.bombs) {
    if (now >= bomb.expiresAt) {
      continue;
    }

    const position: Vec3 = [
      bomb.position[0] + bomb.velocity[0] * delta,
      bomb.position[1],
      bomb.position[2] + bomb.velocity[2] * delta,
    ];

    if (
      Math.abs(position[0]) > bounds.floorHalfWidth + 1 ||
      Math.abs(position[2]) > bounds.floorHalfDepth + 1
    ) {
      continue;
    }

    const { hp, lastHitAt } = applyProjectileHitsToBomb(
      combat,
      bomb,
      position,
      now,
      spentProjectiles
    );

    if (hp <= 0) {
      combat.deflectBursts.push({
        color: bomb.color,
        createdAt: now,
        id: crypto.randomUUID(),
        position,
        radius: bomb.radius * 1.5,
      });
      continue;
    }

    const armed = now >= bomb.armAt;
    const distance = Math.hypot(
      playerPos[0] - position[0],
      playerPos[2] - position[2]
    );

    if (armed && distance <= bomb.explosionRadius + playerRadius) {
      playerDamage += bomb.damage;
      detonateBomb(combat, bomb, position, playerPos, player, now);
      continue;
    }

    bomb.position = position;
    bomb.hp = hp;
    bomb.lastHitAt = lastHitAt;
    survivors.push(bomb);
  }

  combat.bombs = survivors;

  return playerDamage;
};

const stepEnemyShots = (ctx: StepContext, delta: number, now: number) => {
  const { combat, player } = ctx;
  const playerPos = player.lastPosition;
  const bounds = getRoomBounds(ctx.currentRoomTemplate.layout);
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
      Math.abs(position[0]) > bounds.floorHalfWidth + 1 ||
      Math.abs(position[2]) > bounds.floorHalfDepth + 1
    ) {
      return false;
    }

    if (shotHitsObstacle(shot.position, position, shot.radius, ctx.obstacles)) {
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

  if (
    !isCurrentRoomCombat ||
    room.releasedSet.has(currentRoomId) ||
    (room.clearedSet.has(currentRoomId) &&
      room.unlockingRoomId !== currentRoomId)
  ) {
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

interface StepEnemiesArgs extends Omit<StepContext, "obstacles"> {
  delta: number;
  doorOpenDelayMs: number;
  doorOpenDurationMs: number;
}

interface StepActiveEnemyResult {
  bombs: ActiveBomb[];
  enemy: ActiveEnemy | null;
  gateKeeperDefeated: boolean;
  gateLasers: ActiveGateLaser[];
  playerDamage: number;
  shots: ActiveEnemyShot[];
}

const stepActiveEnemies = (
  ctx: StepContext,
  enemiesSleeping: boolean,
  delta: number,
  now: number,
  spentProjectiles: Set<string>
) => {
  const nextEnemies: ActiveEnemy[] = [];
  const spawnedEnemyShots: ActiveEnemyShot[] = [];
  const spawnedBombs: ActiveBomb[] = [];
  const spawnedGateLasers: ActiveGateLaser[] = [];
  let gateKeeperDefeated = false;
  let playerDamage = 0;

  for (const enemy of ctx.combat.enemies) {
    let result: StepActiveEnemyResult;

    if (ctx.enemyAiPaused) {
      result = {
        enemy: stepPausedEnemy(ctx, enemy, now, spentProjectiles),
        gateKeeperDefeated: false,
        playerDamage: 0,
        shots: [],
        bombs: [],
        gateLasers: [],
      };
    } else if (enemiesSleeping) {
      result = {
        enemy,
        gateKeeperDefeated: false,
        playerDamage: 0,
        shots: [],
        bombs: [],
        gateLasers: [],
      };
    } else {
      result = stepEnemy(ctx, enemy, delta, now, spentProjectiles);
    }

    playerDamage += result.playerDamage;

    if (result.shots.length > 0) {
      spawnedEnemyShots.push(...result.shots);
    }

    if (result.bombs.length > 0) {
      spawnedBombs.push(...result.bombs);
    }

    if (result.gateLasers.length > 0) {
      spawnedGateLasers.push(...result.gateLasers);
    }

    gateKeeperDefeated = gateKeeperDefeated || result.gateKeeperDefeated;

    if (result.enemy) {
      nextEnemies.push(result.enemy);
    }
  }

  return {
    gateKeeperDefeated,
    nextEnemies,
    playerDamage,
    spawnedBombs,
    spawnedEnemyShots,
    spawnedGateLasers,
  };
};

const keepOriginBoundActorsAlive = (
  combat: CombatStore,
  nextEnemies: ActiveEnemy[],
  options: { keepGateKeeperActors?: boolean } = {}
) => {
  const livingIds = new Set(nextEnemies.map((entry) => entry.id));
  const isKeptFinaleActor = (originId: string) =>
    Boolean(options.keepGateKeeperActors && originId.endsWith("-gate-keeper"));

  if (combat.bombs.length > 0) {
    const survivingBombs = combat.bombs.filter(
      (bomb) => livingIds.has(bomb.originId) || isKeptFinaleActor(bomb.originId)
    );

    if (survivingBombs.length !== combat.bombs.length) {
      combat.bombs = survivingBombs;
    }
  }

  if (combat.gateLasers.length > 0) {
    const survivingGateLasers = combat.gateLasers.filter(
      (laser) =>
        livingIds.has(laser.originId) || isKeptFinaleActor(laser.originId)
    );

    if (survivingGateLasers.length !== combat.gateLasers.length) {
      combat.gateLasers = survivingGateLasers;
    }
  }
};

export interface StepEnemiesResult {
  doorStartedOpening: boolean;
  lootSpawned: boolean;
  nextHealth: number;
  roomCleared: boolean;
}

export const stepEnemies = (args: StepEnemiesArgs): StepEnemiesResult => {
  const {
    combat,
    currentRoomId,
    currentRoomTemplate,
    delta,
    isCurrentRoomCombat,
    pickups,
    player,
    room,
    timing,
  } = args;
  const now = performance.now();
  const enemiesSleeping = now < timing.enemyWakeUntil;
  const spentProjectiles = new Set<string>();
  let lootSpawned = false;
  let nextHealth = player.health;
  const ctx: StepContext = {
    ...args,
    obstacles: getSolidObstacles(currentRoomTemplate.layout),
  };
  const doorWasLocked =
    room.unlockingRoomId === currentRoomId && room.doorOpenAmount <= 0.001;

  syncRoomDoorState(ctx, now, args.doorOpenDelayMs, args.doorOpenDurationMs);
  const doorStartedOpening =
    doorWasLocked &&
    room.unlockingRoomId === currentRoomId &&
    room.doorOpenAmount > 0.001;
  const outsideFinaleResolved =
    currentRoomTemplate.id === "outside-start" &&
    currentRoomTemplate.layout === "outside-yard" &&
    room.clearedSet.has(currentRoomId);

  if (outsideFinaleResolved) {
    return {
      doorStartedOpening,
      lootSpawned,
      nextHealth,
      roomCleared: false,
    };
  }

  nextHealth = Math.max(0, nextHealth - applyHazardDamage(ctx, now));
  nextHealth = Math.max(0, nextHealth - stepGateLasers(ctx, now));
  nextHealth = Math.max(0, nextHealth - stepEnemyShots(ctx, delta, now));
  nextHealth = Math.max(
    0,
    nextHealth - stepBombs(ctx, delta, now, spentProjectiles)
  );

  const steppedEnemies = stepActiveEnemies(
    ctx,
    enemiesSleeping,
    delta,
    now,
    spentProjectiles
  );
  nextHealth = Math.max(0, nextHealth - steppedEnemies.playerDamage);

  const outsideGateKeeperCleared =
    isCurrentRoomCombat &&
    currentRoomTemplate.id === "outside-start" &&
    currentRoomTemplate.layout === "outside-yard" &&
    !room.clearedSet.has(currentRoomId) &&
    !steppedEnemies.nextEnemies.some(
      (enemy) => enemy.templateId === "gate-keeper"
    );

  combat.enemies = steppedEnemies.nextEnemies;
  keepOriginBoundActorsAlive(combat, steppedEnemies.nextEnemies, {
    keepGateKeeperActors: outsideGateKeeperCleared,
  });

  if (steppedEnemies.spawnedEnemyShots.length > 0) {
    combat.enemyShots.push(...steppedEnemies.spawnedEnemyShots);
  }

  if (steppedEnemies.spawnedBombs.length > 0) {
    combat.bombs.push(...steppedEnemies.spawnedBombs);
  }

  if (steppedEnemies.spawnedGateLasers.length > 0) {
    combat.gateLasers.push(...steppedEnemies.spawnedGateLasers);
  }

  combat.removeProjectiles(spentProjectiles);

  if (outsideGateKeeperCleared) {
    combat.bombs = combat.bombs.map((bomb) =>
      bomb.originId.endsWith("-gate-keeper")
        ? {
            ...bomb,
            armAt: Number.POSITIVE_INFINITY,
            damage: 0,
            velocity: [0, 0, 0],
          }
        : bomb
    );
    combat.enemyShots = combat.enemyShots.map((shot) => ({
      ...shot,
      damage: 0,
      velocity: [0, 0, 0],
    }));
    combat.gateLasers = combat.gateLasers.map((laser) =>
      laser.originId.endsWith("-gate-keeper") ? { ...laser, damage: 0 } : laser
    );
  }

  const roomCleared =
    ((combat.enemies.length === 0 &&
      isCurrentRoomCombat &&
      !room.clearedSet.has(currentRoomId) &&
      (currentRoomTemplate.layout === "outside-yard" ||
        !room.releasedSet.has(currentRoomId))) ||
      outsideGateKeeperCleared ||
      (steppedEnemies.gateKeeperDefeated &&
        currentRoomTemplate.layout === "outside-yard" &&
        !room.clearedSet.has(currentRoomId))) &&
    room.unlockingRoomId !== currentRoomId;

  if (roomCleared) {
    lootSpawned = pickups.dropRoom(currentRoomId, currentRoomTemplate, now) > 0;
    room.markCleared(currentRoomId);
    room.beginUnlock(currentRoomId, now);
  }

  return { doorStartedOpening, lootSpawned, nextHealth, roomCleared };
};
