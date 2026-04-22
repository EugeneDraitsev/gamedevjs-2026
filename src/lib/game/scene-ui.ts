import type { Camera } from "three";
import { Vector3 } from "three";
import type { DungeonRoom } from "$lib/config/dungeon-layout";
import type {
  DamagePopup,
  DeflectBurst,
  HealBurst,
  MinimapBounds,
  ProjectedDamagePopup,
  RenderedDeflectBurst,
  RenderedHealBurst,
  Vec3,
} from "$lib/types/game";

export const deflectBurstDurationMs = 240;
export const healBurstDurationMs = 820;

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
