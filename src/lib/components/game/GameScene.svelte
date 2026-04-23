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
    getRoomBounds,
  } from "$lib/game/scene-layout";
  import { deflectBurstDurationMs } from "$lib/game/scene-ui";
  import { cheats } from "$lib/stores/cheats.svelte";
  import { GameSceneStore } from "$lib/stores/game-scene.svelte";
  import { setGameSceneContext } from "$lib/stores/scene-context";
  import type { MeleeFrame, Vec3 } from "$lib/types/game";
  import type { GameSceneProps } from "$lib/types/game-components";

  let {
    collectedArtifactRoomIds = [],
    controlsLocked = false,
    dungeon,
    gearCount = 0,
    meleeParams,
    meleeTrailSettings,
    onCollectArtifact,
    onGearCountChange,
    onOpenSettings,
    onOpenWeaponLab,
    settings,
    weaponBuild,
  }: GameSceneProps = $props();

  const scene = new GameSceneStore();
  const syncSceneInputs = () =>
    scene.syncInputs({
      collectedArtifactRoomIds,
      controlsLocked,
      dungeon,
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
  const sceneCamera = $derived(
    scene.settings.cameraOrthographic ? orthographicCamera : perspectiveCamera
  );
  const outside = $derived(scene.currentRoomTemplate.layout === "outside-yard");

  setGameSceneContext(scene);

  $effect(() => {
    syncSceneInputs();
  });

  $effect(() => {
    scene.pickups.gears = gearCount;
  });

  $effect(() => {
    scene.camera = sceneCamera;
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
        currentRoomTemplate,
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
    spawnPlayerProjectile({
      combat,
      player,
      position,
      velocity,
      weaponBuild: scene.weaponBuild,
    });
  };

  const handlePositionChange = (position: Vec3) => {
    const pickupResult = pickups.collectAt(
      position,
      player.health,
      player.maxHealth
    );

    if (pickupResult.healthDelta > 0) {
      player.health = pickupResult.nextHealth;
    }

    if (pickupResult.gearDelta > 0) {
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
  };

  const handleMelee = (frame: MeleeFrame) => {
    handleMeleeFrame(combat, frame);
  };

  const tick = (time: number, delta: number) => {
    timing.now = time;
    combat.pruneExpired(
      time,
      beamDurationMs,
      damagePopupDurationMs,
      deflectBurstDurationMs
    );
    textures.advanceLava(delta);

    if (!timing.bossIntroActive && combat.currentMeleeFrame) {
      applyMeleeHitsToEnemies({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
        weaponBuild: scene.weaponBuild,
      });
      applyMeleeHitsToBombs({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
        weaponBuild: scene.weaponBuild,
      });
      applyMeleeDeflects({
        combat,
        frame: combat.currentMeleeFrame,
        hitboxPadding: settings.meleeHitboxPadding,
        meleeParams: scene.meleeParams,
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
      isCurrentRoomCombat: scene.isCurrentRoomCombat,
      pickups,
      player,
      room,
      roomHazards: scene.roomHazards,
      roomPlatforms: scene.roomPlatforms,
      timing,
    });

    if (cheats.infiniteHealth) {
      player.health = player.maxHealth;
      return;
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
      if (scene.controlsLocked) {
        previousTime = time;
        timing.now = time;
      } else {
        const delta = Math.min(0.05, (time - previousTime) / 1000);

        previousTime = time;
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
      backgroundColor={outside ? "#d7ded8" : "#050403"}
      exposure={scene.settings.toneMappingExposure}
    />
    <T.Fog
      attach="fog"
      args={[
        outside ? '#d7ded8' : '#080604',
        outside ? 70 : scene.settings.fogNear,
        outside ? 230 : scene.settings.fogFar,
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
        outside ? '#f2f0d5' : '#c18455',
        outside ? '#77846f' : '#050403',
        outside ? 1.2 : scene.settings.hemisphereLightIntensity,
      ]}
    />
    <T.AmbientLight intensity={scene.settings.ambientLightIntensity} />
    <T.DirectionalLight
      bind:ref={sunLight}
      castShadow
      color={outside ? '#fff0ca' : '#ffbd76'}
      intensity={outside ? 2.55 : scene.settings.sunIntensity}
      position={[
        scene.settings.sunPositionX,
        scene.settings.sunPositionY,
        scene.settings.sunPositionZ,
      ]}
    />

    <World gravity={[0, scene.settings.gravityY, 0]}>
      {#if scene.settings.showPhysicsDebug}
        <Debug />
      {/if}

      <GameSceneEnvironment />

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
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }
</style>
