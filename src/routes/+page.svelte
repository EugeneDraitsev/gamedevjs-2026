<script lang="ts">
  import type { Component } from "svelte";
  import { onMount } from "svelte";
  import PhysicsShowcase from "$lib/components/physics-showcase.svelte";
  import WeaponLabModal from "$lib/components/weapon-lab-modal.svelte";
  import type { SceneSettings } from "$lib/config/scene-settings";
  import { createSceneSettings } from "$lib/config/scene-settings";
  import {
    computeWeaponBuild,
    createDefaultWeaponGraph,
  } from "$lib/config/weapon-graph";

  let DebugPane = $state<Component<{
    onResetDefaults: () => void;
    onResetScene: () => void;
    settings: SceneSettings;
  }> | null>(null);
  let paneLoadFailed = $state(false);
  let settings = $state(createSceneSettings());
  let sceneResetKey = $state(0);
  let weaponLabOpen = $state(false);

  const defaultWeaponGraph = createDefaultWeaponGraph();

  let weaponNodes = $state.raw(defaultWeaponGraph.nodes);
  let weaponEdges = $state.raw(defaultWeaponGraph.edges);

  const weaponPreview = $derived(computeWeaponBuild(weaponNodes, weaponEdges));

  const resetScene = () => {
    sceneResetKey += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
    resetScene();
  };

  const isEditableTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(
      target.isContentEditable ||
        target.closest(
          "input, textarea, select, button, [contenteditable='true']"
        )
    );

  const controlsHint = $derived.by(() => {
    if (weaponLabOpen) {
      return "Weapon Lab open: fit up to 3 modules in the weapon rack";
    }

    return settings.cameraMode === "orbit"
      ? "Mouse to orbit, WASD to pan camera, E opens Weapon Lab"
      : "Mouse aim, LMB shoot, WASD move, Space jump, E opens Weapon Lab";
  });

  onMount(() => {
    let isActive = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "KeyE" && !event.repeat) {
        weaponLabOpen = !weaponLabOpen;
        event.preventDefault();
      }

      if (event.code === "Escape" && weaponLabOpen) {
        weaponLabOpen = false;
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    import("$lib/components/debug-pane.svelte")
      .then((module) => {
        if (isActive) {
          DebugPane = module.default;
        }
      })
      .catch(() => {
        if (isActive) {
          paneLoadFailed = true;
        }
      });

    return () => {
      isActive = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<svelte:head>
  <title>Third-Person Ball Prototype</title>
  <meta
    name="description"
    content="A minimal third-person ball controller prototype built with Threlte, Rapier, and Svelte Tweakpane UI."
  >
</svelte:head>

<main class="stage">
  {#key sceneResetKey}
    <PhysicsShowcase
      ambientLightIntensity={settings.ambientLightIntensity}
      cameraFov={settings.cameraFov}
      cameraMode={settings.cameraMode}
      cameraSmoothing={settings.cameraSmoothing}
      controlsLocked={weaponLabOpen}
      followDistance={settings.followDistance}
      followPitch={settings.followPitch}
      followYaw={settings.followYaw}
      gravityY={settings.gravityY}
      jumpSpeed={settings.jumpSpeed}
      lookHeight={settings.lookHeight}
      moveResponsiveness={settings.moveResponsiveness}
      moveSpeed={settings.moveSpeed}
      playerLinearDamping={settings.playerLinearDamping}
      shadowBias={settings.shadowBias}
      shadowFar={settings.shadowFar}
      shadowFrustum={settings.shadowFrustum}
      shadowMapSize={settings.shadowMapSize}
      shadowNormalBias={settings.shadowNormalBias}
      showDebugGeometry={settings.showDebugGeometry}
      showPhysicsDebug={settings.showPhysicsDebug}
      sunIntensity={settings.sunIntensity}
      sunPositionX={settings.sunPositionX}
      sunPositionY={settings.sunPositionY}
      sunPositionZ={settings.sunPositionZ}
      weaponBuild={weaponPreview}
    />
  {/key}

  {#if DebugPane}
    <DebugPane
      bind:settings
      onResetDefaults={resetDefaults}
      onResetScene={resetScene}
    />
  {:else if paneLoadFailed}
    <div class="pane-fallback">Debug pane failed to load.</div>
  {/if}

  <div class="hint">{controlsHint}</div>

  <WeaponLabModal
    bind:edges={weaponEdges}
    bind:nodes={weaponNodes}
    open={weaponLabOpen}
    preview={weaponPreview}
    onClose={() => (weaponLabOpen = false)}
  />
</main>

<style>
  :global(body) {
    min-block-size: 100vh;
    margin: 0;
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top, rgba(54, 113, 170, 0.45), transparent 42%),
      linear-gradient(180deg, #030711 0%, #071424 48%, #0a1c2c 100%);
  }

  :global(html) {
    overflow: hidden;
  }

  .stage {
    position: relative;
    min-block-size: 100vh;
  }

  :global(.stage > :first-child) {
    position: absolute;
    inset: 0;
  }

  .hint,
  .pane-fallback {
    position: fixed;
    left: 1rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    color: rgba(246, 251, 255, 0.9);
    background: rgba(4, 8, 22, 0.35);
    border-radius: 999px;
    backdrop-filter: blur(8px);
  }

  .hint {
    bottom: 1rem;
    z-index: 0;
  }

  .pane-fallback {
    top: 1rem;
    z-index: 2;
  }
</style>
