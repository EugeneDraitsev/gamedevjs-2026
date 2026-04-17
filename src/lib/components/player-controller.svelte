<script lang="ts">
  import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Collider, RigidBody, useRapier } from "@threlte/rapier";
  import { onMount } from "svelte";
  import {
    MathUtils,
    PerspectiveCamera,
    Plane,
    Raycaster,
    Vector2,
    Vector3,
  } from "three";
  import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import type { WeaponBuild } from "$lib/config/weapon-graph";

  type CameraMode = "follow" | "orbit";

  interface PlayerControllerProps {
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
    controlsLocked?: boolean;
    followDistance?: number;
    followPitch?: number;
    followYaw?: number;
    jumpSpeed?: number;
    lookHeight?: number;
    moveResponsiveness?: number;
    moveSpeed?: number;
    onMouseMove?: (x: number, y: number) => void;
    onPositionChange?: (position: [number, number, number]) => void;
    onShoot?: (projectile: {
      position: [number, number, number];
      velocity: [number, number, number];
    }) => void;
    orbitControls?: OrbitControls;
    playerLinearDamping?: number;
    showDebugGeometry?: boolean;
    teleportNonce?: number;
    teleportTarget?: [number, number, number] | null;
    weaponBuild: WeaponBuild;
  }

  const pressed = new Set<string>();
  const orbitPressed = new Set<string>();

  const moveDirection = new Vector3();
  const orbitPanOffset = new Vector3();
  const playerPosition = new Vector3();
  const orbitRight = new Vector3();
  const orbitUp = new Vector3();
  const smoothedAnchor = new Vector3();
  const cameraOffset = new Vector3();
  const cameraTarget = new Vector3();
  const lookTarget = new Vector3();
  const groundProbePosition = new Vector3();
  const jumpVelocity = new Vector3();
  const forwardDirection = new Vector3();
  const shootSpawnPosition = new Vector3();
  const mouseNdc = new Vector2();
  const raycaster = new Raycaster();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const groundHit = new Vector3();

  const groundProbeOffset = 0.45;
  const groundProbeLength = 0.22;
  const groundedNormalThreshold = 0.35;
  const orbitKeyboardPanSpeed = 0.9;
  const projectileForwardOffset = 1.1;
  const projectileHeightOffset = 0.18;
  const shootCooldownMs = 180;

  let jumpRequested = false;
  let shootRequested = false;
  let mouseScreenX = 0;
  let mouseScreenY = 0;
  let isGroundedState = $state(false);
  let rigidBody = $state<RapierRigidBody>();
  let lastShotAt = 0;

  let {
    cameraMode = "follow",
    cameraSmoothing = 10,
    controlsLocked = false,
    followDistance = 10.8,
    followPitch = 58,
    followYaw = 0,
    jumpSpeed = 6.2,
    lookHeight = 0.4,
    moveResponsiveness = 12,
    moveSpeed = 7.5,
    onMouseMove,
    onPositionChange,
    onShoot,
    orbitControls,
    playerLinearDamping = 1.6,
    showDebugGeometry = false,
    teleportNonce = 0,
    teleportTarget = null,
    weaponBuild,
  }: PlayerControllerProps = $props();
  let previousCameraMode: CameraMode | undefined;

  const { camera } = useThrelte();
  const { rapier, world } = useRapier();

  $effect(() => {
    rigidBody?.setLinearDamping(playerLinearDamping);
  });

  $effect(() => {
    teleportNonce;
    const body = rigidBody;

    if (!(body && teleportTarget)) {
      return;
    }

    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setTranslation(
      { x: teleportTarget[0], y: teleportTarget[1], z: teleportTarget[2] },
      true
    );
    body.wakeUp();

    playerPosition.set(...teleportTarget);
    smoothedAnchor.set(...teleportTarget);
    cameraTarget.set(...teleportTarget);
    lookTarget.set(
      teleportTarget[0],
      teleportTarget[1] + lookHeight,
      teleportTarget[2]
    );
  });

  $effect(() => {
    if (cameraMode === "orbit" || controlsLocked) {
      jumpRequested = false;
      shootRequested = false;
      pressed.clear();
    }
  });

  $effect(() => {
    if (cameraMode !== "orbit" || controlsLocked) {
      orbitPressed.clear();
    }
  });

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.isContentEditable ||
        target.closest(
          "input, textarea, select, button, [contenteditable='true']"
        )
    );
  };

  const isOrbitInputKey = (code: string) =>
    code === "KeyW" || code === "KeyA" || code === "KeyS" || code === "KeyD";

  const isGrounded = (body: RapierRigidBody) => {
    const playerCollider = body.collider(0);

    if (playerCollider) {
      let grounded = false;

      world.contactPairsWith(playerCollider, (otherCollider) => {
        if (grounded) {
          return;
        }

        world.contactPair(
          playerCollider,
          otherCollider,
          (manifold, flipped) => {
            if (grounded || manifold.numContacts() === 0) {
              return;
            }

            const contactNormal = manifold.normal();
            const upwardNormal = flipped ? -contactNormal.y : contactNormal.y;

            if (upwardNormal > groundedNormalThreshold) {
              grounded = true;
            }
          }
        );
      });

      if (grounded) {
        return true;
      }
    }

    const translation = body.translation();
    const origin = {
      x: translation.x,
      y: translation.y - groundProbeOffset,
      z: translation.z,
    };
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
    const hit = world.castRayAndGetNormal(
      ray,
      groundProbeLength,
      true,
      undefined,
      undefined,
      undefined,
      body
    );

    return hit !== null && hit.normal.y > groundedNormalThreshold;
  };

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (controlsLocked) {
        return;
      }

      if (cameraMode === "orbit") {
        if (isOrbitInputKey(event.code)) {
          orbitPressed.add(event.code);
          event.preventDefault();
        } else if (event.code === "Space") {
          event.preventDefault();
        }

        return;
      }

      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "ArrowDown" ||
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight"
      ) {
        event.preventDefault();
      }

      pressed.add(event.code);

      if (event.code === "Space" && !event.repeat) {
        jumpRequested = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      orbitPressed.delete(event.code);

      if (cameraMode === "orbit" || controlsLocked) {
        return;
      }

      pressed.delete(event.code);
    };

    const handleBlur = () => {
      jumpRequested = false;
      shootRequested = false;
      orbitPressed.clear();
      pressed.clear();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || cameraMode === "orbit" || controlsLocked) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      mouseScreenX = event.clientX;
      mouseScreenY = event.clientY;
      shootRequested = true;
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseScreenX = event.clientX;
      mouseScreenY = event.clientY;
      onMouseMove?.(event.clientX, event.clientY);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  });

  const readMovementInput = () => {
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

  const getDesiredHorizontalVelocity = (
    velocity: ReturnType<RapierRigidBody["linvel"]>
  ) => {
    const hasInput = readMovementInput();

    if (hasInput) {
      moveDirection.normalize();
    }

    return {
      x: hasInput ? moveDirection.x * moveSpeed : velocity.x,
      z: hasInput ? moveDirection.z * moveSpeed : velocity.z,
    };
  };

  const updateBodyMovement = (body: RapierRigidBody, delta: number) => {
    const velocity = body.linvel();
    isGroundedState = isGrounded(body);

    if (cameraMode !== "orbit" && !controlsLocked) {
      const response = Math.min(1, delta * moveResponsiveness);
      const desiredVelocity = getDesiredHorizontalVelocity(velocity);
      let nextVelocityY = velocity.y;

      if (jumpRequested && isGroundedState) {
        body.wakeUp();
        nextVelocityY = jumpSpeed;
      }

      jumpVelocity.set(
        MathUtils.lerp(velocity.x, desiredVelocity.x, response),
        nextVelocityY,
        MathUtils.lerp(velocity.z, desiredVelocity.z, response)
      );
      body.setLinvel(jumpVelocity, true);
    }

    jumpRequested = false;
  };

  const updateCamera = (
    activeCamera: NonNullable<typeof camera.current>,
    delta: number
  ) => {
    const followFactor = Math.min(1, delta * cameraSmoothing);
    smoothedAnchor.lerp(playerPosition, followFactor);

    lookTarget.copy(smoothedAnchor);
    lookTarget.y += lookHeight;

    if (
      cameraMode === "orbit" &&
      previousCameraMode !== "orbit" &&
      orbitControls
    ) {
      orbitControls.target.copy(lookTarget);
      orbitControls.update();
    }

    previousCameraMode = cameraMode;

    if (cameraMode === "follow") {
      const pitch = MathUtils.degToRad(followPitch);
      const yaw = MathUtils.degToRad(followYaw);

      cameraOffset.set(
        Math.sin(yaw) * Math.cos(pitch) * followDistance,
        Math.sin(pitch) * followDistance,
        Math.cos(yaw) * Math.cos(pitch) * followDistance
      );

      cameraTarget.copy(smoothedAnchor).add(cameraOffset);
      activeCamera.position.copy(cameraTarget);
      activeCamera.lookAt(lookTarget);
    }
  };

  const tryShoot = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    if (!shootRequested || cameraMode === "orbit" || controlsLocked) {
      shootRequested = false;
      return;
    }

    const now = performance.now();

    if (now - lastShotAt < shootCooldownMs) {
      shootRequested = false;
      return;
    }

    const translation = body.translation();

    activeCamera.updateMatrixWorld();

    mouseNdc.set(
      (mouseScreenX / window.innerWidth) * 2 - 1,
      -(mouseScreenY / window.innerHeight) * 2 + 1
    );

    groundPlane.constant = -(translation.y + projectileHeightOffset);
    raycaster.setFromCamera(mouseNdc, activeCamera);
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);

    if (hit) {
      forwardDirection.set(
        groundHit.x - translation.x,
        0,
        groundHit.z - translation.z
      );
    } else {
      activeCamera.getWorldDirection(forwardDirection);
      forwardDirection.y = 0;
    }

    if (forwardDirection.lengthSq() === 0) {
      forwardDirection.set(0, 0, -1);
    }

    forwardDirection.normalize();
    const projectileSpeed = weaponBuild.speed;
    const spawnOffset = projectileForwardOffset + weaponBuild.radius * 2.4;

    shootSpawnPosition
      .set(translation.x, translation.y + projectileHeightOffset, translation.z)
      .addScaledVector(forwardDirection, spawnOffset);

    onShoot?.({
      position: [
        shootSpawnPosition.x,
        shootSpawnPosition.y,
        shootSpawnPosition.z,
      ],
      velocity: [
        forwardDirection.x * projectileSpeed,
        forwardDirection.y * projectileSpeed,
        forwardDirection.z * projectileSpeed,
      ],
    });

    lastShotAt = now;
    shootRequested = false;
  };

  const updateOrbitKeyboardCamera = (
    activeCamera: NonNullable<typeof camera.current>,
    delta: number
  ) => {
    if (
      cameraMode !== "orbit" ||
      !orbitControls ||
      orbitPressed.size === 0 ||
      !(activeCamera instanceof PerspectiveCamera)
    ) {
      return;
    }

    const horizontalInput =
      Number(orbitPressed.has("KeyD")) - Number(orbitPressed.has("KeyA"));
    const verticalInput =
      Number(orbitPressed.has("KeyW")) - Number(orbitPressed.has("KeyS"));

    if (horizontalInput === 0 && verticalInput === 0) {
      return;
    }

    const distance = activeCamera.position.distanceTo(orbitControls.target);
    const verticalStep =
      distance *
      Math.tan(MathUtils.degToRad(activeCamera.fov * 0.5)) *
      orbitKeyboardPanSpeed *
      delta;
    const horizontalStep = verticalStep * activeCamera.aspect;

    activeCamera.updateMatrixWorld();
    orbitRight.setFromMatrixColumn(activeCamera.matrix, 0).normalize();
    orbitUp.setFromMatrixColumn(activeCamera.matrix, 1).normalize();

    orbitPanOffset
      .set(0, 0, 0)
      .addScaledVector(orbitRight, horizontalInput * horizontalStep)
      .addScaledVector(orbitUp, verticalInput * verticalStep);

    orbitControls.target.add(orbitPanOffset);
    activeCamera.position.add(orbitPanOffset);
    orbitControls.update();
  };

  useTask((delta) => {
    const body = rigidBody;
    const activeCamera = camera.current;

    if (!(body && activeCamera)) {
      return;
    }

    updateBodyMovement(body, delta);

    const translation = body.translation();
    playerPosition.set(translation.x, translation.y, translation.z);
    onPositionChange?.([translation.x, translation.y, translation.z]);
    groundProbePosition.set(
      translation.x,
      translation.y - groundProbeOffset - groundProbeLength * 0.5,
      translation.z
    );

    updateCamera(activeCamera, delta);
    updateOrbitKeyboardCamera(activeCamera, delta);
    tryShoot(body, activeCamera);
  });
</script>

<T.Group position={[0, 0.58, 0]}>
  <RigidBody
    bind:rigidBody
    ccd
    canSleep={false}
    linearDamping={playerLinearDamping}
    lockRotations
  >
    <Collider shape="ball" args={[0.55]} friction={1.4} restitution={0.08} />

    <T.Mesh castShadow>
      <T.SphereGeometry args={[0.55, 32, 32]} />
      <T.MeshStandardMaterial
        color="#f9c74f"
        metalness={0.18}
        roughness={0.22}
      />
    </T.Mesh>
  </RigidBody>
</T.Group>

{#if showDebugGeometry}
  <T.Group position={lookTarget.toArray()}>
    <T.Mesh>
      <T.SphereGeometry args={[0.12, 16, 16]} />
      <T.MeshBasicMaterial color="#8ac6ff" />
    </T.Mesh>
  </T.Group>

  <T.Group position={cameraTarget.toArray()}>
    <T.Mesh>
      <T.SphereGeometry args={[0.16, 16, 16]} />
      <T.MeshBasicMaterial color="#f72585" />
    </T.Mesh>
  </T.Group>

  <T.Group position={groundProbePosition.toArray()}>
    <T.Mesh>
      <T.CylinderGeometry args={[0.035, 0.035, groundProbeLength, 10]} />
      <T.MeshBasicMaterial color={isGroundedState ? "#78f0a4" : "#ffd166"} />
    </T.Mesh>
  </T.Group>
{/if}
