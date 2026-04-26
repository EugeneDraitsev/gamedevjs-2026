import { type Matrix4, Object3D, Vector3 } from "three";
import type { StaticWall, Vec3, WallFacing } from "$lib/types/game";

export type FoundryWallVariant = "gear" | "pipe" | "plain" | "valve";

const wallObject = new Object3D();
const faceObject = new Object3D();
const moduleObject = new Object3D();
const lampPoint = new Vector3();

export const isFoundryWallKitWall = (wall: StaticWall) =>
  wall.style === "mechanic" && (wall.opacity ?? 1) >= 1;

export const foundryWallKitHorizontal = (wall: StaticWall) =>
  wall.args[0] > wall.args[2];

export const foundryWallKitSpan = (wall: StaticWall) =>
  (foundryWallKitHorizontal(wall) ? wall.args[0] : wall.args[2]) * 2;

export const foundryWallKitModuleCount = (wall: StaticWall) =>
  Math.max(1, Math.min(5, Math.round(foundryWallKitSpan(wall) / 3.2)));

export const foundryWallKitModuleWidth = (wall: StaticWall) =>
  foundryWallKitSpan(wall) / foundryWallKitModuleCount(wall);

export const foundryWallKitFaceSign = (wall: StaticWall) =>
  wall.facing === "south" || wall.facing === "east" ? 1 : -1;

export const foundryWallKitFacePosition = (wall: StaticWall): Vec3 =>
  foundryWallKitHorizontal(wall)
    ? [0, -0.08, foundryWallKitFaceSign(wall) * (wall.args[2] + 0.18)]
    : [foundryWallKitFaceSign(wall) * (wall.args[0] + 0.18), -0.08, 0];

export const foundryWallKitFaceRotationY = (wall: StaticWall) => {
  if (wall.facing === "north") {
    return Math.PI;
  }

  if (wall.facing === "east") {
    return Math.PI / 2;
  }

  if (wall.facing === "west") {
    return -Math.PI / 2;
  }

  return 0;
};

export const foundryWallKitModuleVariant = (
  index: number,
  moduleCount: number
): FoundryWallVariant => {
  if (moduleCount === 3 && index === 1) {
    return "gear";
  }

  if (moduleCount === 3 && index === 0) {
    return "valve";
  }

  if (moduleCount === 3 && index === 2) {
    return "pipe";
  }

  if (moduleCount === 4 && index === 1) {
    return "gear";
  }

  if (moduleCount === 4 && index === 2) {
    return "valve";
  }

  if (moduleCount > 4 && index === 0) {
    return "valve";
  }

  if (moduleCount > 4 && (index === 1 || index === moduleCount - 2)) {
    return "gear";
  }

  if (moduleCount > 3 && index === Math.floor(moduleCount / 2)) {
    return "pipe";
  }

  return "plain";
};

export const foundryWallKitShowsDecor = (
  wall: StaticWall,
  decoratedWallFacings: WallFacing[] | null
) => !decoratedWallFacings || decoratedWallFacings.includes(wall.facing);

export const foundryWallKitShowsGears = (
  wall: StaticWall,
  gearlessWallFacings: WallFacing[] | null
) => !gearlessWallFacings?.includes(wall.facing);

export const foundryWallKitModuleMatrix = (
  wall: StaticWall,
  moduleIndex: number
): Matrix4 => {
  const moduleCount = foundryWallKitModuleCount(wall);
  const moduleWidth = foundryWallKitModuleWidth(wall);

  wallObject.position.set(...wall.position);
  wallObject.rotation.set(0, foundryWallKitFaceRotationY(wall), 0);
  wallObject.scale.set(1, 1, 1);
  wallObject.updateMatrix();

  faceObject.position.set(...foundryWallKitFacePosition(wall));
  faceObject.rotation.set(0, 0, 0);
  faceObject.scale.set(1, 1, 1);
  faceObject.updateMatrix();

  moduleObject.position.set(
    (moduleIndex - (moduleCount - 1) / 2) * moduleWidth,
    0,
    0
  );
  moduleObject.rotation.set(0, 0, 0);
  moduleObject.scale.set(1, 1, 1);
  moduleObject.updateMatrix();

  return wallObject.matrix
    .clone()
    .multiply(faceObject.matrix)
    .multiply(moduleObject.matrix);
};

export const foundryWallKitLampPosition = (wall: StaticWall): Vec3 => {
  const moduleIndex = Math.floor(foundryWallKitModuleCount(wall) / 2);
  const matrix = foundryWallKitModuleMatrix(wall, moduleIndex);

  lampPoint.set(0, -0.78, 0.62).applyMatrix4(matrix);
  return [lampPoint.x, lampPoint.y, lampPoint.z];
};

export const foundryWallKitLampPositions = ({
  decoratedWallFacings,
  limit,
  roomWalls,
}: {
  decoratedWallFacings: WallFacing[] | null;
  limit: number;
  roomWalls: StaticWall[];
}) =>
  roomWalls
    .filter(isFoundryWallKitWall)
    .slice(0, limit)
    .filter(
      (wall) =>
        wall.lamp && foundryWallKitShowsDecor(wall, decoratedWallFacings)
    )
    .map(foundryWallKitLampPosition);
