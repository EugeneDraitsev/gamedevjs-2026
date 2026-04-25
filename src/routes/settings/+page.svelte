<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { gameMusic } from "$lib/audio/music";
  import SettingsPanel from "$lib/components/app/SettingsPanel.svelte";
  import {
    createSceneSettings,
    loadSceneSettings,
    saveSceneSettings,
  } from "$lib/config/scene-settings";

  let settings = $state(loadSceneSettings());
  const debugEnabled = $derived(page.url.searchParams.get("debug") === "true");

  const resetDefaults = () => {
    Object.assign(settings, createSceneSettings());
  };

  const setDebugEnabled = async (enabled: boolean) => {
    const nextUrl = new URL(page.url);

    if (enabled) {
      nextUrl.searchParams.set("debug", "true");
    } else {
      nextUrl.searchParams.delete("debug");
    }

    await goto(nextUrl, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  };

  const withDebugParam = (path: string) => {
    const nextUrl = new URL(path, page.url);

    if (page.url.searchParams.get("debug") === "true") {
      nextUrl.searchParams.set("debug", "true");
    }

    return nextUrl;
  };

  $effect(() => {
    saveSceneSettings(settings);
    gameMusic.syncMix(settings);
  });

  onMount(() => {
    gameMusic.preload();
    gameMusic.playCue("menu", {
      fadeInMs: 2000,
      fadeOutMs: 1500,
      startDelayMs: 260,
    });
  });
</script>

<svelte:head> <title>Settings | Orb Knight</title> </svelte:head>

<main class="settings-route">
  <SettingsPanel
    {debugEnabled}
    bind:settings
    onBack={() => goto(withDebugParam("/"))}
    onDebugEnabledChange={setDebugEnabled}
    onResetDefaults={resetDefaults}
  />
</main>

<style>
  .settings-route {
    display: grid;
    place-items: center;
    min-block-size: 100svh;
    padding: 1rem;
    background:
      radial-gradient(
        circle at 50% 18%,
        rgba(219, 188, 118, 0.12),
        transparent 22%
      ),
      radial-gradient(
        circle at 50% 100%,
        rgba(45, 76, 112, 0.14),
        transparent 44%
      ),
      rgba(3, 8, 16, 0.94);
  }

  :global(.settings-route .panel) {
    display: grid;
    gap: 1.05rem;
    inline-size: min(100%, 36rem);
    padding: 1.55rem 1.5rem 1.4rem;
    color: #eff7ff;
    background:
      radial-gradient(
        circle at 50% 0,
        rgba(219, 188, 118, 0.14),
        transparent 26%
      ),
      linear-gradient(180deg, rgba(18, 16, 24, 0.94), rgba(6, 9, 17, 0.99)),
      repeating-linear-gradient(
        90deg,
        transparent 0 28px,
        rgba(212, 190, 132, 0.03) 28px 29px
      );
    border: 1px solid rgba(212, 190, 132, 0.16);
    border-radius: 1.25rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 243, 217, 0.05),
      0 24px 60px rgba(0, 0, 0, 0.34);
  }

  :global(.settings-route .eyebrow) {
    font-size: 0.74rem;
    font-weight: 800;
    color: rgba(221, 200, 154, 0.68);
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  :global(.settings-route .panel h1),
  :global(.settings-route .panel h2),
  :global(.settings-route .panel p) {
    margin: 0;
  }

  :global(.settings-route .panel p) {
    line-height: 1.5;
    color: rgba(221, 205, 171, 0.72);
  }

  :global(.settings-route .panel label span) {
    font-size: 0.74rem;
    font-weight: 700;
    color: rgba(221, 200, 154, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  :global(.settings-route .panel label) {
    display: grid;
    gap: 0.4rem;
  }

  :global(.settings-route .panel select) {
    font: inherit;
  }

  :global(.settings-route .panel select) {
    padding: 0.72rem 0.9rem;
    color: #f2e7c7;
    background: rgba(10, 11, 16, 0.82);
    border: 1px solid rgba(212, 190, 132, 0.14);
    border-radius: 0.9rem;
  }

  :global(.settings-route .panel .toggle) {
    grid-template-columns: auto 1fr;
    align-items: center;
  }
</style>
