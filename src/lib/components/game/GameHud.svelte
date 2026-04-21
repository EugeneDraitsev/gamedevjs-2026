<script lang="ts">
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";
  import orbKnightIconUrl from "$lib/assets/orb-knight-icon.svg";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  interface GameHudProps {
    onOpenSettings?: () => void;
    onOpenWeaponLab?: () => void;
  }

  let { onOpenSettings, onOpenWeaponLab }: GameHudProps = $props();

  const scene = getGameSceneContext();
  const { pickups, player } = scene;
  const ammoSlots = $derived(
    Array.from({ length: player.magazineSize }, (_, index) => index)
  );
  const reloadRatio = $derived(
    player.reloading && player.reloadDuration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            1 - (player.reloadUntil - scene.timing.now) / player.reloadDuration
          )
        )
      : 0
  );
  const animatedAmmo = $derived(
    player.reloading
      ? Math.max(player.ammo, Math.round(reloadRatio * player.magazineSize))
      : player.ammo
  );
</script>

<div class="hud">
  <div class="hud-shell">
    <button
      type="button"
      class="hud-icon-button"
      aria-label="Open weapon lab"
      onclick={onOpenWeaponLab}
    >
      <img class="hud-icon" src={orbKnightIconUrl} alt="" aria-hidden="true">
      <span class="hud-hint hud-icon-hint" aria-hidden="true">E</span>
    </button>
    <div class="hud-bars">
      <div
        class="hud-bar"
        aria-label={`Health ${player.health}/${player.maxHealth}`}
      >
        <div
          class="hud-recover"
          style:width={`${scene.playerRecoverRatio * 100}%`}
        ></div>
        <div
          class="hud-fill"
          style:width={`${player.healthRatio * 100}%`}
        ></div>
      </div>
      <div
        class="hud-ammo"
        aria-label={`Ammo ${player.ammo}/${player.magazineSize}`}
      >
        <div
          class="hud-ammo-track"
          style:grid-template-columns={`repeat(${player.magazineSize}, minmax(0, 1fr))`}
        >
          {#if player.reloading}
            <div
              class="hud-ammo-reload"
              style:width={`${reloadRatio * 100}%`}
            ></div>
          {/if}

          {#each ammoSlots as slot}
            <div class:spent={slot >= animatedAmmo} class="hud-ammo-slot"></div>
          {/each}
        </div>
        <span class="hud-hint" aria-hidden="true">R</span>
      </div>
      <div class="hud-currency" aria-label={`Gears ${pickups.gears}`}>
        <img src={gearCurrencyUrl} alt="" aria-hidden="true">
        <span>{pickups.gears}</span>
      </div>
    </div>
  </div>
  <button
    type="button"
    class="hud-settings-button"
    aria-label="Open settings"
    onclick={onOpenSettings}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.14 12.94a7.49 7.49 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.48 7.48 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.48 7.48 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.49.38 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.48 7.48 0 0 0 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"
        fill="currentColor"
      />
    </svg>
  </button>
</div>

<style>
  .hud {
    position: fixed;
    top: 1.5rem;
    left: 1.35rem;
    z-index: 8;
    inline-size: clamp(16rem, 16vw, 13rem);
  }

  .hud-shell {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .hud-bars {
    flex: 1 1 auto;
    min-inline-size: 0;
    margin-top: 6px;
  }

  .hud-currency {
    display: inline-flex;
    gap: 0.18rem;
    align-items: center;
    padding: 0;
    margin-top: 5px;
    font-size: 0.78rem;
    font-weight: 900;
    color: #ffe7a3;
    text-shadow: 0 0.12rem 0.35rem rgba(0, 0, 0, 0.65);
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .hud-currency {
    margin-left: 5px;
  }

  .hud-currency img {
    inline-size: 1.3rem;
    block-size: 1.3rem;
    filter: drop-shadow(0 0 0.32rem rgba(255, 184, 77, 0.45));
  }

  .hud-icon-button {
    position: relative;
    flex: 0 0 auto;
    padding: 0;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .hud-icon-button:focus-visible {
    outline: 2px solid rgba(255, 220, 170, 0.8);
    outline-offset: 3px;
    border-radius: 999px;
  }

  .hud-icon {
    display: block;
    inline-size: 2.1rem;
    block-size: 2.1rem;
    pointer-events: none;
    filter: drop-shadow(0 0.2rem 0.45rem rgba(0, 0, 0, 0.3));
    transition: transform 0.12s ease-out;
  }

  .hud-icon-button:active .hud-icon {
    transform: scale(0.94);
  }

  .hud-hint {
    display: grid;
    place-items: center;
    min-inline-size: 0.95rem;
    block-size: 0.95rem;
    padding: 0 0.24rem;
    font-size: 0.52rem;
    font-weight: 800;
    color: rgba(255, 236, 204, 0.95);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    pointer-events: none;
    background: rgba(10, 8, 12, 0.98);
    border: 1px solid rgba(236, 224, 196, 0.5);
    border-radius: 0.28rem;
    box-shadow:
      0 0 0 1.5px rgba(10, 8, 12, 0.65),
      0 0.16rem 0.35rem rgba(0, 0, 0, 0.55);
  }

  .hud-icon-hint {
    position: absolute;
    inset-block-end: -0.55rem;
    inset-inline-end: -0.6rem;
    pointer-events: none;
  }

  .hud-bar {
    position: relative;
    flex: 1 1 auto;
    block-size: 0.5rem;
    overflow: hidden;
    background: rgba(18, 5, 4, 0.28);
    border-radius: 999px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 218, 218, 0.08),
      0 0 1rem rgba(0, 0, 0, 0.16);
  }

  .hud-bar {
    margin-bottom: 6px;
  }

  .hud-recover,
  .hud-fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .hud-recover {
    background: linear-gradient(
      90deg,
      rgba(124, 15, 10, 0.16),
      rgba(124, 15, 10, 0.4)
    );
    opacity: 0.66;
  }

  .hud-fill {
    background:
      linear-gradient(
        90deg,
        #b3211dff 0%,
        #b3211dff 38%,
        #b3211dff 72%,
        #b3211dff 100%
      ),
      linear-gradient(180deg, rgba(255, 214, 214, 0.14), transparent);
    box-shadow:
      0 0 0.7rem rgba(179, 33, 29, 0.2),
      inset 0 1px 0 rgba(255, 214, 214, 0.16);
  }

  .hud-ammo {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-block-start: 0.28rem;
  }

  .hud-ammo-track {
    position: relative;
    display: grid;
    flex: 1 1 auto;
    gap: 0.14rem;
    block-size: 0.34rem;
    padding: 0.05rem;
    overflow: hidden;
    background: rgba(11, 8, 14, 0.62);
    border-radius: 999px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 236, 204, 0.06),
      0 0 0.8rem rgba(0, 0, 0, 0.14);
  }

  .hud-ammo-reload {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(
      90deg,
      rgba(255, 185, 107, 0.14),
      rgba(255, 225, 168, 0.7)
    );
    border-radius: inherit;
    box-shadow: 0 0 0.7rem rgba(255, 184, 107, 0.18);
    transition: width 0.12s linear;
  }

  .hud-ammo-slot {
    position: relative;
    z-index: 1;
    min-inline-size: 0;
    background: linear-gradient(180deg, #ffe8a6, #ff9b57);
    border-radius: 999px;
    box-shadow:
      0 0 0.45rem rgba(255, 168, 94, 0.25),
      inset 0 1px 0 rgba(255, 249, 228, 0.55);
    transition:
      opacity 0.14s ease,
      transform 0.14s ease,
      filter 0.14s ease;
  }

  .hud-ammo-slot.spent {
    opacity: 0.18;
    filter: saturate(0.45);
    transform: scaleY(0.52);
  }

  .hud-settings-button {
    display: none;
    padding: 0;
    margin-block-start: 0.75rem;
    color: rgba(236, 224, 196, 0.85);
    cursor: pointer;
    background: transparent;
    border: 0;
    filter: drop-shadow(0 0.2rem 0.45rem rgba(0, 0, 0, 0.35));
    transition: transform 0.12s ease-out;
  }

  .hud-settings-button:hover {
    color: rgba(255, 236, 196, 1);
  }

  .hud-settings-button:active {
    transform: scale(0.94);
  }

  .hud-settings-button:focus-visible {
    outline: 2px solid rgba(255, 220, 170, 0.8);
    outline-offset: 3px;
    border-radius: 0.4rem;
  }

  .hud-settings-button svg {
    display: block;
    inline-size: 1.8rem;
    block-size: 1.8rem;
    pointer-events: none;
  }

  @media (max-width: 700px) {
    .hud {
      top: 0.85rem;
      left: 0.85rem;
      inline-size: min(11rem, calc(100vw - 9.5rem));
    }

    .hud-icon {
      inline-size: 1.8rem;
      block-size: 1.8rem;
    }

    .hud-settings-button {
      display: block;
    }

    .hud-settings-button svg {
      inline-size: 1.8rem;
      block-size: 1.8rem;
    }
  }

  @media (pointer: coarse) {
    .hud-hint {
      display: none;
    }
  }
</style>
