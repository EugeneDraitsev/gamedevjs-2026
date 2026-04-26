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
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import DeathModal from "$lib/components/app/DeathModal.svelte";
  import EndDemoModal from "$lib/components/app/EndDemoModal.svelte";
  import FloorAdvanceTransition from "$lib/components/app/FloorAdvanceTransition.svelte";
  import HowToPlayPanel from "$lib/components/app/HowToPlayPanel.svelte";
  import SceneLoadingOverlay from "$lib/components/app/SceneLoadingOverlay.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import MobileControls from "$lib/components/game/MobileControls.svelte";
  import LoadoutModal from "$lib/components/loadout/LoadoutModal.svelte";
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
    machineModuleIds,
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
  import type { ShopOffer } from "$lib/config/shop-offers";
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
  import { playerDeathAnimationMs } from "$lib/game/scene-layout";
  import { cheats } from "$lib/stores/cheats.svelte";
  import { mobileInput } from "$lib/stores/mobile-input.svelte";
  import type { MeleeTrailSettings } from "$lib/types/game";
  import type {
    GameSceneProps,
    SceneLoadProgress,
  } from "$lib/types/game-components";

  interface GameAppProps {
    seed: string;
  }

  type FloorAdvancePhase = "covered" | "closing" | "idle" | "opening";

  const floorAdvanceCloseMs = 620;
  const floorAdvanceHoldMs = 520;
  const floorAdvanceOpenMs = 760;
  let gameSceneImport: Promise<Component<GameSceneProps>> | null = null;

  const loadGameSceneComponent = () => {
    gameSceneImport ??= import("$lib/components/game/GameScene.svelte").then(
      (module) => module.default
    );

    return gameSceneImport;
  };

  let { seed }: GameAppProps = $props();

  let GameSceneComponent = $state<Component<GameSceneProps> | null>(null);
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
  let howToPlayOpen = $state(false);
  let sceneResetKey = $state(0);
  let loadoutOpen = $state(false);
  let demoCompleteOpen = $state(false);
  let collectedArtifactRooms = $state<string[]>([]);
  let floorIndex = $state(initialDungeonFloor);
  let floorAdvanceTarget = $state(getNextRunFloor(initialDungeonFloor));
  let floorAdvancePending = $state(false);
  let floorAdvancePhase = $state<FloorAdvancePhase>("idle");
  let floorAdvanceTimers: number[] = [];
  let gearCount = $state(0);
  let runReady = $state(page.url.searchParams.get("continue") !== "1");
  let sceneBootReady = $state(false);
  let sceneLoadFailed = $state(false);
  let sceneLoadProgress = $state<SceneLoadProgress>({
    detail: "Preparing run",
    label: "Loading",
    progress: 0,
  });
  let sceneReady = $state(false);
  let touchControls = $state(false);
  let machineLoadout = $state<MachineLoadout>(createDefaultMachineLoadout());
  let moduleInventory = $state<MachineModuleId[]>(
    createDefaultModuleInventory()
  );
  let newModuleIds = $state<MachineModuleId[]>([]);
  let purchasedShopOfferIds = $state<string[]>([]);
  let playerDeathPending = $state(false);
  let deathModalOpen = $state(false);
  let revivalNonce = $state(0);
  let musicFloorIndex: number | null = null;
  let lastGiveAllModulesNonce = 0;
  let deathModalTimer = 0;

  const dungeon = $derived(
    createDungeonLayout(`${seed}-f${floorIndex}`, floorIndex)
  );
  const machineStats = $derived(computeMachineStats(machineLoadout));
  const controlsLocked = $derived(
    settingsOpen ||
      loadoutOpen ||
      demoCompleteOpen ||
      deathModalOpen ||
      playerDeathPending ||
      floorAdvancePhase !== "idle"
  );
  const runtimeControlsLocked = $derived(controlsLocked || !sceneReady);
  const sceneInstanceKey = $derived(`${dungeon.seed}:${sceneResetKey}`);
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
    newModuleIds = [...(state.newModuleIds ?? [])];
    purchasedShopOfferIds = [...(state.purchasedShopOfferIds ?? [])];
    playerDeathPending = false;
    deathModalOpen = false;
    if (deathModalTimer) {
      window.clearTimeout(deathModalTimer);
      deathModalTimer = 0;
    }
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
    loadoutOpen = false;
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
    howToPlayOpen = false;
  };

  const closeHowToPlay = () => {
    howToPlayOpen = false;
  };

  const openHowToPlay = () => {
    howToPlayOpen = true;
  };

  const closeDemoComplete = () => {
    demoCompleteOpen = false;
  };

  const openDemoComplete = () => {
    settingsOpen = false;
    loadoutOpen = false;
    demoCompleteOpen = true;
  };

  const openSettings = () => {
    demoCompleteOpen = false;
    loadoutOpen = false;
    howToPlayOpen = false;
    settingsOpen = true;
  };

  const handleEscapeMenu = () => {
    if (demoCompleteOpen) {
      demoCompleteOpen = false;
      return;
    }

    if (loadoutOpen) {
      loadoutOpen = false;
      return;
    }

    if (settingsOpen && howToPlayOpen) {
      howToPlayOpen = false;
      return;
    }

    if (settingsOpen) {
      closeSettings();
      return;
    }

    openSettings();
  };

  const getMusicTransitionDefaults = (
    cue: MusicCue,
    options: MusicTransitionOptions
  ): MusicTransitionOptions => {
    if (cue === "boss" || cue === "boss-catacombs") {
      return { fadeInMs: 2600, fadeOutMs: 1900, startDelayMs: 420 };
    }

    if (cue === "level") {
      return {
        fadeInMs: options.restart ? 2200 : 1900,
        fadeOutMs: options.restart ? 1700 : 1500,
        startDelayMs: options.restart ? 420 : 260,
      };
    }

    if (cue === "outside") {
      return {
        fadeInMs: options.restart ? 2600 : 2100,
        fadeOutMs: options.restart ? 1900 : 1600,
        startDelayMs: options.restart ? 460 : 280,
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

  const openLoadout = () => {
    if (settingsOpen || demoCompleteOpen) {
      return;
    }

    loadoutOpen = true;
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
    return sceneInstanceKey;
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

  const markModuleSeen = (moduleId: MachineModuleId) => {
    if (!newModuleIds.includes(moduleId)) {
      return;
    }

    newModuleIds = newModuleIds.filter((id) => id !== moduleId);
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
    markModuleSeen(moduleId);

    if (previous) {
      moduleInventory = [...moduleInventory, previous];
    }
  };

  const ejectModule = (slotId: MachineSlotId) => {
    if (slotId === "attack" || slotId === "body" || slotId === "utility-c") {
      return;
    }

    const moduleId = machineLoadout[slotId];

    if (!moduleId) {
      return;
    }

    machineLoadout = { ...machineLoadout, [slotId]: null };
    moduleInventory = [...moduleInventory, moduleId];
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
      if (!newModuleIds.includes(type)) {
        newModuleIds = [...newModuleIds, type];
      }
    }
  };

  const purchaseShopOffer = (offer: ShopOffer) => {
    if (purchasedShopOfferIds.includes(offer.id)) {
      return;
    }

    purchasedShopOfferIds = [...purchasedShopOfferIds, offer.id];

    if (
      offer.kind === "module" &&
      offer.moduleId &&
      !hasMachineModule(machineLoadout, moduleInventory, offer.moduleId)
    ) {
      moduleInventory = [...moduleInventory, offer.moduleId];
    }
  };

  const handlePlayerDeath = () => {
    if (playerDeathPending) {
      return;
    }

    playerDeathPending = true;
    deathModalOpen = false;

    if (deathModalTimer) {
      window.clearTimeout(deathModalTimer);
    }

    deathModalTimer = window.setTimeout(() => {
      deathModalOpen = true;
      deathModalTimer = 0;
    }, playerDeathAnimationMs + 80);
  };

  const restartRun = () => {
    if (deathModalTimer) {
      window.clearTimeout(deathModalTimer);
      deathModalTimer = 0;
    }

    deathModalOpen = false;
    playerDeathPending = false;
    clearRunSave(seed);
    applyRunState(createDefaultRunState());
    resetScene();
    handleMusicCue(floorIndex >= outsideFloor ? "outside" : "level", {
      restart: true,
    });
  };

  const continueAfterDeath = () => {
    if (deathModalTimer) {
      window.clearTimeout(deathModalTimer);
      deathModalTimer = 0;
    }

    deathModalOpen = false;
    playerDeathPending = false;
    revivalNonce += 1;
  };

  const advanceFloor = () => {
    if (floorAdvancePending || floorIndex >= outsideFloor) {
      return;
    }

    const nextFloor = getNextRunFloor(floorIndex);

    clearFloorAdvanceTimers();
    floorAdvancePending = true;
    settingsOpen = false;
    loadoutOpen = false;
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
    handleMusicCue(floorIndex >= outsideFloor ? "outside" : "level", {
      restart,
    });
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
      newModuleIds,
      purchasedShopOfferIds,
      version: 2,
    });
  });

  $effect(() => {
    const nonce = cheats.giveAllModulesNonce;

    if (nonce === 0) {
      lastGiveAllModulesNonce = 0;
      return;
    }

    if (nonce === lastGiveAllModulesNonce) {
      return;
    }

    lastGiveAllModulesNonce = nonce;

    const ownedModuleIds = new Set<MachineModuleId>([
      ...Object.values(machineLoadout).filter(
        (moduleId): moduleId is MachineModuleId => Boolean(moduleId)
      ),
      ...moduleInventory,
    ]);
    const missingModuleIds = machineModuleIds.filter(
      (moduleId) => !ownedModuleIds.has(moduleId)
    );

    if (missingModuleIds.length > 0) {
      moduleInventory = [...moduleInventory, ...missingModuleIds];
    }
  });

  $effect(() => {
    seed;
    resetFloorAdvanceTransition();
    applyRunState(createDefaultRunState());
  });

  $effect(() => {
    sceneInstanceKey;

    if (!runReady) {
      sceneBootReady = false;
      sceneReady = false;
      return;
    }

    let canceled = false;
    let firstFrame = 0;
    let secondFrame = 0;

    sceneBootReady = false;
    sceneLoadFailed = false;
    sceneLoadProgress = {
      detail: "Preparing run",
      label: "Loading",
      progress: 0,
    };
    sceneReady = false;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        loadGameSceneComponent()
          .then((component) => {
            if (!canceled) {
              GameSceneComponent = component;
              sceneBootReady = true;
            }
          })
          .catch(() => {
            if (!canceled) {
              sceneLoadFailed = true;
            }
          });
      });
    });

    return () => {
      canceled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
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
    gameSfx.warmupGameplayEvents();

    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const onCoarseChange = (event: MediaQueryListEvent) => {
      touchControls = event.matches || isTouchDevice();
    };

    coarseQuery.addEventListener("change", onCoarseChange);

    let isActive = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        if (deathModalOpen || playerDeathPending) {
          event.preventDefault();
          return;
        }

        handleEscapeMenu();
        event.preventDefault();
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (
        event.code === "KeyE" &&
        !event.repeat &&
        !settingsOpen &&
        !deathModalOpen &&
        !playerDeathPending
      ) {
        loadoutOpen = !loadoutOpen;
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
      if (deathModalTimer) {
        window.clearTimeout(deathModalTimer);
        deathModalTimer = 0;
      }
      mobileInput.reset();
    };
  });

  $effect(() => {
    if (runtimeControlsLocked) {
      mobileInput.reset();
    }
  });
</script>

<svelte:head>
  <title>Orb Knight</title>
  <meta
    name="description"
    content="A clockwork escape prototype about breaking out of a sealed machine, crossing the outside yard, and reaching the castle road."
  >
</svelte:head>

<main class="stage">
  {#if runReady && sceneBootReady && GameSceneComponent}
    {#key sceneKey()}
      <GameSceneComponent
        collectedArtifactRoomIds={collectedArtifactRooms}
        controlsLocked={runtimeControlsLocked}
        {dungeon}
        {gearCount}
        inventoryModuleIds={moduleInventory}
        {machineLoadout}
        meleeParams={swingParams}
        meleeTrailSettings={trailSettings}
        onAdvanceFloor={advanceFloor}
        onCollectArtifact={collectArtifact}
        onEndDemo={openDemoComplete}
        onGearCountChange={(value) => (gearCount = value)}
        onMusicCue={handleMusicCue}
        onLoadProgress={(progress) => (sceneLoadProgress = progress)}
        onOpenSettings={openSettings}
        onOpenLoadout={openLoadout}
        onPlayerDeath={handlePlayerDeath}
        onPurchaseShopOffer={purchaseShopOffer}
        onReady={() => (sceneReady = true)}
        {purchasedShopOfferIds}
        {revivalNonce}
        {settings}
        showLoader={false}
        {machineStats}
        weaponBuild={machineStats.weaponBuild}
      />
    {/key}
  {/if}

  <MobileControls visible={touchControls && !runtimeControlsLocked} />

  <FloorAdvanceTransition
    nextFloor={floorAdvanceTarget}
    phase={floorAdvancePhase}
  />

  <SceneLoadingOverlay
    active={!sceneReady && floorAdvancePhase === "idle"}
    detail={sceneLoadFailed ? "Could not initialize scene" : sceneLoadProgress.detail}
    label="Loading"
    progress={sceneLoadFailed ? null : sceneLoadProgress.progress}
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
    <AppModalShell
      describedby={howToPlayOpen ? "how-to-play-copy" : undefined}
      labelledby={howToPlayOpen ? "how-to-play-title" : undefined}
      onClose={howToPlayOpen ? closeHowToPlay : closeSettings}
      open={settingsOpen}
    >
      {#if howToPlayOpen}
        <HowToPlayPanel onBack={closeHowToPlay} />
      {:else}
        <SettingsPanel
          {debugEnabled}
          bind:settings
          onDebugEnabledChange={setDebugEnabled}
          onBack={closeSettings}
          onOpenHowToPlay={openHowToPlay}
          onOpenMainMenu={openMainMenu}
          onResetDefaults={resetDefaults}
        />
      {/if}
    </AppModalShell>
  {/if}

  {#if demoCompleteOpen}
    <AppModalShell
      describedby="end-demo-copy"
      labelledby="end-demo-title"
      onClose={closeDemoComplete}
      open={demoCompleteOpen}
    >
      <EndDemoModal
        onClose={closeDemoComplete}
        onOpenMainMenu={openMainMenu}
        open={demoCompleteOpen}
      />
    </AppModalShell>
  {/if}

  <LoadoutModal
    {gearCount}
    {machineLoadout}
    {machineStats}
    {moduleInventory}
    {newModuleIds}
    onClose={() => (loadoutOpen = false)}
    onEjectModule={ejectModule}
    onInstallModule={installModule}
    onMarkModuleSeen={markModuleSeen}
    open={loadoutOpen}
  />

  {#if deathModalOpen}
    <DeathModal onContinue={continueAfterDeath} onRestart={restartRun} />
  {/if}
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
    inline-size: 100%;
    block-size: 100dvh;
    min-block-size: 100dvh;
    overflow: hidden;
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
</style>
