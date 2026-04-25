<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Button, Folder, List, Pane } from "svelte-tweakpane-ui";
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
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
    playgroundMachineLoadout,
    playgroundMachineStats,
    playgroundWeaponBuild,
  } from "./playground-scene";

  interface Props {
    initialPresetId?: string;
  }

  let { initialPresetId = combatPresets[0].id }: Props = $props();

  let settings = $state<SceneSettings>(createSceneSettings());
  let settingsOpen = $state(false);
  let presetId = $state(combatPresets[0].id);
  let restartTick = $state(0);
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
  const meleeParams = $derived(buildPlaygroundMeleeParams(settings));
  const trailSettings = $derived(buildPlaygroundTrailSettings(settings));

  const restart = () => {
    settingsOpen = false;
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
    settingsOpen = true;
  };

  $effect(() => {
    cheats.infiniteHealth = currentPreset.id === "gate-keeper";
  });

  onMount(() => {
    if (initialPresetId && presetById[initialPresetId]) {
      presetId = initialPresetId;
    }

    import("$lib/components/debug/DebugPane.svelte").then((module) => {
      DebugPane = module.default;
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || isEditableTarget(event.target)) {
        return;
      }

      settingsOpen = !settingsOpen;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  onDestroy(() => {
    cheats.infiniteHealth = false;
  });
</script>

<main class="stage">
  {#key sceneKey}
    <GameScene
      collectedArtifactRoomIds={[]}
      controlsLocked={settingsOpen}
      {dungeon}
      {meleeParams}
      meleeTrailSettings={trailSettings}
      machineLoadout={playgroundMachineLoadout}
      machineStats={playgroundMachineStats}
      onCollectArtifact={noop}
      onOpenSettings={openSettings}
      onOpenWeaponLab={noop}
      {settings}
      weaponBuild={playgroundWeaponBuild}
    />
  {/key}

  <div class="combat-pane">
    <Pane position="inline" title="Combat Preset" width={280}>
      <Folder title="Encounter">
        <List bind:value={presetId} label="Preset" options={presetOptions} />
        <Button on:click={restart} title="Restart fight" />
      </Folder>
      <p class="hint">{currentPreset.description}</p>
    </Pane>
  </div>

  {#if DebugPane}
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
    inset-inline-end: 1rem;
    z-index: 12;
  }

  .hint {
    margin: 8px 12px 4px;
    font-size: 11px;
    color: rgba(207, 226, 255, 0.7);
  }
</style>
