<script lang="ts">
  import {
    Handle,
    type NodeProps,
    Position,
    useSvelteFlow,
  } from "@xyflow/svelte";
  import WeaponModIcon from "$lib/components/weapon-mod-icon.svelte";
  import {
    type WeaponFlowNode,
    weaponRarityColors,
  } from "$lib/config/weapon-graph";

  let { data, id, selected = false }: NodeProps<WeaponFlowNode> = $props();

  const flow = useSvelteFlow<WeaponFlowNode>();

  const updateValue = (event: Event) => {
    flow.updateNodeData(id, {
      value: Number((event.currentTarget as HTMLInputElement).value),
    });
  };

  const removeNode = () => {
    flow.deleteElements({ nodes: [{ id }] });
  };

  const rarityLabel = $derived(data.rarity ? data.rarity.toUpperCase() : null);
</script>

<div class:selected class="node" style:--accent={data.accent}>
  {#if data.kind !== "entry"}
    <Handle type="target" position={Position.Left} />
  {/if}

  <div class="title-row">
    <div class="title-copy">
      <div class="title-main">
        {#if data.icon}
          <WeaponModIcon icon={data.icon} tint={data.accent} />
        {/if}
        <strong>{data.label}</strong>
      </div>

      {#if rarityLabel}
        <span
          class="rarity"
          style:--rarity={data.rarity ? weaponRarityColors[data.rarity] : data.accent}
        >
          {rarityLabel}
        </span>
      {/if}
    </div>

    {#if data.kind === "modifier"}
      <button class="nodrag nopan remove" type="button" onclick={removeNode}>
        x
      </button>
    {/if}
  </div>

  {#if data.kind === "modifier"}
    <div class="value">roll {Math.round((data.value ?? 0) * 100)}%</div>
    <input
      class="nodrag nopan"
      type="range"
      min={data.min}
      max={data.max}
      step={data.step}
      value={data.value}
      oninput={updateValue}
    >
    <p class="effect">{data.effect}</p>
    {#if selected}
      <p>{data.hint}</p>
    {/if}
  {:else}
    <p>{data.kind === "entry" ? "Start of chain" : "End of chain"}</p>
  {/if}

  {#if data.kind !== "exit"}
    <Handle type="source" position={Position.Right} />
  {/if}
</div>

<style>
  .node {
    position: relative;
    display: grid;
    gap: 0.35rem;
    inline-size: 176px;
    min-inline-size: 176px;
    max-inline-size: 176px;
    padding: 0.72rem;
    overflow: hidden;
    color: #eff7ff;
    background:
      linear-gradient(180deg, rgba(8, 18, 32, 0.96), rgba(5, 12, 24, 0.98)),
      repeating-linear-gradient(
        90deg,
        transparent 0 14px,
        color-mix(in srgb, var(--accent) 10%, transparent) 14px 15px
      );
    border: 1px solid
      color-mix(in srgb, var(--accent) 50%, rgba(255, 255, 255, 0.12));
    border-radius: 1rem;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25);
  }

  .node::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background:
      radial-gradient(
        circle at 14px 14px,
        rgba(255, 255, 255, 0.14) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 14px) 14px,
        rgba(255, 255, 255, 0.14) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at 14px calc(100% - 14px),
        rgba(255, 255, 255, 0.14) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 14px) calc(100% - 14px),
        rgba(255, 255, 255, 0.14) 0 2px,
        transparent 2px
      );
  }

  .node::after {
    position: absolute;
    inset: auto 0.55rem 0.55rem auto;
    inline-size: 1.85rem;
    block-size: 1.85rem;
    pointer-events: none;
    content: "";
    background:
      repeating-conic-gradient(
        from 0deg,
        color-mix(in srgb, var(--accent) 48%, white) 0 12deg,
        transparent 12deg 30deg
      ),
      radial-gradient(
        circle,
        transparent 0 0.36rem,
        color-mix(in srgb, var(--accent) 24%, white) 0.36rem 0.58rem,
        transparent 0.58rem
      );
    border-radius: 999px;
    opacity: 0.22;
  }

  .node.selected {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 70%, white),
      0 14px 40px rgba(0, 0, 0, 0.3);
  }

  .title-row {
    display: flex;
    gap: 0.5rem;
    align-items: start;
    justify-content: space-between;
  }

  .title-copy {
    display: grid;
    gap: 0.3rem;
    min-inline-size: 0;
  }

  .title-main {
    display: flex;
    gap: 0.45rem;
    align-items: center;
  }

  .title-main :global(svg) {
    inline-size: 1.8rem;
    block-size: 1.8rem;
  }

  strong {
    font-size: 0.86rem;
    line-height: 1.1;
  }

  .rarity {
    inline-size: fit-content;
    padding: 0.18rem 0.42rem;
    font-size: 0.63rem;
    font-weight: 700;
    color: color-mix(in srgb, var(--rarity) 86%, white);
    letter-spacing: 0.08em;
    background: color-mix(in srgb, var(--rarity) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--rarity) 30%, transparent);
    border-radius: 999px;
  }

  .value,
  p {
    margin: 0;
    font-size: 0.72rem;
    line-height: 1.25;
    color: rgba(231, 243, 252, 0.72);
    overflow-wrap: anywhere;
  }

  .value {
    font-weight: 700;
    color: color-mix(in srgb, var(--accent) 70%, white);
  }

  .effect {
    min-block-size: 1.8em;
    color: rgba(245, 250, 255, 0.88);
  }

  input {
    inline-size: 100%;
    margin: 0;
  }

  .remove {
    inline-size: 1.5rem;
    block-size: 1.5rem;
    padding: 0;
    color: inherit;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
  }

  :global(.svelte-flow__handle) {
    inline-size: 0.7rem;
    block-size: 0.7rem;
    background: color-mix(in srgb, var(--accent) 80%, white);
    border: 2px solid rgba(6, 16, 30, 0.95);
  }
</style>
