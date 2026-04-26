<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Button, Checkbox, Folder, List, Pane } from "svelte-tweakpane-ui";
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import LoadoutModal from "$lib/components/loadout/LoadoutModal.svelte";
  import {
    computeMachineStats,
    createDefaultMachineLoadout,
    type MachineLoadout,
    type MachineModuleId,
    type MachineSlotId,
    machineModuleIds,
    moduleFitsSlot,
  } from "$lib/config/machine-modules";
  import {
    createSceneSettings,
    type SceneSettings,
  } from "$lib/config/scene-settings";
  import { isEditableTarget } from "$lib/game/dom";
  import { cheats } from "$lib/stores/cheats.svelte";
  import {
    buildPlaygroundDungeon,
    buildPlaygroundMeleeParams,
    buildPlaygroundTrailSettings,
    type CombatPreset,
    combatPresets,
    noop,
  } from "./playground-scene";

  interface Props {
    initialPresetId?: string;
  }

  let { initialPresetId = combatPresets[0].id }: Props = $props();

  let settings = $state<SceneSettings>(createSceneSettings());
  let settingsOpen = $state(false);
  let loadoutOpen = $state(false);
  let presetId = $state(combatPresets[0].id);
  let restartTick = $state(0);
  let infiniteHealth = $state(false);
  let oneHitKill = $state(false);
  let machineLoadout = $state<MachineLoadout>(createDefaultMachineLoadout());
  let moduleInventory = $state<MachineModuleId[]>([]);
  let debugEnabled = $state(false);
  let DebugPane = $state<
    typeof import("$lib/components/debug/DebugPane.svelte").default | null
  >(null);

  const presetOptions: Record<string, string> = Object.fromEntries(
    combatPresets.map((preset) => [preset.label, preset.id])
  );
  const presetById = Object.fromEntries(
    combatPresets.map((preset) => [preset.id, preset])
  ) as Record<string, CombatPreset>;

  const currentPreset = $derived(presetById[presetId] ?? combatPresets[0]);
  const sceneKey = $derived(`${currentPreset.id}-${restartTick}`);
  const dungeon = $derived(
    buildPlaygroundDungeon(currentPreset.templateId, sceneKey)
  );
  const machineStats = $derived(computeMachineStats(machineLoadout));
  const meleeParams = $derived(buildPlaygroundMeleeParams(settings));
  const trailSettings = $derived(buildPlaygroundTrailSettings(settings));

  const giveAllModules = () => {
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
  };

  const restart = () => {
    settingsOpen = false;
    loadoutOpen = false;
    restartTick += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
    restart();
  };

  const closeSettings = () => {
    settingsOpen = false;
  };

  const openSettings = () => {
    loadoutOpen = false;
    settingsOpen = true;
  };

  const openLoadout = () => {
    settingsOpen = false;
    loadoutOpen = true;
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

  $effect(() => {
    cheats.infiniteHealth = infiniteHealth;
    cheats.oneHitKill = oneHitKill;
  });

  onMount(() => {
    if (initialPresetId && presetById[initialPresetId]) {
      presetId = initialPresetId;
      infiniteHealth = initialPresetId === "gate-keeper";
    }

    giveAllModules();

    debugEnabled =
      new URL(window.location.href).searchParams.get("debug") === "true";

    if (debugEnabled) {
      import("$lib/components/debug/DebugPane.svelte").then((module) => {
        DebugPane = module.default;
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Escape") {
        if (loadoutOpen) {
          loadoutOpen = false;
        } else {
          settingsOpen = !settingsOpen;
        }

        event.preventDefault();
        return;
      }

      if (event.code === "KeyE" && !event.repeat) {
        loadoutOpen = !loadoutOpen;
        settingsOpen = false;
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  onDestroy(() => {
    cheats.infiniteHealth = false;
    cheats.oneHitKill = false;
  });
</script>

<main class="stage">
  {#key sceneKey}
    <GameScene
      collectedArtifactRoomIds={[]}
      controlsLocked={settingsOpen || loadoutOpen}
      {dungeon}
      enemySpawnOverride={{
        enemyCount: currentPreset.enemyCount,
        enemyTemplateId: currentPreset.enemyTemplateId,
      }}
      inventoryModuleIds={moduleInventory}
      {machineLoadout}
      {meleeParams}
      meleeTrailSettings={trailSettings}
      {machineStats}
      onCollectArtifact={noop}
      onOpenSettings={openSettings}
      onOpenLoadout={openLoadout}
      {settings}
      weaponBuild={machineStats.weaponBuild}
    />
  {/key}

  <div class="combat-pane">
    <Pane position="inline" title="Combat Preset" width={300}>
      <Folder title="Encounter">
        <List bind:value={presetId} label="Preset" options={presetOptions} />
        <Button on:click={restart} title="Restart fight" />
      </Folder>
      <Folder title="Cheats">
        <Checkbox bind:value={oneHitKill} label="One-Hit Kill" />
        <Checkbox bind:value={infiniteHealth} label="Infinite Health" />
        <Button on:click={giveAllModules} title="Give all modules" />
        <Button on:click={() => cheats.requestRevealMap()} title="Reveal map" />
        <Button on:click={openLoadout} title="Open Loadout (E)" />
      </Folder>
      <p class="hint">{currentPreset.description}</p>
    </Pane>
  </div>

  {#if debugEnabled && DebugPane}
    <DebugPane
      bind:settings
      onResetDefaults={resetDefaults}
      onResetLevel={restart}
      onResetScene={restart}
    />
  {/if}

  {#if settingsOpen}
    <AppModalShell onClose={closeSettings} open={settingsOpen}>
      <SettingsPanel
        bind:settings
        onBack={closeSettings}
        onResetDefaults={resetDefaults}
      />
    </AppModalShell>
  {/if}

  <LoadoutModal
    gearCount={0}
    {machineLoadout}
    {machineStats}
    {moduleInventory}
    onClose={() => (loadoutOpen = false)}
    onEjectModule={ejectModule}
    onInstallModule={installModule}
    open={loadoutOpen}
  />
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

  .combat-pane {
    position: fixed;
    inset-block-start: 1rem;
    inset-inline-start: 1rem;
    z-index: 12;
  }

  .hint {
    margin: 8px 12px 4px;
    font-size: 11px;
    color: rgba(207, 226, 255, 0.7);
  }
</style>
