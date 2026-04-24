<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { World } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { Checkbox, Pane, Slider } from "svelte-tweakpane-ui";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import FloorExitPortal from "$lib/components/game/scene/environment/FloorExitPortal.svelte";
  import RoomFloor from "$lib/components/game/scene/environment/RoomFloor.svelte";
  import RoomHazards from "$lib/components/game/scene/environment/RoomHazards.svelte";
  import RoomPlatforms from "$lib/components/game/scene/environment/RoomPlatforms.svelte";
  import RoomTemplateEnvironment from "$lib/components/game/scene/environment/RoomTemplateEnvironment.svelte";
  import RoomWalls from "$lib/components/game/scene/environment/RoomWalls.svelte";
  import type { DungeonRoom } from "$lib/config/dungeon-layout";
  import { roomTemplateById } from "$lib/config/room-templates";
  import {
    createRoomWalls,
    floorThemes,
    getRoomBounds,
    getRoomHazards,
    getRoomPlatforms,
    getRoomSkin,
    wallThemes,
  } from "$lib/game/scene-layout";
  import { TextureStore } from "$lib/stores/textures.svelte";

  let { height = "720px" }: { height?: string } = $props();

  const textures = new TextureStore();
  const bossRoom: DungeonRoom = {
    exits: { south: "preview-entry" },
    grid: [0, 0],
    id: "boss-exit-preview",
    kind: "boss",
    label: "Boss Exit Preview",
    templateId: "boss-warden",
  };
  const bossTemplate = roomTemplateById["boss-warden"];
  const bossSkin = getRoomSkin(bossRoom, bossTemplate);
  const currentFloorPalette = floorThemes[bossSkin.floorTheme];
  const currentWallPalette = wallThemes[bossSkin.wallTheme];
  const roomBounds = getRoomBounds(bossTemplate.layout);
  const roomWalls = createRoomWalls(bossRoom, currentWallPalette, bossSkin);
  const roomHazards = getRoomHazards(bossTemplate.layout);
  const roomPlatforms = getRoomPlatforms(bossTemplate.layout);
  const preloadTextures = $derived([
    textures.bossBanner,
    textures.bossFloor,
    textures.bossFloorHeight,
    textures.bossFloorNormal,
    textures.foundryFloorDecals,
    textures.foundryWall,
    textures.lavaSurface,
  ]);

  let animationNow = $state(0);
  let autoPlay = $state(true);
  let openAmount = $state(0);

  onMount(() => {
    textures.load();

    let frameId = 0;
    let startedAt = performance.now();
    let previousTime = startedAt;

    const frame = (time: number) => {
      const delta = Math.min(0.05, (time - previousTime) / 1000);

      previousTime = time;
      animationNow = time;
      textures.advanceLava(delta);

      if (autoPlay) {
        const cycle = ((time - startedAt) % 3600) / 3600;
        openAmount = 0.5 - Math.cos(cycle * Math.PI * 2) * 0.5;
      } else {
        startedAt = time - openAmount * 3600;
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(frameId);
  });
</script>

<main class="stage" style:--h={height}>
  <Canvas dpr={2} shadows>
    <SceneRendererConfig
      exposure={1.1}
      {preloadTextures}
      showEnvironmentMap={false}
    />

    <T.Fog attach="fog" args={['#080604', 16, 28]} />

    <T.PerspectiveCamera fov={48} makeDefault position={[0, 7.3, 7.5]}>
      <OrbitControls
        enableDamping
        enablePan
        enableZoom
        maxDistance={18}
        minDistance={4}
        target={[0, 1.6, -3.7]}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={['#f0c38f', '#090604', 1.2]} />
    <T.AmbientLight intensity={0.42} />
    <T.DirectionalLight
      castShadow
      color="#ffbd76"
      intensity={2.7}
      position={[5, 9, 6]}
      shadow.mapSize={[1024, 1024]}
    />

    <World gravity={[0, -9.81, 0]}>
      <RoomFloor
        bossFloorHeightTexture={textures.bossFloorHeight}
        bossFloorNormalTexture={textures.bossFloorNormal}
        bossFloorTexture={textures.bossFloor}
        bounds={roomBounds}
        currentRoomId={bossRoom.id}
        currentRoomTemplate={bossTemplate}
        floorReliefStrength={1.4}
        foundryFloorDecalTexture={textures.foundryFloorDecals}
        foundryFloorTexture={textures.foundryFloor}
      />

      <RoomWalls
        {animationNow}
        decoratedWallFacings={["east", "south", "west"]}
        foundryWallDecalTexture={textures.foundryFloorDecals}
        foundryWallTexture={textures.foundryWall}
        gearlessWallFacings={["south"]}
        {roomWalls}
        showWallKit
      />

      <RoomHazards
        {animationNow}
        lavaSurfaceTexture={textures.lavaSurface}
        {roomHazards}
      />
      <RoomPlatforms {animationNow} {roomPlatforms} />

      <RoomTemplateEnvironment
        {animationNow}
        bossBannerTexture={textures.bossBanner}
        {currentFloorPalette}
        environment={bossTemplate.environment}
        floorExitOpenAmount={openAmount}
      />

      <FloorExitPortal active {animationNow} {openAmount} />
    </World>
  </Canvas>

  <div class="controls">
    <Pane position="inline" title="Boss Exit" width={280}>
      <Checkbox bind:value={autoPlay} label="Auto play" />
      <Slider
        bind:value={openAmount}
        label="Open"
        max={1}
        min={0}
        step={0.01}
      />
    </Pane>
  </div>
</main>

<style>
  .stage {
    position: relative;
    inline-size: 100%;
    block-size: var(--h);
    overflow: hidden;
    background: #080604;
  }

  .controls {
    position: absolute;
    inset-block-start: 1rem;
    inset-inline-start: 1rem;
    z-index: 5;
  }
</style>
