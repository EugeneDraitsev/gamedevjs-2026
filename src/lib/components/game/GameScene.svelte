<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Debug, World } from "@threlte/rapier";
  import { onMount } from "svelte";
  import {
    type DirectionalLight,
    type OrthographicCamera,
    PCFShadowMap,
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
  import { stepEnemies } from "$lib/game/enemy-stepper";
  import {
    applyMeleeDeflects,
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
    createRoomEnemies,
    damagePopupDurationMs,
    doorOpenDelayMs,
    doorOpenDurationMs,
  } from "$lib/game/scene-layout";
  import { deflectBurstDurationMs } from "$lib/game/scene-ui";
  import { GameSceneStore } from "$lib/stores/game-scene.svelte";
  import { setGameSceneContext } from "$lib/stores/scene-context";
  import type { MeleeFrame, Vec3 } from "$lib/types/game";
  import type { GameSceneProps } from "$lib/types/game-components";

  let {
    collectedArtifactRoomIds = [],
    controlsLocked = false,
    dungeon,
    meleeParams,
    meleeTrailSettings,
    onCollectArtifact,
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
  const { combat, player, room, textures, timing } = scene;

  let orbitControls = $state<OrbitControlsInstance>();
  let sceneCamera = $state<PerspectiveCamera>();
  let sunLight = $state<DirectionalLight>();

  setGameSceneContext(scene);

  $effect(() => {
    syncSceneInputs();
  });

  $effect(() => {
    scene.camera = sceneCamera;
  });

  $effect(() => {
    dungeon.seed;
    timing.resetForFloor();
    combat.resetForFloor();
    room.resetForFloor(dungeon.startRoomId);
    player.resetForFloor();
  });

  $effect(() => {
    scene.currentRoom.id;
    combat.enemies = createRoomEnemies(
      scene.currentRoom,
      scene.currentRoomTemplate,
      room.entryDirection,
      room.clearedSet
    );
    combat.beams = [];
    combat.enemyShots = [];
    timing.lastHazardAt = performance.now();
    room.doorOpenAmount =
      scene.currentRoomTemplate.spawnPattern === "none" ||
      room.releasedSet.has(scene.currentRoom.id)
        ? 1
        : 0;
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

    const result = stepEnemies({
      combat,
      currentRoomId: scene.currentRoom.id,
      delta,
      doorOpenDelayMs,
      doorOpenDurationMs,
      isCurrentRoomCombat: scene.isCurrentRoomCombat,
      player,
      room,
      roomHazards: scene.roomHazards,
      timing,
    });

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
  <Canvas shadows={PCFShadowMap} dpr={2}>
    <SceneRendererConfig />
    <T.Fog attach="fog" args={['#040816', 13, 24]} />

    <T.PerspectiveCamera
      bind:ref={sceneCamera}
      makeDefault
      position={[0, 9, 6.4]}
      fov={scene.settings.cameraFov}
    >
      <OrbitControls
        bind:ref={orbitControls}
        enabled={scene.settings.cameraMode === "orbit"}
        enableDamping
        enablePan
        maxDistance={26}
        minDistance={4}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={['#9fd6ff', '#081221', 1.15]} />
    <T.AmbientLight intensity={scene.settings.ambientLightIntensity} />
    <T.DirectionalLight
      bind:ref={sunLight}
      castShadow
      intensity={scene.settings.sunIntensity}
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
