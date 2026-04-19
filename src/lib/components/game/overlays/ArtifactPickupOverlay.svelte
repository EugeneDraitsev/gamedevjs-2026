<script lang="ts">
  import type { SceneOverlayProps } from "$lib/types/game";

  let {
    artifactPickupProgress,
    pickedArtifactTemplate,
  }: Pick<
    SceneOverlayProps,
    "artifactPickupProgress" | "pickedArtifactTemplate"
  > = $props();

  const artifactPickupStrength = $derived(
    Math.sin((1 - artifactPickupProgress) * Math.PI)
  );
</script>

{#if artifactPickupProgress > 0 && pickedArtifactTemplate}
  <div class="artifact-pickup" style:opacity={artifactPickupStrength}>
    <div
      class="artifact-pickup-card"
      style:--accent={pickedArtifactTemplate.accent}
      style:transform={`translateY(${(1 - artifactPickupStrength) * 18}px) scale(${0.97 + artifactPickupStrength * 0.03})`}
    >
      <span>Artifact Acquired</span>
      <strong>{pickedArtifactTemplate.label}</strong>
      <small>{pickedArtifactTemplate.rarity}</small>
    </div>
  </div>
{/if}

<style>
  .artifact-pickup {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    align-items: end;
    justify-items: center;
    padding: 0 1rem 4.5rem;
    pointer-events: none;
  }

  .artifact-pickup-card {
    position: relative;
    display: grid;
    gap: 0.18rem;
    justify-items: center;
    inline-size: min(20rem, calc(100vw - 2rem));
    padding: 0.85rem 1.8rem 0.95rem;
    overflow: hidden;
    color: #eff7ff;
    text-align: center;
    background:
      radial-gradient(
        circle at top,
        color-mix(in srgb, var(--accent) 22%, transparent),
        transparent 62%
      ),
      linear-gradient(180deg, rgba(8, 15, 26, 0.96), rgba(4, 10, 18, 0.94));
    border: 1px solid
      color-mix(in srgb, var(--accent) 36%, rgba(138, 198, 255, 0.2));
    border-radius: 1.1rem;
    box-shadow:
      0 1.15rem 2.8rem rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  }

  .artifact-pickup-card::before,
  .artifact-pickup-card::after {
    position: absolute;
    left: 50%;
    inline-size: calc(100% - 2.4rem);
    block-size: 1px;
    content: "";
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--accent) 72%, rgba(255, 255, 255, 0.74)),
      transparent
    );
    transform: translateX(-50%);
  }

  .artifact-pickup-card::before {
    top: 0.58rem;
  }

  .artifact-pickup-card::after {
    bottom: 0.58rem;
  }

  .artifact-pickup-card span,
  .artifact-pickup-card small {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .artifact-pickup-card span {
    margin-top: 0.08rem;
    color: color-mix(in srgb, var(--accent) 54%, rgba(255, 255, 255, 0.82));
    letter-spacing: 0.18em;
  }

  .artifact-pickup-card strong {
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(1.5rem, 4vw, 2.35rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.98);
    letter-spacing: 0.04em;
  }

  .artifact-pickup-card small {
    margin-bottom: 0.08rem;
    color: rgba(198, 214, 232, 0.8);
    letter-spacing: 0.16em;
  }
</style>
