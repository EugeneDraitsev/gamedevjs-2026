import type { PerspectiveCamera } from "three";
import { Vector3 } from "three";
import type { DungeonRoom } from "$lib/config/dungeon-layout";
import type {
  DamagePopup,
  DeflectBurst,
  MinimapBounds,
  ProjectedDamagePopup,
  RenderedDeflectBurst,
  Vec3,
} from "$lib/game/types";

export const deflectBurstDurationMs = 240;

const deflectBurstShardCount = 4;
const deflectBurstShardAngles = Array.from(
  { length: deflectBurstShardCount },
  (_unused, index) => (index / deflectBurstShardCount) * Math.PI * 2
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
  camera: PerspectiveCamera,
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
