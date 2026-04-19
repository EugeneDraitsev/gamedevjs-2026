import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
import type { Vector3 } from "three";

export const isOrbitInputKey = (code: string) =>
  code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD";

export const handleOrbitKeyDown = (
  event: KeyboardEvent,
  orbitPressed: Set<string>
) => {
  if (isOrbitInputKey(event.code)) {
    orbitPressed.add(event.code);
    event.preventDefault();
  } else if (event.code === "Space") {
    event.preventDefault();
  }
};

export const isGameplayPreventDefaultCode = (code: string) =>
  code === "Space" ||
  code === "ArrowUp" ||
  code === "ArrowDown" ||
  code === "ArrowLeft" ||
  code === "ArrowRight";

export const readMovementInput = (
  pressed: Set<string>,
  moveDirection: Vector3
) => {
  moveDirection.set(0, 0, 0);

  if (pressed.has("KeyW") || pressed.has("ArrowUp")) {
    moveDirection.z -= 1;
  }
  if (pressed.has("KeyS") || pressed.has("ArrowDown")) {
    moveDirection.z += 1;
  }
  if (pressed.has("KeyA") || pressed.has("ArrowLeft")) {
    moveDirection.x -= 1;
  }
  if (pressed.has("KeyD") || pressed.has("ArrowRight")) {
    moveDirection.x += 1;
  }

  return moveDirection.lengthSq() > 0;
};

export const getDesiredHorizontalVelocity = (
  pressed: Set<string>,
  moveDirection: Vector3,
  moveSpeed: number,
  moveSpeedFactor: number,
  velocity: ReturnType<RapierRigidBody["linvel"]>
) => {
  const hasInput = readMovementInput(pressed, moveDirection);

  if (hasInput) {
    moveDirection.normalize();
  }

  return {
    x: hasInput ? moveDirection.x * moveSpeed * moveSpeedFactor : velocity.x,
    z: hasInput ? moveDirection.z * moveSpeed * moveSpeedFactor : velocity.z,
  };
};
