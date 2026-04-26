<script lang="ts">
  import { onMount } from "svelte";
  import {
    Button,
    Checkbox,
    Folder,
    List,
    Pane,
    Slider,
  } from "svelte-tweakpane-ui";
  import { gameMusic } from "$lib/audio/music";
  import { gameSfx } from "$lib/audio/sfx";
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import {
    type MachineModuleId,
    machineModuleTemplates,
  } from "$lib/config/machine-modules";
  import { type RoomTemplate, roomTemplates } from "$lib/config/room-templates";
  import {
    createSceneSettings,
    loadSceneSettings,
    type SceneSettings,
    saveSceneSettings,
  } from "$lib/config/scene-settings";
  import { isEditableTarget } from "$lib/game/dom";
  import {
    buildPlaygroundDungeon,
    buildPlaygroundMeleeParams,
    buildPlaygroundTrailSettings,
    noop,
    playgroundMachineLoadout,
    playgroundMachineStats,
    playgroundWeaponBuild,
  } from "./playground-scene";

  interface Props {
    initialTemplateId?: string;
  }

  let { initialTemplateId = "normal-furnace" }: Props = $props();

  const roomOptions: Record<string, string> = Object.fromEntries(
    roomTemplates.map((template) => [
      `${template.kind} / ${template.layout} / ${template.id}`,
      template.id,
    ])
  );
  const templateById = Object.fromEntries(
    roomTemplates.map((template) => [template.id, template])
  ) as Record<string, RoomTemplate>;
  const moduleOptions: Record<string, string> = Object.fromEntries(
    machineModuleTemplates.map((module) => [module.label, module.id])
  );

  let settings = $state<SceneSettings>({
    ...loadSceneSettings(),
    cameraFov: 80,
    cameraMode: "orbit",
  });
  let settingsOpen = $state(false);
  let floorReliefMaps = $state(true);
  let floorReliefStrength = $state(1.4);
  let artifactModuleId = $state<MachineModuleId>("ammo-hopper");
  let templateId = $state("normal-furnace");
  let restartTick = $state(0);
  let DebugPane = $state<
    typeof import("$lib/components/debug/DebugPane.svelte").default | null
  >(null);

  const currentTemplate = $derived(
    templateById[templateId] ?? templateById["normal-furnace"]
  );
  const sceneKey = $derived(
    `${currentTemplate.id}-${artifactModuleId}-${restartTick}`
  );
  const dungeon = $derived(
    buildPlaygroundDungeon(currentTemplate.id, sceneKey, true, artifactModuleId)
  );
  const meleeParams = $derived(buildPlaygroundMeleeParams(settings));
  const trailSettings = $derived(buildPlaygroundTrailSettings(settings));
  const showPlayer = $derived(currentTemplate.kind !== "treasure");

  const restart = () => {
    settingsOpen = false;
    restartTick += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings(), {
      cameraFov: 80,
      cameraMode: "orbit",
    });
    floorReliefStrength = 1.4;
    restart();
  };

  const closeSettings = () => {
    settingsOpen = false;
  };

  const openSettings = () => {
    settingsOpen = true;
  };

  $effect(() => {
    saveSceneSettings(settings);
    gameMusic.syncMix(settings);
    gameSfx.syncMix(settings);
  });

  $effect(() => {
    if (templateById[initialTemplateId]) {
      templateId = initialTemplateId;
    }
  });

  onMount(() => {
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
</script>

<main class="stage">
  {#key sceneKey}
    <GameScene
      collectedArtifactRoomIds={[]}
      controlsLocked
      {dungeon}
      {floorReliefMaps}
      {floorReliefStrength}
      {meleeParams}
      meleeTrailSettings={trailSettings}
      machineLoadout={playgroundMachineLoadout}
      machineStats={playgroundMachineStats}
      onCollectArtifact={noop}
      onOpenSettings={openSettings}
      onOpenLoadout={noop}
      {settings}
      {showPlayer}
      weaponBuild={playgroundWeaponBuild}
    />
  {/key}

  <div class="room-pane">
    <Pane position="inline" title="Room Preview" width={300}>
      <Folder title="Room">
        <List bind:value={templateId} label="Template" options={roomOptions} />
        {#if currentTemplate.kind === "treasure"}
          <List
            bind:value={artifactModuleId}
            label="Pedestal"
            options={moduleOptions}
          />
        {/if}
        <Checkbox bind:value={floorReliefMaps} label="Relief maps" />
        <Slider
          bind:value={floorReliefStrength}
          label="Relief strength"
          min={0}
          max={2.5}
          step={0.05}
        />
        <Button on:click={restart} title="Restart preview" />
      </Folder>
      <p class="hint">
        {currentTemplate.kind}
        / {currentTemplate.layout} / {currentTemplate.spawnPattern}
      </p>
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
      radial-gradient(circle at top, rgba(120, 71, 37, 0.18), transparent 36%),
      linear-gradient(180deg, #080604, #110b07 52%, #060403);
  }

  .stage > :global(:first-child) {
    position: absolute;
    inset: 0;
  }

  .room-pane {
    position: fixed;
    inset-block-start: 1rem;
    inset-inline-start: 1rem;
    z-index: 12;
  }

  .hint {
    margin: 8px 12px 4px;
    font-size: 11px;
    color: rgba(255, 226, 184, 0.72);
  }
</style>
