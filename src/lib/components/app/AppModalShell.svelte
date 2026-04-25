<script lang="ts">
  import type { Snippet } from "svelte";

  interface AppModalShellProps {
    children?: Snippet;
    describedby?: string;
    labelledby?: string;
    onClose?: () => void;
    open?: boolean;
  }

  let {
    children,
    describedby,
    labelledby,
    onClose,
    open = true,
  }: AppModalShellProps = $props();
</script>

{#if open}
  <dialog
    aria-describedby={describedby}
    aria-labelledby={labelledby}
    aria-modal="true"
    class="settings-dialog"
    open
    onclick={(event) => {
      if (event.target === event.currentTarget) {
        onClose?.();
      }
    }}
  >
    {#if children}
      {@render children()}
    {/if}
  </dialog>
{/if}

<style>
  .settings-dialog {
    position: fixed;
    inset: 0;
    z-index: 20;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 100vw;
    max-inline-size: 100vw;
    block-size: 100dvh;
    max-block-size: 100dvh;
    padding: 1.5rem;
    margin: 0;
    background: transparent;
    border: 0;
  }

  .settings-dialog::backdrop {
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
      rgba(3, 8, 16, 0.74);
    backdrop-filter: blur(18px);
  }

  :global(.settings-dialog .panel) {
    display: grid;
    gap: 1.05rem;
    inline-size: min(100%, 36rem);
    max-block-size: calc(100dvh - 3rem);
    padding: 1.55rem 1.5rem 1.4rem;
    margin: 0;
    overflow-y: auto;
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

  :global(.settings-dialog .eyebrow) {
    font-size: 0.74rem;
    font-weight: 800;
    color: rgba(221, 200, 154, 0.68);
    text-transform: uppercase;
    letter-spacing: 0.22em;
  }

  :global(.settings-dialog .panel h1),
  :global(.settings-dialog .panel h2),
  :global(.settings-dialog .panel p) {
    margin: 0;
  }

  :global(.settings-dialog .panel p) {
    line-height: 1.5;
    color: rgba(221, 205, 171, 0.72);
  }

  :global(.settings-dialog .panel label span) {
    font-size: 0.74rem;
    font-weight: 700;
    color: rgba(221, 200, 154, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  :global(.settings-dialog .panel label) {
    display: grid;
    gap: 0.4rem;
  }

  :global(.settings-dialog .panel select) {
    font: inherit;
  }

  :global(.settings-dialog .panel select) {
    padding: 0.72rem 0.9rem;
    color: #f2e7c7;
    background: rgba(10, 11, 16, 0.82);
    border: 1px solid rgba(212, 190, 132, 0.14);
    border-radius: 0.9rem;
  }

  :global(.settings-dialog .panel .toggle) {
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  @media (max-width: 700px) {
    .settings-dialog {
      padding: 1rem;
    }

    :global(.settings-dialog .panel) {
      gap: 1rem;
      inline-size: min(100%, 20rem);
      max-block-size: calc(100dvh - 2.5rem);
      padding: 1.4rem 1.25rem 1.25rem;
      overflow-y: auto;
      border-radius: 1rem;
    }

    :global(.settings-dialog .panel .actions) {
      gap: 0.7rem;
      padding-top: 0.7rem;
      margin-top: 0.4rem;
    }

    :global(.settings-dialog .panel .toggle) {
      padding-block: 0.2rem;
    }

    :global(.settings-dialog .panel .menu-button) {
      font-size: 1.05rem;
    }
  }
</style>
