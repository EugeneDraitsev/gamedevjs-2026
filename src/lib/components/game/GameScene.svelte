<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Debug, World } from "@threlte/rapier";
  import { onMount, untrack } from "svelte";
  import {
    type DirectionalLight,
    type OrthographicCamera,
    PCFSoftShadowMap,
    type PerspectiveCamera,
  } from "three";
  import type { OrbitControls as OrbitControlsInstance } from "three/examples/jsm/controls/OrbitControls.js";
  import { gameSfx } from "$lib/audio/sfx";
  import SceneLoadingOverlay from "$lib/components/app/SceneLoadingOverlay.svelte";
  import GameHud from "$lib/components/game/GameHud.svelte";
  import GameMinimap from "$lib/components/game/GameMinimap.svelte";
  import GameSceneOverlays from "$lib/components/game/GameSceneOverlays.svelte";
  import PlayerController from "$lib/components/game/PlayerController.svelte";
  import Projectile from "$lib/components/game/Projectile.svelte";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import GameSceneActors from "$lib/components/game/scene/GameSceneActors.svelte";
  import GameSceneEnvironment from "$lib/components/game/scene/GameSceneEnvironment.svelte";
  import { createDefaultMachineLoadout } from "$lib/config/machine-modules";
  import { roomTemplateById } from "$lib/config/room-templates";
  import {
    enableTransitionPerf,
    markGameFrameEnd,
    markGameFrameStart,
    markRuntimeTrace,
    markTransitionPhaseEnd,
    markTransitionPhaseStart,
  } from "$lib/debug/transition-perf";
  import { stepEnemies } from "$lib/game/enemy-stepper";
  import {
    applyMeleeDeflects,
    applyMeleeHitsToBombs,
    applyMeleeHitsToEnemies,
    handleMeleeFrame,
  } from "$lib/game/melee-resolver";
  import {
    DEFAULT_CHUNK_CONFIG,
    getOutsideChunkPlan,
  } from "$lib/game/outside-chunk/plan";
  import { setOutsideChunkSeed } from "$lib/game/outside-chunk-context";
  import { pauseGameSceneTimers } from "$lib/game/pause-timers";
  import { spawnPlayerProjectile } from "$lib/game/projectile-spawner";
  import {
    buildOutsideWarmupViews,
    type WarmupView,
  } from "$lib/game/renderer-warmup";
  import { handlePlayerPositionChange } from "$lib/game/room-transitions";
  import {
    beamDurationMs,
    corePrisonSealCenterZ,
    createOutsidePickups,
    createRoomEnemies,
    damagePopupDurationMs,
    doorOpenDelayMs,
    doorOpenDurationMs,
    floorExitTriggerHalfWidth,
    floorExitTriggerZ,
    getRoomBounds,
    getStartRoomSpawnTarget,
    outsideGateTriggerHalfWidth,
    outsideGateTriggerZ,
  } from "$lib/game/scene-layout";
  import {
    deflectBurstDurationMs,
    healBurstDurationMs,
    projectileImpactBurstDurationMs,
  } from "$lib/game/scene-ui";
  import { cheats } from "$lib/stores/cheats.svelte";
  import { GameSceneStore } from "$lib/stores/game-scene.svelte";
  import { setGameSceneContext } from "$lib/stores/scene-context";
  import type { MeleeFrame, Vec3 } from "$lib/types/game";
  import type { GameSceneProps } from "$lib/types/game-components";

  let {
    collectedArtifactRoomIds = [],
    controlsLocked = false,
    dungeon,
    enemyAiPaused = false,
    enemySpawnOverride,
    floorReliefMaps = true,
    floorReliefStrength = 1.4,
    gearCount = 0,
    inventoryModuleIds = [],
    machineLoadout = createDefaultMachineLoadout(),
    machineStats,
    meleeParams,
    meleeTrailSettings,
    onAdvanceFloor,
    onCollectArtifact,
    onEndDemo,
    onGearCountChange,
    onLoadProgress,
    onOpenLoadout,
    onMusicCue,
    onOpenSettings,
    onPlayerDeath,
    onPurchaseShopOffer,
    onReady,
    purchasedShopOfferIds = [],
    revivalNonce = 0,
    settings,
    showLoader = true,
    showPlayer = true,
    weaponBuild,
  }: GameSceneProps = $props();

  const scene = new GameSceneStore();
  let sceneReady = $state(false);
  let runtimeWarmupActive = $state(false);
  let rendererWarmupReady = $state(false);
  let outsideDetailLevel = $state(3);
  let outsideDetailFrame = 0;
  let transitionCoverFrame = 0;
  const syncSceneInputs = () =>
    scene.syncInputs({
      collectedArtifactRoomIds,
      controlsLocked: controlsLocked || !sceneReady,
      dungeon,
      floorReliefMaps,
      floorReliefStrength,
      inventoryModuleIds,
      machineLoadout,
      machineStats,
      meleeParams,
      meleeTrailSettings,
      purchasedShopOfferIds,
      settings,
      weaponBuild,
    });

  syncSceneInputs();
  const { combat, pickups, player, room, textures, timing } = scene;

  let orbitControls = $state<OrbitControlsInstance>();
  let orthographicCamera = $state<OrthographicCamera>();
  let perspectiveCamera = $state<PerspectiveCamera>();
  let sunLight = $state<DirectionalLight>();
  let enemySpawnPending = $state(false);
  let outsideGateTriggerArmed = $state(true);
  let corePrisonSealHits = $state(0);
  let corePrisonLastSealSwingId = 0;
  let corePrisonSealBrokenAt = $state(0);
  const corePrisonSealHitsRequired = 3;
  const sceneCamera = $derived(
    scene.settings.cameraOrthographic ? orthographicCamera : perspectiveCamera
  );
  const outside = $derived(scene.currentRoomTemplate.layout === "outside-yard");
  const outsideBaseShaderCompileViews = [
    {
      position: [0, 42, 72],
      target: [0, 0, 30],
    },
    {
      position: [0, 42, 10],
      target: [0, 0, -32],
    },
    {
      position: [-44, 44, -18],
      target: [-18, 0, -58],
    },
    {
      position: [44, 44, -18],
      target: [18, 0, -58],
    },
    {
      position: [-72, 38, 46],
      target: [-42, 0, 18],
    },
    {
      position: [-72, 38, -8],
      target: [-48, 0, -38],
    },
    {
      position: [72, 38, 46],
      target: [42, 0, 18],
    },
    {
      position: [72, 38, -8],
      target: [48, 0, -38],
    },
    {
      position: [0, 46, -76],
      target: [0, 0, -112],
    },
    {
      position: [0, 52, -130],
      target: [0, 0, -156],
    },
  ] satisfies WarmupView[];
  const outsideShaderCompileViews = $derived.by(() => {
    const plan = getOutsideChunkPlan({
      ...DEFAULT_CHUNK_CONFIG,
      seed: `outside-${dungeon.seed}`,
    });

    return buildOutsideWarmupViews(outsideBaseShaderCompileViews, plan.pois);
  });
  const shaderCompileViews = $derived(outside ? outsideShaderCompileViews : []);
  const shaderWarmupViews = $derived(outside ? outsideShaderCompileViews : []);
  const shaderWarmupCleanCycles = $derived(outside ? 2 : 1);
  const shaderWarmupMinPasses = $derived(
    outside
      ? Math.max(18, outsideShaderCompileViews.length * shaderWarmupCleanCycles)
      : 6
  );
  const shaderWarmupMaxPasses = $derived(
    outside
      ? Math.max(
          72,
          outsideShaderCompileViews.length * (shaderWarmupCleanCycles + 2)
        )
      : 30
  );
  const shaderWarmupStablePasses = $derived(outside ? 6 : 3);
  const sceneWarmupsVisible = $derived(!(runtimeWarmupActive || sceneReady));
  const sceneActorsVisible = $derived(
    !outside || runtimeWarmupActive || sceneReady
  );
  const corePrisonSealLocked = $derived(
    scene.currentRoomTemplate.environment === "core-prison" &&
      corePrisonSealHits < corePrisonSealHitsRequired
  );
  const machineModuleIconPreloadTextures = $derived.by(() =>
    Object.values(textures.machineModuleIcons)
  );
  const outsidePreloadTextures = $derived.by(() => [
    textures.outsideEarth,
    textures.outsideEarthDecals,
    textures.outsideRockDecals,
    textures.outsideRocks,
    textures.outsideWater,
    textures.outsideWaterDecals,
  ]);
  const warmupPreloadTextures = $derived.by(() => [
    ...machineModuleIconPreloadTextures,
    textures.bossBanner,
    textures.bossDoor,
    textures.bossFloor,
    textures.bossFloorHeight,
    textures.bossFloorNormal,
    textures.foundryFloor,
    textures.foundryFloorDecals,
    textures.foundryWall,
    textures.lavaSurface,
    textures.outsideEarth,
    textures.outsideEarthDecals,
    textures.outsideRockDecals,
    textures.outsideRocks,
    textures.outsideWater,
    textures.outsideWaterDecals,
    textures.treasureFloor,
    textures.treasureFloorHeight,
    textures.treasureFloorNormal,
  ]);
  const indoorPreloadTextures = $derived.by(() => [
    textures.bossBanner,
    textures.bossDoor,
    textures.bossFloor,
    textures.bossFloorHeight,
    textures.bossFloorNormal,
    textures.foundryFloor,
    textures.foundryFloorDecals,
    textures.foundryWall,
    textures.lavaSurface,
    textures.treasureFloor,
    textures.treasureFloorHeight,
    textures.treasureFloorNormal,
  ]);
  const bossShaderWarmupTextures = $derived.by(() => ({
    bump: textures.bossFloorHeight,
    diffuse: textures.bossFloor,
    normal: textures.bossFloorNormal,
  }));
  const blockingPreloadTextures = $derived.by(() => {
    if (outside) {
      return outsidePreloadTextures;
    }

    if (
      scene.currentRoomTemplate.layout === "boss-foundry" ||
      scene.currentRoomTemplate.layout === "boss-crucible" ||
      scene.currentRoomTemplate.layout === "boss-bomber"
    ) {
      return indoorPreloadTextures;
    }

    if (scene.currentRoomTemplate.layout === "gear-floor") {
      return indoorPreloadTextures;
    }

    return indoorPreloadTextures;
  });
  const shouldAutoEnableTransitionPerf = () => {
    const params = new URLSearchParams(window.location.search);

    return params.get("debug") === "true" || params.get("rtperf") === "1";
  };
  const markSceneReady = () => {
    if (sceneReady) {
      return;
    }

    runtimeWarmupActive = false;
    sceneReady = true;
    onReady?.();
    revealOutsideDetails();
  };
  const startRuntimeWarmup = () => {
    runtimeWarmupActive = true;
  };
  const clearOutsideDetailFrame = () => {
    if (outsideDetailFrame) {
      window.cancelAnimationFrame(outsideDetailFrame);
      outsideDetailFrame = 0;
    }
  };
  const revealOutsideDetails = () => {
    clearOutsideDetailFrame();
    outsideDetailLevel = 3;
  };
  const clearTransitionCoverFrame = () => {
    if (transitionCoverFrame) {
      window.cancelAnimationFrame(transitionCoverFrame);
      transitionCoverFrame = 0;
    }
  };
  const finishTransitionCoverAfterWarmFrames = () => {
    clearTransitionCoverFrame();

    let framesLeft = 5;
    const step = () => {
      framesLeft -= 1;

      if (framesLeft <= 0) {
        transitionCoverFrame = 0;
        timing.clearRoomTransitionCover();
        return;
      }

      transitionCoverFrame = window.requestAnimationFrame(step);
    };

    transitionCoverFrame = window.requestAnimationFrame(step);
  };

  setGameSceneContext(scene);

  let roomFlushStartedAt = 0;

  $effect.pre(() => {
    const currentRoom = scene.currentRoom;

    currentRoom.id;
    currentRoom.templateId;
    roomFlushStartedAt = markTransitionPhaseStart();
  });

  $effect(() => {
    const currentRoom = scene.currentRoom;

    currentRoom.id;
    currentRoom.templateId;

    const info = untrack(() => ({
      doors: scene.roomDoors.length,
      hazards: scene.roomHazards.length,
      nodesHint:
        scene.roomWalls.length +
        scene.roomDoors.length +
        scene.roomDoorSeals.length +
        scene.roomHazards.length +
        scene.roomPlatforms.length,
      platforms: scene.roomPlatforms.length,
      roomId: currentRoom.id,
      templateId: currentRoom.templateId,
      walls: scene.roomWalls.length,
    }));

    markTransitionPhaseEnd("svelte-room-flush", roomFlushStartedAt, () => info);
  });

  $effect(() => {
    syncSceneInputs();
    gameSfx.syncMix(settings);
  });

  $effect(() => {
    dungeon.seed;
    scene.currentRoom.id;
    runtimeWarmupActive = false;
    outsideDetailLevel = 3;

    untrack(() => {
      if (timing.roomTransitionCoverActive) {
        finishTransitionCoverAfterWarmFrames();
      }
    });

    return () => {
      clearOutsideDetailFrame();
      clearTransitionCoverFrame();
    };
  });

  $effect(() => {
    scene.pickups.gears = gearCount;
  });

  $effect(() => {
    revivalNonce;
    untrack(() => {
      if (revivalNonce <= 0 || timing.playerDeathStartedAt === 0) {
        return;
      }

      const now = performance.now();
      player.resetForRespawn();
      timing.lastHazardAt = now;
      timing.enemyWakeUntil = now + 800;
      timing.clearPlayerDeath();
    });
  });

  $effect(() => {
    scene.camera = sceneCamera;
  });

  // Push the URL-derived dungeon seed into the outside-chunk pipeline
  // so every consumer (terrain, road, foliage, minimap, enemy spawn)
  // regenerates when the player starts a new run.
  $effect(() => {
    setOutsideChunkSeed(`outside-${dungeon.seed}`);
  });

  $effect(() => {
    const startRoomId = dungeon.startRoomId;

    dungeon.seed;
    untrack(() => {
      const startRoom = dungeon.rooms[startRoomId];
      const startBounds = getRoomBounds(
        roomTemplateById[startRoom.templateId].layout
      );

      timing.resetForFloor();
      combat.resetForFloor();
      pickups.clear();
      room.resetForFloor(startRoomId);
      outsideGateTriggerArmed = true;
      corePrisonSealHits = 0;
      corePrisonLastSealSwingId = 0;
      corePrisonSealBrokenAt = 0;
      if (startRoom.templateId === "outside-start") {
        pickups.seedRoom(startRoomId, createOutsidePickups(performance.now()));
      }
      pickups.enterRoom(startRoomId);
      player.resetForFloor();
      room.teleportTo(
        getStartRoomSpawnTarget(startRoom.templateId, startBounds)
      );
    });
  });

  $effect(() => {
    const currentRoom = scene.currentRoom;

    if (currentRoom.kind === "boss") {
      const bossCue =
        currentRoom.templateId === "boss-bomber" ? "boss-catacombs" : "boss";

      onMusicCue?.(room.clearedSet.has(currentRoom.id) ? "silence" : bossCue);
      return;
    }

    onMusicCue?.(outside ? "outside" : "level");
  });

  $effect(() => {
    if (cheats.revealMapNonce === 0) {
      return;
    }

    for (const id of Object.keys(scene.dungeon.rooms)) {
      room.markExplored(id);
    }
  });

  $effect(() => {
    const currentRoom = scene.currentRoom;
    const currentRoomTemplate = scene.currentRoomTemplate;
    let spawnFrame = 0;
    const resetPhaseStartedAt = markTransitionPhaseStart();
    let pendingAfterReset = false;

    untrack(() => {
      enemySpawnPending =
        currentRoomTemplate.spawnPattern !== "none" &&
        !room.clearedSet.has(currentRoom.id);
      pendingAfterReset = enemySpawnPending;
      if (currentRoomTemplate.layout === "outside-yard") {
        pickups.seedRoom(
          currentRoom.id,
          createOutsidePickups(performance.now())
        );
      }
      pickups.enterRoom(currentRoom.id);
      combat.enemies = [];
      combat.beams = [];
      combat.bombs = [];
      combat.enemyShots = [];
      combat.gateLasers = [];
      timing.lastHazardAt = performance.now();
      room.doorOpenAmount =
        currentRoomTemplate.spawnPattern === "none" ||
        room.releasedSet.has(currentRoom.id) ||
        room.clearedSet.has(currentRoom.id)
          ? 1
          : 0;
    });

    markTransitionPhaseEnd("room-effect-reset", resetPhaseStartedAt, () => ({
      enemySpawnPending: pendingAfterReset,
      roomId: currentRoom.id,
      spawnPattern: currentRoomTemplate.spawnPattern,
      templateId: currentRoom.templateId,
    }));

    spawnFrame = requestAnimationFrame(() => {
      const spawnPhaseStartedAt = markTransitionPhaseStart();
      const enemies = createRoomEnemies(
        currentRoom,
        enemySpawnOverride
          ? { ...currentRoomTemplate, ...enemySpawnOverride }
          : currentRoomTemplate,
        untrack(() => room.entryDirection),
        untrack(() => room.clearedSet)
      );

      combat.enemies = enemies;
      enemySpawnPending = false;
      markTransitionPhaseEnd("spawn-enemies", spawnPhaseStartedAt, () => ({
        enemies: enemies.length,
        override: Boolean(enemySpawnOverride),
        roomId: currentRoom.id,
        templateId: currentRoom.templateId,
      }));
    });

    return () => {
      cancelAnimationFrame(spawnFrame);
      enemySpawnPending = false;
    };
  });

  $effect(() => {
    const light = sunLight;

    if (!light) {
      return;
    }

    if (outside) {
      light.castShadow = false;
      light.shadow.map?.dispose();
      light.shadow.map = null;
      light.shadow.needsUpdate = false;
      rendererWarmupReady = true;
      return;
    }

    light.castShadow = true;
    light.shadow.bias = settings.shadowBias;
    light.shadow.camera.far = settings.shadowFar;
    light.shadow.mapSize.set(settings.shadowMapSize, settings.shadowMapSize);
    light.shadow.normalBias = settings.shadowNormalBias;

    const shadowCamera = light.shadow.camera as OrthographicCamera;
    shadowCamera.bottom = -settings.shadowFrustum;
    shadowCamera.left = -settings.shadowFrustum;
    shadowCamera.near = 0.5;
    shadowCamera.right = settings.shadowFrustum;
    shadowCamera.top = settings.shadowFrustum;
    shadowCamera.updateProjectionMatrix();

    light.shadow.needsUpdate = true;
    rendererWarmupReady = true;
  });

  const handleShoot = ({
    position,
    velocity,
  }: {
    position: Vec3;
    velocity: Vec3;
  }) => {
    const build = scene.weaponBuild;
    const intensity =
      build.attackMode === "beam" ? build.damage / 22 : build.damage / 36;

    gameSfx.playLaserShot(Math.min(1, Math.max(0, intensity)));

    spawnPlayerProjectile({
      combat,
      player,
      position,
      velocity,
      weaponBuild: build,
    });
  };

  const tryPurchaseAtPosition = (position: Vec3) => {
    const purchaseRadius = 0.95;

    for (const offer of scene.availableShopOffers) {
      const dx = position[0] - offer.position[0];
      const dz = position[2] - offer.position[2];

      if (Math.hypot(dx, dz) > purchaseRadius) {
        continue;
      }

      if (pickups.gears < offer.price) {
        continue;
      }

      const isHeal = offer.kind === "heal-small" || offer.kind === "heal-big";

      if (
        offer.kind === "module" &&
        (!offer.moduleId || scene.inventoryModuleIdSet.has(offer.moduleId))
      ) {
        continue;
      }

      if (isHeal && player.health >= player.maxHealth) {
        continue;
      }

      if (isHeal) {
        const heal = Math.min(offer.value, player.maxHealth - player.health);

        player.health += heal;
        combat.popHeal(heal, [position[0], position[1] + 1.05, position[2]]);
        gameSfx.playRepairPickup();
      } else {
        gameSfx.playGearPickup();
      }

      pickups.gears -= offer.price;
      onGearCountChange?.(pickups.gears);
      onPurchaseShopOffer?.(offer);
      return;
    }
  };

  const handlePositionChange = (position: Vec3) => {
    const meleeFrame = combat.currentMeleeFrame;
    const pickupResult = pickups.collectAt(
      position,
      player.health,
      player.maxHealth,
      scene.roomPlatforms,
      scene.machineStats.pickupRadiusBonus,
      meleeFrame ?? undefined,
      meleeFrame
        ? {
            ...scene.meleeParams,
            reach: scene.meleeParams.reach + settings.meleeHitboxPadding,
          }
        : undefined
    );

    if (pickupResult.healthDelta > 0) {
      gameSfx.playRepairPickup();
      player.health = pickupResult.nextHealth;
      combat.popHeal(pickupResult.healthDelta, [
        position[0],
        position[1] + 1.05,
        position[2],
      ]);
    }

    if (pickupResult.gearDelta > 0) {
      gameSfx.playGearPickup();
      onGearCountChange?.(pickups.gears);
    }

    if (
      scene.currentRoom.kind === "shop" ||
      scene.currentRoomTemplate.layout === "outside-yard"
    ) {
      tryPurchaseAtPosition(position);
    }

    handlePlayerPositionChange({
      combat,
      completedBossRoomIds: scene.collectedArtifactRoomSet,
      currentArtifactType: scene.currentArtifactType,
      currentRoom: scene.currentRoom,
      currentRoomUnlocked: scene.currentRoomUnlocked,
      dungeon: scene.dungeon,
      onCollectArtifact,
      player,
      position,
      room,
      timing,
    });

    if (
      scene.floorExitReady &&
      scene.dungeon.floor < 0 &&
      scene.currentRoom.kind === "boss" &&
      !scene.currentArtifactType &&
      Math.abs(position[0]) < floorExitTriggerHalfWidth &&
      position[2] < floorExitTriggerZ
    ) {
      onAdvanceFloor?.();
    }

    const inOutsideGateTrigger =
      scene.currentRoomTemplate.layout === "outside-yard" &&
      Math.abs(position[0]) < outsideGateTriggerHalfWidth &&
      position[2] < outsideGateTriggerZ;
    const outsideGateUnlocked =
      scene.currentRoomTemplate.layout === "outside-yard" &&
      scene.room.clearedSet.has(scene.currentRoom.id);

    if (!inOutsideGateTrigger) {
      outsideGateTriggerArmed = true;
    } else if (outsideGateUnlocked && outsideGateTriggerArmed) {
      outsideGateTriggerArmed = false;
      onEndDemo?.();
    }
  };

  const handleCorePrisonSealHit = (frame: MeleeFrame) => {
    if (
      !(corePrisonSealLocked && frame.active) ||
      frame.ended ||
      frame.swingId === corePrisonLastSealSwingId ||
      Math.hypot(frame.center[0], frame.center[2] - corePrisonSealCenterZ) >
        2.35
    ) {
      return;
    }

    const now = performance.now();
    const nextHits = Math.min(
      corePrisonSealHitsRequired,
      corePrisonSealHits + 1
    );

    corePrisonLastSealSwingId = frame.swingId;
    corePrisonSealHits = nextHits;
    combat.deflectBursts.push({
      color: nextHits >= corePrisonSealHitsRequired ? "#ffd166" : "#8ff7ff",
      createdAt: now,
      id: crypto.randomUUID(),
      position: [0, 1, corePrisonSealCenterZ + 1.18],
      radius: nextHits >= corePrisonSealHitsRequired ? 2.2 : 1,
    });

    if (nextHits >= corePrisonSealHitsRequired) {
      corePrisonSealBrokenAt = now;
      gameSfx.playCorePrisonDomeBreak();
    } else {
      gameSfx.playCorePrisonDomeCrack(nextHits);
    }
  };

  const handleMelee = (frame: MeleeFrame) => {
    handleMeleeFrame(combat, frame);
    handleCorePrisonSealHit(frame);
  };

  const tick = (time: number, delta: number) => {
    const enemySimulationPaused = enemyAiPaused || controlsLocked;

    timing.now = time;
    combat.pruneExpired(
      time,
      beamDurationMs,
      damagePopupDurationMs,
      deflectBurstDurationMs,
      projectileImpactBurstDurationMs,
      healBurstDurationMs,
      enemySimulationPaused ? delta * 1000 : 0
    );
    textures.advanceLava(delta);

    if (timing.playerDeathActive) {
      return;
    }

    if (!timing.bossIntroActive && combat.currentMeleeFrame) {
      applyMeleeHitsToEnemies({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
        oneHitKill: cheats.oneHitKill,
        weaponBuild: scene.weaponBuild,
      });
      applyMeleeHitsToBombs({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
        oneHitKill: cheats.oneHitKill,
        weaponBuild: scene.weaponBuild,
      });
      applyMeleeDeflects({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
        reflectedShotsSeekEnemies: scene.machineStats.reflectedShotsSeekEnemies,
        weaponBuild: scene.weaponBuild,
      });
    }

    if (timing.bossIntroActive) {
      return;
    }

    if (enemySpawnPending) {
      return;
    }

    const result = stepEnemies({
      combat,
      currentRoomId: scene.currentRoom.id,
      currentRoomTemplate: scene.currentRoomTemplate,
      delta,
      doorOpenDelayMs,
      doorOpenDurationMs,
      enemyAiPaused: enemySimulationPaused,
      isCurrentRoomCombat: scene.isCurrentRoomCombat,
      oneHitKill: cheats.oneHitKill,
      pickups,
      player,
      room,
      roomHazards: scene.roomHazards,
      roomPlatforms: scene.roomPlatforms,
      timing,
    });
    const playerTookDamage = result.nextHealth < player.health;

    if (result.lootSpawned || result.roomCleared || result.doorStartedOpening) {
      markRuntimeTrace("room-clear-runtime", () => ({
        doorStartedOpening: result.doorStartedOpening,
        enemies: combat.enemies.length,
        lootSpawned: result.lootSpawned,
        pickupKinds: pickups.items.map((pickup) => pickup.kind),
        roomCleared: result.roomCleared,
        roomId: scene.currentRoom.id,
        templateId: scene.currentRoomTemplate.id,
      }));
    }

    if (result.doorStartedOpening) {
      gameSfx.playDoorOpen();
    }

    if (result.lootSpawned) {
      gameSfx.playLootSpawn();
    }

    if (result.roomCleared && scene.currentRoom.kind === "boss") {
      timing.beginBossDeath(time);
      onMusicCue?.("silence", { fadeOutMs: 2400 });
    }

    if (
      result.roomCleared &&
      scene.currentRoomTemplate.layout === "outside-yard"
    ) {
      gameSfx.playDoorOpen();
    }

    if (cheats.infiniteHealth) {
      player.health = player.maxHealth;
      return;
    }

    if (playerTookDamage) {
      gameSfx.playPlayerDamage();
    }

    const nextHealth = result.nextHealth;

    if (nextHealth <= 0) {
      if (timing.playerDeathStartedAt === 0) {
        timing.beginPlayerDeath(time);
        combat.beams = [];
        combat.bombs = [];
        combat.enemyShots = [];
        combat.gateLasers = [];
        combat.projectiles = [];
        combat.projectilePositions.clear();
        gameSfx.playPlayerDamage();
        onPlayerDeath?.();
      }
      player.health = 0;
      return;
    }

    player.health = nextHealth;
  };

  onMount(() => {
    if (shouldAutoEnableTransitionPerf()) {
      enableTransitionPerf();
    }

    const textureLoadAbort = new AbortController();

    if (outside) {
      textures.loadOutsideCritical();
    } else {
      textures.loadGameplayCritical();
    }
    textures
      .loadDeferred({ signal: textureLoadAbort.signal })
      .catch(() => undefined);

    let frameId = 0;
    let previousTime = performance.now();

    const frame = (time: number) => {
      const gameFrameStartedAt = markGameFrameStart();
      const delta = Math.min(0.05, (time - previousTime) / 1000);

      previousTime = time;

      if (timing.playerDeathActive) {
        timing.now = time;
        textures.advanceLava(delta);
      } else if (scene.controlsLocked) {
        pauseGameSceneTimers({
          combat,
          deltaMs: delta * 1000,
          player,
          timing,
        });
      } else {
        tick(time, delta);
      }

      if (gameFrameStartedAt > 0) {
        markGameFrameEnd(gameFrameStartedAt, () => ({
          beams: combat.beams.length,
          bombs: combat.bombs.length,
          deltaSec: delta,
          enemies: combat.enemies.length,
          enemyShots: combat.enemyShots.length,
          gateLasers: combat.gateLasers.length,
          playerDeathActive: timing.playerDeathActive,
          projectiles: combat.projectiles.length,
          roomId: scene.currentRoom.id,
          spawnPending: enemySpawnPending,
          templateId: scene.currentRoom.templateId,
        }));
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      textureLoadAbort.abort();
      clearOutsideDetailFrame();
      clearTransitionCoverFrame();
      window.cancelAnimationFrame(frameId);
    };
  });
</script>

<div class="scene">
  <Canvas shadows={outside ? false : PCFSoftShadowMap} dpr={1}>
    <SceneRendererConfig
      backgroundColor={outside ? "#c7d0c0" : "#050403"}
      compileBeforeReady
      compileViews={shaderCompileViews}
      environmentMap={textures.environmentMap}
      exposure={outside ? 0.82 : scene.settings.toneMappingExposure}
      onProgress={onLoadProgress}
      onReady={markSceneReady}
      onWarmupStart={startRuntimeWarmup}
      preloadTextures={blockingPreloadTextures}
      shadowsEnabled={!outside}
      shaderWarmupTextures={bossShaderWarmupTextures}
      warmupTextures={warmupPreloadTextures}
      warmupCleanRenderCycles={shaderWarmupCleanCycles}
      warmupMinRenderPasses={shaderWarmupMinPasses}
      warmupMaxRenderPasses={shaderWarmupMaxPasses}
      warmupReady={rendererWarmupReady}
      warmupStableRenderPasses={shaderWarmupStablePasses}
      warmupViews={shaderWarmupViews}
      showEnvironmentMap={!outside && scene.settings.showEnvironmentMap}
    />
    <T.Fog
      attach="fog"
      args={[
        outside ? '#b8c3ad' : '#080604',
        outside ? 46 : scene.settings.fogNear,
        outside ? 190 : scene.settings.fogFar,
      ]}
    />

    {#if scene.settings.cameraOrthographic}
      <T.OrthographicCamera
        bind:ref={orthographicCamera}
        makeDefault
        position={[0, 9, 6.4]}
        zoom={scene.settings.cameraFov}
      />
    {:else}
      <T.PerspectiveCamera
        bind:ref={perspectiveCamera}
        makeDefault
        position={[0, 9, 6.4]}
        fov={scene.settings.cameraFov}
      />
    {/if}

    {#if sceneCamera}
      <OrbitControls
        bind:ref={orbitControls}
        camera={sceneCamera}
        enabled={scene.settings.cameraMode === "orbit"}
        enableDamping
        enablePan
        maxDistance={26}
        minDistance={4}
      />
    {/if}

    <T.HemisphereLight
      args={[
        outside ? '#ead7a4' : '#c18455',
        outside ? '#435d4c' : '#050403',
        outside ? 0.95 : scene.settings.hemisphereLightIntensity,
      ]}
    />
    <T.AmbientLight
      intensity={outside ? 0.42 : scene.settings.ambientLightIntensity}
    />
    <T.DirectionalLight
      bind:ref={sunLight}
      castShadow={!outside}
      color={outside ? '#ffd18a' : '#ffbd76'}
      intensity={outside ? 3.25 : scene.settings.sunIntensity}
      position={[
        outside ? -12 : scene.settings.sunPositionX,
        outside ? 8 : scene.settings.sunPositionY,
        outside ? -10 : scene.settings.sunPositionZ,
      ]}
    />

    <World gravity={[0, scene.settings.gravityY, 0]}>
      {#if scene.settings.showPhysicsDebug}
        <Debug />
      {/if}

      <GameSceneEnvironment
        {corePrisonSealBrokenAt}
        {corePrisonSealHits}
        {corePrisonSealHitsRequired}
        {corePrisonSealLocked}
        {outsideDetailLevel}
        warmupVisible={sceneWarmupsVisible && !outside}
      />

      <GameSceneActors
        activeActorsVisible={sceneActorsVisible}
        actorWarmupEnabled={!outside}
        pickupWarmupEnabled
        shopWarmupEnabled={!outside}
        warmupVisible={sceneWarmupsVisible}
      />

      {#if showPlayer}
        <PlayerController
          {orbitControls}
          onMeleeFrame={handleMelee}
          onPositionChange={handlePositionChange}
          onShoot={handleShoot}
        />
      {/if}

      {#each combat.projectiles as projectile (projectile.id)}
        <Projectile
          data={projectile}
          enemyTargets={scene.activeEnemyTargets}
          onExpire={(id) => combat.removeProjectile(id)}
          onImpact={(impact) => combat.popProjectileImpact(impact)}
          onMove={(id, x, y, z) => combat.handleProjectileMove(id, x, y, z)}
        />
      {/each}
    </World>
  </Canvas>

  <GameSceneOverlays overlays={scene.overlays} />

  {#if scene.sceneUiVisible}
    <GameMinimap {onOpenSettings} />

    <GameHud {onOpenLoadout} {onOpenSettings} />
  {/if}

  <SceneLoadingOverlay
    active={showLoader && !sceneReady}
    detail="Preparing renderer"
    progress={sceneReady ? 1 : null}
  />
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }
</style>
