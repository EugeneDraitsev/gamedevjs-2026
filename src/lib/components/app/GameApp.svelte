<script lang="ts">
  import type { Component } from "svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { DEFAULT_SWING, type SwingParams } from "$lib/combat/melee-swing";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import WeaponLabModal from "$lib/components/weapon-lab/WeaponLabModal.svelte";
  import { createDungeonLayout } from "$lib/config/dungeon-layout";
  import {
    createSceneSettings,
    loadSceneSettings,
    type SceneSettings,
    saveSceneSettings,
  } from "$lib/config/scene-settings";
  import {
    computeWeaponBuild,
    createDefaultWeaponGraph,
    type WeaponNodeType,
  } from "$lib/config/weapon-graph";
  import { isEditableTarget } from "$lib/game/dom";
  import type { MeleeTrailSettings } from "$lib/types/game";

  interface GameAppProps {
    seed: string;
  }

  let { seed }: GameAppProps = $props();

  let DebugPane = $state<Component<{
    onResetDefaults: () => void;
    onResetScene: () => void;
    settings: SceneSettings;
  }> | null>(null);
  let paneLoadFailed = $state(false);
  let settings = $state(loadSceneSettings());
  let settingsOpen = $state(false);
  let sceneResetKey = $state(0);
  let weaponLabOpen = $state(false);
  let collectedArtifactRooms = $state<string[]>([]);
  let floorIndex = $state(1);

  const startingDungeon = $derived.by(() =>
    createDungeonLayout(`${seed}-f1`, 1)
  );
  const dungeon = $derived(
    createDungeonLayout(`${seed}-f${floorIndex}`, floorIndex)
  );
  let looseModules = $state<WeaponNodeType[]>([]);

  const defaultWeaponGraph = createDefaultWeaponGraph();

  let weaponNodes = $state.raw(defaultWeaponGraph.nodes);
  let weaponEdges = $state.raw(defaultWeaponGraph.edges);

  const weaponPreview = $derived(computeWeaponBuild(weaponNodes, weaponEdges));
  const controlsLocked = $derived(settingsOpen || weaponLabOpen);
  const debugEnabled = $derived(page.url.searchParams.get("debug") === "true");

  const swingParams = $derived<SwingParams>({
    ...DEFAULT_SWING,
    durationMs: settings.meleeDurationMs,
    endAngle: settings.meleeArcSpan / 2,
    reach: settings.meleeReach,
    startAngle: -settings.meleeArcSpan / 2,
  });
  const trailSettings = $derived<MeleeTrailSettings>({
    bandAlphas: [
      settings.meleeBand1Alpha,
      settings.meleeBand2Alpha,
      settings.meleeBand3Alpha,
    ],
    bandCenters: [
      settings.meleeBand1Center,
      settings.meleeBand2Center,
      settings.meleeBand3Center,
    ],
    bandWidths: [
      settings.meleeBand1Width,
      settings.meleeBand2Width,
      settings.meleeBand3Width,
    ],
    coreColor: settings.meleeCoreColor,
    edgeColor: settings.meleeEdgeColor,
    tailLength: settings.meleeTailLength,
  });

  const resetScene = () => {
    sceneResetKey += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
    resetScene();
  };

  const closeSettings = () => {
    settingsOpen = false;
  };

  const openMainMenu = async () => {
    await goto("/");
  };

  const setDebugEnabled = async (enabled: boolean) => {
    const nextUrl = new URL(page.url);

    if (enabled) {
      nextUrl.searchParams.set("debug", "true");
    } else {
      nextUrl.searchParams.delete("debug");
    }

    await goto(nextUrl, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  };

  const installModule = (type: WeaponNodeType) => {
    const index = looseModules.indexOf(type);

    if (index !== -1) {
      looseModules = looseModules.toSpliced(index, 1);
    }
  };

  const returnModule = (type: WeaponNodeType) => {
    looseModules = [...looseModules, type];
  };

  const collectArtifact = (roomId: string, type: WeaponNodeType) => {
    if (collectedArtifactRooms.includes(roomId)) {
      return;
    }

    collectedArtifactRooms = [...collectedArtifactRooms, roomId];
    looseModules = [...looseModules, type];

    if (floorIndex === 1 && dungeon.rooms[roomId]?.kind === "boss") {
      collectedArtifactRooms = [];
      floorIndex = 2;
    }
  };

  $effect(() => {
    saveSceneSettings(settings);
  });

  $effect(() => {
    seed;
    looseModules = [...startingDungeon.initialModules];
  });

  onMount(() => {
    let isActive = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (weaponLabOpen) {
          weaponLabOpen = false;
        } else {
          settingsOpen = !settingsOpen;
        }

        event.preventDefault();
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "KeyE" && !event.repeat && !settingsOpen) {
        weaponLabOpen = !weaponLabOpen;
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    import("$lib/components/debug/DebugPane.svelte")
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
  <title>Warden's Trial</title>
  <meta
    name="description"
    content="A dark-fantasy action prototype built with Threlte, Rapier, and Svelte."
  >
</svelte:head>

<main class="stage">
  {#key sceneResetKey}
    <GameScene
      collectedArtifactRoomIds={collectedArtifactRooms}
      {controlsLocked}
      {dungeon}
      meleeParams={swingParams}
      meleeTrailSettings={trailSettings}
      onCollectArtifact={collectArtifact}
      {settings}
      weaponBuild={weaponPreview}
    />
  {/key}

  {#if debugEnabled && DebugPane}
    <DebugPane
      bind:settings
      onResetDefaults={resetDefaults}
      onResetScene={resetScene}
    />
  {:else if debugEnabled && paneLoadFailed}
    <div class="pane-fallback">Debug pane failed to load.</div>
  {/if}

  {#if settingsOpen}
    <dialog class="settings-dialog" open>
      <SettingsPanel
        {debugEnabled}
        bind:settings
        onDebugEnabledChange={setDebugEnabled}
        onBack={closeSettings}
        onOpenMainMenu={openMainMenu}
        onResetDefaults={resetDefaults}
      />
    </dialog>
  {/if}

  <WeaponLabModal
    availableModules={looseModules}
    bind:edges={weaponEdges}
    bind:nodes={weaponNodes}
    onAddModule={installModule}
    open={weaponLabOpen}
    onReturnModule={returnModule}
    preview={weaponPreview}
    onClose={() => (weaponLabOpen = false)}
  />
</main>

<style>
  :global(body) {
    min-block-size: 100vh;
    margin: 0;
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    background: #040816;
  }

  :global(html) {
    overflow: hidden;
  }

  .stage {
    position: relative;
    min-block-size: 100vh;
    background:
      radial-gradient(circle at top, rgba(88, 166, 201, 0.16), transparent 35%),
      linear-gradient(180deg, #040816, #060d18 48%, #08101c);
  }

  :global(.stage > :first-child) {
    position: absolute;
    inset: 0;
  }

  .pane-fallback {
    position: fixed;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    color: rgba(246, 251, 255, 0.9);
    background: rgba(4, 8, 22, 0.35);
    border-radius: 999px;
    backdrop-filter: blur(8px);
  }

  .pane-fallback {
    right: 1rem;
    bottom: 1rem;
    z-index: 12;
  }

  .settings-dialog {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    inline-size: 100%;
    max-inline-size: none;
    block-size: 100%;
    max-block-size: none;
    padding: 1rem;
    background: transparent;
    border: 0;
  }

  .settings-dialog::backdrop {
    background:
      radial-gradient(
        circle at 50% 18%,
        rgba(219, 188, 118, 0.12),
        transparent 22%
      ),
      radial-gradient(
        circle at 50% 100%,
        rgba(45, 76, 112, 0.14),
        transparent 44%
      ),
      rgba(3, 8, 16, 0.74);
    backdrop-filter: blur(18px);
  }

  :global(.settings-dialog .panel) {
    display: grid;
    gap: 1.05rem;
    inline-size: min(100%, 36rem);
    padding: 1.55rem 1.5rem 1.4rem;
    color: #eff7ff;
    background:
      radial-gradient(
        circle at 50% 0,
        rgba(219, 188, 118, 0.14),
        transparent 26%
      ),
      linear-gradient(180deg, rgba(18, 16, 24, 0.94), rgba(6, 9, 17, 0.99)),
      repeating-linear-gradient(
        90deg,
        transparent 0 28px,
        rgba(212, 190, 132, 0.03) 28px 29px
      );
    border: 1px solid rgba(212, 190, 132, 0.16);
    border-radius: 1.25rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 243, 217, 0.05),
      0 24px 60px rgba(0, 0, 0, 0.34);
  }

  :global(.settings-dialog .eyebrow) {
    font-size: 0.74rem;
    font-weight: 800;
    color: rgba(221, 200, 154, 0.68);
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  :global(.settings-dialog .panel h1),
  :global(.settings-dialog .panel h2),
  :global(.settings-dialog .panel p) {
    margin: 0;
  }

  :global(.settings-dialog .panel p) {
    line-height: 1.5;
    color: rgba(221, 205, 171, 0.72);
  }

  :global(.settings-dialog .panel label span) {
    font-size: 0.74rem;
    font-weight: 700;
    color: rgba(221, 200, 154, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  :global(.settings-dialog .panel label) {
    display: grid;
    gap: 0.4rem;
  }

  :global(.settings-dialog .panel select) {
    font: inherit;
  }

  :global(.settings-dialog .panel select) {
    padding: 0.72rem 0.9rem;
    color: #f2e7c7;
    background: rgba(10, 11, 16, 0.82);
    border: 1px solid rgba(212, 190, 132, 0.14);
    border-radius: 0.9rem;
  }

  :global(.settings-dialog .panel .toggle) {
    grid-template-columns: auto 1fr;
    align-items: center;
  }
</style>
