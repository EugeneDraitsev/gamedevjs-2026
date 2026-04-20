<script lang="ts">
  import type { SceneSettings } from "$lib/config/scene-settings";

  interface SettingsPanelProps {
    debugEnabled?: boolean;
    onBack: () => void;
    onDebugEnabledChange?: (enabled: boolean) => void;
    onOpenMainMenu?: () => void;
    onResetDefaults: () => void;
    settings: SceneSettings;
  }

  let {
    debugEnabled,
    onDebugEnabledChange,
    onBack,
    onOpenMainMenu,
    onResetDefaults,
    settings = $bindable(),
  }: SettingsPanelProps = $props();

  let confirmAction = $state<"main-menu" | "reset" | null>(null);

  const handleDangerAction = (
    action: "main-menu" | "reset",
    callback: (() => void) | undefined
  ) => {
    if (!callback) {
      return;
    }

    if (confirmAction === action) {
      confirmAction = null;
      callback();
      return;
    }

    confirmAction = action;
  };
</script>

<section class="panel">
  {#if !onOpenMainMenu}
    <div class="panel-header">
      <h2>Run Settings</h2>
    </div>

    <div class="panel-rule"></div>
  {/if}

  <label class="slider">
    <span class="slider-label">
      <span>Minimap Opacity</span>
      <span class="slider-value">
        {Math.round(settings.minimapOpacity * 100)}%
      </span>
    </span>
    <input
      type="range"
      min="0.1"
      max="1"
      step="0.05"
      bind:value={settings.minimapOpacity}
    >
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
      <button
        type="button"
        class="menu-button"
        class:confirming={confirmAction === "main-menu"}
        onclick={() => handleDangerAction("main-menu", onOpenMainMenu)}
      >
        {confirmAction === "main-menu"
          ? "Click Again: Main Menu"
          : "Back to Main Menu"}
      </button>
    {/if}
    <button
      type="button"
      class="menu-button subtle"
      class:confirming={confirmAction === "reset"}
      onclick={() => handleDangerAction("reset", onResetDefaults)}
    >
      {confirmAction === "reset" ? "Click Again: Reset" : "Reset Defaults"}
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

  .toggle {
    gap: 0.6rem;
  }

  .toggle input {
    accent-color: #d5b06f;
  }

  .slider {
    display: grid;
    gap: 0.45rem;
  }

  .slider-label {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    justify-content: space-between;
  }

  .slider-label > span:first-child {
    font-size: 0.74rem;
    font-weight: 700;
    color: rgba(221, 200, 154, 0.72);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .slider-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.8rem;
    color: rgba(242, 231, 199, 0.86);
  }

  .slider input[type="range"] {
    inline-size: 100%;
    block-size: 0.3rem;
    accent-color: #d5b06f;
    cursor: pointer;
    background: transparent;
  }

  .actions {
    display: grid;
    gap: 0.55rem;
    justify-items: start;
    padding-top: 0.9rem;
    margin-top: 0.5rem;
    border-top: 1px solid rgba(212, 190, 132, 0.12);
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

  .menu-button.confirming {
    color: #fff3d1;
  }

  .menu-button.subtle {
    color: rgba(221, 205, 171, 0.54);
  }
</style>
