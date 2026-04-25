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
  const lastRunSeedStorageKey = "warden-menu-last-run-seed";
  const useCustomSeedStorageKey = "warden-menu-use-custom-seed";
  let canResume = $state(false);
  let customSeed = $state(defaultSeed);
  let floorIndex = $state(initialDungeonFloor);
  let lastRunSeed = $state(defaultSeed);
  let storageReady = $state(false);
  let useCustomSeed = $state(false);

  const normalizeMenuSeed = (value: string) => value.trim();
  const seed = $derived(
    useCustomSeed ? normalizeMenuSeed(customSeed) : lastRunSeed
  );

  const setLastRunSeed = (nextSeed: string) => {
    lastRunSeed = nextSeed;

    if (storageReady) {
      localStorage.setItem(lastRunSeedStorageKey, nextSeed);
    }
  };

  const createRandomSeed = () => {
    if (!globalThis.crypto?.getRandomValues) {
      return `run-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
    }

    const randomValues = new Uint32Array(2);

    globalThis.crypto.getRandomValues(randomValues);

    return `run-${Date.now().toString(36)}-${Array.from(randomValues)
      .map((value) => value.toString(36).padStart(7, "0"))
      .join("")}`;
  };

  const syncResumeState = () => {
    const savedRun = seed ? loadRunSave(seed) : null;

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
    const savedLastRunSeed = localStorage.getItem(lastRunSeedStorageKey);

    if (savedCustomSeed !== null) {
      customSeed = savedCustomSeed;
    }

    if (savedLastRunSeed) {
      setLastRunSeed(savedLastRunSeed);
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
    localStorage.setItem(lastRunSeedStorageKey, lastRunSeed);
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

  const startNewGame = async () => {
    const nextSeed =
      useCustomSeed && normalizeMenuSeed(customSeed)
        ? normalizeMenuSeed(customSeed)
        : createRandomSeed();

    setLastRunSeed(nextSeed);

    await openGameRoute(
      withDebugParam(gameRouteForSeed(nextSeed)),
      initialDungeonFloor
    );
  };

  const continueRun = async () => {
    if (!seed) {
      return;
    }

    setLastRunSeed(seed);

    await openGameRoute(
      withDebugParam(gameRouteForSeed(seed, true)),
      floorIndex
    );
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
  onContinue={continueRun}
  onCustomSeedChange={(value) => (customSeed = value)}
  onOpenSettings={() => openRoute(withDebugParam("/settings"))}
  onPlay={startNewGame}
  onUseCustomSeedChange={(value) => (useCustomSeed = value)}
  {seed}
  {useCustomSeed}
/>
