<script lang="ts">
  import "@xyflow/svelte/dist/style.css";
  import {
    buildPipeline,
    entryPosition,
    exitPosition,
    getGraphSignature,
    modifierLimit,
    orderModifiers,
    slotPositions,
  } from "$lib/components/weapon-lab/helpers";
  import WeaponLabCanvas from "$lib/components/weapon-lab/WeaponLabCanvas.svelte";
  import WeaponLabPalette from "$lib/components/weapon-lab/WeaponLabPalette.svelte";
  import WeaponLabPreview from "$lib/components/weapon-lab/WeaponLabPreview.svelte";
  import {
    createWeaponFlowNode,
    type WeaponBuild,
    type WeaponFlowEdge,
    type WeaponFlowNode as WeaponFlowNodeType,
    type WeaponNodeType,
    weaponEntryNodeId,
    weaponExitNodeId,
  } from "$lib/config/weapon-graph";

  interface WeaponLabModalProps {
    availableModules: WeaponNodeType[];
    edges: WeaponFlowEdge[];
    nodes: WeaponFlowNodeType[];
    onAddModule?: (type: WeaponNodeType) => void;
    onClose?: () => void;
    onReturnModule?: (type: WeaponNodeType) => void;
    open?: boolean;
    preview: WeaponBuild;
  }

  let {
    availableModules,
    edges = $bindable(),
    nodes = $bindable(),
    onAddModule,
    onClose,
    open = false,
    onReturnModule,
    preview,
  }: WeaponLabModalProps = $props();
  let knownModifierTypes = new Map<string, WeaponNodeType>();

  const syncPipeline = (sourceNodes = nodes) => {
    const nextGraph = buildPipeline(sourceNodes);

    if (
      getGraphSignature(nextGraph.nodes, nextGraph.edges) ===
      getGraphSignature(nodes, edges)
    ) {
      return;
    }

    nodes = nextGraph.nodes;
    edges = nextGraph.edges;
  };

  const addNode = (type: WeaponNodeType) => {
    if (modifierCount >= modifierLimit) {
      return;
    }

    nodes = [
      ...nodes,
      createWeaponFlowNode(type, slotPositions[modifierCount]),
    ];
    onAddModule?.(type);
  };

  const resetLayout = () => {
    const ordered = orderModifiers(nodes);

    nodes = nodes.map((node) => {
      if (node.id === weaponEntryNodeId) {
        return { ...node, draggable: false, position: entryPosition };
      }

      if (node.id === weaponExitNodeId) {
        return { ...node, draggable: false, position: exitPosition };
      }

      const index = ordered.findIndex((candidate) => candidate.id === node.id);

      return index === -1
        ? node
        : { ...node, draggable: true, position: slotPositions[index] };
    });
  };

  const modifierCount = $derived(
    nodes.filter((node) => node.data.kind === "modifier").length
  );
  const slotStates = $derived(
    Array.from(
      { length: modifierLimit },
      (_unused, index) => orderModifiers(nodes)[index] ?? null
    )
  );

  $effect(() => {
    if (!open) {
      return;
    }

    modifierCount;
    syncPipeline();
  });

  $effect(() => {
    const nextModifierTypes = new Map(
      nodes.flatMap((node) =>
        node.data.kind === "modifier" && node.data.type
          ? [[node.id, node.data.type as WeaponNodeType] as const]
          : []
      )
    );

    for (const [id, type] of knownModifierTypes) {
      if (!nextModifierTypes.has(id)) {
        onReturnModule?.(type);
      }
    }

    knownModifierTypes = nextModifierTypes;
  });
</script>

{#if open}
  <div class="backdrop">
    <section class="modal">
      <header class="header">
        <div>
          <strong>Weapon Lab</strong>
          <span>Separate UI shell, same graph logic.</span>
        </div>
        <button type="button" onclick={onClose}>Close</button>
      </header>

      <div class="layout">
        <WeaponLabPalette
          {availableModules}
          {modifierCount}
          onAddModule={addNode}
        />

        <WeaponLabCanvas bind:edges bind:nodes {resetLayout} {slotStates} />

        <WeaponLabPreview {preview} />
      </div>
    </section>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    padding: 1rem;
    background: rgba(2, 7, 16, 0.68);
    backdrop-filter: blur(12px);
  }

  .modal {
    display: grid;
    grid-template-rows: auto 1fr;
    block-size: calc(100vh - 2rem);
    overflow: hidden;
    color: #eff7ff;
    background:
      linear-gradient(180deg, rgba(11, 21, 35, 0.92), rgba(4, 10, 18, 0.98)),
      repeating-linear-gradient(
        90deg,
        transparent 0 28px,
        rgba(125, 211, 252, 0.03) 28px 29px
      );
    border: 1px solid rgba(125, 211, 252, 0.16);
    border-radius: 1.25rem;
  }

  .header {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.1rem;
    border-bottom: 1px solid rgba(125, 211, 252, 0.12);
  }

  .header div {
    display: grid;
    gap: 0.18rem;
  }

  .header span {
    font-size: 0.84rem;
    color: rgba(174, 197, 223, 0.76);
  }

  .header button {
    padding: 0.75rem 0.95rem;
    color: #eff7ff;
    background: rgba(8, 18, 31, 0.82);
    border: 1px solid rgba(138, 198, 255, 0.16);
    border-radius: 0.9rem;
  }

  .layout {
    display: grid;
    grid-template-columns: 19rem minmax(0, 1fr) 18rem;
    min-block-size: 0;
  }

  :global(.palette),
  :global(.preview) {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    overflow: auto;
    border-inline-end: 1px solid rgba(125, 211, 252, 0.08);
  }

  :global(.preview) {
    border-inline: 1px solid rgba(125, 211, 252, 0.08);
  }

  :global(.palette-status),
  :global(.preview-card),
  :global(.palette-empty),
  :global(.rarity-group) {
    display: grid;
    gap: 0.65rem;
  }

  :global(.palette-status span),
  :global(.palette-empty span),
  :global(.preview-head span),
  :global(.preview span),
  :global(.preview small) {
    color: rgba(174, 197, 223, 0.76);
  }

  :global(.palette button),
  :global(.reset-layout) {
    display: grid;
    gap: 0.55rem;
    padding: 0.8rem;
    color: #eff7ff;
    text-align: left;
    background: rgba(8, 18, 31, 0.82);
    border: 1px solid rgba(138, 198, 255, 0.12);
    border-radius: 0.9rem;
  }

  :global(.palette button:disabled) {
    opacity: 0.45;
  }

  :global(.palette-head),
  :global(.preview-head),
  :global(.palette-copy) {
    display: flex;
    gap: 0.65rem;
    align-items: center;
  }

  :global(.palette-copy) {
    flex-direction: column;
    gap: 0.12rem;
    align-items: start;
  }

  :global(.rarity-title) {
    display: flex;
    gap: 0.45rem;
    align-items: center;
    margin: 0;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  :global(.rarity-title span) {
    inline-size: 0.55rem;
    block-size: 0.55rem;
    background: var(--rarity);
    border-radius: 999px;
  }

  :global(.flow-pane) {
    position: relative;
    min-inline-size: 0;
  }

  :global(.flow-pane .svelte-flow) {
    inline-size: 100%;
    block-size: 100%;
  }

  :global(.flow-overlay) {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    gap: 1rem;
    align-content: start;
    padding: 1rem;
    pointer-events: none;
  }

  :global(.machine-rig),
  :global(.slot-strip) {
    display: flex;
    gap: 0.6rem;
  }

  :global(.slot-strip) {
    justify-content: center;
  }

  :global(.slot-strip > div) {
    display: grid;
    gap: 0.2rem;
    min-inline-size: 7rem;
    padding: 0.65rem;
    background: rgba(6, 14, 24, 0.72);
    border: 1px solid rgba(138, 198, 255, 0.12);
    border-radius: 0.9rem;
  }

  :global(.slot-strip > div.filled) {
    border-color: color-mix(
      in srgb,
      var(--slot) 42%,
      rgba(255, 255, 255, 0.08)
    );
  }

  :global(.slot-strip span),
  :global(.meta span),
  :global(.damage-bands span),
  :global(.stat-grid span) {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  :global(.reset-layout) {
    grid-auto-flow: column;
    align-items: center;
    justify-self: end;
    inline-size: fit-content;
    pointer-events: auto;
  }

  :global(.reset-layout svg) {
    inline-size: 1rem;
    block-size: 1rem;
    fill: currentColor;
  }

  :global(.preview-card) {
    padding: 0.9rem;
    background: rgba(8, 18, 31, 0.82);
    border: 1px solid rgba(138, 198, 255, 0.12);
    border-radius: 1rem;
  }

  :global(.preview-card svg) {
    inline-size: 100%;
    block-size: auto;
  }

  :global(.preview-card rect) {
    fill: rgba(7, 17, 29, 0.92);
    stroke: rgba(138, 198, 255, 0.16);
  }

  :global(.stat-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  :global(.stat-grid > div),
  :global(.damage-bands > div),
  :global(.meta) {
    display: grid;
    gap: 0.3rem;
  }

  :global(.bar) {
    block-size: 0.42rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
  }

  :global(.fill) {
    block-size: 100%;
    background: linear-gradient(90deg, #7dd3fc, #57d6a5);
  }

  :global(.gradient) {
    block-size: 0.6rem;
    border-radius: 999px;
  }

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 1fr;
    }

    :global(.palette),
    :global(.preview) {
      border: 0;
    }

    :global(.flow-pane) {
      min-block-size: 26rem;
    }
  }
</style>
