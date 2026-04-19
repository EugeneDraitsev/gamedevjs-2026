<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import MainMenu from "$lib/components/app/MainMenu.svelte";
  import { loadRunSave } from "$lib/game/run-save";

  const seed = "polygon-001";
  let canResume = $state(false);
  let floorIndex = $state(1);

  onMount(() => {
    const savedRun = loadRunSave(seed);

    canResume = Boolean(savedRun);
    floorIndex = savedRun?.floorIndex ?? 1;
  });
</script>

<svelte:head> <title>Warden's Trial</title> </svelte:head>

<MainMenu
  {canResume}
  {floorIndex}
  onContinue={() => goto(`/game/${seed}?continue=1`)}
  onOpenSettings={() => goto("/settings")}
  onPlay={() => goto(`/game/${seed}`)}
  {seed}
/>
