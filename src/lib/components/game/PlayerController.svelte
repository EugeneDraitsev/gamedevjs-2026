<script lang="ts">
  import type {
    RigidBody as RapierRigidBody,
    RigidBodyType,
  } from "@dimforge/rapier3d-compat";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Collider, RigidBody, useRapier } from "@threlte/rapier";
  import { onMount } from "svelte";
  import {
    type BufferGeometry,
    type Group,
    MathUtils,
    OrthographicCamera,
    PerspectiveCamera,
    Plane,
    Raycaster,
    type ShaderMaterial,
    Vector2,
    Vector3,
  } from "three";
  import {
    isPointInSwing,
    isSwingActive,
    type SwingParams,
    swingGroupRotationY,
    swingKnockbackDirection,
    swingProgress,
    swingRibbonProgress,
  } from "$lib/combat/melee-swing";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import { bindPlayerInput } from "$lib/components/game/player/input";
  import {
    applyMeleeTrailSettings,
    createMeleeTrail,
    lerpAngleShortest,
    trailFadeMs,
  } from "$lib/components/game/player/melee-trail";
  import PlayerDebugMarkers from "$lib/components/game/player/PlayerDebugMarkers.svelte";
  import PlayerMeleeVisuals from "$lib/components/game/player/PlayerMeleeVisuals.svelte";
  import { getDesiredHorizontalVelocity as resolveHorizontalVelocity } from "$lib/game/player-controls";
  import { clampToRoom } from "$lib/game/scene-layout";
  import { mobileInput } from "$lib/stores/mobile-input.svelte";
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type { CameraMode, Vec3 } from "$lib/types/game";
  import type { PlayerControllerProps } from "$lib/types/game-components";

  const scene = getGameSceneContext();
  const { player, room, crosshair } = scene;
  const settings = $derived(scene.settings);

  let {
    onMeleeFrame,
    onPositionChange,
    onShoot,
    orbitControls,
  }: PlayerControllerProps = $props();

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
  const shootCooldownMs = 350;
  const reloadDurationMs = 900;
  const DYNAMIC_BODY_TYPE: RigidBodyType = 0 as RigidBodyType;
  const shellYawSmoothing = 14;
  const playerBodyRadius = 0.55;
  const wallUnstuckInset = 0.08;

  let jumpRequested = false;
  let reloadRequested = false;
  let shootRequested = false;
  let shootingHeld = false;
  let meleeRequested = false;
  let mouseScreenX = 0;
  let mouseScreenY = 0;
  let lastMobileJumpPulse = 0;
  let lastMobileMeleePulse = 0;
  let mobileShooting = false;
  const playerScreenProjection = new Vector3();
  let isGroundedState = $state(false);
  let rigidBody = $state<RapierRigidBody>();
  let lastShotAt = 0;
  let swingId = 0;
  let swingStartedAt = 0;
  let swingActiveFlag = false;
  let lastSwingStartedAt = -Number.POSITIVE_INFINITY;
  const swingHitBodies = new Set<number>();
  let shellGroup = $state<Group>();
  let shellYaw = 0;
  let isSwingingVisual = $state(false);
  let swingVisualT = $state(0);
  let swingFacingYaw = $state(0);
  let swingCenter = $state<[number, number, number]>([0, 0, 0]);
  let trailGeometry = $state<BufferGeometry>();
  let trailMaterial = $state<ShaderMaterial>();
  let previousCameraMode: CameraMode | undefined;

  const meleeParams = $derived(scene.meleeParams);
  const meleeCooldownMs = $derived(settings.meleeCooldownMs);
  const meleeTrailSettings = $derived(scene.meleeTrailSettings);

  const meleeHitboxParams = $derived<SwingParams>({
    ...meleeParams,
    reach: meleeParams.reach + settings.meleeHitboxPadding,
  });
  const swingBladeLength = $derived(
    (meleeParams.reach - meleeParams.innerRadius) * 0.8
  );
  const swingBladeMidZ = $derived(
    meleeParams.innerRadius + swingBladeLength / 2
  );
  const swingBladeTipZ = $derived(
    meleeParams.innerRadius + swingBladeLength + 0.04
  );
  const swingActiveFlare = $derived(
    isSwingActive(swingVisualT, meleeParams) ? 1 : 0.25
  );
  const swingLingerFade = $derived(
    swingVisualT <= 1
      ? 1
      : Math.max(
          0,
          1 - ((swingVisualT - 1) * meleeParams.durationMs) / trailFadeMs
        )
  );
  const swingLightRadial = $derived(
    meleeParams.innerRadius +
      (meleeParams.reach - meleeParams.innerRadius) * 0.7
  );
  const swordRotationY = $derived(
    swingGroupRotationY(Math.min(1, swingVisualT), swingFacingYaw, meleeParams)
  );

  $effect(() => {
    const { geometry, material } = createMeleeTrail(meleeParams);

    trailGeometry = geometry;
    trailMaterial = material;

    return () => {
      geometry.dispose();
      material.dispose();
      trailGeometry = undefined;
      trailMaterial = undefined;
    };
  });

  $effect(() => {
    const material = trailMaterial;

    if (!material) {
      return;
    }

    applyMeleeTrailSettings(material, meleeTrailSettings);
  });

  const { camera } = useThrelte();
  const { pause, rapier, resume, world } = useRapier();

  $effect(() => {
    if (scene.controlsLocked) {
      pause();
    } else {
      resume();
    }
  });

  $effect(() => {
    rigidBody?.setLinearDamping(settings.playerLinearDamping);
  });

  $effect(() => {
    player.impactNonce;
    const body = rigidBody;
    const impact = player.impactVelocity;

    if (!(body && impact)) {
      return;
    }

    body.applyImpulse({ x: impact[0], y: impact[1], z: impact[2] }, true);
    body.wakeUp();
  });

  $effect(() => {
    room.teleportNonce;
    const body = rigidBody;
    const target = room.teleportTarget;

    if (!(body && target)) {
      return;
    }

    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setTranslation({ x: target[0], y: target[1], z: target[2] }, true);
    body.wakeUp();

    playerPosition.set(...target);
    smoothedAnchor.set(...target);
    cameraTarget.set(...target);
    lookTarget.set(target[0], target[1] + settings.lookHeight, target[2]);
  });

  $effect(() => {
    if (settings.cameraMode === "orbit" || scene.sceneControlsLocked) {
      jumpRequested = false;
      reloadRequested = false;
      shootRequested = false;
      shootingHeld = false;
      meleeRequested = false;
      pressed.clear();
    }
  });

  $effect(() => {
    if (settings.cameraMode !== "orbit" || scene.sceneControlsLocked) {
      orbitPressed.clear();
    }
  });

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

  const resetInputState = () => {
    jumpRequested = false;
    reloadRequested = false;
    shootRequested = false;
    shootingHeld = false;
    meleeRequested = false;
    orbitPressed.clear();
    pressed.clear();
  };

  onMount(() =>
    bindPlayerInput({
      getCameraMode: () => settings.cameraMode,
      getControlsLocked: () => scene.sceneControlsLocked,
      onJump: () => {
        jumpRequested = true;
      },
      onMeleeRequest: () => {
        meleeRequested = true;
      },
      onMouseMove: (x, y) => {
        mouseScreenX = x;
        mouseScreenY = y;
        crosshair.set(x, y);
      },
      onReload: () => {
        reloadRequested = true;
      },
      onReset: resetInputState,
      onShootPointerDown: (x, y) => {
        mouseScreenX = x;
        mouseScreenY = y;
        shootingHeld = true;
        shootRequested = true;
      },
      onShootPointerUp: () => {
        shootingHeld = false;
        shootRequested = false;
      },
      orbitPressed,
      pressed,
    })
  );

  const getDesiredHorizontalVelocity = (
    velocity: ReturnType<RapierRigidBody["linvel"]>
  ) => {
    const analog = mobileInput.moveVector;
    const analogActive = analog.x !== 0 || analog.y !== 0;

    return resolveHorizontalVelocity(
      pressed,
      moveDirection,
      settings.moveSpeed,
      scene.moveSpeedFactor,
      velocity,
      analogActive ? { x: analog.x, z: analog.y } : null
    );
  };

  const updateBodyMovement = (body: RapierRigidBody, delta: number) => {
    const velocity = body.linvel();
    isGroundedState = isGrounded(body);

    if (settings.cameraMode !== "orbit" && !scene.sceneControlsLocked) {
      const response = Math.min(1, delta * settings.moveResponsiveness);
      const desiredVelocity = getDesiredHorizontalVelocity(velocity);
      let nextVelocityY = velocity.y;

      if (jumpRequested && isGroundedState) {
        body.wakeUp();
        nextVelocityY = settings.jumpSpeed;
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
    const followFactor = Math.min(1, delta * settings.cameraSmoothing);
    smoothedAnchor.lerp(playerPosition, followFactor);

    lookTarget.copy(smoothedAnchor);
    lookTarget.y += settings.lookHeight;

    if (
      settings.cameraMode === "orbit" &&
      previousCameraMode !== "orbit" &&
      orbitControls
    ) {
      orbitControls.target.copy(lookTarget);
      orbitControls.update();
    }

    previousCameraMode = settings.cameraMode;

    if (settings.cameraMode === "follow") {
      const pitch = MathUtils.degToRad(settings.followPitch);
      const yaw = MathUtils.degToRad(settings.followYaw);

      cameraOffset.set(
        Math.sin(yaw) * Math.cos(pitch) * settings.followDistance,
        Math.sin(pitch) * settings.followDistance,
        Math.cos(yaw) * Math.cos(pitch) * settings.followDistance
      );

      cameraTarget.copy(smoothedAnchor).add(cameraOffset);
      activeCamera.position.copy(cameraTarget);
      activeCamera.lookAt(lookTarget);
    }
  };

  const resolveFacingYaw = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    const translation = body.translation();

    activeCamera.updateMatrixWorld();

    mouseNdc.set(
      (mouseScreenX / window.innerWidth) * 2 - 1,
      -(mouseScreenY / window.innerHeight) * 2 + 1
    );

    groundPlane.constant = -(translation.y + projectileHeightOffset);
    raycaster.setFromCamera(mouseNdc, activeCamera);
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit);

    let dirX: number;
    let dirZ: number;

    if (hit) {
      dirX = groundHit.x - translation.x;
      dirZ = groundHit.z - translation.z;
    } else {
      activeCamera.getWorldDirection(forwardDirection);
      dirX = forwardDirection.x;
      dirZ = forwardDirection.z;
    }

    if (dirX === 0 && dirZ === 0) {
      return 0;
    }

    return Math.atan2(dirX, dirZ);
  };

  const startMeleeSwing = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    swingId += 1;
    swingStartedAt = performance.now();
    swingFacingYaw = resolveFacingYaw(body, activeCamera);
    const translation = body.translation();
    swingCenter = [translation.x, translation.y, translation.z];
    swingActiveFlag = true;
    isSwingingVisual = true;
    swingVisualT = 0;
    swingHitBodies.clear();

    onMeleeFrame?.({
      swingId,
      t: 0,
      active: false,
      center: swingCenter,
      facingYaw: swingFacingYaw,
      ended: false,
    });
  };

  const applySwingKnockbacks = (playerBody: RapierRigidBody, t: number) => {
    if (!isSwingActive(t, meleeHitboxParams)) {
      return;
    }

    const playerHandle = playerBody.handle;

    world.forEachRigidBody((otherBody) => {
      if (otherBody.handle === playerHandle) {
        return;
      }

      if (otherBody.bodyType() !== DYNAMIC_BODY_TYPE) {
        return;
      }

      if (swingHitBodies.has(otherBody.handle)) {
        return;
      }

      const position = otherBody.translation();
      const point: [number, number, number] = [
        position.x,
        position.y,
        position.z,
      ];

      if (
        !isPointInSwing(
          point,
          t,
          swingCenter,
          swingFacingYaw,
          meleeHitboxParams
        )
      ) {
        return;
      }

      const [kx, kz] = swingKnockbackDirection(
        point,
        swingCenter,
        meleeHitboxParams
      );
      const mass = otherBody.mass() || 1;
      const impulse = meleeHitboxParams.impulse * mass;

      otherBody.applyImpulse(
        {
          x: kx * impulse,
          y: meleeHitboxParams.lift * mass,
          z: kz * impulse,
        },
        true
      );
      otherBody.wakeUp();

      swingHitBodies.add(otherBody.handle);
    });
  };

  const updateMelee = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    const now = performance.now();
    const cooldownReady = now - lastSwingStartedAt >= meleeCooldownMs;

    if (
      meleeRequested &&
      !swingActiveFlag &&
      cooldownReady &&
      settings.cameraMode !== "orbit" &&
      !scene.sceneControlsLocked
    ) {
      lastSwingStartedAt = now;
      startMeleeSwing(body, activeCamera);
    }

    meleeRequested = false;

    if (!isSwingingVisual) {
      return;
    }

    const elapsed = now - swingStartedAt;
    const t = swingProgress(elapsed, meleeParams);
    const translation = body.translation();

    swingCenter = [translation.x, translation.y, translation.z];
    swingVisualT = t;

    const active = isSwingActive(t, meleeParams);

    if (trailMaterial) {
      const lingerElapsed = Math.max(0, elapsed - meleeParams.durationMs);
      const intensity = Math.max(0, 1 - lingerElapsed / trailFadeMs);

      trailMaterial.uniforms.uProgress.value = Math.min(
        1,
        swingRibbonProgress(t, meleeParams)
      );
      trailMaterial.uniforms.uIntensity.value = intensity;
    }

    if (swingActiveFlag) {
      applySwingKnockbacks(body, t);

      onMeleeFrame?.({
        swingId,
        t,
        active,
        center: swingCenter,
        facingYaw: swingFacingYaw,
        ended: false,
      });

      if (elapsed >= meleeParams.durationMs) {
        swingActiveFlag = false;
        onMeleeFrame?.({
          swingId,
          t: 1,
          active: false,
          center: swingCenter,
          facingYaw: swingFacingYaw,
          ended: true,
        });
      }
    } else if (elapsed >= meleeParams.durationMs + trailFadeMs) {
      isSwingingVisual = false;
    }
  };

  const updateReload = () => {
    const now = performance.now();

    if (player.reloading) {
      if (now >= player.reloadUntil) {
        player.finishReload();
      }

      reloadRequested = false;
      return;
    }

    if (reloadRequested || player.ammo <= 0) {
      player.startReload(now, reloadDurationMs);
    }

    reloadRequested = false;
  };

  const tryShoot = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    if (
      !shootRequested ||
      settings.cameraMode === "orbit" ||
      scene.sceneControlsLocked
    ) {
      shootRequested = false;
      return;
    }

    if (player.reloading) {
      return;
    }

    const now = performance.now();

    if (player.ammo <= 0) {
      player.startReload(now, reloadDurationMs);
      return;
    }

    if (now - lastShotAt < shootCooldownMs) {
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
    const projectileSpeed = Math.max(scene.weaponBuild.speed * 1.6, 28);
    const spawnOffset =
      projectileForwardOffset + scene.weaponBuild.radius * 2.4;

    shootSpawnPosition
      .set(translation.x, translation.y + projectileHeightOffset, translation.z)
      .addScaledVector(forwardDirection, spawnOffset);

    if (!player.consumeAmmo()) {
      return;
    }

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

    if (player.ammo <= 0) {
      player.startReload(now, reloadDurationMs);
    }

    shootRequested = shootingHeld;
  };

  const updateOrbitKeyboardCamera = (
    activeCamera: NonNullable<typeof camera.current>,
    delta: number
  ) => {
    if (
      settings.cameraMode !== "orbit" ||
      !orbitControls ||
      orbitPressed.size === 0
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

    let horizontalStep = 0;
    let verticalStep = 0;

    if (activeCamera instanceof PerspectiveCamera) {
      const distance = activeCamera.position.distanceTo(orbitControls.target);
      verticalStep =
        distance *
        Math.tan(MathUtils.degToRad(activeCamera.fov * 0.5)) *
        orbitKeyboardPanSpeed *
        delta;
      horizontalStep = verticalStep * activeCamera.aspect;
    } else if (activeCamera instanceof OrthographicCamera) {
      verticalStep =
        ((activeCamera.top - activeCamera.bottom) / activeCamera.zoom) *
        orbitKeyboardPanSpeed *
        delta;
      horizontalStep =
        ((activeCamera.right - activeCamera.left) / activeCamera.zoom) *
        orbitKeyboardPanSpeed *
        delta;
    }

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

  const keepBodyInRoom = (body: RapierRigidBody) => {
    const translation = body.translation();
    const clamped = clampToRoom(
      [translation.x, translation.y, translation.z],
      playerBodyRadius
    );

    if (
      clamped[0] === translation.x &&
      clamped[1] === translation.y &&
      clamped[2] === translation.z
    ) {
      return;
    }

    const velocity = body.linvel();
    const hitMinX = clamped[0] !== translation.x && translation.x < clamped[0];
    const hitMaxX = clamped[0] !== translation.x && translation.x > clamped[0];
    const hitMinZ = clamped[2] !== translation.z && translation.z < clamped[2];
    const hitMaxZ = clamped[2] !== translation.z && translation.z > clamped[2];
    let nextVelocityX = velocity.x;
    let nextVelocityZ = velocity.z;

    if (hitMinX) {
      nextVelocityX = Math.max(0, velocity.x);
    } else if (hitMaxX) {
      nextVelocityX = Math.min(0, velocity.x);
    }

    if (hitMinZ) {
      nextVelocityZ = Math.max(0, velocity.z);
    } else if (hitMaxZ) {
      nextVelocityZ = Math.min(0, velocity.z);
    }

    body.setTranslation({ x: clamped[0], y: clamped[1], z: clamped[2] }, true);
    body.setLinvel(
      {
        x: nextVelocityX,
        y: velocity.y,
        z: nextVelocityZ,
      },
      true
    );
    body.wakeUp();
  };

  const pollMobileInput = (
    body: RapierRigidBody,
    activeCamera: NonNullable<typeof camera.current>
  ) => {
    if (scene.sceneControlsLocked || settings.cameraMode === "orbit") {
      lastMobileJumpPulse = mobileInput.jumpPulse;
      lastMobileMeleePulse = mobileInput.meleePulse;
      return;
    }

    if (mobileInput.jumpPulse !== lastMobileJumpPulse) {
      lastMobileJumpPulse = mobileInput.jumpPulse;
      jumpRequested = true;
    }

    if (mobileInput.meleePulse !== lastMobileMeleePulse) {
      lastMobileMeleePulse = mobileInput.meleePulse;
      meleeRequested = true;
    }

    const aim = mobileInput.aimVector;

    if (!aim) {
      if (mobileShooting) {
        mobileShooting = false;
        shootingHeld = false;
        shootRequested = false;
      }
      return;
    }

    const translation = body.translation();

    playerScreenProjection.set(
      translation.x,
      translation.y + projectileHeightOffset,
      translation.z
    );
    activeCamera.updateMatrixWorld();
    playerScreenProjection.project(activeCamera);

    const playerScreenX =
      ((playerScreenProjection.x + 1) / 2) * window.innerWidth;
    const playerScreenY =
      ((1 - playerScreenProjection.y) / 2) * window.innerHeight;
    const offset = Math.max(window.innerWidth, window.innerHeight);

    mouseScreenX = playerScreenX + aim.x * offset;
    mouseScreenY = playerScreenY + aim.y * offset;
    crosshair.set(mouseScreenX, mouseScreenY);
    mobileShooting = true;
    shootingHeld = true;
    shootRequested = true;
  };

  useTask((delta) => {
    const body = rigidBody;
    const activeCamera = camera.current;

    if (!(body && activeCamera)) {
      return;
    }

    pollMobileInput(body, activeCamera);
    updateBodyMovement(body, delta);
    keepBodyInRoom(body);

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
    updateReload();
    tryShoot(body, activeCamera);
    updateMelee(body, activeCamera);

    if (shellGroup) {
      const aimYaw = resolveFacingYaw(body, activeCamera);
      const yawAlpha = Math.min(1, delta * shellYawSmoothing);
      const visualPosition = clampToRoom(
        [translation.x, translation.y, translation.z],
        playerBodyRadius + wallUnstuckInset
      );

      shellYaw = lerpAngleShortest(shellYaw, aimYaw, yawAlpha);
      shellGroup.position.set(
        visualPosition[0],
        visualPosition[1],
        visualPosition[2]
      );
      shellGroup.rotation.set(0, shellYaw, 0);
    }
  });
</script>

<T.Group position={[0, 0.58, 0]}>
  <RigidBody
    bind:rigidBody
    ccd
    canSleep={false}
    linearDamping={settings.playerLinearDamping}
    lockRotations
  >
    <Collider shape="ball" args={[0.55]} friction={1.4} restitution={0.08} />
  </RigidBody>
</T.Group>

<T.Group bind:ref={shellGroup}>
  <OrbKnight scale={0.55} autoRotate={false} hitFlash={scene.playerHitFlash} />
</T.Group>

<PlayerMeleeVisuals
  {isSwingingVisual}
  {meleeParams}
  meleeShowSword={settings.meleeShowSword}
  meleeSwordOpacity={settings.meleeSwordOpacity}
  {meleeTrailSettings}
  {swingActiveFlare}
  {swingBladeLength}
  {swingBladeMidZ}
  {swingBladeTipZ}
  {swingCenter}
  {swingFacingYaw}
  {swingLightRadial}
  {swingLingerFade}
  {swordRotationY}
  {trailGeometry}
  {trailMaterial}
/>

<PlayerDebugMarkers
  cameraTarget={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
  {groundProbeLength}
  groundProbePosition={[
    groundProbePosition.x,
    groundProbePosition.y,
    groundProbePosition.z,
  ]}
  isGrounded={isGroundedState}
  lookTarget={[lookTarget.x, lookTarget.y, lookTarget.z]}
  showDebugGeometry={settings.showDebugGeometry}
/>
