import { isEditableTarget } from "$lib/game/dom";
import {
  handleOrbitKeyDown,
  isGameplayPreventDefaultCode,
} from "$lib/game/player-controls";
import type { CameraMode } from "$lib/types/game";

interface PlayerInputBindings {
  getCameraMode: () => CameraMode;
  getControlsLocked: () => boolean;
  onJump: () => void;
  onMeleeRequest: () => void;
  onMouseMove: (x: number, y: number) => void;
  onReload: () => void;
  onReset: () => void;
  onShootPointerDown: (x: number, y: number) => void;
  onShootPointerUp: () => void;
  orbitPressed: Set<string>;
  pressed: Set<string>;
}

export const bindPlayerInput = ({
  getCameraMode,
  getControlsLocked,
  onJump,
  onMeleeRequest,
  onMouseMove,
  onReload,
  onReset,
  onShootPointerDown,
  onShootPointerUp,
  orbitPressed,
  pressed,
}: PlayerInputBindings) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || getControlsLocked()) {
      return;
    }

    if (getCameraMode() === "orbit") {
      handleOrbitKeyDown(event, orbitPressed);
      return;
    }

    if (isGameplayPreventDefaultCode(event.code)) {
      event.preventDefault();
    }

    pressed.add(event.code);

    if (!event.repeat) {
      if (event.code === "Space") {
        onJump();
      } else if (event.code === "KeyF") {
        onMeleeRequest();
      } else if (event.code === "KeyR") {
        onReload();
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    orbitPressed.delete(event.code);

    if (getCameraMode() === "orbit" || getControlsLocked()) {
      return;
    }

    pressed.delete(event.code);
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (getCameraMode() === "orbit" || getControlsLocked()) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.button === 0) {
      onShootPointerDown(event.clientX, event.clientY);
      return;
    }

    if (event.button === 2) {
      event.preventDefault();
      onMouseMove(event.clientX, event.clientY);
      onMeleeRequest();
    }
  };

  const handleContextMenu = (event: MouseEvent) => {
    if (getCameraMode() === "orbit" || getControlsLocked()) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    event.preventDefault();
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      onShootPointerUp();
    }
  };

  const handlePointerMove = (event: MouseEvent) => {
    onMouseMove(event.clientX, event.clientY);
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", onReset);
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("contextmenu", handleContextMenu);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", onReset);
    window.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handlePointerMove);
    window.removeEventListener("contextmenu", handleContextMenu);
  };
};
