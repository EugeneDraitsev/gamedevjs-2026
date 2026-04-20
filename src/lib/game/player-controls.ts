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

export interface AnalogMove {
  x: number;
  z: number;
}

export const readMovementInput = (
  pressed: Set<string>,
  moveDirection: Vector3,
  analogMove?: AnalogMove | null
) => {
  moveDirection.set(0, 0, 0);

  if (analogMove && (analogMove.x !== 0 || analogMove.z !== 0)) {
    moveDirection.set(analogMove.x, 0, analogMove.z);
    return true;
  }

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
  velocity: ReturnType<RapierRigidBody["linvel"]>,
  analogMove?: AnalogMove | null
) => {
  const hasInput = readMovementInput(pressed, moveDirection, analogMove);
  const analogMagnitude =
    analogMove && (analogMove.x !== 0 || analogMove.z !== 0)
      ? Math.min(1, Math.hypot(analogMove.x, analogMove.z))
      : 1;

  if (hasInput) {
    moveDirection.normalize();
  }

  const effectiveSpeed = moveSpeed * moveSpeedFactor * analogMagnitude;

  return {
    x: hasInput ? moveDirection.x * effectiveSpeed : velocity.x,
    z: hasInput ? moveDirection.z * effectiveSpeed : velocity.z,
  };
};
