<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Button, Folder, List, Pane } from "svelte-tweakpane-ui";
  import { gameMusic } from "$lib/audio/music";
  import { gameSfx } from "$lib/audio/sfx";
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import {
    createSceneSettings,
    loadSceneSettings,
    type SceneSettings,
    saveSceneSettings,
  } from "$lib/config/scene-settings";
  import { isEditableTarget } from "$lib/game/dom";
  import { cheats } from "$lib/stores/cheats.svelte";
  import {
    buildPlaygroundDungeon,
    buildPlaygroundMeleeParams,
    buildPlaygroundTrailSettings,
    noop,
    type WeaponPlaygroundPreset,
    weaponPlaygroundPresets,
  } from "./playground-scene";

  interface Props {
    initialWeaponId?: string;
  }

  let { initialWeaponId = weaponPlaygroundPresets[0].id }: Props = $props();

  let settings = $state<SceneSettings>(loadSceneSettings());
  let settingsOpen = $state(false);
  let weaponId = $state(weaponPlaygroundPresets[0].id);
  let restartTick = $state(0);
  let DebugPane = $state<
    typeof import("$lib/components/debug/DebugPane.svelte").default | null
  >(null);

  const weaponOptions: Record<string, string> = Object.fromEntries(
    weaponPlaygroundPresets.map((preset) => [preset.label, preset.id])
  );
  const weaponById = Object.fromEntries(
    weaponPlaygroundPresets.map((preset) => [preset.id, preset])
  ) as Record<string, WeaponPlaygroundPreset>;

  const currentWeapon = $derived(
    weaponById[weaponId] ?? weaponPlaygroundPresets[0]
  );
  const sceneKey = $derived(`${currentWeapon.id}-${restartTick}`);
  const dungeon = $derived(buildPlaygroundDungeon("normal-line", sceneKey));
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
    saveSceneSettings(settings);
    gameMusic.syncMix(settings);
    gameSfx.syncMix(settings);
  });

  onMount(() => {
    if (initialWeaponId && weaponById[initialWeaponId]) {
      weaponId = initialWeaponId;
    }

    cheats.infiniteHealth = true;

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
      enemyAiPaused
      enemySpawnOverride={{
        enemyCount: 1,
        enemyTemplateId: "scrap-runner",
        spawnPattern: "line",
      }}
      {meleeParams}
      meleeTrailSettings={trailSettings}
      machineLoadout={currentWeapon.machineLoadout}
      machineStats={currentWeapon.machineStats}
      onCollectArtifact={noop}
      onOpenSettings={openSettings}
      onOpenLoadout={noop}
      {settings}
      weaponBuild={currentWeapon.weaponBuild}
    />
  {/key}

  <div class="weapon-pane">
    <Pane position="inline" title="Weapon Playground" width={290}>
      <Folder title="Weapon">
        <List bind:value={weaponId} label="Build" options={weaponOptions} />
        <Button on:click={restart} title="Reset target" />
      </Folder>
      <p class="hint">{currentWeapon.description}</p>
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
      radial-gradient(circle at top, rgba(101, 181, 204, 0.16), transparent 35%),
      linear-gradient(180deg, #040816, #080d16 48%, #090706);
  }

  .stage > :global(:first-child) {
    position: absolute;
    inset: 0;
  }

  .weapon-pane {
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
