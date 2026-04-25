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
  import GameHud from "$lib/components/game/GameHud.svelte";
  import GameMinimap from "$lib/components/game/GameMinimap.svelte";
  import GameSceneOverlays from "$lib/components/game/GameSceneOverlays.svelte";
  import PlayerController from "$lib/components/game/PlayerController.svelte";
  import Projectile from "$lib/components/game/Projectile.svelte";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import GameSceneActors from "$lib/components/game/scene/GameSceneActors.svelte";
  import GameSceneEnvironment from "$lib/components/game/scene/GameSceneEnvironment.svelte";
  import { roomTemplateById } from "$lib/config/room-templates";
  import { stepEnemies } from "$lib/game/enemy-stepper";
  import {
    applyMeleeDeflects,
    applyMeleeHitsToBombs,
    applyMeleeHitsToEnemies,
    handleMeleeFrame,
  } from "$lib/game/melee-resolver";
  import { setOutsideChunkSeed } from "$lib/game/outside-chunk-context";
  import { spawnPlayerProjectile } from "$lib/game/projectile-spawner";
  import {
    handlePlayerPositionChange,
    resetPlayerAfterDeath,
  } from "$lib/game/room-transitions";
  import {
    beamDurationMs,
    createOutsidePickups,
    createRoomEnemies,
    damagePopupDurationMs,
    doorOpenDelayMs,
    doorOpenDurationMs,
    floorExitTriggerHalfWidth,
    floorExitTriggerZ,
    getRoomBounds,
  } from "$lib/game/scene-layout";
  import {
    deflectBurstDurationMs,
    healBurstDurationMs,
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
    machineStats,
    meleeParams,
    meleeTrailSettings,
    onAdvanceFloor,
    onCollectArtifact,
    onEndDemo,
    onGearCountChange,
    onMusicCue,
    onOpenSettings,
    onOpenWeaponLab,
    settings,
    weaponBuild,
  }: GameSceneProps = $props();

  const scene = new GameSceneStore();
  let sceneReady = $state(false);
  const syncSceneInputs = () =>
    scene.syncInputs({
      collectedArtifactRoomIds,
      controlsLocked: controlsLocked || !sceneReady,
      dungeon,
      floorReliefMaps,
      floorReliefStrength,
      machineStats,
      meleeParams,
      meleeTrailSettings,
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
  const corePrisonSealLocked = $derived(
    scene.currentRoomTemplate.environment === "core-prison" &&
      corePrisonSealHits < corePrisonSealHitsRequired
  );
  const preloadTextures = $derived([
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
  const markSceneReady = () => {
    sceneReady = true;
  };

  setGameSceneContext(scene);

  $effect(() => {
    syncSceneInputs();
    gameSfx.syncMix(settings);
  });

  $effect(() => {
    scene.pickups.gears = gearCount;
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

      if (startRoom.templateId === "outside-start") {
        room.teleportTo([0, 1.1, startBounds.teleportZ * 0.92]);
      }
    });
  });

  $effect(() => {
    const currentRoom = scene.currentRoom;

    if (currentRoom.kind === "boss") {
      onMusicCue?.(room.clearedSet.has(currentRoom.id) ? "silence" : "boss");
      return;
    }

    onMusicCue?.("level");
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

    untrack(() => {
      enemySpawnPending =
        currentRoomTemplate.spawnPattern !== "none" &&
        !room.clearedSet.has(currentRoom.id);
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

    spawnFrame = requestAnimationFrame(() => {
      combat.enemies = createRoomEnemies(
        currentRoom,
        enemySpawnOverride
          ? { ...currentRoomTemplate, ...enemySpawnOverride }
          : currentRoomTemplate,
        untrack(() => room.entryDirection),
        untrack(() => room.clearedSet)
      );
      enemySpawnPending = false;
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

    handlePlayerPositionChange({
      combat,
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
      Math.abs(position[0]) < 5 &&
      position[2] < -scene.roomBounds.transitionInsetZ;
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
      Math.hypot(frame.center[0], frame.center[2]) > 2.35
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
      position: [0, 1, 1.66],
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
    timing.now = time;
    combat.pruneExpired(
      time,
      beamDurationMs,
      damagePopupDurationMs,
      deflectBurstDurationMs,
      healBurstDurationMs
    );
    textures.advanceLava(delta);

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
      enemyAiPaused,
      isCurrentRoomCombat: scene.isCurrentRoomCombat,
      pickups,
      player,
      room,
      roomHazards: scene.roomHazards,
      roomPlatforms: scene.roomPlatforms,
      timing,
    });
    const playerTookDamage = result.nextHealth < player.health;

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

    if (result.nextHealth <= 0) {
      resetPlayerAfterDeath({
        combat,
        dungeon: scene.dungeon,
        now: performance.now(),
        player,
        room,
        timing,
      });
      return;
    }

    player.health = result.nextHealth;
  };

  onMount(() => {
    textures.load();

    let frameId = 0;
    let previousTime = performance.now();

    const frame = (time: number) => {
      const delta = Math.min(0.05, (time - previousTime) / 1000);

      previousTime = time;

      if (scene.controlsLocked) {
        timing.now = time;
        textures.advanceLava(delta);
      } else {
        tick(time, delta);
      }

      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  });
</script>

<div class="scene">
  <Canvas shadows={PCFSoftShadowMap} dpr={2}>
    <SceneRendererConfig
      backgroundColor={outside ? "#c7d0c0" : "#050403"}
      environmentMap={textures.environmentMap}
      exposure={outside ? 0.82 : scene.settings.toneMappingExposure}
      onReady={markSceneReady}
      {preloadTextures}
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
      castShadow
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
      />

      <GameSceneActors />

      <PlayerController
        {orbitControls}
        onMeleeFrame={handleMelee}
        onPositionChange={handlePositionChange}
        onShoot={handleShoot}
      />

      {#each combat.projectiles as projectile (projectile.id)}
        <Projectile
          data={projectile}
          enemyTargets={scene.activeEnemyTargets}
          onExpire={(id) => combat.removeProjectile(id)}
          onMove={(id, pos) => combat.handleProjectileMove(id, pos)}
        />
      {/each}
    </World>
  </Canvas>

  <GameSceneOverlays overlays={scene.overlays} />

  {#if scene.sceneUiVisible}
    <GameMinimap {onOpenSettings} />

    <GameHud {onOpenSettings} {onOpenWeaponLab} />
  {/if}

  {#if !sceneReady}
    <div class="scene-loader">
      <div class="scene-loader-ring"></div>
      <span>Loading Foundry</span>
    </div>
  {/if}
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }

  .scene-loader {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    gap: 0.8rem;
    place-content: center;
    justify-items: center;
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(239, 247, 255, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    background: #050403;
  }

  .scene-loader-ring {
    inline-size: 3.2rem;
    block-size: 3.2rem;
    border: 0.18rem solid rgba(255, 191, 118, 0.18);
    border-top-color: #ffbd76;
    border-radius: 999px;
    animation: scene-loader-spin 0.8s linear infinite;
  }

  @keyframes scene-loader-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
