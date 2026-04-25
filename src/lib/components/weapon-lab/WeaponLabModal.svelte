<script lang="ts">
  import "@xyflow/svelte/dist/style.css";
  import {
    createAudioDuckReason,
    setGameAudioDucked,
  } from "$lib/audio/ducking";
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
  const audioDuckReason = createAudioDuckReason("weapon-lab");
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

  $effect(() => {
    setGameAudioDucked(audioDuckReason, open);

    return () => {
      setGameAudioDucked(audioDuckReason, false);
    };
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

        <div class="workspace">
          <WeaponLabCanvas bind:edges bind:nodes {resetLayout} {slotStates} />
          <WeaponLabPreview {preview} />
        </div>
      </div>
    </section>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 3vw, 2.5rem);
    background: rgba(2, 7, 16, 0.54);
    backdrop-filter: blur(12px);
  }

  .modal {
    display: grid;
    grid-template-rows: auto 1fr;
    inline-size: min(1380px, 100%);
    max-block-size: min(88vh, 920px);
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
    grid-template-columns: 17rem minmax(0, 1fr);
    min-block-size: 0;
  }

  .workspace {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    min-inline-size: 0;
    min-block-size: 0;
  }

  :global(.palette),
  :global(.preview) {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    overflow: auto;
  }

  :global(.palette) {
    border-inline-end: 1px solid rgba(125, 211, 252, 0.08);
  }

  :global(.preview) {
    background: rgba(5, 13, 22, 0.78);
    border-top: 1px solid rgba(125, 211, 252, 0.08);
  }

  :global(.preview-card),
  :global(.palette-empty),
  :global(.rarity-group) {
    display: grid;
    gap: 0.65rem;
  }

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
    grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
    gap: 1rem;
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

  :global(.preview-visual),
  :global(.preview-details) {
    display: grid;
    gap: 0.8rem;
    min-inline-size: 0;
  }

  :global(.preview-head) {
    justify-content: space-between;
  }

  :global(.stat-grid) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
  }

  :global(.stat-grid > div),
  :global(.damage-bands > div),
  :global(.meta) {
    display: grid;
    gap: 0.3rem;
  }

  :global(.damage-bands) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  :global(.damage-band-head) {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    justify-content: space-between;
  }

  :global(.damage-band-head strong) {
    font-size: 0.95rem;
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
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-columns: 1fr;
    }

    .workspace {
      grid-template-rows: minmax(24rem, 1fr) auto;
    }

    :global(.palette),
    :global(.preview) {
      border: 0;
    }

    :global(.palette) {
      border-bottom: 1px solid rgba(125, 211, 252, 0.08);
    }

    :global(.flow-pane) {
      min-block-size: 26rem;
    }

    :global(.preview-card) {
      grid-template-columns: 1fr;
    }

    :global(.stat-grid),
    :global(.damage-bands) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .backdrop {
      place-items: stretch;
      padding: 0.5rem;
    }

    .modal {
      inline-size: 100%;
      block-size: calc(100dvh - 1rem);
      max-block-size: calc(100dvh - 1rem);
      border-radius: 0.9rem;
    }

    .header {
      padding: 0.75rem 0.85rem;
    }

    .header strong {
      font-size: 1rem;
    }

    .header span {
      font-size: 0.72rem;
    }

    .header button {
      padding: 0.5rem 0.8rem;
      font-size: 0.9rem;
    }

    .layout {
      display: block;
      overflow-y: auto;
      min-block-size: 0;
      -webkit-overflow-scrolling: touch;
    }

    .workspace {
      display: block;
    }

    :global(.flow-pane) {
      display: block;
      block-size: 22rem;
      min-block-size: 22rem;
    }

    :global(.palette),
    :global(.preview) {
      padding: 0.9rem;
    }

    :global(.slot-strip > div) {
      min-inline-size: 5.5rem;
      padding: 0.5rem;
    }

    :global(.stat-grid),
    :global(.damage-bands) {
      grid-template-columns: 1fr;
    }
  }
</style>
