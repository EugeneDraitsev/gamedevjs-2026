import { getBeamHitDistance } from "$lib/components/game/scene/utils";
import {
  copyWeaponBuild,
  getDamageAtDistance,
  type WeaponBuild,
} from "$lib/config/weapon-graph";
import type {
  ActiveBeam,
  ActiveEnemy,
  ActiveProjectile,
  Vec3,
} from "$lib/types/game";

interface DamagePopupDraft {
  amount: number;
  position: Vec3;
}

interface SpawnWeaponAttackInput {
  activeEnemies: ActiveEnemy[];
  activeProjectiles: ActiveProjectile[];
  attackCount: number;
  position: Vec3;
  velocity: Vec3;
  weaponBuild: WeaponBuild;
}

interface AttackVectors {
  baseYaw: number;
  horizontalSpeed: number;
  rightX: number;
  rightZ: number;
}

const createAttackVectors = (
  build: WeaponBuild,
  velocity: Vec3
): AttackVectors => {
  const baseYaw = Math.atan2(velocity[0], velocity[2]);

  return {
    baseYaw,
    horizontalSpeed: Math.hypot(velocity[0], velocity[2]) || build.speed,
    rightX: Math.cos(baseYaw),
    rightZ: -Math.sin(baseYaw),
  };
};

const appendProjectileBurst = (
  build: WeaponBuild,
  position: Vec3,
  velocity: Vec3,
  vectors: AttackVectors,
  projectiles: ActiveProjectile[]
) => {
  for (let index = 0; index < build.pelletCount; index += 1) {
    const spreadOffset =
      build.pelletCount === 1
        ? 0
        : (index / (build.pelletCount - 1) - 0.5) * build.spread;
    const shotYaw = vectors.baseYaw + spreadOffset;
    const laneOffset =
      build.pelletCount === 1
        ? 0
        : (index / (build.pelletCount - 1) - 0.5) * build.radius * 2.6;

    projectiles.push({
      build,
      id: crypto.randomUUID(),
      position: [
        position[0] + vectors.rightX * laneOffset,
        position[1],
        position[2] + vectors.rightZ * laneOffset,
      ],
      velocity: [
        Math.sin(shotYaw) * vectors.horizontalSpeed,
        velocity[1],
        Math.cos(shotYaw) * vectors.horizontalSpeed,
      ],
    });
  }
};

const applyBeamAttack = (
  activeEnemies: ActiveEnemy[],
  beams: ActiveBeam[],
  build: WeaponBuild,
  damagePopups: DamagePopupDraft[],
  now: number,
  position: Vec3,
  vectors: AttackVectors
) => {
  const direction: Vec3 = [
    Math.sin(vectors.baseYaw),
    0,
    Math.cos(vectors.baseYaw),
  ];
  let nextEnemies = activeEnemies;

  for (let index = 0; index < build.pelletCount; index += 1) {
    const laneOffset =
      build.pelletCount === 1
        ? 0
        : (index / (build.pelletCount - 1) - 0.5) * build.beamWidth * 3.4;

    beams.push({
      color: build.colors.shell,
      core: build.colors.core,
      curve: build.curve,
      createdAt: now,
      id: crypto.randomUUID(),
      length: build.beamLength,
      position: [
        position[0] + vectors.rightX * laneOffset,
        position[1],
        position[2] + vectors.rightZ * laneOffset,
      ],
      rotationY: vectors.baseYaw,
      width: build.beamWidth * 1.45,
    });

    const survivors: ActiveEnemy[] = [];

    for (const enemy of nextEnemies) {
      const hitDistance = getBeamHitDistance(
        enemy,
        position,
        direction,
        laneOffset,
        build
      );

      if (hitDistance === null) {
        survivors.push(enemy);
        continue;
      }

      const damage = Math.max(
        1,
        Math.round(
          build.damage * getDamageAtDistance(build.damageProfile, hitDistance)
        )
      );
      const kick =
        enemy.radius > 1
          ? 0
          : Math.min(8.8, build.mass * 5.4 + build.knockback * 0.24);
      const speed = Math.hypot(direction[0], direction[2]) || 1;

      damagePopups.push({
        amount: damage,
        position: [
          enemy.position[0],
          enemy.position[1] + enemy.radius + 0.34,
          enemy.position[2],
        ],
      });

      enemy.hp -= damage;
      enemy.knockbackVelocity = [
        Math.max(
          -10.5,
          Math.min(
            10.5,
            enemy.knockbackVelocity[0] + (direction[0] / speed) * kick
          )
        ),
        0,
        Math.max(
          -10.5,
          Math.min(
            10.5,
            enemy.knockbackVelocity[2] + (direction[2] / speed) * kick
          )
        ),
      ] as Vec3;
      enemy.lastHitAt = now;

      if (enemy.hp > 0) {
        survivors.push(enemy);
      }
    }

    nextEnemies = survivors;
  }

  return [...nextEnemies];
};

const appendRocketProjectile = (
  build: WeaponBuild,
  baseYaw: number,
  position: Vec3,
  projectiles: ActiveProjectile[]
) => {
  const rocketBuild = copyWeaponBuild(build);

  rocketBuild.colors = {
    core: "#ffe0a8",
    glow: "#ff5a54",
    gradient: build.colors.gradient,
    shell: "#ff935a",
  };
  rocketBuild.attackMode = "projectile";
  rocketBuild.curve = 0;
  rocketBuild.damage = Math.round(build.damage * 1.45);
  rocketBuild.drag = Math.max(0.02, build.drag * 0.55);
  rocketBuild.gravity = 0;
  rocketBuild.homingTurn = build.rocketTurn;
  rocketBuild.knockback *= 1.35;
  rocketBuild.mass *= 1.8;
  rocketBuild.pelletCount = 1;
  rocketBuild.radius *= 1.35;
  rocketBuild.rocketCadence = 0;
  rocketBuild.speed *= 0.58;
  rocketBuild.spread = 0;
  rocketBuild.ttlMs = Math.max(build.ttlMs, 2400);

  projectiles.push({
    build: rocketBuild,
    id: crypto.randomUUID(),
    position: [position[0], position[1] + 0.08, position[2]],
    velocity: [
      Math.sin(baseYaw) * rocketBuild.speed,
      0,
      Math.cos(baseYaw) * rocketBuild.speed,
    ],
  });
};

export const spawnWeaponAttack = ({
  activeEnemies,
  attackCount,
  activeProjectiles,
  position,
  velocity,
  weaponBuild,
}: SpawnWeaponAttackInput) => {
  const build = copyWeaponBuild(weaponBuild);
  const vectors = createAttackVectors(build, velocity);
  const now = performance.now();
  const projectiles: ActiveProjectile[] = [];
  const beams: ActiveBeam[] = [];
  const damagePopups: DamagePopupDraft[] = [];
  const nextEnemies =
    build.attackMode === "beam"
      ? applyBeamAttack(
          activeEnemies,
          beams,
          build,
          damagePopups,
          now,
          position,
          vectors
        )
      : activeEnemies;

  if (build.attackMode === "projectile") {
    appendProjectileBurst(build, position, velocity, vectors, projectiles);
  }

  if (
    build.rocketCadence > 0 &&
    attackCount % build.rocketCadence === 0 &&
    nextEnemies.length > 0 &&
    !activeProjectiles.some((projectile) => projectile.build.homingTurn > 0)
  ) {
    appendRocketProjectile(build, vectors.baseYaw, position, projectiles);
  }

  return {
    attackCount,
    activeEnemies: nextEnemies,
    beams,
    damagePopups,
    projectiles,
  };
};
