<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Collider, Debug, RigidBody, World } from "@threlte/rapier";
  import { onMount } from "svelte";
  import {
    type DirectionalLight,
    type OrthographicCamera,
    PCFShadowMap,
    type PerspectiveCamera,
    RepeatWrapping,
    type Texture,
    TextureLoader,
    Vector3,
  } from "three";
  import type { OrbitControls as OrbitControlsInstance } from "three/examples/jsm/controls/OrbitControls.js";
  import bossDoorTextureUrl from "$lib/assets/boss-door.svg";
  import bossFloorTextureUrl from "$lib/assets/boss-floor.svg";
  import lavaSurfaceTextureUrl from "$lib/assets/lava-surface.svg";
  import treasureFloorTextureUrl from "$lib/assets/treasure-floor.svg";
  import {
    DEFAULT_SWING,
    isPointInSwing,
    type SwingParams,
    swingKnockbackDirection,
  } from "$lib/combat/melee-swing";
  import GameHud from "$lib/components/game/GameHud.svelte";
  import GameMinimap from "$lib/components/game/GameMinimap.svelte";
  import GameSceneOverlays from "$lib/components/game/GameSceneOverlays.svelte";
  import PlayerController from "$lib/components/game/PlayerController.svelte";
  import Projectile from "$lib/components/game/Projectile.svelte";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import ShootingTarget from "$lib/components/game/ShootingTarget.svelte";
  import type {
    DungeonLayout,
    DungeonRoom,
    DungeonRoomDirection,
  } from "$lib/config/dungeon-layout";
  import {
    enemyTemplateById,
    type RoomTemplate,
    roomTemplateById,
  } from "$lib/config/room-templates";
  import type { FloorTheme, WallTheme } from "$lib/config/scene-settings";
  import {
    copyWeaponBuild,
    getDamageAtDistance,
    getWeaponNodeTemplate,
    type WeaponBuild,
    type WeaponNodeType,
  } from "$lib/config/weapon-graph";
  import {
    artifactPickupDurationMs,
    beamDurationMs,
    bossGearMounts,
    bossIntroDurationMs,
    clampToRoom,
    createDoorMarkers,
    createDoorSeals,
    createRoomEnemies,
    createRoomWalls,
    damagePopupDurationMs,
    doorOpenDelayMs,
    doorOpenDurationMs,
    enemyShotRadius,
    enemyShotTtlMs,
    floorHalfDepth,
    floorHalfWidth,
    floorIntroDurationMs,
    floorThemes,
    floorTiles,
    gearTeeth,
    getEntryDirectionFromTarget,
    getRevealedDoors,
    getRoomHazards,
    getRoomPlatforms,
    getTransition,
    hazardTickMs,
    playerMaxHealth,
    playerRadius,
    roomTeleportZ,
    treasureGearMounts,
    wallHalfDepth,
    wallThemes,
  } from "$lib/game/scene-layout";
  import {
    deflectBurstDurationMs,
    getMinimapBounds,
    projectDamagePopups,
    renderDeflectBursts,
  } from "$lib/game/scene-ui";
  import type {
    CameraMode,
    MeleeFrame,
    MeleeTrailSettings,
    ProjectileData,
    Vec3,
  } from "$lib/game/types";

  interface GameSceneProps {
    ambientLightIntensity?: number;
    cameraFov?: number;
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
    collectedArtifactRoomIds?: string[];
    controlsLocked?: boolean;
    dungeon: DungeonLayout;
    floorTheme?: FloorTheme;
    followDistance?: number;
    followPitch?: number;
    followYaw?: number;
    gravityY?: number;
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
    onCollectArtifact?: (roomId: string, type: WeaponNodeType) => void;
    playerLinearDamping?: number;
    shadowBias?: number;
    shadowFar?: number;
    shadowFrustum?: number;
    shadowMapSize?: number;
    shadowNormalBias?: number;
    showDebugGeometry?: boolean;
    showPhysicsDebug?: boolean;
    sunIntensity?: number;
    sunPositionX?: number;
    sunPositionY?: number;
    sunPositionZ?: number;
    wallTheme?: WallTheme;
    weaponBuild: WeaponBuild;
  }

  interface ActiveProjectile extends ProjectileData {
    build: WeaponBuild;
  }

  interface ActiveBeam {
    color: string;
    core: string;
    createdAt: number;
    curve: number;
    id: string;
    length: number;
    position: Vec3;
    rotationY: number;
    width: number;
  }

  interface ActiveEnemy {
    behavior: "rush" | "shooter";
    color: string;
    hp: number;
    id: string;
    knockbackVelocity: Vec3;
    lastHitAt: number;
    lastShotAt: number;
    maxHp: number;
    moveSpeed: number;
    position: Vec3;
    preferredRange?: number;
    radius: number;
    shotColor?: string;
    shotDamage?: number;
    shotIntervalMs?: number;
    shotSpeed?: number;
    touchDamage: number;
    touchIntervalMs: number;
  }

  interface ActiveEnemyShot {
    color: string;
    damage: number;
    id: string;
    position: Vec3;
    radius: number;
    ttlMs: number;
    velocity: Vec3;
  }

  interface DeflectBurst {
    color: string;
    createdAt: number;
    id: string;
    position: Vec3;
    radius: number;
  }

  interface DamagePopup {
    amount: number;
    createdAt: number;
    id: string;
    position: Vec3;
    variant: "enemy" | "player";
  }

  let bossDoorTexture = $state<Texture | null>(null);
  let bossFloorTexture = $state<Texture | null>(null);
  let lavaSurfaceTexture = $state<Texture | null>(null);
  let treasureFloorTexture = $state<Texture | null>(null);

  let orbitControls = $state<OrbitControlsInstance>();
  let sceneCamera = $state<PerspectiveCamera>();
  let activeEnemies = $state<ActiveEnemy[]>([]);
  let activeBeams = $state<ActiveBeam[]>([]);
  let damagePopups = $state<DamagePopup[]>([]);
  let enemyShots = $state<ActiveEnemyShot[]>([]);
  let deflectBursts = $state<DeflectBurst[]>([]);
  let clearedEnemyRoomIds = $state<string[]>([]);
  let releasedRoomIds = $state<string[]>([]);
  let playerHealth = $state(playerMaxHealth);
  let projectiles = $state<ActiveProjectile[]>([]);
  let sunLight = $state<DirectionalLight>();
  let crosshairX = $state(0);
  let crosshairY = $state(0);

  let {
    ambientLightIntensity = 0.52,
    cameraFov = 63,
    cameraMode = "follow",
    cameraSmoothing = 8,
    collectedArtifactRoomIds = [],
    controlsLocked = false,
    dungeon,
    floorTheme = "check",
    followDistance = 12.3,
    followPitch = 52,
    followYaw = 0,
    gravityY = -9.81,
    jumpSpeed = 6.2,
    lookHeight = 0.4,
    meleeCooldownMs,
    meleeHitboxPadding = 0,
    meleeParams,
    meleeShowSword = true,
    meleeSwordOpacity = 0.5,
    meleeTrailSettings,
    moveResponsiveness = 12,
    moveSpeed = 7.5,
    onCollectArtifact,
    playerLinearDamping = 1.6,
    shadowBias = -0.000_35,
    shadowFar = 32,
    shadowFrustum = 16,
    shadowMapSize = 2048,
    shadowNormalBias = 0.035,
    showPhysicsDebug = false,
    showDebugGeometry = false,
    sunIntensity = 2.2,
    sunPositionX = 6,
    sunPositionY = 10,
    sunPositionZ = 4,
    wallTheme = "aqua",
    weaponBuild,
  }: GameSceneProps = $props();

  let currentRoomId = $state("");
  let exploredRooms = $state<string[]>([]);
  let teleportNonce = $state(0);
  let teleportTarget = $state<Vec3 | null>(null);
  let currentEntryDirection = $state<DungeonRoomDirection>("south");
  let animationNow = $state(0);
  let bossIntroStartedAt = $state(0);
  let bossIntroTitle = $state("");
  let floorIntroStartedAt = $state(0);
  let enemyWakeUntil = $state(0);
  let pickedArtifactAt = $state(0);
  let pickedArtifactType = $state<WeaponNodeType | null>(null);
  let roomTransitionStartedAt = $state(0);
  let roomTransitionSubtitle = $state("");
  let roomTransitionTitle = $state("");
  let playerImpactNonce = $state(0);
  let playerImpactVelocity = $state<Vec3 | null>(null);
  let playerShotCount = $state(0);
  let playerLastHitAt = $state(0);
  let playerRecoverDuration = $state(0);
  let playerRecoverUntil = $state(0);
  let lastRoomTransitionAt = 0;
  let lastPlayerHitAt = 0;
  let lastHazardAt = 0;
  let unlockingRoomId = "";
  let unlockStartedAt = 0;
  let doorOpenAmount = $state(1);
  let lastPlayerPosition = $state<Vec3>([0, 1, 0]);
  const projectilePositions = new Map<string, Vec3>();
  let currentMeleeFrame: MeleeFrame | null = null;
  const meleeHitEnemies = new Map<number, Set<string>>();

  const roomList = $derived.by(() => Object.values(dungeon.rooms));
  const currentFloorPalette = $derived(floorThemes[floorTheme]);
  const currentWallPalette = $derived(wallThemes[wallTheme]);
  const currentRoom = $derived(
    dungeon.rooms[currentRoomId] ?? dungeon.rooms[dungeon.startRoomId]
  );
  const currentRoomTemplate = $derived(
    roomTemplateById[currentRoom.templateId]
  );
  const isCurrentRoomCombat = $derived(
    currentRoomTemplate.spawnPattern !== "none"
  );
  const roomPlatforms = $derived.by(() =>
    getRoomPlatforms(currentRoomTemplate.layout)
  );
  const roomHazards = $derived.by(() =>
    getRoomHazards(currentRoomTemplate.layout)
  );
  const roomWalls = $derived.by(() =>
    createRoomWalls(currentRoom, currentWallPalette)
  );
  const roomDoors = $derived.by(() => createDoorMarkers(currentRoom, dungeon));
  const roomDoorSeals = $derived.by(() => createDoorSeals(currentRoom));
  const exploredRoomSet = $derived.by(() => new Set(exploredRooms));
  const clearedEnemyRoomSet = $derived.by(() => new Set(clearedEnemyRoomIds));
  const releasedRoomSet = $derived.by(() => new Set(releasedRoomIds));
  const collectedArtifactRoomSet = $derived.by(
    () => new Set(collectedArtifactRoomIds)
  );
  const minimapBounds = $derived.by(() => getMinimapBounds(roomList));
  const currentArtifactType = $derived(
    currentRoom.artifactType &&
      !collectedArtifactRoomSet.has(currentRoom.id) &&
      (currentRoom.kind === "treasure" ||
        (currentRoom.kind === "boss" &&
          clearedEnemyRoomSet.has(currentRoom.id)))
      ? currentRoom.artifactType
      : null
  );
  const currentArtifactTemplate = $derived.by(() =>
    currentArtifactType ? getWeaponNodeTemplate(currentArtifactType) : null
  );
  const playerHealthRatio = $derived(playerHealth / playerMaxHealth);
  const playerHitFlash = $derived(
    Math.max(0, 1 - (animationNow - playerLastHitAt) / 180)
  );
  const playerRecoverRatio = $derived(
    playerRecoverDuration > 0
      ? Math.max(0, (playerRecoverUntil - animationNow) / playerRecoverDuration)
      : 0
  );
  const bossIntroProgress = $derived(
    bossIntroStartedAt > 0
      ? Math.max(
          0,
          1 - (animationNow - bossIntroStartedAt) / bossIntroDurationMs
        )
      : 0
  );
  const bossIntroActive = $derived(
    bossIntroStartedAt > 0 &&
      animationNow < bossIntroStartedAt + bossIntroDurationMs
  );
  const sceneControlsLocked = $derived(controlsLocked || bossIntroActive);
  const floorIntroProgress = $derived(
    floorIntroStartedAt > 0
      ? Math.max(
          0,
          1 - (animationNow - floorIntroStartedAt) / floorIntroDurationMs
        )
      : 0
  );
  const pickedArtifactTemplate = $derived.by(() =>
    pickedArtifactType ? getWeaponNodeTemplate(pickedArtifactType) : null
  );
  const artifactPickupProgress = $derived(
    pickedArtifactAt > 0
      ? Math.max(
          0,
          1 - (animationNow - pickedArtifactAt) / artifactPickupDurationMs
        )
      : 0
  );
  const roomTransitionProgress = $derived(
    roomTransitionStartedAt > 0
      ? Math.max(0, 1 - (animationNow - roomTransitionStartedAt) / 900)
      : 0
  );
  const projectedDamagePopups = $derived.by(() => {
    if (!(sceneCamera && typeof window !== "undefined")) {
      return [];
    }

    return projectDamagePopups(
      damagePopups,
      sceneCamera,
      window.innerWidth,
      window.innerHeight
    );
  });
  const deflectBurstsRendered = $derived.by(() =>
    renderDeflectBursts(deflectBursts, animationNow)
  );
  const sceneUiVisible = $derived(
    floorIntroStartedAt > 0 &&
      animationNow >= floorIntroStartedAt &&
      currentRoomId !== ""
  );
  const currentRoomUnlocked = $derived(
    !isCurrentRoomCombat || releasedRoomSet.has(currentRoom.id)
  );
  const isRoomUnlocked = (room: DungeonRoom) =>
    roomTemplateById[room.templateId].spawnPattern === "none" ||
    releasedRoomSet.has(room.id);

  const triggerPlayerRecover = (duration: number) => {
    playerRecoverDuration = duration;
    playerRecoverUntil = performance.now() + duration;
  };

  const getHazardBrakeFactor = (position: Vec3) => {
    if (position[1] > 1.25 || roomHazards.length === 0) {
      return 1;
    }

    let factor = 1;

    for (const hazard of roomHazards) {
      const dx = Math.max(
        0,
        Math.abs(position[0] - hazard.position[0]) - hazard.args[0]
      );
      const dz = Math.max(
        0,
        Math.abs(position[2] - hazard.position[2]) - hazard.args[2]
      );
      const distance = Math.hypot(dx, dz);

      if (distance > 1.1) {
        continue;
      }

      factor = Math.min(factor, 0.42 + (distance / 1.1) * 0.58);
    }

    return factor;
  };

  const lavaBrakeFactor = $derived.by(() =>
    getHazardBrakeFactor(lastPlayerPosition)
  );

  const pushPlayer = (vector: Vec3, strength: number, lift = 0.16) => {
    const distance = Math.hypot(vector[0], vector[2]) || 1;

    playerImpactVelocity = [
      (vector[0] / distance) * strength,
      lift,
      (vector[2] / distance) * strength,
    ];
    playerImpactNonce += 1;
  };

  const popDamage = (
    amount: number,
    position: Vec3,
    variant: DamagePopup["variant"]
  ) => {
    damagePopups.push({
      amount,
      createdAt: performance.now(),
      id: crypto.randomUUID(),
      position,
      variant,
    });
  };

  const resolveEnemyWallImpact = (
    enemy: ActiveEnemy,
    position: Vec3,
    knockbackVelocity: Vec3,
    hp: number,
    now: number
  ) => {
    const clampedPosition = clampToRoom(position, enemy.radius);
    const hitWallX = Math.abs(clampedPosition[0] - position[0]) > 0.001;
    const hitWallZ = Math.abs(clampedPosition[2] - position[2]) > 0.001;
    const wallImpactSpeed = Math.max(
      hitWallX ? Math.abs(knockbackVelocity[0]) : 0,
      hitWallZ ? Math.abs(knockbackVelocity[2]) : 0
    );
    const wallDamage = wallImpactSpeed >= 3.2 ? 1 : 0;

    if (wallDamage > 0) {
      popDamage(
        wallDamage,
        [
          clampedPosition[0],
          clampedPosition[1] + enemy.radius + 0.34,
          clampedPosition[2],
        ],
        "enemy"
      );
    }

    return {
      hp: hp - wallDamage,
      knockbackVelocity: [
        hitWallX ? 0 : knockbackVelocity[0],
        0,
        hitWallZ ? 0 : knockbackVelocity[2],
      ] as Vec3,
      lastHitAt: wallDamage > 0 ? now : null,
      position: clampedPosition,
    };
  };

  const getActiveHazard = (position: Vec3) =>
    roomHazards.find(
      (hazard) =>
        position[1] < 0.84 &&
        Math.abs(position[0] - hazard.position[0]) <= hazard.args[0] &&
        Math.abs(position[2] - hazard.position[2]) <= hazard.args[2]
    );

  const getEnemyMoveIntent = (enemy: ActiveEnemy, distance: number) => {
    if (enemy.behavior !== "shooter") {
      return 1;
    }

    const preferredRange = enemy.preferredRange ?? 6.5;

    if (enemy.radius > 1) {
      if (distance > preferredRange - 1.3) {
        return 1.16;
      }

      if (distance < preferredRange - 2.6) {
        return 0.28;
      }

      return 0.62;
    }

    if (distance > preferredRange + 0.6) {
      return 1;
    }

    if (distance < preferredRange - 0.8) {
      return -0.55;
    }

    return 0;
  };

  const getProjectileHitDamage = (
    projectile: ActiveProjectile,
    position: Vec3,
    radius: number
  ) => {
    const projectilePosition = projectilePositions.get(projectile.id);

    if (!projectilePosition) {
      return null;
    }

    const hitDistance = Math.hypot(
      projectilePosition[0] - position[0],
      projectilePosition[1] - position[1],
      projectilePosition[2] - position[2]
    );

    if (hitDistance > radius + projectile.build.radius) {
      return null;
    }

    const travelDistance = Math.hypot(
      projectilePosition[0] - projectile.position[0],
      projectilePosition[1] - projectile.position[1],
      projectilePosition[2] - projectile.position[2]
    );

    return Math.max(
      1,
      Math.round(
        projectile.build.damage *
          getDamageAtDistance(projectile.build.damageProfile, travelDistance)
      )
    );
  };

  const getBeamHitDistance = (
    enemy: ActiveEnemy,
    origin: Vec3,
    direction: Vec3,
    laneOffset: number,
    build: WeaponBuild
  ) => {
    const beamStartX = origin[0] + direction[2] * laneOffset;
    const beamStartZ = origin[2] - direction[0] * laneOffset;
    const deltaX = enemy.position[0] - beamStartX;
    const deltaZ = enemy.position[2] - beamStartZ;
    const forwardDistance = deltaX * direction[0] + deltaZ * direction[2];

    if (forwardDistance < 0 || forwardDistance > build.beamLength) {
      return null;
    }

    const waveOffset =
      build.curve > 0.01
        ? Math.sin(forwardDistance * (0.9 + build.curve * 0.08)) *
          build.curve *
          0.36
        : 0;
    const lateralDistance = Math.abs(
      deltaX * direction[2] - deltaZ * direction[0] - waveOffset
    );

    return lateralDistance <= enemy.radius + build.beamWidth
      ? forwardDistance
      : null;
  };

  const createEnemyShots = (
    enemy: ActiveEnemy,
    position: Vec3,
    dx: number,
    dz: number,
    _distance: number
  ): ActiveEnemyShot[] => {
    const shotColor = enemy.shotColor;
    const shotDamage = enemy.shotDamage;
    const shotSpeed = enemy.shotSpeed;

    if (
      typeof shotColor !== "string" ||
      typeof shotDamage !== "number" ||
      typeof shotSpeed !== "number" ||
      typeof enemy.shotIntervalMs !== "number"
    ) {
      return [];
    }

    const baseYaw = Math.atan2(dx, dz);
    const muzzleDistance = enemy.radius + enemyShotRadius + 0.12;
    const spreads = enemy.radius > 1 ? [-0.24, 0, 0.24] : [0];

    return spreads.map((spread) => ({
      color: shotColor,
      damage: shotDamage,
      id: crypto.randomUUID(),
      position: [
        position[0] + Math.sin(baseYaw + spread) * muzzleDistance,
        position[1] + enemy.radius * 0.24,
        position[2] + Math.cos(baseYaw + spread) * muzzleDistance,
      ],
      radius: enemyShotRadius,
      ttlMs: enemyShotTtlMs,
      velocity: [
        Math.sin(baseYaw + spread) * shotSpeed,
        0,
        Math.cos(baseYaw + spread) * shotSpeed,
      ],
    }));
  };

  const stepEnemy = (
    enemy: ActiveEnemy,
    delta: number,
    now: number,
    spentProjectiles: Set<string>
  ) => {
    const dx = lastPlayerPosition[0] - enemy.position[0];
    const dz = lastPlayerPosition[2] - enemy.position[2];
    const distance = Math.hypot(dx, dz) || 1;
    const moveIntent = getEnemyMoveIntent(enemy, distance);
    const step = Math.min(distance, enemy.moveSpeed * delta) * moveIntent;
    const strafeStep =
      enemy.radius > 1
        ? Math.sin(now * 0.0042 + enemy.position[0] * 0.18) *
          enemy.moveSpeed *
          delta *
          0.82
        : 0;
    let knockbackVelocity = enemy.knockbackVelocity;
    let position: Vec3 = [
      enemy.position[0] +
        (dx / distance) * step +
        (-dz / distance) * strafeStep +
        knockbackVelocity[0] * delta,
      enemy.position[1],
      enemy.position[2] +
        (dz / distance) * step +
        (dx / distance) * strafeStep +
        knockbackVelocity[2] * delta,
    ];
    let hp = enemy.hp;
    let lastHitAt = enemy.lastHitAt;
    let lastShotAt = enemy.lastShotAt;
    let playerDamage = 0;
    let shots: ActiveEnemyShot[] = [];

    for (const projectile of projectiles) {
      if (spentProjectiles.has(projectile.id)) {
        continue;
      }

      const damage = getProjectileHitDamage(projectile, position, enemy.radius);

      if (!damage) {
        continue;
      }

      hp -= damage;
      lastHitAt = now;
      popDamage(
        damage,
        [position[0], position[1] + enemy.radius + 0.34, position[2]],
        "enemy"
      );
      const projectileSpeed =
        Math.hypot(projectile.velocity[0], projectile.velocity[2]) || 1;
      const kick =
        enemy.radius > 1
          ? 0
          : Math.min(
              8.8,
              (projectile.build.mass * 5.4 +
                projectile.build.knockback * 0.24) /
                Math.max(0.75, enemy.radius * 1.05)
            );

      knockbackVelocity = [
        Math.max(
          -10.5,
          Math.min(
            10.5,
            knockbackVelocity[0] +
              (projectile.velocity[0] / projectileSpeed) * kick
          )
        ),
        0,
        Math.max(
          -10.5,
          Math.min(
            10.5,
            knockbackVelocity[2] +
              (projectile.velocity[2] / projectileSpeed) * kick
          )
        ),
      ];
      spentProjectiles.add(projectile.id);
    }

    const knockbackDamping = Math.max(0, 1 - delta * 5.8);
    knockbackVelocity = [
      knockbackVelocity[0] * knockbackDamping,
      0,
      knockbackVelocity[2] * knockbackDamping,
    ];

    if (hp <= 0) {
      return { enemy: null, playerDamage, shots };
    }

    const wallImpact = resolveEnemyWallImpact(
      enemy,
      position,
      knockbackVelocity,
      hp,
      now
    );
    hp = wallImpact.hp;
    knockbackVelocity = wallImpact.knockbackVelocity;
    lastHitAt = wallImpact.lastHitAt ?? lastHitAt;
    position = wallImpact.position;

    if (hp <= 0) {
      return { enemy: null, playerDamage, shots };
    }

    if (
      Math.hypot(
        lastPlayerPosition[0] - position[0],
        lastPlayerPosition[2] - position[2]
      ) <=
        enemy.radius + playerRadius &&
      now - lastPlayerHitAt >= enemy.touchIntervalMs
    ) {
      lastPlayerHitAt = now;
      playerLastHitAt = now;
      triggerPlayerRecover(enemy.touchIntervalMs);
      playerDamage = enemy.touchDamage;
      popDamage(
        enemy.touchDamage,
        [
          lastPlayerPosition[0],
          lastPlayerPosition[1] + 1.1,
          lastPlayerPosition[2],
        ],
        "player"
      );
      pushPlayer(
        [
          lastPlayerPosition[0] - position[0],
          0,
          lastPlayerPosition[2] - position[2],
        ],
        0.42 + enemy.radius * 0.42 + enemy.moveSpeed * 0.08,
        0.14
      );
    }

    if (
      enemy.behavior === "shooter" &&
      enemy.shotIntervalMs &&
      now - lastShotAt >= enemy.shotIntervalMs &&
      distance <= (enemy.preferredRange ?? 6.5) + 3.2
    ) {
      shots = createEnemyShots(enemy, position, dx, dz, distance);

      if (shots.length > 0) {
        lastShotAt = now;
      }
    }

    return {
      enemy: {
        ...enemy,
        hp,
        knockbackVelocity,
        lastHitAt,
        lastShotAt,
        position,
      },
      playerDamage,
      shots,
    };
  };

  $effect(() => {
    dungeon.seed;
    floorIntroStartedAt =
      typeof performance === "undefined" ? 0 : performance.now();
    activeEnemies = [];
    activeBeams = [];
    clearedEnemyRoomIds = [];
    currentRoomId = dungeon.startRoomId;
    enemyWakeUntil = 0;
    exploredRooms = [dungeon.startRoomId];
    releasedRoomIds = [dungeon.startRoomId];
    enemyShots = [];
    playerHealth = playerMaxHealth;
    playerShotCount = 0;
    projectiles = [];
    projectilePositions.clear();
    currentEntryDirection = "south";
    damagePopups = [];
    playerImpactVelocity = null;
    playerImpactNonce = 0;
    playerLastHitAt = 0;
    playerRecoverDuration = 0;
    playerRecoverUntil = 0;
    bossIntroStartedAt = 0;
    bossIntroTitle = "";
    pickedArtifactAt = 0;
    pickedArtifactType = null;
    roomTransitionStartedAt = 0;
    roomTransitionSubtitle = "";
    roomTransitionTitle = "";
    unlockingRoomId = "";
    unlockStartedAt = 0;
    doorOpenAmount = 1;
    teleportTarget = null;
    teleportNonce = 0;
  });

  $effect(() => {
    currentRoom.id;
    activeEnemies = createRoomEnemies(
      currentRoom,
      currentRoomTemplate,
      currentEntryDirection,
      clearedEnemyRoomSet
    );
    activeBeams = [];
    enemyShots = [];
    lastHazardAt = performance.now();
    doorOpenAmount =
      currentRoomTemplate.spawnPattern === "none" ||
      releasedRoomSet.has(currentRoom.id)
        ? 1
        : 0;
  });

  $effect(() => {
    const light = sunLight;

    if (!light) {
      return;
    }

    light.shadow.bias = shadowBias;
    light.shadow.camera.far = shadowFar;
    light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    light.shadow.normalBias = shadowNormalBias;

    const shadowCamera = light.shadow.camera as OrthographicCamera;
    shadowCamera.bottom = -shadowFrustum;
    shadowCamera.left = -shadowFrustum;
    shadowCamera.near = 0.5;
    shadowCamera.right = shadowFrustum;
    shadowCamera.top = shadowFrustum;
    shadowCamera.updateProjectionMatrix();

    light.shadow.needsUpdate = true;
  });

  const spawnProjectile = ({
    position,
    velocity,
  }: {
    position: Vec3;
    velocity: Vec3;
  }) => {
    const build = copyWeaponBuild(weaponBuild);
    const baseYaw = Math.atan2(velocity[0], velocity[2]);
    const horizontalSpeed = Math.hypot(velocity[0], velocity[2]) || build.speed;
    const rightX = Math.cos(baseYaw);
    const rightZ = -Math.sin(baseYaw);
    const nextProjectiles: ActiveProjectile[] = [];
    const nextBeams: ActiveBeam[] = [];
    const attackCount = playerShotCount + 1;
    const now = performance.now();

    playerShotCount = attackCount;

    if (build.attackMode === "beam") {
      const direction: Vec3 = [Math.sin(baseYaw), 0, Math.cos(baseYaw)];

      for (let index = 0; index < build.pelletCount; index += 1) {
        const laneOffset =
          build.pelletCount === 1
            ? 0
            : (index / (build.pelletCount - 1) - 0.5) * build.beamWidth * 3.4;
        const beamPosition: Vec3 = [
          position[0] + rightX * laneOffset,
          position[1],
          position[2] + rightZ * laneOffset,
        ];

        nextBeams.push({
          color: build.colors.shell,
          core: build.colors.core,
          curve: build.curve,
          createdAt: now,
          id: crypto.randomUUID(),
          length: build.beamLength,
          position: beamPosition,
          rotationY: baseYaw,
          width: build.beamWidth * 1.45,
        });

        activeEnemies = activeEnemies
          .map((enemy) => {
            const hitDistance = getBeamHitDistance(
              enemy,
              position,
              direction,
              laneOffset,
              build
            );

            if (hitDistance === null) {
              return enemy;
            }

            const damage = Math.max(
              1,
              Math.round(
                build.damage *
                  getDamageAtDistance(build.damageProfile, hitDistance)
              )
            );
            const kick =
              enemy.radius > 1
                ? 0
                : Math.min(8.8, build.mass * 5.4 + build.knockback * 0.24);
            const speed = Math.hypot(direction[0], direction[2]) || 1;

            popDamage(
              damage,
              [
                enemy.position[0],
                enemy.position[1] + enemy.radius + 0.34,
                enemy.position[2],
              ],
              "enemy"
            );

            return {
              ...enemy,
              hp: enemy.hp - damage,
              knockbackVelocity: [
                Math.max(
                  -10.5,
                  Math.min(
                    10.5,
                    enemy.knockbackVelocity[0] + (direction[0] / speed) * kick
                  )
                ),
                0,
                Math.max(
                  -10.5,
                  Math.min(
                    10.5,
                    enemy.knockbackVelocity[2] + (direction[2] / speed) * kick
                  )
                ),
              ] as Vec3,
              lastHitAt: now,
            };
          })
          .filter((enemy) => enemy.hp > 0);
      }

      activeBeams = [...activeBeams, ...nextBeams];
    } else {
      for (let index = 0; index < build.pelletCount; index += 1) {
        const spreadOffset =
          build.pelletCount === 1
            ? 0
            : (index / (build.pelletCount - 1) - 0.5) * build.spread;
        const shotYaw = baseYaw + spreadOffset;
        const laneOffset =
          build.pelletCount === 1
            ? 0
            : (index / (build.pelletCount - 1) - 0.5) * build.radius * 2.6;

        nextProjectiles.push({
          build,
          id: crypto.randomUUID(),
          position: [
            position[0] + rightX * laneOffset,
            position[1],
            position[2] + rightZ * laneOffset,
          ],
          velocity: [
            Math.sin(shotYaw) * horizontalSpeed,
            velocity[1],
            Math.cos(shotYaw) * horizontalSpeed,
          ],
        });
      }
    }

    if (
      build.rocketCadence > 0 &&
      attackCount % build.rocketCadence === 0 &&
      activeEnemies.length > 0 &&
      !projectiles.some((projectile) => projectile.build.homingTurn > 0)
    ) {
      const rocketBuild = copyWeaponBuild(build);

      rocketBuild.colors = {
        core: "#ffe0a8",
        glow: "#ff5a54",
        gradient: build.colors.gradient,
        shell: "#ff935a",
      };
      rocketBuild.attackMode = "projectile";
      rocketBuild.curve = 0;
      rocketBuild.damage = Math.round(build.damage * 1.45);
      rocketBuild.drag = Math.max(0.02, build.drag * 0.55);
      rocketBuild.gravity = 0;
      rocketBuild.homingTurn = build.rocketTurn;
      rocketBuild.knockback *= 1.35;
      rocketBuild.mass *= 1.8;
      rocketBuild.pelletCount = 1;
      rocketBuild.radius *= 1.35;
      rocketBuild.rocketCadence = 0;
      rocketBuild.speed *= 0.58;
      rocketBuild.spread = 0;
      rocketBuild.ttlMs = Math.max(build.ttlMs, 2400);

      nextProjectiles.push({
        build: rocketBuild,
        id: crypto.randomUUID(),
        position: [position[0], position[1] + 0.08, position[2]],
        velocity: [
          Math.sin(baseYaw) * rocketBuild.speed,
          0,
          Math.cos(baseYaw) * rocketBuild.speed,
        ],
      });
    }

    if (nextProjectiles.length > 0) {
      projectiles = [...projectiles, ...nextProjectiles];
    }
  };

  const removeProjectile = (id: string) => {
    projectilePositions.delete(id);
    projectiles = projectiles.filter((projectile) => projectile.id !== id);
  };

  const handleProjectileMove = (id: string, position: Vec3) => {
    projectilePositions.set(id, position);
  };

  const handleMouseMove = (x: number, y: number) => {
    crosshairX = x;
    crosshairY = y;
  };

  const handleMeleeFrame = (frame: MeleeFrame) => {
    if (frame.ended) {
      meleeHitEnemies.delete(frame.swingId);
      currentMeleeFrame = null;
      return;
    }

    currentMeleeFrame = frame;

    if (!meleeHitEnemies.has(frame.swingId)) {
      meleeHitEnemies.set(frame.swingId, new Set());
    }
  };

  const applyMeleeDeflects = (frame: MeleeFrame) => {
    if (!(frame.active && enemyShots.length > 0)) {
      return;
    }

    const baseConfig = meleeParams ?? DEFAULT_SWING;
    const swingConfig: SwingParams = {
      ...baseConfig,
      reach: baseConfig.reach + meleeHitboxPadding,
    };
    const now = performance.now();
    const survivors: ActiveEnemyShot[] = [];
    const newBursts: DeflectBurst[] = [];

    for (const shot of enemyShots) {
      if (
        isPointInSwing(
          shot.position,
          frame.t,
          frame.center,
          frame.facingYaw,
          swingConfig
        )
      ) {
        newBursts.push({
          color: shot.color,
          createdAt: now,
          id: crypto.randomUUID(),
          position: shot.position,
          radius: shot.radius,
        });
      } else {
        survivors.push(shot);
      }
    }

    if (newBursts.length > 0) {
      enemyShots = survivors;
      deflectBursts.push(...newBursts);
    }
  };

  const applyMeleeHitsToEnemies = (frame: MeleeFrame) => {
    if (!frame.active) {
      return;
    }

    const hitSet = meleeHitEnemies.get(frame.swingId);

    if (!hitSet) {
      return;
    }

    const baseConfig = meleeParams ?? DEFAULT_SWING;
    const swingConfig: SwingParams = {
      ...baseConfig,
      damage: Math.max(1, Math.round(weaponBuild.damage * 0.5)),
      reach: baseConfig.reach + meleeHitboxPadding,
    };
    const now = performance.now();

    activeEnemies = activeEnemies
      .map((enemy) => {
        if (hitSet.has(enemy.id) || enemy.radius > 1) {
          return enemy;
        }

        if (
          !isPointInSwing(
            enemy.position,
            frame.t,
            frame.center,
            frame.facingYaw,
            swingConfig
          )
        ) {
          return enemy;
        }

        hitSet.add(enemy.id);

        const damage = swingConfig.damage;
        const [kx, kz] = swingKnockbackDirection(
          enemy.position,
          frame.center,
          swingConfig
        );
        const kick = Math.min(10, swingConfig.impulse * 1.6);

        popDamage(
          damage,
          [
            enemy.position[0],
            enemy.position[1] + enemy.radius + 0.34,
            enemy.position[2],
          ],
          "enemy"
        );

        return {
          ...enemy,
          hp: enemy.hp - damage,
          knockbackVelocity: [
            Math.max(-10.5, Math.min(10.5, kx * kick)),
            0,
            Math.max(-10.5, Math.min(10.5, kz * kick)),
          ] as Vec3,
          lastHitAt: now,
        };
      })
      .filter((enemy) => enemy.hp > 0);
  };

  const handlePlayerPositionChange = (position: Vec3) => {
    lastPlayerPosition = position;
    const now = performance.now();
    const transition = currentRoomUnlocked
      ? getTransition(currentRoom, position)
      : null;

    if (!transition || now - lastRoomTransitionAt < 240) {
      if (currentArtifactType && Math.hypot(position[0], position[2]) < 1.5) {
        pickedArtifactAt = now;
        pickedArtifactType = currentArtifactType;
        onCollectArtifact?.(currentRoom.id, currentArtifactType);
      }

      return;
    }

    const nextRoom = dungeon.rooms[transition.roomId];

    lastRoomTransitionAt = now;
    currentEntryDirection =
      nextRoom.kind === "boss"
        ? "south"
        : getEntryDirectionFromTarget(transition.target);
    currentRoomId = transition.roomId;
    teleportTarget =
      nextRoom.kind === "boss"
        ? ([0, transition.target[1], roomTeleportZ] as Vec3)
        : transition.target;
    teleportNonce += 1;
    activeEnemies = [];
    activeBeams = [];
    enemyWakeUntil = now + 650;
    enemyShots = [];
    damagePopups = [];
    lastHazardAt = now;
    playerImpactVelocity = null;
    projectiles = [];
    projectilePositions.clear();
    if (nextRoom.kind === "boss") {
      bossIntroStartedAt = now;
      bossIntroTitle =
        enemyTemplateById[
          roomTemplateById[nextRoom.templateId].enemyTemplateId ?? ""
        ]?.label ?? "Boss";
    }

    if (!exploredRooms.includes(transition.roomId)) {
      exploredRooms = [...exploredRooms, transition.roomId];
    }
  };

  const stepEnemies = (delta: number) => {
    const now = performance.now();
    const enemiesSleeping = now < enemyWakeUntil;
    const spentProjectiles = new Set<string>();
    const spawnedEnemyShots: ActiveEnemyShot[] = [];
    let clearedRoom = false;
    let nextHealth = playerHealth;
    const activeHazard = getActiveHazard(lastPlayerPosition);

    if (!isCurrentRoomCombat || releasedRoomSet.has(currentRoom.id)) {
      doorOpenAmount = 1;
    } else if (unlockingRoomId === currentRoom.id) {
      doorOpenAmount = Math.max(
        0,
        Math.min(
          1,
          (now - unlockStartedAt - doorOpenDelayMs) / doorOpenDurationMs
        )
      );

      if (doorOpenAmount >= 1) {
        releasedRoomIds = [...releasedRoomIds, currentRoom.id];
        unlockingRoomId = "";
      }
    } else {
      doorOpenAmount = 0;
    }

    if (activeHazard && now - lastHazardAt >= hazardTickMs) {
      lastHazardAt = now;
      playerLastHitAt = now;
      triggerPlayerRecover(hazardTickMs);
      nextHealth = Math.max(0, nextHealth - activeHazard.damage);
      popDamage(
        activeHazard.damage,
        [
          lastPlayerPosition[0],
          lastPlayerPosition[1] + 1.05,
          lastPlayerPosition[2],
        ],
        "player"
      );
      pushPlayer(
        [
          lastPlayerPosition[0] - activeHazard.position[0],
          0,
          lastPlayerPosition[2] - activeHazard.position[2],
        ],
        0.86,
        0.28
      );
    }

    enemyShots = enemyShots.filter((shot) => {
      const ttlMs = shot.ttlMs - delta * 1000;
      const position: Vec3 = [
        shot.position[0] + shot.velocity[0] * delta,
        shot.position[1] + shot.velocity[1] * delta,
        shot.position[2] + shot.velocity[2] * delta,
      ];

      if (
        ttlMs <= 0 ||
        Math.abs(position[0]) > floorHalfWidth + 1 ||
        Math.abs(position[2]) > floorHalfDepth + 1
      ) {
        return false;
      }

      if (
        Math.hypot(
          lastPlayerPosition[0] - position[0],
          lastPlayerPosition[1] - position[1],
          lastPlayerPosition[2] - position[2]
        ) <=
        shot.radius + playerRadius
      ) {
        playerLastHitAt = now;
        triggerPlayerRecover(260);
        nextHealth = Math.max(0, nextHealth - shot.damage);
        popDamage(
          shot.damage,
          [
            lastPlayerPosition[0],
            lastPlayerPosition[1] + 1.05,
            lastPlayerPosition[2],
          ],
          "player"
        );
        pushPlayer(
          shot.velocity,
          0.54 + Math.hypot(shot.velocity[0], shot.velocity[2]) * 0.06,
          0.2
        );
        return false;
      }

      shot.position = position;
      shot.ttlMs = ttlMs;

      return true;
    });

    activeEnemies = activeEnemies
      .map((enemy) => {
        const result = enemiesSleeping
          ? { enemy, playerDamage: 0, shots: [] }
          : stepEnemy(enemy, delta, now, spentProjectiles);

        nextHealth = Math.max(0, nextHealth - result.playerDamage);

        if (result.shots.length > 0) {
          spawnedEnemyShots.push(...result.shots);
        }

        return result.enemy;
      })
      .filter((enemy): enemy is ActiveEnemy => Boolean(enemy));

    if (spawnedEnemyShots.length > 0) {
      enemyShots.push(...spawnedEnemyShots);
    }

    if (spentProjectiles.size > 0) {
      for (const id of spentProjectiles) {
        projectilePositions.delete(id);
      }

      projectiles = projectiles.filter(
        (projectile) => !spentProjectiles.has(projectile.id)
      );
    }

    if (
      activeEnemies.length === 0 &&
      isCurrentRoomCombat &&
      !clearedEnemyRoomSet.has(currentRoom.id) &&
      !releasedRoomSet.has(currentRoom.id) &&
      unlockingRoomId !== currentRoom.id
    ) {
      clearedRoom = true;
    }

    if (clearedRoom) {
      clearedEnemyRoomIds = [...clearedEnemyRoomIds, currentRoom.id];
      unlockingRoomId = currentRoom.id;
      unlockStartedAt = now;
      doorOpenAmount = 0;
    }

    if (nextHealth <= 0) {
      activeEnemies = [];
      activeBeams = [];
      enemyWakeUntil = 0;
      enemyShots = [];
      currentRoomId = dungeon.startRoomId;
      playerHealth = playerMaxHealth;
      playerShotCount = 0;
      damagePopups = [];
      lastHazardAt = now;
      playerImpactVelocity = null;
      playerRecoverDuration = 0;
      playerRecoverUntil = 0;
      projectiles = [];
      projectilePositions.clear();
      unlockingRoomId = "";
      doorOpenAmount = 1;
      bossIntroStartedAt = 0;
      bossIntroTitle = "";
      roomTransitionStartedAt = 0;
      roomTransitionSubtitle = "";
      roomTransitionTitle = "";
      teleportTarget = [0, 1.1, 0];
      teleportNonce += 1;
      return;
    }

    playerHealth = nextHealth;
  };

  onMount(() => {
    bossDoorTexture = new TextureLoader().load(bossDoorTextureUrl);
    bossDoorTexture.wrapS = RepeatWrapping;
    bossDoorTexture.wrapT = RepeatWrapping;
    bossDoorTexture.repeat.set(1, 1);
    bossFloorTexture = new TextureLoader().load(bossFloorTextureUrl);
    bossFloorTexture.wrapS = RepeatWrapping;
    bossFloorTexture.wrapT = RepeatWrapping;
    bossFloorTexture.repeat.set(1, 1);
    lavaSurfaceTexture = new TextureLoader().load(lavaSurfaceTextureUrl);
    lavaSurfaceTexture.wrapS = RepeatWrapping;
    lavaSurfaceTexture.wrapT = RepeatWrapping;
    lavaSurfaceTexture.repeat.set(2.4, 2.4);
    treasureFloorTexture = new TextureLoader().load(treasureFloorTextureUrl);
    treasureFloorTexture.wrapS = RepeatWrapping;
    treasureFloorTexture.wrapT = RepeatWrapping;
    treasureFloorTexture.repeat.set(1, 1);

    let frameId = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      if (controlsLocked) {
        previousTime = time;
        animationNow = time;
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      const delta = Math.min(0.05, (time - previousTime) / 1000);

      previousTime = time;
      animationNow = time;
      activeBeams = activeBeams.filter(
        (beam) => time - beam.createdAt < beamDurationMs
      );
      damagePopups = damagePopups.filter(
        (popup) => time - popup.createdAt < damagePopupDurationMs
      );
      deflectBursts = deflectBursts.filter(
        (burst) => time - burst.createdAt < deflectBurstDurationMs
      );
      if (lavaSurfaceTexture) {
        lavaSurfaceTexture.offset.x += delta * 0.18;
        lavaSurfaceTexture.offset.y -= delta * 0.08;
      }
      if (!bossIntroActive && currentMeleeFrame) {
        applyMeleeHitsToEnemies(currentMeleeFrame);
        applyMeleeDeflects(currentMeleeFrame);
      }
      if (!bossIntroActive) {
        stepEnemies(delta);
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  });
</script>

<div class="scene">
  <Canvas shadows={PCFShadowMap} dpr={2}>
    <SceneRendererConfig />
    <T.Fog attach="fog" args={['#040816', 13, 24]} />

    <T.PerspectiveCamera
      bind:ref={sceneCamera}
      makeDefault
      position={[0, 9, 6.4]}
      fov={cameraFov}
    >
      <OrbitControls
        bind:ref={orbitControls}
        enabled={cameraMode === "orbit"}
        enableDamping
        enablePan
        maxDistance={26}
        minDistance={4}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={['#9fd6ff', '#081221', 1.15]} />
    <T.AmbientLight intensity={ambientLightIntensity} />
    <T.DirectionalLight
      bind:ref={sunLight}
      castShadow
      intensity={sunIntensity}
      position={[sunPositionX, sunPositionY, sunPositionZ]}
    />

    <World gravity={[0, gravityY, 0]}>
      {#if showPhysicsDebug}
        <Debug />
      {/if}

      <T.Group position={[0, -0.35, 0]}>
        <RigidBody type="fixed">
          <Collider
            shape="cuboid"
            args={[floorHalfWidth, 0.35, floorHalfDepth]}
            friction={0.92}
            restitution={0.08}
          />

          {#each floorTiles as tile}
            <T.Mesh
              position={tile.position}
              receiveShadow
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <T.PlaneGeometry args={[0.96, 0.96]} />
              <T.MeshStandardMaterial
                color={tile.even ? currentFloorPalette.even : currentFloorPalette.odd}
                metalness={0.02}
                roughness={0.94}
              />
            </T.Mesh>
          {/each}
        </RigidBody>
      </T.Group>

      {#if currentRoomTemplate.layout === "gear-floor" && treasureFloorTexture}
        <T.Mesh
          position={[0, 0.031, 0]}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <T.PlaneGeometry args={[floorHalfWidth * 2, floorHalfDepth * 2]} />
          <T.MeshStandardMaterial
            map={treasureFloorTexture}
            transparent
            alphaTest={0.08}
            metalness={0.22}
            opacity={0.92}
            roughness={0.72}
          />
        </T.Mesh>
      {/if}

      {#if (currentRoomTemplate.layout === "boss-foundry" ||
        currentRoomTemplate.layout === "boss-crucible") &&
        bossFloorTexture}
        <T.Mesh
          position={[0, 0.032, 0]}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <T.PlaneGeometry args={[floorHalfWidth * 2, floorHalfDepth * 2]} />
          <T.MeshStandardMaterial
            map={bossFloorTexture}
            color="#ffd0b2"
            emissive="#ff8f70"
            emissiveIntensity={0.18}
            transparent
            alphaTest={0.08}
            metalness={0.26}
            opacity={0.94}
            roughness={0.66}
          />
        </T.Mesh>
      {/if}

      {#if currentRoom.kind === "polygon" && dungeon.floor === 1}
        <T.Group position={[2.9, 0.65, -1.6]} rotation={[0, 0, -0.32]}>
          <RigidBody type="fixed">
            <Collider
              shape="cuboid"
              args={[2.2, 0.18, 1.2]}
              friction={0.48}
              restitution={0.04}
            />

            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry args={[4.4, 0.36, 2.4]} />
              <T.MeshStandardMaterial
                color={currentFloorPalette.trim}
                roughness={0.78}
                metalness={0.08}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/if}

      {#each roomWalls as wall (wall.id)}
        <T.Group position={wall.position}>
          <RigidBody type="fixed">
            <Collider
              shape="cuboid"
              args={wall.args}
              friction={0.92}
              restitution={0.22}
            />

            <T.Mesh
              castShadow={!wall.opacity || wall.opacity >= 1}
              receiveShadow
            >
              <T.BoxGeometry
                args={[
                  wall.args[0] * 2,
                  wall.args[1] * 2,
                  wall.args[2] * 2,
                ]}
              />
              <T.MeshStandardMaterial
                color={wall.color}
                metalness={0.08}
                opacity={wall.opacity ?? 1}
                roughness={0.9}
                transparent={Boolean(wall.opacity && wall.opacity < 1)}
                depthWrite={!wall.opacity || wall.opacity >= 1}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/each}

      {#each roomDoors as door (door.id)}
        <T.Group position={door.position}>
          <T.Mesh receiveShadow>
            <T.BoxGeometry args={door.args} />
            <T.MeshStandardMaterial
              color={door.color}
              emissive={door.color}
              emissiveIntensity={0.2}
              map={door.boss ? bossDoorTexture : null}
              metalness={0.28}
              roughness={door.boss ? 0.18 : 0.36}
            />
          </T.Mesh>
        </T.Group>
      {/each}

      {#if doorOpenAmount < 0.999}
        {#each roomDoorSeals as seal (seal.id)}
          <T.Group position={seal.position}>
            <RigidBody type="fixed">
              <Collider
                shape="cuboid"
                args={seal.args}
                friction={0.92}
                restitution={0.02}
              />
            </RigidBody>
          </T.Group>

          <T.Group
            position={[
              seal.position[0],
              seal.position[1] + doorOpenAmount * 3.4,
              seal.position[2],
            ]}
          >
            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry
                args={[
                  seal.args[0] * 2,
                  Math.max(0.18, seal.args[1] * (1 - doorOpenAmount)) * 2,
                  seal.args[2] * 2,
                ]}
              />
              <T.MeshStandardMaterial
                color={seal.color}
                emissive={seal.color}
                emissiveIntensity={0.26}
                metalness={0.34}
                opacity={0.9 - doorOpenAmount * 0.35}
                roughness={0.28}
                transparent
              />
            </T.Mesh>
          </T.Group>
        {/each}
      {/if}

      {#each roomHazards as hazard (hazard.id)}
        <T.Group position={hazard.position}>
          <T.Mesh receiveShadow>
            <T.BoxGeometry
              args={[hazard.args[0] * 2, hazard.args[1] * 2, hazard.args[2] * 2]}
            />
            <T.MeshStandardMaterial
              color="#351008"
              metalness={0.12}
              roughness={0.24}
            />
          </T.Mesh>

          {#if lavaSurfaceTexture}
            <T.Mesh
              position={[0, hazard.args[1] + 0.004, 0]}
              receiveShadow
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <T.PlaneGeometry
                args={[hazard.args[0] * 2, hazard.args[2] * 2]}
              />
              <T.MeshStandardMaterial
                color={hazard.color}
                emissive={hazard.color}
                emissiveIntensity={0.7}
                map={lavaSurfaceTexture}
                metalness={0.08}
                roughness={0.18}
              />
            </T.Mesh>
          {/if}
        </T.Group>
      {/each}

      {#each roomHazards as hazard (hazard.id)}
        <T.Group position={hazard.position}>
          <T.Mesh
            position={[0, hazard.args[1] + 0.01, 0]}
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <T.RingGeometry
              args={[
                Math.max(0.2, Math.min(hazard.args[0], hazard.args[2]) * 0.18),
                Math.min(hazard.args[0], hazard.args[2]) * 0.42,
                24,
              ]}
            />
            <T.MeshBasicMaterial color="#ffd7a6" opacity={0.34} transparent />
          </T.Mesh>
        </T.Group>
      {/each}

      {#each roomPlatforms as platform (platform.id)}
        <T.Group position={platform.position}>
          <RigidBody type="fixed">
            <Collider
              shape="cuboid"
              args={platform.args}
              friction={0.94}
              restitution={0.04}
            />
            <T.Mesh castShadow receiveShadow>
              {#if platform.shape === "hex"}
                <T.CylinderGeometry
                  args={[platform.args[0], platform.args[0], platform.args[1] * 2, 6]}
                />
              {:else}
                <T.BoxGeometry
                  args={[
                    platform.args[0] * 2,
                    platform.args[1] * 2,
                    platform.args[2] * 2,
                  ]}
                />
              {/if}
              <T.MeshStandardMaterial
                color={platform.color}
                metalness={0.24}
                roughness={0.72}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/each}

      {#if currentRoom.kind === "polygon" && dungeon.floor === 1}
        <T.Group position={[-2.2, 0.45, -2.4]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[0.6, 0.45, 0.6]} friction={0.95} />

            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry args={[1.2, 0.9, 1.2]} />
              <T.MeshStandardMaterial
                color="#ff7a59"
                metalness={0.08}
                roughness={0.42}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>

        <T.Group position={[0.2, 0.65, 2.1]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[0.9, 0.65, 0.9]} friction={0.95} />

            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry args={[1.8, 1.3, 1.8]} />
              <T.MeshStandardMaterial
                color="#4cc9f0"
                metalness={0.08}
                roughness={0.38}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>

        <ShootingTarget position={[-4, 0, -3.5]} color="#e63946" />
        <ShootingTarget position={[-3, 0, -3.5]} color="#e63946" />
        <ShootingTarget position={[-2, 0, -3.5]} color="#e63946" />

        <ShootingTarget
          position={[4.5, 0, -4]}
          color="#f4a261"
          height={2}
          width={0.3}
        />
        <ShootingTarget
          position={[5.5, 0, -4]}
          color="#f4a261"
          height={2}
          width={0.3}
        />

        <ShootingTarget
          position={[-5, 0, 3]}
          color="#2a9d8f"
          height={1.2}
          width={0.4}
        />
        <ShootingTarget
          position={[6, 0, 2]}
          color="#2a9d8f"
          height={1.2}
          width={0.4}
        />
      {/if}

      {#if currentRoom.kind === "treasure"}
        {#each treasureGearMounts as mount, index}
          <T.Group position={mount.position}>
            <T.Mesh receiveShadow>
              <T.BoxGeometry args={mount.panel} />
              <T.MeshStandardMaterial
                color="#10202f"
                metalness={0.52}
                roughness={0.68}
              />
            </T.Mesh>

            <T.Mesh castShadow position={[0, 0, 0.2]}>
              <T.TorusGeometry args={[mount.size, 0.16, 12, 30]} />
              <T.MeshStandardMaterial
                color={index < 2 ? "#ffd166" : "#8ac6ff"}
                emissive={index < 2 ? "#ffd166" : "#8ac6ff"}
                emissiveIntensity={0.08}
                metalness={0.74}
                roughness={0.34}
              />
            </T.Mesh>

            <T.Mesh castShadow position={[0, 0, 0.22]}>
              <T.CylinderGeometry args={[0.34, 0.34, 0.24, 20]} />
              <T.MeshStandardMaterial
                color="#dfeeff"
                metalness={0.4}
                roughness={0.28}
              />
            </T.Mesh>

            {#each gearTeeth as tooth, toothIndex}
              <T.Mesh
                castShadow
                position={[
                  tooth.x * mount.size,
                  tooth.y * mount.size,
                  0.2,
                ]}
                rotation={[0, 0, tooth.rotation + (index + toothIndex) * 0.03]}
              >
                <T.BoxGeometry args={[0.26, 0.44, 0.2]} />
                <T.MeshStandardMaterial
                  color={index < 2 ? "#ffd166" : "#8ac6ff"}
                  metalness={0.7}
                  roughness={0.38}
                />
              </T.Mesh>
            {/each}
          </T.Group>
        {/each}
      {/if}

      {#if currentRoomTemplate.layout === "boss-foundry" ||
        currentRoomTemplate.layout === "boss-crucible"}
        {#each bossGearMounts as gear, index}
          <T.Group position={gear.position}>
            <T.Mesh receiveShadow>
              <T.BoxGeometry args={[gear.size * 2.4, gear.size * 2.4, 0.22]} />
              <T.MeshStandardMaterial
                color="#152737"
                metalness={0.48}
                roughness={0.72}
              />
            </T.Mesh>

            <T.Mesh castShadow position={[0, 0, 0.18]}>
              <T.TorusGeometry args={[gear.size, 0.18, 14, 34]} />
              <T.MeshStandardMaterial
                color={gear.color}
                emissive={gear.color}
                emissiveIntensity={0.14}
                metalness={0.76}
                roughness={0.28}
              />
            </T.Mesh>

            {#each gearTeeth as tooth, toothIndex}
              <T.Mesh
                castShadow
                position={[
                  tooth.x * gear.size,
                  tooth.y * gear.size,
                  0.18,
                ]}
                rotation={[0, 0, tooth.rotation + (index + toothIndex) * 0.05]}
              >
                <T.BoxGeometry args={[0.28, 0.5, 0.16]} />
                <T.MeshStandardMaterial
                  color={gear.color}
                  metalness={0.74}
                  roughness={0.3}
                />
              </T.Mesh>
            {/each}
          </T.Group>
        {/each}

        <T.Mesh
          position={[0, 0.04, -5.4]}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <T.RingGeometry args={[2.2, 3.25, 44]} />
          <T.MeshBasicMaterial color="#ffd166" opacity={0.8} transparent />
        </T.Mesh>
      {/if}

      {#if currentArtifactTemplate}
        <T.Group
          position={[0, 0.9 + Math.sin(animationNow * 0.006) * 0.08, 0]}
          rotation={[0, animationNow * 0.0014, 0]}
        >
          <T.Mesh castShadow receiveShadow>
            <T.CylinderGeometry args={[0.55, 0.72, 0.32, 20]} />
            <T.MeshStandardMaterial
              color="#193040"
              metalness={0.42}
              roughness={0.52}
            />
          </T.Mesh>

          <T.Mesh castShadow position={[0, 0.58, 0]}>
            <T.SphereGeometry args={[0.42, 24, 24]} />
            <T.MeshStandardMaterial
              color={currentArtifactTemplate.accent}
              emissive={currentArtifactTemplate.accent}
              emissiveIntensity={0.28}
              metalness={0.14}
              roughness={0.24}
            />
          </T.Mesh>

          <T.Mesh
            position={[0, -0.72, 0]}
            receiveShadow
            rotation={[-Math.PI / 2, animationNow * 0.0018, 0]}
          >
            <T.RingGeometry args={[0.78, 1.02, 36]} />
            <T.MeshBasicMaterial
              color={currentArtifactTemplate.accent}
              opacity={0.84}
              transparent
            />
          </T.Mesh>
        </T.Group>
      {/if}

      {#each activeEnemies as enemy (enemy.id)}
        <T.Group dispose={false} position={enemy.position}>
          {#if enemy.radius > 1}
            <T.Mesh
              position={[0, -enemy.radius + 0.1, 0]}
              receiveShadow
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <T.RingGeometry
                args={[enemy.radius * 1.15, enemy.radius * 1.45, 36]}
              />
              <T.MeshBasicMaterial
                color={enemy.color}
                opacity={0.4}
                transparent
              />
            </T.Mesh>
          {/if}

          <T.Mesh castShadow receiveShadow>
            <T.SphereGeometry args={[enemy.radius, 24, 24]} />
            <T.MeshStandardMaterial
              color={animationNow - enemy.lastHitAt < 130 ? "#fff4da" : enemy.color}
              emissive={enemy.color}
              emissiveIntensity={animationNow - enemy.lastHitAt < 130 ? 0.52 : 0.18}
              metalness={0.16}
              roughness={0.36}
            />
          </T.Mesh>

          <T.Mesh castShadow position={[0, enemy.radius * 0.92, 0]}>
            <T.SphereGeometry args={[enemy.radius * 0.38, 16, 16]} />
            <T.MeshStandardMaterial
              color="#f5fbff"
              metalness={0.04}
              roughness={0.22}
            />
          </T.Mesh>

          {#if enemy.behavior === "shooter"}
            <T.Mesh
              castShadow
              position={[0, enemy.radius * 0.34, enemy.radius * 0.8]}
            >
              <T.BoxGeometry
                args={[enemy.radius * 0.52, enemy.radius * 0.28, enemy.radius * 0.92]}
              />
              <T.MeshStandardMaterial
                color={enemy.shotColor ?? enemy.color}
                emissive={enemy.shotColor ?? enemy.color}
                emissiveIntensity={0.12}
                metalness={0.28}
                roughness={0.26}
              />
            </T.Mesh>
          {/if}

          <T.Group position={[0, enemy.radius + 0.38, 0]}>
            <T.Mesh position={[0, 0, -0.02]}>
              <T.BoxGeometry args={[1.1, 0.11, 0.06]} />
              <T.MeshBasicMaterial color="#09131f" opacity={0.88} transparent />
            </T.Mesh>

            <T.Mesh
              position={[
                -0.55 * (1 - enemy.hp / enemy.maxHp) * 0.5,
                0,
                0,
              ]}
              scale={[enemy.hp / enemy.maxHp, 1, 1]}
            >
              <T.BoxGeometry args={[1.1, 0.11, 0.06]} />
              <T.MeshBasicMaterial color="#57d6a5" />
            </T.Mesh>
          </T.Group>
        </T.Group>
      {/each}

      {#each enemyShots as shot (shot.id)}
        <T.Group position={shot.position}>
          <T.Mesh castShadow>
            <T.SphereGeometry args={[shot.radius, 16, 16]} />
            <T.MeshStandardMaterial
              color={shot.color}
              emissive={shot.color}
              emissiveIntensity={0.7}
              metalness={0.08}
              roughness={0.16}
            />
          </T.Mesh>
        </T.Group>
      {/each}

      {#each deflectBurstsRendered as burst (burst.id)}
        <T.Group position={burst.position}>
          {#each burst.shards as shard, shardIndex (shardIndex)}
            <T.Mesh
              position={shard.position}
              rotation={shard.rotation}
              scale={[shard.scale, shard.scale, shard.scale]}
            >
              <T.BoxGeometry
                args={[
                  burst.radius * 0.55,
                  burst.radius * 0.55,
                  burst.radius * 0.55,
                ]}
              />
              <T.MeshBasicMaterial
                color={burst.color}
                depthWrite={false}
                opacity={burst.fade}
                transparent
              />
            </T.Mesh>
          {/each}
        </T.Group>
      {/each}

      {#each activeBeams as beam (beam.id)}
        <T.Group position={beam.position} rotation={[0, beam.rotationY, 0]}>
          {#if beam.curve > 0.25}
            {#each Array.from({ length: 6 }, (__unused, index) => index) as index}
              <T.Mesh
                position={[
                  Math.sin(
                    ((index + 0.5) / 6) * Math.PI * (1.7 + beam.curve * 0.08)
                  ) *
                    beam.curve *
                    0.32,
                  0,
                  ((index + 0.5) / 6) * beam.length,
                ]}
              >
                <T.BoxGeometry args={[beam.width, 0.08, beam.length / 6]} />
                <T.MeshStandardMaterial
                  color={beam.color}
                  emissive={beam.color}
                  emissiveIntensity={0.84}
                  metalness={0.08}
                  opacity={0.82}
                  roughness={0.14}
                  transparent
                />
              </T.Mesh>
            {/each}
          {:else}
            <T.Mesh position={[0, 0, beam.length * 0.5]}>
              <T.BoxGeometry args={[beam.width, 0.08, beam.length]} />
              <T.MeshStandardMaterial
                color={beam.color}
                emissive={beam.color}
                emissiveIntensity={0.84}
                metalness={0.08}
                opacity={0.82}
                roughness={0.14}
                transparent
              />
            </T.Mesh>
          {/if}

          <T.Mesh position={[0, 0, beam.length]}>
            <T.SphereGeometry args={[beam.width * 0.28, 12, 12]} />
            <T.MeshStandardMaterial
              color={beam.core}
              emissive={beam.core}
              emissiveIntensity={1}
              metalness={0.04}
              roughness={0.12}
            />
          </T.Mesh>
        </T.Group>
      {/each}

      <PlayerController
        {cameraMode}
        {cameraSmoothing}
        controlsLocked={sceneControlsLocked}
        {followDistance}
        {followPitch}
        {followYaw}
        hitFlash={playerHitFlash}
        impactNonce={playerImpactNonce}
        impactVelocity={playerImpactVelocity}
        {jumpSpeed}
        {lookHeight}
        {moveResponsiveness}
        {moveSpeed}
        {meleeCooldownMs}
        {meleeHitboxPadding}
        {meleeParams}
        {meleeShowSword}
        {meleeSwordOpacity}
        {meleeTrailSettings}
        moveSpeedFactor={lavaBrakeFactor}
        onMeleeFrame={handleMeleeFrame}
        onMouseMove={handleMouseMove}
        onPositionChange={handlePlayerPositionChange}
        onShoot={spawnProjectile}
        {orbitControls}
        {playerLinearDamping}
        {showDebugGeometry}
        {teleportNonce}
        {teleportTarget}
        {weaponBuild}
      />

      {#each projectiles as projectile (projectile.id)}
        <Projectile
          data={projectile}
          enemyTargets={activeEnemies.map((enemy) => enemy.position)}
          onExpire={removeProjectile}
          onMove={handleProjectileMove}
        />
      {/each}
    </World>
  </Canvas>

  <GameSceneOverlays
    {animationNow}
    {artifactPickupProgress}
    {bossIntroProgress}
    {bossIntroTitle}
    {cameraMode}
    controlsLocked={sceneControlsLocked}
    {crosshairX}
    {crosshairY}
    {currentArtifactTemplate}
    dungeonFloor={dungeon.floor}
    {floorIntroProgress}
    {pickedArtifactTemplate}
    {playerHitFlash}
    {projectedDamagePopups}
    {roomTransitionProgress}
    {roomTransitionSubtitle}
    {roomTransitionTitle}
  />

  {#if sceneUiVisible}
    <GameMinimap
      {currentRoom}
      {dungeon}
      {exploredRoomSet}
      {isRoomUnlocked}
      {minimapBounds}
      {roomList}
    />

    <GameHud {playerHealth} {playerHealthRatio} {playerRecoverRatio} />
  {/if}
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }
</style>
