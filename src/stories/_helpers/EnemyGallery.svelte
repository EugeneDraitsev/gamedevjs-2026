<script lang="ts">
  import type { EnemyTemplate } from "$lib/config/room-templates";
  import EnemyModelShowcase from "./EnemyModelShowcase.svelte";

  interface Props {
    autoRotate?: boolean;
    columns?: number;
    height?: string;
    templates: EnemyTemplate[];
    title?: string;
  }

  let {
    autoRotate = false,
    columns = 3,
    height = "260px",
    templates,
    title,
  }: Props = $props();
</script>

<section class="gallery" style:--cols={columns}>
  {#if title}
    <h1>{title}</h1>
  {/if}

  <div class="grid">
    {#each templates as template (template.id)}
      <article class="card">
        <EnemyModelShowcase {autoRotate} {height} {template} />
        <dl>
          <div>
            <dt>HP</dt>
            <dd>{template.hp}</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>{template.moveSpeed.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Radius</dt>
            <dd>{template.radius.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Behavior</dt>
            <dd>{template.behavior}</dd>
          </div>
          {#if template.preferredRange}
            <div>
              <dt>Range</dt>
              <dd>{template.preferredRange.toFixed(1)}</dd>
            </div>
          {/if}
        </dl>
      </article>
    {/each}
  </div>
</section>

<style>
  .gallery {
    min-block-size: 100vh;
    padding: 24px;
    font-family: "Segoe UI", system-ui, sans-serif;
    color: #cfe2ff;
    background: #04060e;
  }

  h1 {
    margin: 0 0 18px;
    font-size: 18px;
    color: #7fd8ff;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 18px;
  }

  .card {
    display: grid;
    gap: 10px;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 12px;
    margin: 0;
    font-size: 12px;
  }

  dl > div {
    display: flex;
    justify-content: space-between;
    padding-block-end: 4px;
    border-bottom: 1px dashed rgba(127, 216, 255, 0.15);
  }

  dt {
    color: #7fd8ff;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  dd {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    color: #f5f7ff;
  }
</style>
