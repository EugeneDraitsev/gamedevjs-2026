<script lang="ts">
  interface HowToPlayPanelProps {
    onBack: () => void;
  }

  let { onBack }: HowToPlayPanelProps = $props();
</script>

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
      <div class="how-to-icon key-wide" aria-hidden="true"><kbd>LMB</kbd></div>
      <div>
        <strong>Shoot</strong>
        <p>Aim with the mouse. Hold LMB to fire your weapon.</p>
      </div>
    </article>

    <article class="how-to-card">
      <div class="how-to-icon key-pair" aria-hidden="true">
        <kbd>F</kbd>
        <kbd>RMB</kbd>
      </div>
      <div>
        <strong>Sword</strong>
        <p>Press F or RMB. Strike the starting seal three times.</p>
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
      <div class="how-to-icon key-wide" aria-hidden="true"><kbd>R</kbd></div>
      <div>
        <strong>Reload</strong>
        <p>Reload manually when a fight gives you a clean opening.</p>
      </div>
    </article>

    <article class="how-to-card">
      <div class="how-to-icon key-wide" aria-hidden="true"><kbd>E</kbd></div>
      <div>
        <strong>Loadout</strong>
        <p>Open the machine bay and install modules between fights.</p>
      </div>
    </article>
  </div>

  <div class="how-to-actions">
    <button type="button" class="menu-action" onclick={onBack}>Back</button>
  </div>
</section>

<style>
  :global(.settings-dialog .how-to-play-panel),
  .how-to-play-panel {
    inline-size: min(100%, 48rem);
  }

  .how-to-play-header {
    display: grid;
    gap: 0.45rem;
  }

  .how-to-play-panel h2 {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(2rem, 4.2vw, 3rem);
    font-weight: 400;
    line-height: 0.9;
    color: #f8f4ff;
    letter-spacing: 0.01em;
  }

  .how-to-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .how-to-card {
    display: grid;
    grid-template-columns: 5.55rem minmax(0, 1fr);
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

  .how-to-card > div:last-child {
    min-inline-size: 0;
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
    justify-self: center;
    inline-size: 4.75rem;
    block-size: 4.75rem;
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
    min-inline-size: 1.18rem;
    block-size: 1.16rem;
    padding: 0 0.18rem;
    font:
      800 0.64rem "IBM Plex Mono",
      monospace;
    color: #f8e7bb;
    background: rgba(31, 20, 17, 0.78);
    border: 1px solid rgba(248, 221, 159, 0.28);
    border-radius: 0.25rem;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.42);
  }

  .key-cluster {
    grid-template-columns: repeat(3, minmax(0, 1.18rem));
    gap: 0.18rem;
    align-content: center;
    justify-content: center;
    padding: 0.45rem;
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

  .key-pair {
    gap: 0.32rem;
    align-content: center;
  }

  .key-pair kbd {
    min-inline-size: 2.45rem;
  }

  .how-to-actions {
    display: flex;
    justify-content: flex-start;
    padding-top: 0.2rem;
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

  @media (max-width: 700px) {
    .how-to-grid {
      grid-template-columns: 1fr;
    }

    .how-to-card {
      grid-template-columns: 4.6rem minmax(0, 1fr);
    }

    .how-to-icon {
      inline-size: 4rem;
      block-size: 4rem;
    }

    .how-to-icon kbd {
      min-inline-size: 1rem;
      block-size: 1.06rem;
      font-size: 0.58rem;
    }

    .key-cluster {
      grid-template-columns: repeat(3, minmax(0, 1rem));
      gap: 0.14rem;
      padding: 0.35rem;
    }
  }
</style>
