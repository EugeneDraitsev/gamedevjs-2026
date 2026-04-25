<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { gameMusic } from "$lib/audio/music";
  import MainMenu from "$lib/components/app/MainMenu.svelte";
  import { initialDungeonFloor, outsideFloor } from "$lib/config/run-floor";
  import { loadSceneSettings } from "$lib/config/scene-settings";
  import { loadRunSave } from "$lib/game/run-save";

  const defaultSeed = "polygon-001";
  const customSeedStorageKey = "warden-menu-custom-seed";
  const useCustomSeedStorageKey = "warden-menu-use-custom-seed";
  let canResume = $state(false);
  let customSeed = $state(defaultSeed);
  let floorIndex = $state(initialDungeonFloor);
  let storageReady = $state(false);
  let useCustomSeed = $state(false);

  const normalizeMenuSeed = (value: string) => value.trim() || defaultSeed;
  const seed = $derived(
    useCustomSeed ? normalizeMenuSeed(customSeed) : defaultSeed
  );

  const syncResumeState = () => {
    const savedRun = loadRunSave(seed);

    canResume = Boolean(savedRun);
    floorIndex = savedRun?.floorIndex ?? initialDungeonFloor;
  };

  const gameRouteForSeed = (nextSeed: string, continueRun = false) => {
    const encodedSeed = encodeURIComponent(nextSeed);
    const suffix = continueRun ? "?continue=1" : "";

    return `/game/${encodedSeed}${suffix}`;
  };

  onMount(() => {
    const settings = loadSceneSettings();
    const savedCustomSeed = localStorage.getItem(customSeedStorageKey);

    if (savedCustomSeed !== null) {
      customSeed = savedCustomSeed;
    }

    useCustomSeed = localStorage.getItem(useCustomSeedStorageKey) === "true";
    storageReady = true;
    syncResumeState();
    gameMusic.syncMix(settings);
    gameMusic.preload();
    gameMusic.playCue("menu", { fadeInMs: 1800, fadeOutMs: 1200 });
  });

  $effect(() => {
    if (!storageReady) {
      return;
    }

    localStorage.setItem(customSeedStorageKey, customSeed);
    localStorage.setItem(useCustomSeedStorageKey, String(useCustomSeed));
    syncResumeState();
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
  {customSeed}
  {floorIndex}
  onContinue={() =>
    openGameRoute(withDebugParam(gameRouteForSeed(seed, true)), floorIndex)}
  onCustomSeedChange={(value) => (customSeed = value)}
  onOpenSettings={() => openRoute(withDebugParam("/settings"))}
  onPlay={() =>
    openGameRoute(withDebugParam(gameRouteForSeed(seed)), initialDungeonFloor)}
  onUseCustomSeedChange={(value) => (useCustomSeed = value)}
  {seed}
  {useCustomSeed}
/>
