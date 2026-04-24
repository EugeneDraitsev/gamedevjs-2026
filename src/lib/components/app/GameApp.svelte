<script lang="ts">
  import type { Component } from "svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import {
    gameMusic,
    type MusicCue,
    type MusicTransitionOptions,
  } from "$lib/audio/music";
  import { gameSfx } from "$lib/audio/sfx";
  import { DEFAULT_SWING, type SwingParams } from "$lib/combat/melee-swing";
  import FloorAdvanceTransition from "$lib/components/app/FloorAdvanceTransition.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import MobileControls from "$lib/components/game/MobileControls.svelte";
  import MachineBayModal from "$lib/components/machine-bay/MachineBayModal.svelte";
  import { createDungeonLayout } from "$lib/config/dungeon-layout";
  import {
    computeMachineStats,
    createDefaultMachineLoadout,
    createDefaultModuleInventory,
    getMachineModule,
    hasMachineModule,
    type MachineLoadout,
    type MachineModuleId,
    type MachineSlotId,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";
  import {
    getNextRunFloor,
    initialDungeonFloor,
    normalizeRunFloorIndex,
    outsideFloor,
  } from "$lib/config/run-floor";
  import {
    createSceneSettings,
    loadSceneSettings,
    type SceneSettings,
    saveSceneSettings,
  } from "$lib/config/scene-settings";
  import { isEditableTarget } from "$lib/game/dom";
  import { isTouchDevice } from "$lib/game/mobile";
  import { setOutsideChunkSeed } from "$lib/game/outside-chunk-context";
  import {
    clearRunSave,
    createDefaultRunState,
    loadRunSave,
    type SavedRunState,
    saveRunSave,
  } from "$lib/game/run-save";
  import { mobileInput } from "$lib/stores/mobile-input.svelte";
  import type { MeleeTrailSettings } from "$lib/types/game";

  interface GameAppProps {
    seed: string;
  }

  type FloorAdvancePhase = "covered" | "closing" | "idle" | "opening";

  const floorAdvanceCloseMs = 620;
  const floorAdvanceHoldMs = 520;
  const floorAdvanceOpenMs = 760;

  let { seed }: GameAppProps = $props();

  let DebugPane = $state<Component<{
    currentFloor: number;
    onResetDefaults: () => void;
    onResetLevel: () => void;
    onResetScene: () => void;
    onSelectFloor: (floor: number) => void;
    settings: SceneSettings;
  }> | null>(null);
  let paneLoadFailed = $state(false);
  let settings = $state(loadSceneSettings());
  let settingsOpen = $state(false);
  let sceneResetKey = $state(0);
  let machineBayOpen = $state(false);
  let demoCompleteOpen = $state(false);
  let collectedArtifactRooms = $state<string[]>([]);
  let floorIndex = $state(initialDungeonFloor);
  let floorAdvanceTarget = $state(getNextRunFloor(initialDungeonFloor));
  let floorAdvancePending = $state(false);
  let floorAdvancePhase = $state<FloorAdvancePhase>("idle");
  let floorAdvanceTimers: number[] = [];
  let gearCount = $state(0);
  let runReady = $state(page.url.searchParams.get("continue") !== "1");
  let touchControls = $state(false);
  let machineLoadout = $state<MachineLoadout>(createDefaultMachineLoadout());
  let moduleInventory = $state<MachineModuleId[]>(
    createDefaultModuleInventory()
  );
  let musicFloorIndex: number | null = null;

  const dungeon = $derived(
    createDungeonLayout(`${seed}-f${floorIndex}`, floorIndex)
  );
  const machineStats = $derived(computeMachineStats(machineLoadout));
  const controlsLocked = $derived(
    settingsOpen ||
      machineBayOpen ||
      demoCompleteOpen ||
      floorAdvancePhase !== "idle"
  );
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

  const clearFloorAdvanceTimers = () => {
    for (const timer of floorAdvanceTimers) {
      window.clearTimeout(timer);
    }

    floorAdvanceTimers = [];
  };

  const scheduleFloorAdvanceStep = (callback: () => void, delayMs: number) => {
    const timer = window.setTimeout(() => {
      floorAdvanceTimers = floorAdvanceTimers.filter(
        (entry) => entry !== timer
      );
      callback();
    }, delayMs);

    floorAdvanceTimers = [...floorAdvanceTimers, timer];
  };

  const resetFloorAdvanceTransition = () => {
    clearFloorAdvanceTimers();
    floorAdvancePending = false;
    floorAdvancePhase = "idle";
  };

  const applyRunState = (state: SavedRunState) => {
    collectedArtifactRooms = [...state.collectedArtifactRooms];
    demoCompleteOpen = false;
    floorIndex = state.floorIndex;
    floorAdvanceTarget = getNextRunFloor(state.floorIndex);
    gearCount = state.gearCount ?? 0;
    machineLoadout = { ...state.machineLoadout };
    moduleInventory = [...state.moduleInventory];
  };

  const resetLevel = () => {
    resetFloorAdvanceTransition();
    clearRunSave(seed);
    applyRunState(createDefaultRunState());
    resetScene();
  };

  const selectDebugFloor = (floor: number) => {
    const nextFloor = normalizeRunFloorIndex(floor);

    resetFloorAdvanceTransition();
    settingsOpen = false;
    machineBayOpen = false;
    demoCompleteOpen = false;
    collectedArtifactRooms = [];
    floorIndex = nextFloor;
    floorAdvanceTarget = getNextRunFloor(nextFloor);
    resetScene();
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
    resetScene();
  };

  const closeSettings = () => {
    settingsOpen = false;
  };

  const closeDemoComplete = () => {
    demoCompleteOpen = false;
  };

  const openDemoComplete = () => {
    settingsOpen = false;
    machineBayOpen = false;
    demoCompleteOpen = true;
  };

  const openSettings = () => {
    demoCompleteOpen = false;
    machineBayOpen = false;
    settingsOpen = true;
  };

  const getMusicTransitionDefaults = (
    cue: MusicCue,
    options: MusicTransitionOptions
  ): MusicTransitionOptions => {
    if (cue === "boss") {
      return { fadeInMs: 2600, fadeOutMs: 1900, startDelayMs: 420 };
    }

    if (cue === "level") {
      return {
        fadeInMs: options.restart ? 2200 : 1900,
        fadeOutMs: options.restart ? 1700 : 1500,
        startDelayMs: options.restart ? 420 : 260,
      };
    }

    return { fadeOutMs: 1800 };
  };

  const handleMusicCue = (
    cue: MusicCue,
    options: MusicTransitionOptions = {}
  ) => {
    const defaults = getMusicTransitionDefaults(cue, options);

    gameMusic.playCue(cue, {
      ...defaults,
      ...options,
    });
  };

  const openMachineBay = () => {
    if (settingsOpen || demoCompleteOpen) {
      return;
    }

    machineBayOpen = true;
  };

  const withDebugParam = (path: string) => {
    const nextUrl = new URL(path, page.url);

    if (page.url.searchParams.get("debug") === "true") {
      nextUrl.searchParams.set("debug", "true");
    }

    return nextUrl;
  };
  const sceneKey = () => {
    setOutsideChunkSeed(`outside-${dungeon.seed}`);
    return `${dungeon.seed}:${sceneResetKey}`;
  };

  const openMainMenu = async () => {
    demoCompleteOpen = false;
    gameMusic.playCue("menu", {
      fadeInMs: 2400,
      fadeOutMs: 1800,
      startDelayMs: 360,
    });
    await goto(withDebugParam("/"));
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

  const removeInventoryModule = (moduleId: MachineModuleId) => {
    const index = moduleInventory.indexOf(moduleId);

    if (index === -1) {
      return null;
    }

    moduleInventory = moduleInventory.toSpliced(index, 1);
    return moduleId;
  };

  const installModule = (moduleId: MachineModuleId, slotId: MachineSlotId) => {
    if (!moduleFitsSlot(moduleId, slotId)) {
      return;
    }

    const removed = removeInventoryModule(moduleId);

    if (!removed) {
      return;
    }

    const previous = machineLoadout[slotId];

    machineLoadout = { ...machineLoadout, [slotId]: moduleId };

    if (previous) {
      moduleInventory = [...moduleInventory, previous];
    }
  };

  const ejectModule = (slotId: MachineSlotId) => {
    const moduleId = machineLoadout[slotId];

    if (!moduleId) {
      return;
    }

    machineLoadout = { ...machineLoadout, [slotId]: null };
    moduleInventory = [...moduleInventory, moduleId];
  };

  const scrapModule = (moduleId: MachineModuleId) => {
    const removed = removeInventoryModule(moduleId);

    if (!removed) {
      return;
    }

    gearCount +=
      getMachineModule(moduleId).scrapValue + machineStats.scrapYieldBonus;
  };

  const collectArtifact = (roomId: string, type: MachineModuleId) => {
    if (collectedArtifactRooms.includes(roomId)) {
      return;
    }

    collectedArtifactRooms = [...collectedArtifactRooms, roomId];

    if (hasMachineModule(machineLoadout, moduleInventory, type)) {
      gearCount +=
        getMachineModule(type).scrapValue + machineStats.scrapYieldBonus;
    } else {
      moduleInventory = [...moduleInventory, type];
    }
  };

  const advanceFloor = () => {
    if (floorAdvancePending || floorIndex >= outsideFloor) {
      return;
    }

    const nextFloor = getNextRunFloor(floorIndex);

    clearFloorAdvanceTimers();
    floorAdvancePending = true;
    settingsOpen = false;
    machineBayOpen = false;
    demoCompleteOpen = false;
    floorAdvanceTarget = nextFloor;
    floorAdvancePhase = "closing";

    scheduleFloorAdvanceStep(() => {
      floorAdvancePhase = "covered";
      collectedArtifactRooms = [];
      floorIndex = nextFloor;

      scheduleFloorAdvanceStep(() => {
        floorAdvancePhase = "opening";

        scheduleFloorAdvanceStep(() => {
          floorAdvancePhase = "idle";
          floorAdvancePending = false;
        }, floorAdvanceOpenMs);
      }, floorAdvanceHoldMs);
    }, floorAdvanceCloseMs);
  };

  $effect(() => {
    saveSceneSettings(settings);
    gameMusic.syncMix(settings);
    gameSfx.syncMix(settings);
  });

  $effect(() => {
    if (!runReady) {
      return;
    }

    const restart = musicFloorIndex !== null && musicFloorIndex !== floorIndex;

    musicFloorIndex = floorIndex;
    handleMusicCue("level", { restart });
  });

  $effect(() => {
    if (!runReady) {
      return;
    }

    saveRunSave(seed, {
      collectedArtifactRooms,
      floorIndex,
      gearCount,
      machineLoadout,
      moduleInventory,
      version: 2,
    });
  });

  $effect(() => {
    seed;
    resetFloorAdvanceTransition();
    applyRunState(createDefaultRunState());
  });

  onMount(() => {
    const savedRun = loadRunSave(seed);

    if (page.url.searchParams.get("continue") === "1" && savedRun) {
      applyRunState(savedRun);
    }

    runReady = true;
    touchControls = isTouchDevice();
    gameMusic.preload();
    gameMusic.syncMix(settings);
    gameSfx.syncMix(settings);

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const onCoarseChange = (event: MediaQueryListEvent) => {
      touchControls = event.matches || isTouchDevice();
    };

    coarseQuery.addEventListener("change", onCoarseChange);

    let isActive = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (demoCompleteOpen) {
          demoCompleteOpen = false;
        } else if (machineBayOpen) {
          machineBayOpen = false;
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
        machineBayOpen = !machineBayOpen;
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
      clearFloorAdvanceTimers();
      window.removeEventListener("keydown", handleKeyDown);
      coarseQuery.removeEventListener("change", onCoarseChange);
      mobileInput.reset();
    };
  });

  $effect(() => {
    if (controlsLocked) {
      mobileInput.reset();
    }
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
  {#if runReady}
    {#key sceneKey()}
      <GameScene
        collectedArtifactRoomIds={collectedArtifactRooms}
        {controlsLocked}
        {dungeon}
        {gearCount}
        meleeParams={swingParams}
        meleeTrailSettings={trailSettings}
        onAdvanceFloor={advanceFloor}
        onCollectArtifact={collectArtifact}
        onEndDemo={openDemoComplete}
        onGearCountChange={(value) => (gearCount = value)}
        onMusicCue={handleMusicCue}
        onOpenSettings={openSettings}
        onOpenWeaponLab={openMachineBay}
        {settings}
        {machineStats}
        weaponBuild={machineStats.weaponBuild}
      />
    {/key}
  {/if}

  <MobileControls visible={touchControls && !controlsLocked} />

  <FloorAdvanceTransition
    nextFloor={floorAdvanceTarget}
    phase={floorAdvancePhase}
  />

  {#if debugEnabled && DebugPane}
    <DebugPane
      bind:settings
      currentFloor={floorIndex}
      onResetDefaults={resetDefaults}
      onResetLevel={resetLevel}
      onResetScene={resetScene}
      onSelectFloor={selectDebugFloor}
    />
  {:else if debugEnabled && paneLoadFailed}
    <div class="pane-fallback">Debug pane failed to load.</div>
  {/if}

  {#if settingsOpen}
    <dialog
      class="settings-dialog"
      open
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closeSettings();
        }
      }}
    >
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

  {#if demoCompleteOpen}
    <dialog
      class="demo-dialog"
      open
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closeDemoComplete();
        }
      }}
    >
      <div class="demo-panel">
        <strong>End of the demo</strong>
        <div class="demo-actions">
          <button type="button" onclick={closeDemoComplete}>Close</button>
          <button type="button" class="primary" onclick={openMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </dialog>
  {/if}

  <MachineBayModal
    {gearCount}
    {machineLoadout}
    {machineStats}
    {moduleInventory}
    onClose={() => (machineBayOpen = false)}
    onEjectModule={ejectModule}
    onInstallModule={installModule}
    onScrapModule={scrapModule}
    open={machineBayOpen}
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

  .demo-dialog {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: grid;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
    padding: 1.5rem;
    color: #f6fbff;
    background: rgba(2, 5, 9, 0.68);
    border: 0;
    backdrop-filter: blur(10px);
  }

  .demo-panel {
    display: grid;
    gap: 1.2rem;
    inline-size: min(28rem, 100%);
    padding: 1.4rem;
    background: rgba(10, 16, 20, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.42);
  }

  .demo-panel strong {
    font-size: 1.35rem;
    line-height: 1.15;
  }

  .demo-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: flex-end;
  }

  .demo-actions button {
    min-inline-size: 7.5rem;
    padding: 0.68rem 0.9rem;
    font: inherit;
    font-weight: 800;
    color: rgba(246, 251, 255, 0.88);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
  }

  .demo-actions button.primary {
    color: #061018;
    background: #f7c66b;
    border-color: rgba(247, 198, 107, 0.72);
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
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 100vw;
    max-inline-size: 100vw;
    block-size: 100dvh;
    max-block-size: 100dvh;
    padding: 1.5rem;
    margin: 0;
    background: transparent;
    border: 0;
  }

  @media (max-width: 700px) {
    .settings-dialog {
      padding: 1rem;
    }
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
    max-block-size: calc(100dvh - 3rem);
    padding: 1.55rem 1.5rem 1.4rem;
    margin: 0;
    overflow-y: auto;
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

  @media (max-width: 700px) {
    :global(.settings-dialog .panel) {
      gap: 1rem;
      inline-size: min(100%, 20rem);
      max-block-size: calc(100dvh - 2.5rem);
      padding: 1.4rem 1.25rem 1.25rem;
      overflow-y: auto;
      border-radius: 1rem;
    }

    :global(.settings-dialog .panel .actions) {
      gap: 0.7rem;
      padding-top: 0.7rem;
      margin-top: 0.4rem;
    }

    :global(.settings-dialog .panel .toggle) {
      padding-block: 0.2rem;
    }

    :global(.settings-dialog .panel .menu-button) {
      font-size: 1.05rem;
    }
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
