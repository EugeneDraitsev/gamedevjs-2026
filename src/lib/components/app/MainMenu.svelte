<script lang="ts">
  import mainMenuArtUrl from "$lib/assets/main-menu-art-machine.png";

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
</script>

<section class="main-menu">
  <div
    class="menu-art"
    aria-hidden="true"
    style:background-image={`url(${mainMenuArtUrl})`}
  ></div>

  <div class="menu-content">
    <div class="menu-kicker">Clockwork Descent</div>
    <h1>
      <span>Warden's</span>
      <span>Trial</span>
    </h1>
    <p class="menu-tagline">Descend into the sealed engine below.</p>

    <nav class="menu-actions" aria-label="Main menu">
      {#if canResume && onContinue}
        <button
          type="button"
          class="menu-action menu-action-primary"
          onclick={onContinue}
        >
          Continue Run
          <small>Floor {floorIndex}</small>
        </button>
      {/if}
      <button type="button" class="menu-action" onclick={onPlay}>
        New Game
      </button>
      <button type="button" class="menu-action" onclick={onOpenSettings}>
        Settings
      </button>
    </nav>
  </div>
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
  }
</style>
