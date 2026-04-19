<script lang="ts">
  import type {
    RigidBody as RapierRigidBody,
    RigidBodyType,
  } from "@dimforge/rapier3d-compat";
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Collider, RigidBody, useRapier } from "@threlte/rapier";
  import { onMount } from "svelte";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import {
    AdditiveBlending,
    BufferGeometry,
    Color,
    DoubleSide,
    Float32BufferAttribute,
    type Group,
    MathUtils,
    type Mesh,
    PerspectiveCamera,
    Plane,
    Raycaster,
    ShaderMaterial,
    Vector2,
    Vector3,
  } from "three";
  import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import {
    buildSwingRibbonGeometryData,
    DEFAULT_MELEE_COOLDOWN_MS,
    DEFAULT_SWING,
    isPointInSwing,
    isSwingActive,
    type SwingParams,
    swingGroupRotationY,
    swingKnockbackDirection,
    swingProgress,
    swingRibbonProgress,
  } from "$lib/combat/melee-swing";
  import type { WeaponBuild } from "$lib/config/weapon-graph";
  import { isEditableTarget } from "$lib/game/dom";
  import {
    handleOrbitKeyDown,
    isGameplayPreventDefaultCode,
    getDesiredHorizontalVelocity as resolveHorizontalVelocity,
  } from "$lib/game/player-controls";
  import type {
    CameraMode,
    MeleeFrame,
    MeleeTrailSettings,
    Vec3,
  } from "$lib/game/types";

  const DEFAULT_TRAIL_SETTINGS: MeleeTrailSettings = {
    bandAlphas: [1, 0.55, 0],
    bandCenters: [0.92, 0.74, 0.5],
    bandWidths: [0.055, 0.025, 0.035],
    coreColor: "#ffffff",
    edgeColor: "#7fd8ff",
    tailLength: 0.55,
  };

  interface PlayerControllerProps {
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
    controlsLocked?: boolean;
    followDistance?: number;
    followPitch?: number;
    followYaw?: number;
    hitFlash?: number;
    impactNonce?: number;
    impactVelocity?: Vec3 | null;
    jumpSpeed?: number;
    lookHeight?: number;
    meleeCooldownMs?: number;
    meleeHitboxPadding?: number;
    meleeParams?: SwingParams;
    meleeShowSword?: boolean;
    meleeSwordOpacity?: number;
    meleeTrailSettings?: MeleeTrailSettings;
    moveResponsiveness?: number;
    moveSpeed?: number;
    moveSpeedFactor?: number;
    onMeleeFrame?: (frame: MeleeFrame) => void;
    onMouseMove?: (x: number, y: number) => void;
    onPositionChange?: (position: Vec3) => void;
    onShoot?: (projectile: { position: Vec3; velocity: Vec3 }) => void;
    orbitControls?: OrbitControls;
    playerLinearDamping?: number;
    showDebugGeometry?: boolean;
    teleportNonce?: number;
    teleportTarget?: Vec3 | null;
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
  const meleeHeightOffset = 0.18;
  const DYNAMIC_BODY_TYPE: RigidBodyType = 0 as RigidBodyType;

  let jumpRequested = false;
  let shootRequested = false;
  let shootingHeld = false;
  let meleeRequested = false;
  let mouseScreenX = 0;
  let mouseScreenY = 0;
  let isGroundedState = $state(false);
  let rigidBody = $state<RapierRigidBody>();
  let lastShotAt = 0;
  let swingId = 0;
  let swingStartedAt = 0;
  let swingActiveFlag = false;
  let lastSwingStartedAt = -Number.POSITIVE_INFINITY;
  const swingHitBodies = new Set<number>();
  let swordGroup = $state<Group>();
  let shellGroup = $state<Group>();
  let shellYaw = 0;
  const shellYawSmoothing = 14;
  let isSwingingVisual = $state(false);
  let swingVisualT = $state(0);
  let swingFacingYaw = $state(0);
  let swingCenter = $state<[number, number, number]>([0, 0, 0]);

  const lerpAngleShortest = (from: number, to: number, alpha: number) => {
    const TAU = Math.PI * 2;
    const diff = (((to - from) % TAU) + TAU + Math.PI) % TAU - Math.PI;
    return from + diff * alpha;
  };
  const trailFadeMs = 180;
  let trailGeometry: BufferGeometry | undefined;
  let trailMaterial: ShaderMaterial | undefined;
  let trailMesh = $state<Mesh>();

  const trailVertexShader = /* glsl */ `
                      varying vec2 vUv;
                      void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                      }
                    `;

  const trailFragmentShader = /* glsl */ `
                      uniform float uProgress;
                      uniform float uIntensity;
                      uniform float uTailLength;
                      uniform vec3 uEdgeColor;
                      uniform vec3 uCoreColor;
                      uniform vec3 uBandCenters;
                      uniform vec3 uBandWidths;
                      uniform vec3 uBandAlphas;
                      varying vec2 vUv;

                      float bandFalloff(float y, float center, float width) {
                        float d = (y - center) / max(width, 0.001);
                        return exp(-d * d);
                      }

                      void main() {
                        float edgeSoftness = mix(0.09, 0.03, clamp(uTailLength, 0.0, 1.0));

                        float tailFalloff =
                          smoothstep(0.0, edgeSoftness, vUv.x);
                        float leadFalloff =
                          1.0 -
                          smoothstep(uProgress - edgeSoftness, uProgress + edgeSoftness * 0.2, vUv.x);
                        float longitudinal = tailFalloff * leadFalloff;

                        if (longitudinal <= 0.0015) discard;

                        float widthScale = 1.0;

                        float primary =
                          bandFalloff(vUv.y, uBandCenters.x, uBandWidths.x * widthScale) *
                          uBandAlphas.x;
                        float secondary =
                          bandFalloff(vUv.y, uBandCenters.y, uBandWidths.y * widthScale) *
                          uBandAlphas.y;
                        float tertiary =
                          bandFalloff(vUv.y, uBandCenters.z, uBandWidths.z * widthScale) *
                          uBandAlphas.z;
                        float bandMask = max(max(primary, secondary), tertiary);

                        float leadingGlow =
                          smoothstep(uProgress - 0.18, uProgress - 0.03, vUv.x);
                        float brightness = 0.85 + 0.6 * leadingGlow;
                        float alpha = longitudinal * bandMask * brightness * uIntensity;

                        vec3 color = mix(uEdgeColor, uCoreColor, leadingGlow * primary);
                        gl_FragColor = vec4(color * brightness, alpha);
                      }
                    `;

  let {
    cameraMode = "follow",
    cameraSmoothing = 10,
    controlsLocked = false,
    followDistance = 10.8,
    followPitch = 58,
    followYaw = 0,
    hitFlash = 0,
    jumpSpeed = 6.2,
    lookHeight = 0.4,
    moveResponsiveness = 12,
    moveSpeed = 7.5,
    moveSpeedFactor = 1,
    impactNonce = 0,
    impactVelocity = null,
    meleeCooldownMs = DEFAULT_MELEE_COOLDOWN_MS,
    meleeHitboxPadding = 0,
    meleeParams = DEFAULT_SWING,
    meleeShowSword = true,
    meleeSwordOpacity = 0.5,
    meleeTrailSettings = DEFAULT_TRAIL_SETTINGS,
    onMeleeFrame,
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

  const meleeHitboxParams = $derived<SwingParams>({
    ...meleeParams,
    reach: meleeParams.reach + meleeHitboxPadding,
  });
  const swingBladeLength = $derived(
    meleeParams.reach - meleeParams.innerRadius
  );
  const swingBladeMidZ = $derived(
    (meleeParams.innerRadius + meleeParams.reach) / 2
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
  const swingLightYaw = $derived(
    swingGroupRotationY(Math.min(1, swingVisualT), swingFacingYaw, meleeParams)
  );
  $effect(() => {
    const data = buildSwingRibbonGeometryData(meleeParams, 56);
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(data.positions, 3)
    );
    geometry.setAttribute("uv", new Float32BufferAttribute(data.uvs, 2));
    geometry.setIndex(Array.from(data.indices));
    geometry.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uBandAlphas: {
          value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandAlphas),
        },
        uBandCenters: {
          value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandCenters),
        },
        uBandWidths: {
          value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandWidths),
        },
        uCoreColor: { value: new Color(DEFAULT_TRAIL_SETTINGS.coreColor) },
        uEdgeColor: { value: new Color(DEFAULT_TRAIL_SETTINGS.edgeColor) },
        uIntensity: { value: 0 },
        uProgress: { value: 0 },
        uTailLength: { value: DEFAULT_TRAIL_SETTINGS.tailLength },
      },
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    });

    trailGeometry = geometry;
    trailMaterial = material;

    const mesh = trailMesh;

    if (mesh) {
      mesh.geometry = geometry;
      mesh.material = material;
    }

    return () => {
      geometry.dispose();
      material.dispose();
      trailGeometry = undefined;
      trailMaterial = undefined;
    };
  });

  $effect(() => {
    const mesh = trailMesh;

    if (!(mesh && trailGeometry && trailMaterial)) {
      return;
    }

    mesh.geometry = trailGeometry;
    mesh.material = trailMaterial;
  });

  $effect(() => {
    const material = trailMaterial;

    if (!material) {
      return;
    }

    const centers = material.uniforms.uBandCenters.value as Vector3;
    const widths = material.uniforms.uBandWidths.value as Vector3;
    const alphas = material.uniforms.uBandAlphas.value as Vector3;
    const edge = material.uniforms.uEdgeColor.value as Color;
    const core = material.uniforms.uCoreColor.value as Color;

    centers.set(...meleeTrailSettings.bandCenters);
    widths.set(...meleeTrailSettings.bandWidths);
    alphas.set(...meleeTrailSettings.bandAlphas);
    edge.set(meleeTrailSettings.edgeColor);
    core.set(meleeTrailSettings.coreColor);
    material.uniforms.uTailLength.value = meleeTrailSettings.tailLength;
  });

  const { camera } = useThrelte();
  const { pause, rapier, resume, world } = useRapier();

  $effect(() => {
    if (controlsLocked) {
      pause();
    } else {
      resume();
    }
  });

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
      shootingHeld = false;
      meleeRequested = false;
      pressed.clear();
    }
  });

  $effect(() => {
    if (cameraMode !== "orbit" || controlsLocked) {
      orbitPressed.clear();
    }
  });

  $effect(() => {
    impactNonce;
    const body = rigidBody;

    if (!(body && impactVelocity)) {
      return;
    }

    body.applyImpulse(
      {
        x: impactVelocity[0],
        y: impactVelocity[1],
        z: impactVelocity[2],
      },
      true
    );
    body.wakeUp();
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

  const recordSingleShotPress = (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    if (event.code === "Space") {
      jumpRequested = true;
    } else if (event.code === "KeyF") {
      meleeRequested = true;
    }
  };

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || controlsLocked) {
        return;
      }

      if (cameraMode === "orbit") {
        handleOrbitKeyDown(event, orbitPressed);
        return;
      }

      if (isGameplayPreventDefaultCode(event.code)) {
        event.preventDefault();
      }

      pressed.add(event.code);
      recordSingleShotPress(event);
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
      shootingHeld = false;
      meleeRequested = false;
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
      shootingHeld = true;
      shootRequested = true;
    };

    const handleRightMouseDown = (event: MouseEvent) => {
      if (event.button !== 2 || cameraMode === "orbit" || controlsLocked) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      mouseScreenX = event.clientX;
      mouseScreenY = event.clientY;
      meleeRequested = true;
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (cameraMode === "orbit" || controlsLocked) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      shootingHeld = false;
      shootRequested = false;
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
    window.addEventListener("mousedown", handleRightMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousedown", handleRightMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  });

  const getDesiredHorizontalVelocity = (
    velocity: ReturnType<RapierRigidBody["linvel"]>
  ) =>
    resolveHorizontalVelocity(
      pressed,
      moveDirection,
      moveSpeed,
      moveSpeedFactor,
      velocity
    );

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

  const updateSwordVisual = (t: number) => {
    const sword = swordGroup;

    if (!sword) {
      return;
    }

    sword.position.set(
      swingCenter[0],
      swingCenter[1] + meleeHeightOffset,
      swingCenter[2]
    );
    sword.rotation.set(
      0,
      swingGroupRotationY(t, swingFacingYaw, meleeParams),
      0
    );
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
      cameraMode !== "orbit" &&
      !controlsLocked
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

    updateSwordVisual(t);

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
    shootRequested = shootingHeld;
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
    updateMelee(body, activeCamera);

    if (shellGroup) {
      const aimYaw = resolveFacingYaw(body, activeCamera);
      const yawAlpha = Math.min(1, delta * shellYawSmoothing);
      shellYaw = lerpAngleShortest(shellYaw, aimYaw, yawAlpha);
      shellGroup.position.set(translation.x, translation.y, translation.z);
      shellGroup.rotation.set(0, shellYaw, 0);
    }
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
  </RigidBody>
</T.Group>

<T.Group bind:ref={shellGroup}>
  <OrbKnight scale={0.55} autoRotate={false} {hitFlash} />
</T.Group>

{#if isSwingingVisual && meleeShowSword}
  <T.Group bind:ref={swordGroup}>
    <T.Mesh
      castShadow
      position={[0, 0, meleeParams.innerRadius - 0.18]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.CylinderGeometry args={[0.045, 0.045, 0.36, 16]} />
      <T.MeshStandardMaterial
        color="#18120d"
        metalness={0.8}
        opacity={meleeSwordOpacity}
        roughness={0.45}
        transparent
      />
    </T.Mesh>

    <T.Mesh castShadow position={[0, 0, meleeParams.innerRadius]}>
      <T.CylinderGeometry args={[0.035, 0.035, 0.46, 16]} />
      <T.MeshStandardMaterial
        color="#c08a2f"
        metalness={1}
        opacity={meleeSwordOpacity}
        roughness={0.3}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0, swingBladeMidZ]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.CylinderGeometry args={[0.026, 0.055, swingBladeLength, 20]} />
      <T.MeshBasicMaterial
        color="#eaffff"
        opacity={meleeSwordOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0, swingBladeMidZ]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.CylinderGeometry args={[0.09, 0.13, swingBladeLength + 0.03, 24]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#56efff"
        depthWrite={false}
        opacity={0.28 * meleeSwordOpacity * (0.5 + swingActiveFlare * 0.6)}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0, meleeParams.reach + 0.08]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.ConeGeometry args={[0.055, 0.16, 20]} />
      <T.MeshBasicMaterial
        color="#eaffff"
        opacity={meleeSwordOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.PointLight
      color="#62f4ff"
      decay={1.8}
      distance={3.1}
      intensity={2.1 * meleeSwordOpacity * swingActiveFlare * swingLingerFade}
      position={[0, 0, meleeParams.reach - 0.1]}
    />
  </T.Group>
{/if}

<T.Mesh
  bind:ref={trailMesh}
  position={[
    swingCenter[0],
    swingCenter[1] + meleeHeightOffset + 0.05,
    swingCenter[2],
  ]}
  rotation={[0, swingFacingYaw, 0]}
  renderOrder={3}
  frustumCulled={false}
/>

{#if isSwingingVisual}
  <T.PointLight
    color={meleeTrailSettings.edgeColor}
    decay={1.6}
    distance={6.5}
    intensity={6 * swingLingerFade}
    position={[
      swingCenter[0] + Math.sin(swingLightYaw) * swingLightRadial,
      swingCenter[1] + meleeHeightOffset + 0.12,
      swingCenter[2] + Math.cos(swingLightYaw) * swingLightRadial,
    ]}
  />
{/if}

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
