import type { WeaponBuild } from "$lib/config/weapon-graph";
import { getDamageAtDistance } from "$lib/config/weapon-graph";
import {
  clampToRoom,
  defaultRoomBounds,
  enemyShotRadius,
  enemyShotTtlMs,
  type RoomBounds,
} from "$lib/game/scene-layout";
import type {
  ActiveBomb,
  ActiveEnemy,
  ActiveEnemyShot,
  ActiveProjectile,
  RoomHazard,
  Vec3,
} from "$lib/types/game";

export const getHazardBrakeFactor = (position: Vec3, hazards: RoomHazard[]) => {
  if (position[1] > 1.25 || hazards.length === 0) {
    return 1;
  }

  let factor = 1;

  for (const hazard of hazards) {
    const dx = Math.max(
      0,
      Math.abs(position[0] - hazard.position[0]) - hazard.args[0]
    );
    const dz = Math.max(
      0,
      Math.abs(position[2] - hazard.position[2]) - hazard.args[2]
    );
    const distance = Math.hypot(dx, dz);

    if (distance > 1.1) {
      continue;
    }

    factor = Math.min(factor, 0.42 + (distance / 1.1) * 0.58);
  }

  return factor;
};

export const resolveEnemyWallImpact = (
  enemy: ActiveEnemy,
  position: Vec3,
  knockbackVelocity: Vec3,
  hp: number,
  now: number,
  bounds: RoomBounds = defaultRoomBounds
) => {
  const clampedPosition = clampToRoom(position, enemy.radius, bounds);
  const hitWallX = Math.abs(clampedPosition[0] - position[0]) > 0.001;
  const hitWallZ = Math.abs(clampedPosition[2] - position[2]) > 0.001;
  const wallImpactSpeed = Math.max(
    hitWallX ? Math.abs(knockbackVelocity[0]) : 0,
    hitWallZ ? Math.abs(knockbackVelocity[2]) : 0
  );
  const wallDamage = wallImpactSpeed >= 3.2 ? 1 : 0;

  return {
    damage: wallDamage,
    hp: hp - wallDamage,
    lastHitAt: wallDamage > 0 ? now : null,
    knockbackVelocity: [
      hitWallX ? 0 : knockbackVelocity[0],
      0,
      hitWallZ ? 0 : knockbackVelocity[2],
    ] as Vec3,
    position: clampedPosition,
  };
};

export const getEnemyMoveIntent = (enemy: ActiveEnemy, distance: number) => {
  if (enemy.behavior === "bomber") {
    const preferredRange = enemy.preferredRange ?? 6.4;

    if (distance < preferredRange) {
      return -1.1;
    }

    if (distance < preferredRange + 1.6) {
      return -0.45;
    }

    return 0.25;
  }

  if (enemy.behavior !== "shooter") {
    return 1;
  }

  const preferredRange = enemy.preferredRange ?? 6.5;

  if (enemy.radius > 1) {
    if (distance > preferredRange - 1.3) {
      return 1.16;
    }

    if (distance < preferredRange - 2.6) {
      return 0.28;
    }

    return 0.62;
  }

  if (distance > preferredRange + 0.6) {
    return 1;
  }

  if (distance < preferredRange - 0.8) {
    return -0.55;
  }

  return 0;
};

export const getProjectileHitDamage = (
  projectile: ActiveProjectile,
  projectilePosition: Vec3 | undefined,
  position: Vec3,
  radius: number
) => {
  if (!projectilePosition) {
    return null;
  }

  const hitDistance = Math.hypot(
    projectilePosition[0] - position[0],
    projectilePosition[1] - position[1],
    projectilePosition[2] - position[2]
  );

  if (hitDistance > radius + projectile.build.radius) {
    return null;
  }

  const travelDistance = Math.hypot(
    projectilePosition[0] - projectile.position[0],
    projectilePosition[1] - projectile.position[1],
    projectilePosition[2] - projectile.position[2]
  );

  return Math.max(
    1,
    Math.round(
      projectile.build.damage *
        getDamageAtDistance(projectile.build.damageProfile, travelDistance)
    )
  );
};

export const getBeamHitDistance = (
  enemy: ActiveEnemy,
  origin: Vec3,
  direction: Vec3,
  laneOffset: number,
  build: WeaponBuild
) => {
  const beamStartX = origin[0] + direction[2] * laneOffset;
  const beamStartZ = origin[2] - direction[0] * laneOffset;
  const deltaX = enemy.position[0] - beamStartX;
  const deltaZ = enemy.position[2] - beamStartZ;
  const forwardDistance = deltaX * direction[0] + deltaZ * direction[2];

  if (forwardDistance < 0 || forwardDistance > build.beamLength) {
    return null;
  }

  const waveOffset =
    build.curve > 0.01
      ? Math.sin(forwardDistance * (0.9 + build.curve * 0.08)) *
        build.curve *
        0.36
      : 0;
  const lateralDistance = Math.abs(
    deltaX * direction[2] - deltaZ * direction[0] - waveOffset
  );

  return lateralDistance <= enemy.radius + build.beamWidth
    ? forwardDistance
    : null;
};

export const createEnemyShots = (
  enemy: ActiveEnemy,
  position: Vec3,
  dx: number,
  dz: number
): ActiveEnemyShot[] => {
  const shotColor = enemy.shotColor;
  const shotDamage = enemy.shotDamage;
  const shotSpeed = enemy.shotSpeed;
  const shotKind = enemy.shotKind ?? "energy";

  if (
    typeof shotColor !== "string" ||
    typeof shotDamage !== "number" ||
    typeof shotSpeed !== "number" ||
    typeof enemy.shotIntervalMs !== "number"
  ) {
    return [];
  }

  const baseYaw = Math.atan2(dx, dz);
  const radius = shotKind === "wheel" ? 0.34 : enemyShotRadius;
  const muzzleDistance = enemy.radius + radius + 0.12;
  const spreads = enemy.radius > 1 ? [-0.24, 0, 0.24] : [0];

  return spreads.map((spread) => ({
    color: shotColor,
    damage: shotDamage,
    id: crypto.randomUUID(),
    kind: shotKind,
    originId: enemy.id,
    position: [
      position[0] + Math.sin(baseYaw + spread) * muzzleDistance,
      shotKind === "wheel" ? 0.42 : position[1] + enemy.radius * 0.24,
      position[2] + Math.cos(baseYaw + spread) * muzzleDistance,
    ],
    radius,
    ttlMs: shotKind === "wheel" ? 60_000 : enemyShotTtlMs,
    velocity: [
      Math.sin(baseYaw + spread) * shotSpeed,
      0,
      Math.cos(baseYaw + spread) * shotSpeed,
    ],
  }));
};

export const createBombs = (
  enemy: ActiveEnemy,
  position: Vec3,
  dx: number,
  dz: number,
  now: number,
  playerVelocity: Vec3 = [0, 0, 0],
  avoidDropPositions: Vec3[] = []
): ActiveBomb[] => {
  const {
    bombArmMs,
    bombColor,
    bombCount,
    bombDamage,
    bombDelivery,
    bombExplosionRadius,
    bombHp,
    bombRadius,
    bombSpeed,
    bombTtlMs,
  } = enemy;

  if (
    typeof bombArmMs !== "number" ||
    typeof bombColor !== "string" ||
    typeof bombCount !== "number" ||
    typeof bombDamage !== "number" ||
    typeof bombExplosionRadius !== "number" ||
    typeof bombHp !== "number" ||
    typeof bombRadius !== "number" ||
    typeof bombSpeed !== "number" ||
    typeof bombTtlMs !== "number"
  ) {
    return [];
  }

  const muzzleDistance = enemy.radius + bombRadius + 0.18;
  const baseYaw = Math.atan2(dx, dz);
  const leadSeconds = Math.min(1.35, Math.max(0.4, bombArmMs / 1000));
  const droppedTargets = [
    [dx, dz],
    [
      dx + playerVelocity[0] * leadSeconds,
      dz + playerVelocity[2] * leadSeconds,
    ],
  ];
  const thrownSpreads = Array.from({ length: bombCount }, (_, index) => {
    if (bombCount === 1) {
      return 0;
    }

    const span = 0.88;

    return -span / 2 + (span * index) / (bombCount - 1);
  });
  const reservedDropPositions = [...avoidDropPositions];
  const resolveDropPosition = (targetDx: number, targetDz: number) => {
    const basePosition: Vec3 = [
      position[0] + targetDx,
      position[1],
      position[2] + targetDz,
    ];
    const minSpacing = bombExplosionRadius * 1.55;
    const candidates: Vec3[] = [basePosition];

    for (let ring = 1; ring <= 3; ring += 1) {
      const radius = bombExplosionRadius * (0.82 + ring * 0.52);
      const count = 8 + ring * 4;

      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + ring * 0.37;

        candidates.push([
          basePosition[0] + Math.sin(angle) * radius,
          basePosition[1],
          basePosition[2] + Math.cos(angle) * radius,
        ]);
      }
    }

    let bestPosition = candidates[0];
    let bestScore = -Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const nearestDistance =
        reservedDropPositions.length === 0
          ? minSpacing
          : Math.min(
              ...reservedDropPositions.map((reserved) =>
                Math.hypot(
                  candidate[0] - reserved[0],
                  candidate[2] - reserved[2]
                )
              )
            );
      const driftPenalty =
        Math.hypot(
          candidate[0] - basePosition[0],
          candidate[2] - basePosition[2]
        ) * 0.32;
      const score = Math.min(nearestDistance, minSpacing) - driftPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestPosition = candidate;
      }
    }

    reservedDropPositions.push(bestPosition);

    return bestPosition;
  };

  return Array.from({ length: bombCount }, (_, index) => {
    const dropped = bombDelivery === "drop";
    const [targetDx, targetDz] =
      droppedTargets[Math.min(index, droppedTargets.length - 1)];
    const yaw = dropped
      ? Math.atan2(targetDx, targetDz)
      : baseYaw + thrownSpreads[index];

    return {
      armAt: now + bombArmMs,
      color: bombColor,
      damage: bombDamage,
      delivery: dropped ? "drop" : "throw",
      explosionRadius: bombExplosionRadius,
      expiresAt: now + bombTtlMs,
      hp: bombHp,
      id: crypto.randomUUID(),
      lastHitAt: 0,
      maxHp: bombHp,
      originId: enemy.id,
      position: dropped
        ? resolveDropPosition(targetDx, targetDz)
        : [
            position[0] + Math.sin(yaw) * muzzleDistance,
            position[1],
            position[2] + Math.cos(yaw) * muzzleDistance,
          ],
      radius: bombRadius,
      spawnedAt: now,
      velocity: dropped
        ? [0, 0, 0]
        : [Math.sin(yaw) * bombSpeed, 0, Math.cos(yaw) * bombSpeed],
    };
  });
};
