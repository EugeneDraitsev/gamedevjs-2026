<script lang="ts">
  import mainMenuArtUrl from "$lib/assets/main-menu-art-machine.png";
  import AppModalShell from "$lib/components/app/AppModalShell.svelte";
  import { formatRunFloorLabel } from "$lib/config/run-floor";

  interface MainMenuProps {
    canResume: boolean;
    floorIndex: number;
    onContinue?: () => void;
    onOpenSettings: () => void;
    onPlay: () => void;
    seed: string;
  }

  let {
    canResume,
    floorIndex,
    onContinue,
    onOpenSettings,
    onPlay,
    seed,
  }: MainMenuProps = $props();

  let howToPlayOpen = $state(false);

  const openHowToPlay = () => {
    howToPlayOpen = true;
  };

  const closeHowToPlay = () => {
    howToPlayOpen = false;
  };
</script>

<section class="main-menu">
  <div
    class="menu-art"
    aria-hidden="true"
    style:background-image={`url(${mainMenuArtUrl})`}
  ></div>

  <div class="menu-content">
    <div class="menu-kicker">Clockwork Escape</div>
    <h1>
      <span>Orb</span>
      <span>Knight</span>
    </h1>
    <p class="menu-tagline">Break out of the machine. Reach the castle road.</p>

    <nav class="menu-actions" aria-label="Main menu">
      {#if canResume && onContinue}
        <button
          type="button"
          class="menu-action menu-action-primary"
          onclick={onContinue}
        >
          Continue Run
          <small>{formatRunFloorLabel(floorIndex)}</small>
        </button>
      {/if}
      <button type="button" class="menu-action" onclick={onPlay}>
        New Game
      </button>
      <button type="button" class="menu-action" onclick={openHowToPlay}>
        How to Play
      </button>
      <button type="button" class="menu-action" onclick={onOpenSettings}>
        Settings
      </button>
    </nav>
  </div>

  {#if howToPlayOpen}
    <AppModalShell
      describedby="how-to-play-copy"
      labelledby="how-to-play-title"
      onClose={closeHowToPlay}
      open={howToPlayOpen}
    >
      <section class="panel how-to-play-panel">
        <div class="how-to-play-header">
          <span class="eyebrow">Machine Floor Notes</span>
          <h2 id="how-to-play-title">How to Play</h2>
          <p id="how-to-play-copy">
            Break the core seal, collect modules, and reach the castle road.
          </p>
        </div>

        <div class="how-to-grid">
          <article class="how-to-card">
            <div class="how-to-icon key-cluster" aria-hidden="true">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
            </div>
            <div>
              <strong>Move</strong>
              <p>Use WASD or arrow keys to cross rooms and dodge hazards.</p>
            </div>
          </article>

          <article class="how-to-card">
            <div class="how-to-icon mouse left" aria-hidden="true">
              <span></span>
            </div>
            <div>
              <strong>Shoot</strong>
              <p>Aim with the mouse. Hold left mouse to fire your weapon.</p>
            </div>
          </article>

          <article class="how-to-card">
            <div class="how-to-icon sword-mark" aria-hidden="true">
              <span></span>
            </div>
            <div>
              <strong>Sword</strong>
              <p>
                Press F or right mouse. Strike the starting seal three times.
              </p>
            </div>
          </article>

          <article class="how-to-card">
            <div class="how-to-icon key-wide" aria-hidden="true">
              <kbd>SPACE</kbd>
            </div>
            <div>
              <strong>Jump</strong>
              <p>Hop over floor hazards and keep momentum through combat.</p>
            </div>
          </article>

          <article class="how-to-card">
            <div class="how-to-icon key-wide" aria-hidden="true">
              <kbd>R</kbd>
            </div>
            <div>
              <strong>Reload</strong>
              <p>Reload manually when a fight gives you a clean opening.</p>
            </div>
          </article>

          <article class="how-to-card">
            <div class="how-to-icon key-wide" aria-hidden="true">
              <kbd>E</kbd>
            </div>
            <div>
              <strong>Loadout</strong>
              <p>Open the machine bay and install modules between fights.</p>
            </div>
          </article>
        </div>

        <div class="how-to-actions">
          <button type="button" class="menu-action" onclick={closeHowToPlay}>
            Back
          </button>
        </div>
      </section>
    </AppModalShell>
  {/if}
</section>

<style>
  .main-menu {
    position: relative;
    inline-size: 100%;
    min-block-size: 100svh;
    overflow: hidden;
    color: #f4e8c7;
    background: #030303;
  }

  .menu-art {
    position: absolute;
    inset: 0;
    background-color: #030303;
    background-repeat: no-repeat;
    background-position: center bottom;
    background-size: cover;
    filter: saturate(0.92) contrast(1.02) brightness(0.78);
  }

  .main-menu::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
  }

  .main-menu::before {
    background:
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.84) 0%,
        rgba(0, 0, 0, 0.46) 28%,
        rgba(0, 0, 0, 0.18) 56%,
        rgba(0, 0, 0, 0.58) 100%
      ),
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.36),
        transparent 18%,
        transparent 60%,
        rgba(0, 0, 0, 0.54) 78%,
        rgba(0, 0, 0, 0.9) 100%
      ),
      radial-gradient(
        circle at 55% 48%,
        transparent 0 24%,
        rgba(0, 0, 0, 0.18) 64%,
        rgba(0, 0, 0, 0.84) 100%
      ),
      radial-gradient(
        circle at 50% 86%,
        rgba(220, 184, 112, 0.14),
        transparent 24%
      );
  }

  .menu-content {
    position: absolute;
    top: clamp(1rem, 5vh, 3rem);
    left: clamp(1rem, 4vw, 3.5rem);
    z-index: 1;
    display: grid;
    gap: 0.75rem;
    justify-items: start;
    inline-size: min(21rem, calc(100vw - 2rem));
    text-align: left;
  }

  .menu-kicker {
    font-size: 0.75rem;
    color: rgba(221, 200, 154, 0.68);
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    display: grid;
    gap: 0.1em;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2.4rem, 4.8vw, 4.8rem);
    font-weight: 400;
    line-height: 0.86;
    color: transparent;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: linear-gradient(
      180deg,
      #fcf0c8 0%,
      #ddb36a 38%,
      #f8e5b1 64%,
      #8d612e 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 0 18px rgba(230, 188, 104, 0.14))
      drop-shadow(0 10px 20px rgba(0, 0, 0, 0.44));
  }

  .menu-tagline {
    max-inline-size: 15rem;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(0.78rem, 0.9vw, 0.94rem);
    color: rgba(221, 205, 171, 0.72);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    text-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  }

  .menu-actions {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.8rem;
  }

  .menu-action {
    position: relative;
    display: grid;
    gap: 0.16rem;
    justify-items: start;
    min-inline-size: 9.5rem;
    min-block-size: 2rem;
    padding: 0.08rem 0.9rem 0.45rem 0.1rem;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(1rem, 1.6vw, 1.45rem);
    line-height: 1.1;
    color: rgba(237, 225, 196, 0.74);
    letter-spacing: 0.05em;
    background: transparent;
    border: 0;
    transition:
      color 160ms ease,
      text-shadow 160ms ease,
      opacity 160ms ease;
  }

  .menu-action::after {
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

  .menu-action:hover,
  .menu-action:focus-visible {
    color: #fff3d1;
    text-shadow: 0 0 16px rgba(238, 197, 110, 0.28);
  }

  .menu-action:hover::after,
  .menu-action:focus-visible::after {
    inline-size: 78%;
    opacity: 1;
  }

  .menu-action-primary {
    color: rgba(255, 243, 209, 0.92);
  }

  .menu-action small {
    font-size: 0.66rem;
    font-weight: 700;
    color: rgba(221, 205, 171, 0.56);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  .how-to-play-panel {
    inline-size: min(100%, 44rem);
  }

  .how-to-play-header {
    display: grid;
    gap: 0.45rem;
  }

  .how-to-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .how-to-card {
    display: grid;
    grid-template-columns: 4.8rem minmax(0, 1fr);
    gap: 0.85rem;
    align-items: center;
    min-block-size: 6.2rem;
    padding: 0.85rem;
    background:
      radial-gradient(circle at 0 0, rgba(213, 176, 111, 0.15), transparent 42%),
      linear-gradient(180deg, rgba(15, 16, 20, 0.78), rgba(7, 8, 13, 0.9));
    border: 1px solid rgba(212, 190, 132, 0.14);
    border-radius: 0.85rem;
    box-shadow: inset 0 1px 0 rgba(255, 243, 217, 0.04);
  }

  .how-to-card strong {
    display: block;
    margin-block-end: 0.28rem;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: 1.12rem;
    font-weight: 400;
    color: #fff3d1;
    letter-spacing: 0.05em;
  }

  .how-to-card p {
    font-size: 0.82rem;
  }

  .how-to-icon {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 4.3rem;
    block-size: 4.3rem;
    color: #201613;
    background: radial-gradient(
      circle at 50% 25%,
      rgba(255, 230, 174, 0.82),
      rgba(189, 122, 70, 0.42) 56%,
      rgba(74, 39, 25, 0.22)
    );
    border: 1px solid rgba(248, 221, 159, 0.46);
    border-radius: 0.75rem;
    box-shadow:
      inset 0 0 0 1px rgba(58, 34, 21, 0.26),
      0 0 1rem rgba(213, 176, 111, 0.12);
  }

  .how-to-icon kbd {
    display: grid;
    place-items: center;
    min-inline-size: 1.35rem;
    block-size: 1.25rem;
    padding: 0 0.24rem;
    font:
      800 0.66rem "IBM Plex Mono",
      monospace;
    color: #f8e7bb;
    background: rgba(31, 20, 17, 0.78);
    border: 1px solid rgba(248, 221, 159, 0.28);
    border-radius: 0.25rem;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.42);
  }

  .key-cluster {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.18rem;
    padding: 0.75rem;
  }

  .key-cluster kbd:first-child {
    grid-row: 1;
    grid-column: 2;
  }

  .key-cluster kbd:nth-child(2) {
    grid-row: 2;
    grid-column: 1;
  }

  .key-cluster kbd:nth-child(3) {
    grid-row: 2;
    grid-column: 2;
  }

  .key-cluster kbd:nth-child(4) {
    grid-row: 2;
    grid-column: 3;
  }

  .key-wide kbd {
    min-inline-size: 2.7rem;
  }

  .mouse {
    border-radius: 999px;
  }

  .mouse::before {
    position: absolute;
    top: 0.72rem;
    bottom: 1.25rem;
    left: 50%;
    inline-size: 1px;
    content: "";
    background: rgba(31, 20, 17, 0.68);
  }

  .mouse span {
    position: absolute;
    top: 0.78rem;
    left: 0.92rem;
    inline-size: 1.1rem;
    block-size: 1.55rem;
    background: rgba(31, 20, 17, 0.7);
    border-radius: 999px 0.2rem 0.2rem 999px;
  }

  .sword-mark span {
    inline-size: 0.34rem;
    block-size: 3.25rem;
    background: linear-gradient(180deg, #fff2c7, #55311e);
    border-radius: 999px;
    box-shadow: 0 0 0.6rem rgba(255, 230, 174, 0.28);
    rotate: 42deg;
  }

  .sword-mark::after {
    position: absolute;
    inline-size: 2.2rem;
    block-size: 0.25rem;
    content: "";
    background: rgba(31, 20, 17, 0.72);
    border-radius: 999px;
    rotate: 42deg;
  }

  .how-to-actions {
    display: flex;
    justify-content: flex-start;
    padding-top: 0.2rem;
  }

  @media (max-width: 1100px), (max-height: 860px) {
    .menu-art {
      background-position: 58% bottom;
    }

    .menu-content {
      top: 1rem;
      left: 1rem;
      inline-size: min(18rem, calc(100vw - 2rem));
    }

    h1 {
      font-size: clamp(2.15rem, 5vw, 3.8rem);
    }
  }

  @media (max-width: 780px), (max-height: 720px) {
    .menu-content {
      position: absolute;
      top: max(0.75rem, env(safe-area-inset-top));
      right: 0.75rem;
      left: 0.75rem;
      justify-items: center;
      inline-size: auto;
      padding: 0.9rem 1rem 1rem;
      text-align: center;
      background:
        radial-gradient(
          circle at 50% 12%,
          rgba(223, 184, 106, 0.14),
          transparent 18%
        ),
        linear-gradient(
          180deg,
          rgba(7, 7, 8, 0.82),
          rgba(7, 7, 8, 0.44) 62%,
          rgba(7, 7, 8, 0.08)
        );
      border: 1px solid rgba(215, 178, 103, 0.08);
      border-radius: 1.25rem;
      box-shadow:
        inset 0 1px 0 rgba(255, 241, 204, 0.04),
        0 18px 40px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(10px);
    }

    .menu-tagline {
      max-inline-size: 17rem;
      line-height: 1.45;
    }
  }

  @media (max-width: 700px) {
    .menu-art {
      background-position: 62% bottom;
    }

    h1 {
      font-size: clamp(2rem, 11vw, 3.15rem);
    }

    .menu-action {
      min-inline-size: 8.5rem;
      padding-inline-end: 0.6rem;
    }

    .how-to-grid {
      grid-template-columns: 1fr;
    }

    .how-to-card {
      grid-template-columns: 4.2rem minmax(0, 1fr);
    }

    .how-to-icon {
      inline-size: 3.8rem;
      block-size: 3.8rem;
    }
  }
</style>
