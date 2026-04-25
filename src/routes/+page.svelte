<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { gameMusic } from "$lib/audio/music";
  import MainMenu from "$lib/components/app/MainMenu.svelte";
  import { initialDungeonFloor, outsideFloor } from "$lib/config/run-floor";
  import { loadSceneSettings } from "$lib/config/scene-settings";
  import { loadRunSave } from "$lib/game/run-save";

  const seed = "polygon-001";
  let canResume = $state(false);
  let floorIndex = $state(initialDungeonFloor);

  onMount(() => {
    const savedRun = loadRunSave(seed);
    const settings = loadSceneSettings();

    canResume = Boolean(savedRun);
    floorIndex = savedRun?.floorIndex ?? initialDungeonFloor;
    gameMusic.syncMix(settings);
    gameMusic.preload();
    gameMusic.playCue("menu", { fadeInMs: 1800, fadeOutMs: 1200 });
  });

  const withDebugParam = (path: string) => {
    const nextUrl = new URL(path, page.url);

    if (page.url.searchParams.get("debug") === "true") {
      nextUrl.searchParams.set("debug", "true");
    }

    return nextUrl;
  };

  const openGameRoute = async (path: URL | string, floor: number) => {
    const cue = floor >= outsideFloor ? "outside" : "level";

    await gameMusic.unlock();
    gameMusic.playCue(cue, {
      fadeInMs: 2300,
      fadeOutMs: 1800,
      restart: cue === "level",
      startDelayMs: 380,
    });
    await goto(path);
  };

  const openRoute = async (path: URL | string) => {
    await gameMusic.unlock();
    await goto(path);
  };
</script>

<svelte:head> <title>Orb Knight</title> </svelte:head>

<MainMenu
  {canResume}
  {floorIndex}
  onContinue={() =>
    openGameRoute(withDebugParam(`/game/${seed}?continue=1`), floorIndex)}
  onOpenSettings={() => openRoute(withDebugParam("/settings"))}
  onPlay={() => openGameRoute(withDebugParam(`/game/${seed}`), initialDungeonFloor)}
  {seed}
/>
