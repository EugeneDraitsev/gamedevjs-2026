<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Folder, List, Pane } from "svelte-tweakpane-ui";
  import GameScene from "$lib/components/game/GameScene.svelte";
  import { type RoomTemplate, roomTemplates } from "$lib/config/room-templates";
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

  let settings = $state<SceneSettings>({
    ...createSceneSettings(),
    cameraFov: 52,
    cameraMode: "orbit",
  });
  let templateId = $state("normal-furnace");
  let restartTick = $state(0);
  let DebugPane = $state<
    typeof import("$lib/components/debug/DebugPane.svelte").default | null
  >(null);

  const currentTemplate = $derived(
    templateById[templateId] ?? templateById["normal-furnace"]
  );
  const sceneKey = $derived(`${currentTemplate.id}-${restartTick}`);
  const dungeon = $derived(
    buildPlaygroundDungeon(currentTemplate.id, sceneKey, true)
  );
  const meleeParams = $derived(buildPlaygroundMeleeParams(settings));
  const trailSettings = $derived(buildPlaygroundTrailSettings(settings));

  const restart = () => {
    restartTick += 1;
  };

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings(), {
      cameraFov: 52,
      cameraMode: "orbit",
    });
    restart();
  };

  $effect(() => {
    if (templateById[initialTemplateId]) {
      templateId = initialTemplateId;
    }
  });

  onMount(() => {
    import("$lib/components/debug/DebugPane.svelte").then((module) => {
      DebugPane = module.default;
    });
  });
</script>

<main class="stage">
  {#key sceneKey}
    <GameScene
      collectedArtifactRoomIds={[]}
      controlsLocked
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

  <div class="room-pane">
    <Pane position="inline" title="Room Preview" width={300}>
      <Folder title="Room">
        <List bind:value={templateId} label="Template" options={roomOptions} />
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
