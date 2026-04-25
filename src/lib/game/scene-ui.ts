import type { Camera } from "three";
import { Vector3 } from "three";
import type { DungeonRoom } from "$lib/config/dungeon-layout";
import type {
  DamagePopup,
  DeflectBurst,
  HealBurst,
  MinimapBounds,
  ProjectedDamagePopup,
  ProjectileImpactBurst,
  RenderedDeflectBurst,
  RenderedHealBurst,
  RenderedProjectileImpactBurst,
  Vec3,
} from "$lib/types/game";

export const deflectBurstDurationMs = 240;
export const healBurstDurationMs = 820;
export const projectileImpactBurstDurationMs = 320;

const deflectBurstShardCount = 4;
const deflectBurstShardAngles = Array.from(
  { length: deflectBurstShardCount },
  (_unused, index) => (index / deflectBurstShardCount) * Math.PI * 2
);
const healParticleCount = 14;
const healParticleAngles = Array.from(
  { length: healParticleCount },
  (_unused, index) => (index / healParticleCount) * Math.PI * 2
);
const projectileImpactSparkCount = 6;
const projectileImpactSparkAngles = Array.from(
  { length: projectileImpactSparkCount },
  (_unused, index) => (index / projectileImpactSparkCount) * Math.PI * 2
);
const popupProjection = new Vector3();

export const getMinimapBounds = (rooms: DungeonRoom[]): MinimapBounds => {
  const grids = rooms.map((room) => room.grid);
  const minX = Math.min(...grids.map(([x]) => x));
  const maxX = Math.max(...grids.map(([x]) => x));
  const minY = Math.min(...grids.map(([, y]) => y));
  const maxY = Math.max(...grids.map(([, y]) => y));

  return {
    columns: maxX - minX + 1,
    minX,
    minY,
    rows: maxY - minY + 1,
  };
};

export const projectDamagePopups = (
  damagePopups: DamagePopup[],
  camera: Camera,
  width: number,
  height: number
): ProjectedDamagePopup[] =>
  damagePopups
    .map((popup) => {
      popupProjection.set(...popup.position).project(camera);

      if (popupProjection.z < -1 || popupProjection.z > 1) {
        return null;
      }

      return {
        ...popup,
        x: (popupProjection.x * 0.5 + 0.5) * width,
        y: (-popupProjection.y * 0.5 + 0.5) * height,
      };
    })
    .filter((popup): popup is ProjectedDamagePopup => Boolean(popup));

export const renderDeflectBursts = (
  deflectBursts: DeflectBurst[],
  animationNow: number
): RenderedDeflectBurst[] =>
  deflectBursts.map((burst) => {
    const age = Math.min(
      1,
      (animationNow - burst.createdAt) / deflectBurstDurationMs
    );
    const fade = 1 - age;
    const travel = burst.radius * 2.6 * age;

    return {
      ...burst,
      age,
      fade,
      shards: deflectBurstShardAngles.map((angle, shardIndex) => ({
        angle,
        position: [
          Math.cos(angle) * travel,
          age * burst.radius * 0.6 - age * age * burst.radius * 1.1,
          Math.sin(angle) * travel,
        ] as Vec3,
        rotation: [
          (shardIndex % 2 ? 1 : -1) * age * 4.5,
          angle + age * 3.5,
          0,
        ] as Vec3,
        scale: Math.max(0, 1 - age),
      })),
    };
  });

export const renderHealBursts = (
  healBursts: HealBurst[],
  animationNow: number
): RenderedHealBurst[] =>
  healBursts.map((burst) => {
    const age = Math.min(
      1,
      (animationNow - burst.createdAt) / healBurstDurationMs
    );
    const fade = 1 - age;

    return {
      ...burst,
      age,
      fade,
      particles: healParticleAngles.map((angle, index) => {
        const spin = angle + age * 5.6 + index * 0.18;
        const radius = burst.radius * (0.22 + age * 0.38);

        return {
          color: index % 3 === 0 ? "#7dffd7" : "#9defff",
          opacity: fade * (0.48 + (index % 4) * 0.12),
          position: [
            Math.cos(spin) * radius,
            0.35 + age * 1.2 + Math.sin(age * Math.PI + index) * 0.16,
            Math.sin(spin) * radius,
          ] as Vec3,
          scale: burst.radius * (0.06 + fade * 0.06),
        };
      }),
    };
  });

export const renderProjectileImpactBursts = (
  projectileImpactBursts: ProjectileImpactBurst[],
  animationNow: number
): RenderedProjectileImpactBurst[] =>
  projectileImpactBursts.map((burst) => {
    const age = Math.min(
      1,
      (animationNow - burst.createdAt) / projectileImpactBurstDurationMs
    );
    const fade = 1 - age;
    const speed = Math.hypot(burst.velocity[0], burst.velocity[2]) || 1;
    const forwardX = burst.velocity[0] / speed;
    const forwardZ = burst.velocity[2] / speed;
    const baseYaw = Math.atan2(forwardX, forwardZ);
    const scatter = burst.radius * (0.18 + age * 1.85);

    return {
      ...burst,
      age,
      fade,
      ringScale: burst.radius * (0.72 + age * 2.15),
      sparks: projectileImpactSparkAngles.map((angle, index) => {
        const side = Math.cos(angle) * scatter * (0.25 + (index % 3) * 0.12);
        const back = burst.radius * age * (1.3 + (index % 4) * 0.24);
        const lift = burst.radius * (0.08 + age * (0.35 + (index % 2) * 0.18));
        const sidewaysX = Math.cos(baseYaw) * side;
        const sidewaysZ = -Math.sin(baseYaw) * side;

        return {
          color: index % 3 === 0 ? burst.core : burst.color,
          opacity: fade * (0.46 + (index % 4) * 0.11),
          position: [
            -forwardX * back + sidewaysX,
            lift + Math.sin(angle * 1.7) * scatter * 0.2,
            -forwardZ * back + sidewaysZ,
          ] as Vec3,
          rotation: [
            angle * 0.22 + age * 2.8,
            baseYaw + angle * 0.35,
            age * 4.2 + index,
          ] as Vec3,
          scale: [
            burst.radius * (0.34 + fade * 0.38),
            burst.radius * (0.045 + fade * 0.035),
            burst.radius * (0.045 + fade * 0.035),
          ] as Vec3,
        };
      }),
    };
  });
