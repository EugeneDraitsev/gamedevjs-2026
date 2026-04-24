<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import MainMenu from "$lib/components/app/MainMenu.svelte";
  import { initialDungeonFloor } from "$lib/config/run-floor";
  import { loadRunSave } from "$lib/game/run-save";

  const seed = "polygon-001";
  let canResume = $state(false);
  let floorIndex = $state(initialDungeonFloor);

  onMount(() => {
    const savedRun = loadRunSave(seed);

    canResume = Boolean(savedRun);
    floorIndex = savedRun?.floorIndex ?? initialDungeonFloor;
  });

  const withDebugParam = (path: string) => {
    const nextUrl = new URL(path, page.url);

    if (page.url.searchParams.get("debug") === "true") {
      nextUrl.searchParams.set("debug", "true");
    }

    return nextUrl;
  };
</script>

<svelte:head> <title>Warden's Trial</title> </svelte:head>

<MainMenu
  {canResume}
  {floorIndex}
  onContinue={() => goto(withDebugParam(`/game/${seed}?continue=1`))}
  onOpenSettings={() => goto(withDebugParam("/settings"))}
  onPlay={() => goto(withDebugParam(`/game/${seed}`))}
  {seed}
/>
