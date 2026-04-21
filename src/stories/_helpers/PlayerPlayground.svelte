<script lang="ts">
  import { onMount } from "svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import {
    createSceneSettings,
    type SceneSettings,
  } from "$lib/config/scene-settings";
  import {
    buildPlaygroundDungeon,
    buildPlaygroundMeleeParams,
    buildPlaygroundTrailSettings,
    noop,
    playgroundWeaponBuild,
  } from "./playground-scene";

  let settings = $state<SceneSettings>(createSceneSettings());
  let sceneResetKey = $state(0);
  let DebugPane = $state<
    typeof import("$lib/components/debug/DebugPane.svelte").default | null
  >(null);

  const dungeon = $derived(
    buildPlaygroundDungeon("polygon-training", `playground-${sceneResetKey}`)
  );
  const meleeParams = $derived(buildPlaygroundMeleeParams(settings));
  const trailSettings = $derived(buildPlaygroundTrailSettings(settings));

  const resetScene = () => {
    sceneResetKey += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
    resetScene();
  };

  onMount(() => {
    import("$lib/components/debug/DebugPane.svelte").then((module) => {
      DebugPane = module.default;
    });
  });
</script>

<main class="stage">
  {#key sceneResetKey}
    <GameScene
      collectedArtifactRoomIds={[]}
      controlsLocked={false}
      {dungeon}
      {meleeParams}
      meleeTrailSettings={trailSettings}
      onCollectArtifact={noop}
      onOpenSettings={noop}
      onOpenWeaponLab={noop}
      {settings}
      weaponBuild={playgroundWeaponBuild}
    />
  {/key}

  {#if DebugPane}
    <DebugPane
      bind:settings
      onResetDefaults={resetDefaults}
      onResetLevel={resetScene}
      onResetScene={resetScene}
    />
  {/if}
</main>

<style>
  .stage {
    position: relative;
    inline-size: 100%;
    block-size: 100vh;
    background:
      radial-gradient(circle at top, rgba(88, 166, 201, 0.16), transparent 35%),
      linear-gradient(180deg, #040816, #060d18 48%, #08101c);
  }

  .stage > :global(:first-child) {
    position: absolute;
    inset: 0;
  }
</style>
