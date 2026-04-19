<script lang="ts">
  import type {
    CameraMode,
    FloorTheme,
    SceneSettings,
    WallTheme,
  } from "$lib/config/scene-settings";

  interface SettingsPanelProps {
    debugEnabled?: boolean;
    onBack: () => void;
    onDebugEnabledChange?: (enabled: boolean) => void;
    onOpenMainMenu?: () => void;
    onResetDefaults: () => void;
    settings: SceneSettings;
  }

  const cameraModes: CameraMode[] = ["follow", "orbit"];
  const floorThemes: FloorTheme[] = ["check", "ember", "steel"];
  const wallThemes: WallTheme[] = ["aqua", "brass", "foundry"];

  let {
    debugEnabled,
    onDebugEnabledChange,
    onBack,
    onOpenMainMenu,
    onResetDefaults,
    settings = $bindable(),
  }: SettingsPanelProps = $props();
</script>

<section class="panel">
  {#if !onOpenMainMenu}
    <div class="panel-header">
      <h2>Run Settings</h2>
      <p>
        Tune the camera, material palette, and debug flags before the descent.
      </p>
    </div>

    <div class="panel-rule"></div>
  {/if}

  <label>
    <span>Camera</span>
    <select bind:value={settings.cameraMode}>
      {#each cameraModes as mode}
        <option value={mode}>{mode}</option>
      {/each}
    </select>
  </label>

  <label>
    <span>Floor Theme</span>
    <select bind:value={settings.floorTheme}>
      {#each floorThemes as theme}
        <option value={theme}>{theme}</option>
      {/each}
    </select>
  </label>

  <label>
    <span>Wall Theme</span>
    <select bind:value={settings.wallTheme}>
      {#each wallThemes as theme}
        <option value={theme}>{theme}</option>
      {/each}
    </select>
  </label>

  <label class="toggle">
    <input type="checkbox" bind:checked={settings.showPhysicsDebug}>
    <span>Physics Debug</span>
  </label>

  {#if onDebugEnabledChange}
    <label class="toggle">
      <input
        type="checkbox"
        checked={debugEnabled ?? false}
        onchange={(event) =>
          onDebugEnabledChange((event.currentTarget as HTMLInputElement).checked)}
      >
      <span>Debug Controls</span>
    </label>
  {/if}

  <div class="actions">
    <button type="button" class="menu-button primary" onclick={onBack}>
      {onOpenMainMenu ? "Return to Run" : "Back"}
    </button>
    {#if onOpenMainMenu}
      <button type="button" class="menu-button" onclick={onOpenMainMenu}>
        Back to Main Menu
      </button>
    {/if}
    <button type="button" class="menu-button subtle" onclick={onResetDefaults}>
      Reset Defaults
    </button>
  </div>
</section>

<style>
  .panel-header {
    display: grid;
    gap: 0.45rem;
  }

  .panel-rule {
    block-size: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(242, 212, 134, 0.72),
      transparent
    );
    box-shadow: 0 0 18px rgba(242, 212, 134, 0.16);
  }

  .panel h2 {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2rem, 4.2vw, 3rem);
    font-weight: 400;
    line-height: 0.9;
    color: transparent;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: linear-gradient(
      180deg,
      #fcf0c8 0%,
      #ddb36a 38%,
      #f8e5b1 64%,
      #8d612e 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 0 18px rgba(230, 188, 104, 0.12))
      drop-shadow(0 10px 20px rgba(0, 0, 0, 0.34));
  }

  .panel p {
    max-inline-size: 30rem;
  }

  .toggle {
    gap: 0.6rem;
  }

  .toggle input {
    accent-color: #d5b06f;
  }

  .actions {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
    margin-top: 0.2rem;
  }

  .menu-button {
    position: relative;
    display: block;
    min-inline-size: min(100%, 17rem);
    min-block-size: 2rem;
    padding: 0.08rem 0.8rem 0.45rem 0;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(1rem, 1.6vw, 1.35rem);
    line-height: 1.1;
    color: rgba(237, 225, 196, 0.74);
    text-align: left;
    letter-spacing: 0.05em;
    background: transparent;
    border: 0;
    transition:
      color 160ms ease,
      text-shadow 160ms ease,
      opacity 160ms ease;
  }

  .menu-button::after {
    position: absolute;
    bottom: 0;
    left: 50%;
    inline-size: 0;
    block-size: 1px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 242, 202, 0.96) 50%,
      transparent
    );
    box-shadow: 0 0 14px rgba(241, 198, 113, 0.44);
    opacity: 0;
    translate: -50% 0;
    transition:
      inline-size 160ms ease,
      opacity 160ms ease;
  }

  .menu-button:hover,
  .menu-button:focus-visible {
    color: #fff3d1;
    text-shadow: 0 0 16px rgba(238, 197, 110, 0.28);
  }

  .menu-button:hover::after,
  .menu-button:focus-visible::after {
    inline-size: 78%;
    opacity: 1;
  }

  .menu-button.primary {
    color: rgba(255, 243, 209, 0.92);
  }

  .menu-button.subtle {
    color: rgba(221, 205, 171, 0.54);
  }
</style>
