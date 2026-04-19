<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Debug, World } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { toStore } from "svelte/store";
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
  import { setGameSceneContext } from "$lib/components/game/scene/context";
  import GameSceneActors from "$lib/components/game/scene/GameSceneActors.svelte";
  import GameSceneEnvironment from "$lib/components/game/scene/GameSceneEnvironment.svelte";
  import { spawnWeaponAttack } from "$lib/components/game/scene/projectile-spawn";
  import {
    createEnemyShots,
    getEnemyMoveIntent,
    getHazardBrakeFactor,
    getProjectileHitDamage,
    resolveEnemyWallImpact,
  } from "$lib/components/game/scene/utils";
  import type {
    DungeonRoom,
    DungeonRoomDirection,
  } from "$lib/config/dungeon-layout";
  import {
    enemyTemplateById,
    roomTemplateById,
  } from "$lib/config/room-templates";
  import {
    getWeaponNodeTemplate,
    type WeaponNodeType,
  } from "$lib/config/weapon-graph";
  import {
    artifactPickupDurationMs,
    beamDurationMs,
    bossIntroDurationMs,
    createDoorMarkers,
    createDoorSeals,
    createRoomEnemies,
    createRoomWalls,
    damagePopupDurationMs,
    doorOpenDelayMs,
    doorOpenDurationMs,
    floorHalfDepth,
    floorHalfWidth,
    floorIntroDurationMs,
    floorThemes,
    getEntryDirectionFromTarget,
    getRoomHazards,
    getRoomPlatforms,
    getTransition,
    hazardTickMs,
    playerMaxHealth,
    playerRadius,
    roomTeleportZ,
    wallThemes,
  } from "$lib/game/scene-layout";
  import {
    deflectBurstDurationMs,
    getMinimapBounds,
    projectDamagePopups,
    renderDeflectBursts,
  } from "$lib/game/scene-ui";
  import type {
    ActiveBeam,
    ActiveEnemy,
    ActiveEnemyShot,
    ActiveProjectile,
    DamagePopup,
    DeflectBurst,
    MeleeFrame,
    Vec3,
  } from "$lib/types/game";
  import type { GameSceneProps } from "$lib/types/game-components";

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
  const roomEnvironment = $derived(currentRoomTemplate.environment ?? null);
  const currentRoomUnlocked = $derived(
    !isCurrentRoomCombat || releasedRoomSet.has(currentRoom.id)
  );
  const activeEnemyTargets = $derived.by(() =>
    activeEnemies.map((enemy) => enemy.position)
  );
  const isRoomUnlocked = (room: DungeonRoom) =>
    roomTemplateById[room.templateId].spawnPattern === "none" ||
    releasedRoomSet.has(room.id);

  setGameSceneContext({
    activeBeams: toStore(() => activeBeams),
    activeEnemies: toStore(() => activeEnemies),
    animationNow: toStore(() => animationNow),
    artifactPickupProgress: toStore(() => artifactPickupProgress),
    bossDoorTexture: toStore(() => bossDoorTexture),
    bossFloorTexture: toStore(() => bossFloorTexture),
    bossIntroProgress: toStore(() => bossIntroProgress),
    bossIntroTitle: toStore(() => bossIntroTitle),
    cameraMode: toStore(() => cameraMode),
    crosshairX: toStore(() => crosshairX),
    crosshairY: toStore(() => crosshairY),
    currentArtifactTemplate: toStore(() => currentArtifactTemplate),
    currentFloorPalette: toStore(() => currentFloorPalette),
    currentRoom: toStore(() => currentRoom),
    currentRoomTemplate: toStore(() => currentRoomTemplate),
    deflectBurstsRendered: toStore(() => deflectBurstsRendered),
    doorOpenAmount: toStore(() => doorOpenAmount),
    dungeon: toStore(() => dungeon),
    dungeonFloor: toStore(() => dungeon.floor),
    enemyShots: toStore(() => enemyShots),
    exploredRoomSet: toStore(() => exploredRoomSet),
    floorIntroProgress: toStore(() => floorIntroProgress),
    isRoomUnlocked,
    lavaSurfaceTexture: toStore(() => lavaSurfaceTexture),
    minimapBounds: toStore(() => minimapBounds),
    pickedArtifactTemplate: toStore(() => pickedArtifactTemplate),
    playerHealth: toStore(() => playerHealth),
    playerHealthRatio: toStore(() => playerHealthRatio),
    playerHitFlash: toStore(() => playerHitFlash),
    playerRecoverRatio: toStore(() => playerRecoverRatio),
    projectedDamagePopups: toStore(() => projectedDamagePopups),
    roomDoors: toStore(() => roomDoors),
    roomDoorSeals: toStore(() => roomDoorSeals),
    roomEnvironment: toStore(() => roomEnvironment),
    roomHazards: toStore(() => roomHazards),
    roomList: toStore(() => roomList),
    roomPlatforms: toStore(() => roomPlatforms),
    roomWalls: toStore(() => roomWalls),
    sceneControlsLocked: toStore(() => sceneControlsLocked),
    sceneUiVisible: toStore(() => sceneUiVisible),
    treasureFloorTexture: toStore(() => treasureFloorTexture),
  });

  const triggerPlayerRecover = (duration: number) => {
    playerRecoverDuration = duration;
    playerRecoverUntil = performance.now() + duration;
  };

  const lavaBrakeFactor = $derived.by(() =>
    getHazardBrakeFactor(lastPlayerPosition, roomHazards)
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

  const getActiveHazard = (position: Vec3) =>
    roomHazards.find(
      (hazard) =>
        position[1] < 0.84 &&
        Math.abs(position[0] - hazard.position[0]) <= hazard.args[0] &&
        Math.abs(position[2] - hazard.position[2]) <= hazard.args[2]
    );

  const applyProjectileHits = (
    enemy: ActiveEnemy,
    position: Vec3,
    knockbackVelocity: Vec3,
    hp: number,
    now: number,
    spentProjectiles: Set<string>
  ) => {
    let nextHp = hp;
    let nextLastHitAt = enemy.lastHitAt;
    let nextKnockbackVelocity = knockbackVelocity;

    for (const projectile of projectiles) {
      if (spentProjectiles.has(projectile.id)) {
        continue;
      }

      const damage = getProjectileHitDamage(
        projectile,
        projectilePositions.get(projectile.id),
        position,
        enemy.radius
      );

      if (!damage) {
        continue;
      }

      nextHp -= damage;
      nextLastHitAt = now;
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

      nextKnockbackVelocity = [
        Math.max(
          -10.5,
          Math.min(
            10.5,
            nextKnockbackVelocity[0] +
              (projectile.velocity[0] / projectileSpeed) * kick
          )
        ),
        0,
        Math.max(
          -10.5,
          Math.min(
            10.5,
            nextKnockbackVelocity[2] +
              (projectile.velocity[2] / projectileSpeed) * kick
          )
        ),
      ];
      spentProjectiles.add(projectile.id);
    }

    return {
      hp: nextHp,
      lastHitAt: nextLastHitAt,
      knockbackVelocity: nextKnockbackVelocity,
    };
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
    ({ hp, lastHitAt, knockbackVelocity } = applyProjectileHits(
      enemy,
      position,
      knockbackVelocity,
      hp,
      now,
      spentProjectiles
    ));

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

    if (wallImpact.damage > 0) {
      popDamage(
        wallImpact.damage,
        [position[0], position[1] + enemy.radius + 0.34, position[2]],
        "enemy"
      );
    }

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
      shots = createEnemyShots(enemy, position, dx, dz);

      if (shots.length > 0) {
        lastShotAt = now;
      }
    }

    return {
      enemy: Object.assign(enemy, {
        hp,
        knockbackVelocity,
        lastHitAt,
        lastShotAt,
        position,
      }),
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
    const attackCount = playerShotCount + 1;
    const attack = spawnWeaponAttack({
      activeEnemies,
      activeProjectiles: projectiles,
      attackCount,
      position,
      velocity,
      weaponBuild,
    });

    playerShotCount = attack.attackCount;
    activeEnemies = attack.activeEnemies;

    if (attack.beams.length > 0) {
      activeBeams = [...activeBeams, ...attack.beams];
    }

    for (const popup of attack.damagePopups) {
      popDamage(popup.amount, popup.position, "enemy");
    }

    if (attack.projectiles.length > 0) {
      projectiles = [...projectiles, ...attack.projectiles];
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

    const nextEnemies: ActiveEnemy[] = [];

    for (const enemy of activeEnemies) {
      if (
        hitSet.has(enemy.id) ||
        enemy.radius > 1 ||
        !isPointInSwing(
          enemy.position,
          frame.t,
          frame.center,
          frame.facingYaw,
          swingConfig
        )
      ) {
        nextEnemies.push(enemy);
        continue;
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

      enemy.hp -= damage;
      enemy.knockbackVelocity = [
        Math.max(-10.5, Math.min(10.5, kx * kick)),
        0,
        Math.max(-10.5, Math.min(10.5, kz * kick)),
      ] as Vec3;
      enemy.lastHitAt = now;

      if (enemy.hp > 0) {
        nextEnemies.push(enemy);
      }
    }

    activeEnemies = nextEnemies;
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

  const syncRoomDoorState = (now: number) => {
    if (!isCurrentRoomCombat || releasedRoomSet.has(currentRoom.id)) {
      doorOpenAmount = 1;
      return;
    }

    if (unlockingRoomId === currentRoom.id) {
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

      return;
    }

    doorOpenAmount = 0;
  };

  const resetPlayerAfterDeath = (now: number) => {
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
    teleportTarget = [0, 1.1, 0];
    teleportNonce += 1;
  };

  const stepEnemies = (delta: number) => {
    const now = performance.now();
    const enemiesSleeping = now < enemyWakeUntil;
    const spentProjectiles = new Set<string>();
    const spawnedEnemyShots: ActiveEnemyShot[] = [];
    let clearedRoom = false;
    let nextHealth = playerHealth;
    const activeHazard = getActiveHazard(lastPlayerPosition);

    syncRoomDoorState(now);

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

    const nextEnemies: ActiveEnemy[] = [];

    for (const enemy of activeEnemies) {
      const result = enemiesSleeping
        ? { enemy, playerDamage: 0, shots: [] }
        : stepEnemy(enemy, delta, now, spentProjectiles);

      nextHealth = Math.max(0, nextHealth - result.playerDamage);

      if (result.shots.length > 0) {
        spawnedEnemyShots.push(...result.shots);
      }

      if (result.enemy) {
        nextEnemies.push(result.enemy);
      }
    }

    activeEnemies = nextEnemies;

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
      resetPlayerAfterDeath(now);
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

      <GameSceneEnvironment />

      <GameSceneActors />

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
          enemyTargets={activeEnemyTargets}
          onExpire={removeProjectile}
          onMove={handleProjectileMove}
        />
      {/each}
    </World>
  </Canvas>

  <GameSceneOverlays />

  {#if sceneUiVisible}
    <GameMinimap />

    <GameHud />
  {/if}
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }
</style>
