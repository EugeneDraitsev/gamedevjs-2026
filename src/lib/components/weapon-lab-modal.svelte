<script lang="ts">
  import { Background, MarkerType, SvelteFlow } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import WeaponFlowNode from "$lib/components/weapon-flow-node.svelte";
  import WeaponModIcon from "$lib/components/weapon-mod-icon.svelte";
  import {
    createWeaponEdge,
    createWeaponFlowNode,
    type WeaponBuild,
    type WeaponFlowEdge,
    type WeaponFlowNode as WeaponFlowNodeType,
    type WeaponNodeRarity,
    type WeaponNodeType,
    weaponEntryNodeId,
    weaponExitNodeId,
    weaponNodeTemplates,
    weaponRarityColors,
  } from "$lib/config/weapon-graph";

  interface WeaponLabModalProps {
    edges: WeaponFlowEdge[];
    nodes: WeaponFlowNodeType[];
    onClose?: () => void;
    open?: boolean;
    preview: WeaponBuild;
  }

  const nodeTypes = { weapon: WeaponFlowNode };
  const rarityOrder: WeaponNodeRarity[] = ["common", "uncommon", "rare"];
  const modifierLimit = 3;
  const entryPosition = { x: 40, y: 190 };
  const exitPosition = { x: 1030, y: 190 };
  const slotPositions = [
    { x: 250, y: 58 },
    { x: 520, y: 248 },
    { x: 790, y: 92 },
  ];

  let {
    edges = $bindable(),
    nodes = $bindable(),
    onClose,
    open = false,
    preview,
  }: WeaponLabModalProps = $props();

  const orderModifiers = (sourceNodes: WeaponFlowNodeType[]) =>
    sourceNodes
      .filter((node) => node.data.kind === "modifier")
      .toSorted(
        (left, right) =>
          left.position.x - right.position.x ||
          left.position.y - right.position.y
      )
      .slice(0, modifierLimit)
      .map((node) => ({ ...node, draggable: true }));

  const buildPipeline = (sourceNodes: WeaponFlowNodeType[]) => {
    const entryNode = sourceNodes.find((node) => node.id === weaponEntryNodeId);
    const exitNode = sourceNodes.find((node) => node.id === weaponExitNodeId);
    const modifiers = orderModifiers(sourceNodes);
    const chain = [
      weaponEntryNodeId,
      ...modifiers.map((node) => node.id),
      weaponExitNodeId,
    ];

    return {
      edges: chain
        .slice(0, -1)
        .map((source, index) => createWeaponEdge(source, chain[index + 1])),
      nodes: [
        ...(entryNode
          ? [{ ...entryNode, draggable: false, position: entryPosition }]
          : []),
        ...modifiers,
        ...(exitNode
          ? [{ ...exitNode, draggable: false, position: exitPosition }]
          : []),
      ],
    };
  };

  const getGraphSignature = (
    nextNodes: WeaponFlowNodeType[],
    nextEdges: WeaponFlowEdge[]
  ) =>
    JSON.stringify({
      edges: nextEdges.map((edge) => [edge.source, edge.target]),
      nodes: nextNodes.map((node) => [
        node.id,
        node.position.x,
        node.position.y,
      ]),
    });

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

  const previewPaths = $derived.by(() => {
    const pathCount = preview.pelletCount;

    return Array.from({ length: pathCount }, (_, index) => {
      const laneOffset =
        pathCount === 1
          ? 0
          : (index / (pathCount - 1) - 0.5) * preview.spread * 120;
      const points = Array.from({ length: 9 }, (__unused, step) => {
        const t = step / 8;
        const x = 18 + t * 220;
        const wave =
          Math.sin(t * Math.PI * (2.2 + preview.curve * 0.38)) *
          preview.curve *
          5.4;
        const drop = preview.gravity * t * t * 8;
        const y = 88 + laneOffset * t + wave + drop;

        return `${x},${clamp(y, 16, 152)}`;
      });

      return {
        endX: 18 + 220,
        endY: clamp(
          88 +
            laneOffset +
            Math.sin(Math.PI * (2.2 + preview.curve * 0.38)) *
              preview.curve *
              5.4 +
            preview.gravity * 8,
          16,
          152
        ),
        id: `${index}-${preview.curve}-${preview.pelletCount}`,
        path: points.join(" "),
      };
    });
  });

  const groupedTemplates = $derived(
    rarityOrder.map((rarity) => ({
      items: weaponNodeTemplates.filter((item) => item.rarity === rarity),
      rarity,
    }))
  );
  const modifierCount = $derived(
    nodes.filter((node) => node.data.kind === "modifier").length
  );
  const slotStates = $derived(
    Array.from(
      { length: modifierLimit },
      (__unused, index) => orderModifiers(nodes)[index] ?? null
    )
  );

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  const getDistanceBandLabel = (index: number) =>
    ["close", "mid", "far"][index] ?? "far";

  $effect(() => {
    if (!open) {
      return;
    }

    modifierCount;
    syncPipeline();
  });
</script>

{#if open}
  <div class="backdrop">
    <section class="modal">
      <header>
        <strong>Weapon Lab</strong>
        <button type="button" onclick={onClose}>Close</button>
      </header>

      <div class="layout">
        <aside class="palette">
          <div class="palette-status">
            <strong>Module Rack</strong>
            <span>{modifierCount}/{modifierLimit} mounted</span>
          </div>

          {#each groupedTemplates as group (group.rarity)}
            <section class="rarity-group">
              <p
                class="rarity-title"
                style:--rarity={weaponRarityColors[group.rarity]}
              >
                <span></span>
                {group.rarity}
              </p>

              {#each group.items as template (template.type)}
                <button
                  type="button"
                  disabled={modifierCount >= modifierLimit}
                  onclick={() => addNode(template.type)}
                  style:--accent={template.accent}
                  style:--rarity={weaponRarityColors[template.rarity]}
                >
                  <div class="palette-head">
                    <WeaponModIcon
                      icon={template.icon}
                      tint={template.accent}
                    />
                    <div class="palette-copy">
                      <strong>{template.label}</strong>
                      <small>{template.rarity}</small>
                    </div>
                  </div>
                  <span>{template.effect}</span>
                </button>
              {/each}
            </section>
          {/each}
        </aside>

        <div class="flow-pane">
          <div class="flow-overlay">
            <div class="machine-rig" aria-hidden="true">
              <span class="rail rail-a"></span>
              <span class="rail rail-b"></span>
              <span class="gear gear-a"></span>
              <span class="gear gear-b"></span>
              <span class="gear gear-c"></span>
            </div>

            <div class="slot-strip">
              {#each slotStates as slot, index}
                <div
                  class:filled={Boolean(slot)}
                  style:--slot={slot?.data.accent ?? "#27405a"}
                >
                  <span>slot {index + 1}</span>
                  <strong>{slot?.data.label ?? "empty"}</strong>
                </div>
              {/each}
            </div>

            <button class="reset-layout" type="button" onclick={resetLayout}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4.6l1.4-1.6 2 1 .2 2.1 1.8.8 1.8-1 1.4 1.6-1 1.8.8 1.8 2.1.2v2.2l-2.1.2-.8 1.8 1 1.8-1.4 1.6-1.8-1-1.8.8-.2 2.1-2 1-1.4-1.6-1.4 1.6-2-1-.2-2.1-1.8-.8-1.8 1-1.4-1.6 1-1.8-.8-1.8-2.1-.2v-2.2l2.1-.2.8-1.8-1-1.8 1.4-1.6 1.8 1 1.8-.8.2-2.1 2-1L12 4.6z"
                />
                <circle cx="12" cy="12" r="3.1" />
              </svg>
              <span>Reset Layout</span>
            </button>
          </div>

          <SvelteFlow
            bind:nodes
            bind:edges
            {nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.42 }}
            colorMode="dark"
            elementsSelectable
            connectionLineStyle="stroke:#7dd3fc;stroke-width:2"
            defaultEdgeOptions={{
              animated: true,
              markerEnd: { color: "#7dd3fc", type: MarkerType.ArrowClosed },
              style: "stroke:#7dd3fc;stroke-width:2.5",
              type: "smoothstep",
            }}
            nodesConnectable={false}
            nodesDraggable
            snapGrid={[20, 20]}
          >
            <Background
              bgColor="#07111d"
              gap={18}
              patternColor="#17324b"
              size={1.2}
            />
          </SvelteFlow>
        </div>

        <aside class="preview">
          <section class="preview-card">
            <div class="preview-head">
              <strong>Current Attack</strong>
              <span>{preview.patternLabel}</span>
            </div>

            <svg viewBox="0 0 256 168" aria-label="Attack preview">
              <title>Attack preview</title>
              <rect x="0" y="0" width="256" height="168" rx="18" />

              {#each previewPaths as path}
                <polyline
                  points={path.path}
                  fill="none"
                  stroke={preview.colors.shell}
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="4"
                />
                <circle
                  cx={path.endX}
                  cy={path.endY}
                  r={6 + preview.massFactor * 1.8}
                  fill={preview.colors.core}
                  stroke={preview.colors.shell}
                  stroke-width="2"
                />
              {/each}
            </svg>

            <div class="stat-grid">
              <div>
                <span>Damage</span>
                <strong>x{preview.damageFactor.toFixed(2)}</strong>
              </div>
              <div>
                <span>Speed</span>
                <strong>x{preview.speedFactor.toFixed(2)}</strong>
              </div>
              <div>
                <span>Mass</span>
                <strong>x{preview.massFactor.toFixed(2)}</strong>
              </div>
              <div>
                <span>Range</span>
                <strong>x{preview.rangeFactor.toFixed(2)}</strong>
              </div>
              <div>
                <span>Balls</span>
                <strong>{preview.pelletCount}</strong>
              </div>
              <div>
                <span>Mods</span>
                <strong>{preview.connectedModifierCount}</strong>
              </div>
            </div>

            <div class="damage-bands">
              {#each preview.damageProfile as band, index}
                <div>
                  <span>{getDistanceBandLabel(index)}</span>
                  <div class="bar">
                    <div
                      class="fill"
                      style:width={`${Math.round((band / 2.4) * 100)}%`}
                    ></div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="meta">
              <div
                class="gradient"
                style:background={preview.colors.gradient}
              ></div>
              <span>{preview.damageProfileLabel}</span>
            </div>
          </section>
        </aside>
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
    position: relative;
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

  .modal::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background:
      radial-gradient(
        circle at 24px 24px,
        rgba(255, 255, 255, 0.12) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 24px) 24px,
        rgba(255, 255, 255, 0.12) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at 24px calc(100% - 24px),
        rgba(255, 255, 255, 0.12) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 24px) calc(100% - 24px),
        rgba(255, 255, 255, 0.12) 0 2px,
        transparent 2px
      );
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border-block-end: 1px solid rgba(125, 211, 252, 0.1);
  }

  header button,
  .palette button {
    color: inherit;
    cursor: pointer;
    background: rgba(10, 21, 35, 0.95);
    border: 1px solid rgba(125, 211, 252, 0.12);
    border-radius: 0.9rem;
  }

  header button {
    padding: 0.55rem 0.9rem;
  }

  .layout {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-columns: 270px minmax(0, 1fr);
    min-block-size: 0;
  }

  .palette,
  .preview {
    padding: 0.85rem;
    overflow: auto;
    background:
      linear-gradient(180deg, rgba(8, 17, 29, 0.95), rgba(6, 14, 25, 0.92)),
      repeating-linear-gradient(
        180deg,
        transparent 0 22px,
        rgba(255, 255, 255, 0.018) 22px 23px
      );
  }

  .palette {
    display: grid;
    grid-row: 1 / span 2;
    gap: 0.85rem;
    align-content: start;
    border-inline-end: 1px solid rgba(125, 211, 252, 0.08);
  }

  .palette-status {
    display: grid;
    gap: 0.2rem;
    padding: 0.75rem 0.85rem;
    background:
      linear-gradient(180deg, rgba(11, 23, 38, 0.95), rgba(8, 16, 28, 0.98)),
      repeating-linear-gradient(
        90deg,
        transparent 0 10px,
        rgba(255, 255, 255, 0.03) 10px 11px
      );
    border: 1px solid rgba(125, 211, 252, 0.12);
    border-radius: 1rem;
  }

  .palette-status strong {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .palette-status span {
    color: rgba(231, 243, 252, 0.62);
  }

  .rarity-group {
    display: grid;
    gap: 0.5rem;
  }

  .rarity-title {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    color: color-mix(in srgb, var(--rarity) 82%, white);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .rarity-title span {
    inline-size: 0.55rem;
    block-size: 0.55rem;
    background: var(--rarity);
    border-radius: 999px;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--rarity) 18%, transparent);
  }

  .palette button {
    display: grid;
    gap: 0.35rem;
    min-inline-size: 0;
    padding: 0.65rem 0.75rem 0.75rem;
    text-align: left;
    background:
      linear-gradient(180deg, rgba(10, 21, 35, 0.98), rgba(7, 15, 26, 0.98)),
      repeating-linear-gradient(
        90deg,
        transparent 0 14px,
        color-mix(in srgb, var(--rarity) 12%, transparent) 14px 15px
      );
    border-color: color-mix(
      in srgb,
      var(--rarity) 28%,
      rgba(255, 255, 255, 0.12)
    );
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .palette button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .palette span {
    font-size: 0.78rem;
    color: rgba(231, 243, 252, 0.65);
  }

  .palette-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.6rem;
    align-items: center;
  }

  .palette-copy {
    display: grid;
    gap: 0.18rem;
    min-inline-size: 0;
  }

  .palette button strong {
    font-size: 0.9rem;
  }

  .palette button small {
    inline-size: fit-content;
    padding: 0.16rem 0.4rem;
    font-size: 0.62rem;
    font-weight: 800;
    color: color-mix(in srgb, var(--rarity) 84%, white);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: color-mix(in srgb, var(--rarity) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--rarity) 32%, transparent);
    border-radius: 999px;
  }

  .flow-pane {
    position: relative;
    grid-row: 1;
    grid-column: 2;
    min-block-size: 0;
    background:
      linear-gradient(180deg, rgba(3, 10, 18, 0.92), rgba(5, 15, 28, 0.98)),
      repeating-linear-gradient(
        0deg,
        transparent 0 26px,
        rgba(255, 255, 255, 0.015) 26px 27px
      );
  }

  .flow-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.8rem;
    align-content: start;
    align-items: start;
    padding: 0.75rem 1rem 0;
    pointer-events: none;
  }

  .machine-rig {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.34;
  }

  .rail,
  .gear {
    position: absolute;
  }

  .rail {
    background:
      linear-gradient(180deg, rgba(5, 13, 24, 0.92), rgba(8, 19, 33, 0.72)),
      repeating-linear-gradient(
        90deg,
        rgba(255, 209, 102, 0.14) 0 12px,
        transparent 12px 20px
      );
    border: 1px solid rgba(125, 211, 252, 0.12);
    border-radius: 999px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 0 0 1px rgba(3, 9, 18, 0.55);
  }

  .rail-a {
    inset: 180px 150px auto 120px;
    block-size: 18px;
  }

  .rail-b {
    inset: auto 180px 92px 240px;
    block-size: 14px;
    opacity: 0.7;
  }

  .gear {
    background:
      repeating-conic-gradient(
        from 0deg,
        rgba(125, 211, 252, 0.26) 0 10deg,
        transparent 10deg 30deg
      ),
      radial-gradient(
        circle,
        transparent 0 18px,
        rgba(125, 211, 252, 0.18) 18px 28px,
        transparent 28px 37px,
        rgba(125, 211, 252, 0.12) 37px 44px,
        transparent 44px
      );
    border-radius: 999px;
    filter: drop-shadow(0 0 18px rgba(0, 0, 0, 0.22));
    animation: gear-spin 16s linear infinite;
  }

  .gear-a {
    inset: 54px auto auto 126px;
    inline-size: 116px;
    block-size: 116px;
  }

  .gear-b {
    inset: auto auto 72px 474px;
    inline-size: 78px;
    block-size: 78px;
    animation-duration: 11s;
    animation-direction: reverse;
  }

  .gear-c {
    inset: 64px 136px auto auto;
    inline-size: 96px;
    block-size: 96px;
    animation-duration: 20s;
  }

  .slot-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .slot-strip div {
    position: relative;
    display: grid;
    gap: 0.18rem;
    padding: 0.72rem 0.75rem 0.62rem;
    background:
      linear-gradient(180deg, rgba(9, 17, 29, 0.92), rgba(5, 11, 21, 0.96)),
      repeating-linear-gradient(
        90deg,
        transparent 0 16px,
        rgba(255, 255, 255, 0.018) 16px 17px
      );
    border: 1px solid rgba(125, 211, 252, 0.08);
    border-radius: 0.9rem;
  }

  .slot-strip div::before {
    position: absolute;
    inset: 0.28rem 0.4rem auto;
    block-size: 0.22rem;
    content: "";
    background: repeating-linear-gradient(
      90deg,
      rgba(255, 209, 102, 0.55) 0 8px,
      transparent 8px 13px
    );
    border-radius: 999px;
    opacity: 0.52;
  }

  .slot-strip .filled {
    border-color: color-mix(
      in srgb,
      var(--slot) 35%,
      rgba(255, 255, 255, 0.12)
    );
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--slot) 14%, transparent);
  }

  .slot-strip div:nth-child(2) {
    transform: translateY(0.4rem);
  }

  .slot-strip div:nth-child(3) {
    transform: translateY(0.15rem);
  }

  .reset-layout {
    display: inline-flex;
    gap: 0.55rem;
    align-items: center;
    align-self: start;
    padding: 0.72rem 0.9rem;
    color: #eff7ff;
    pointer-events: auto;
    cursor: pointer;
    background:
      linear-gradient(180deg, rgba(11, 22, 36, 0.98), rgba(7, 15, 27, 0.98)),
      repeating-linear-gradient(
        90deg,
        transparent 0 12px,
        rgba(255, 209, 102, 0.08) 12px 13px
      );
    border: 1px solid rgba(125, 211, 252, 0.14);
    border-radius: 0.95rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 12px 28px rgba(0, 0, 0, 0.18);
  }

  .reset-layout svg {
    inline-size: 1rem;
    block-size: 1rem;
    fill: none;
    stroke: #ffd166;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .reset-layout span {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .slot-strip span {
    font-size: 0.62rem;
    font-weight: 800;
    color: rgba(231, 243, 252, 0.44);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .slot-strip strong {
    font-size: 0.84rem;
  }

  .preview {
    grid-row: 2;
    grid-column: 2;
    padding-block-start: 0.75rem;
    border-block-start: 1px solid rgba(125, 211, 252, 0.08);
  }

  .preview-card {
    position: relative;
    display: grid;
    grid-template-columns: minmax(240px, 320px) minmax(0, 1fr) minmax(
        180px,
        220px
      );
    gap: 0.85rem;
    align-items: start;
    padding: 0.85rem;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(10, 20, 35, 0.94), rgba(6, 14, 25, 0.96)),
      repeating-linear-gradient(
        90deg,
        transparent 0 18px,
        rgba(255, 255, 255, 0.016) 18px 19px
      );
    border: 1px solid rgba(125, 211, 252, 0.12);
    border-radius: 1rem;
  }

  .preview-card::before {
    position: absolute;
    inset: 0 auto auto 0;
    inline-size: 120px;
    block-size: 120px;
    content: "";
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 8px, transparent 8px),
      radial-gradient(
        circle,
        transparent 0 21px,
        rgba(125, 211, 252, 0.36) 21px 24px,
        transparent 24px
      );
    opacity: 0.1;
    transform: translate(-28px, -28px);
  }

  .preview-head,
  .meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }

  .preview-head {
    grid-column: 1 / -1;
  }

  .preview-head span,
  .meta span,
  .damage-bands span,
  .stat-grid span {
    color: rgba(231, 243, 252, 0.68);
  }

  .preview-card > svg {
    inline-size: 100%;
    block-size: auto;
  }

  .preview-card rect {
    fill: rgba(5, 13, 24, 0.98);
    stroke: rgba(125, 211, 252, 0.12);
  }

  .stat-grid,
  .damage-bands {
    display: grid;
    gap: 0.65rem;
  }

  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stat-grid div,
  .damage-bands div {
    display: grid;
    gap: 0.25rem;
  }

  .stat-grid strong {
    font-size: 1rem;
  }

  .bar {
    block-size: 0.5rem;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
  }

  .fill {
    block-size: 100%;
    background: linear-gradient(90deg, #4cc9f0, #ff5a5f);
    border-radius: inherit;
  }

  .gradient {
    inline-size: 110px;
    block-size: 0.65rem;
    border-radius: 999px;
  }

  .preview-card > svg {
    grid-column: 1;
  }

  .preview-card > .stat-grid,
  .preview-card > .meta {
    grid-column: 2;
  }

  .preview-card > .damage-bands {
    grid-column: 3;
  }

  :global(.svelte-flow) {
    background:
      radial-gradient(circle at top, rgba(76, 201, 240, 0.08), transparent 26%),
      linear-gradient(
        0deg,
        transparent 49.5%,
        rgba(125, 211, 252, 0.035) 50%,
        transparent 50.5%
      ),
      linear-gradient(
        90deg,
        transparent 49.5%,
        rgba(125, 211, 252, 0.04) 50%,
        transparent 50.5%
      ),
      linear-gradient(180deg, #030812, #07111d);
  }

  @keyframes gear-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gear {
      animation: none;
    }
  }

  :global(.svelte-flow__attribution) {
    display: none;
  }

  @media (max-width: 1120px) {
    .layout {
      grid-template-rows: minmax(0, 1fr) auto;
      grid-template-columns: 220px minmax(0, 1fr);
    }

    .flow-overlay {
      grid-template-columns: 1fr;
    }

    .reset-layout {
      justify-self: start;
    }

    .preview {
      grid-column: 2;
    }

    .preview-card {
      grid-template-columns: minmax(220px, 1fr) minmax(0, 1fr);
    }

    .preview-card > .damage-bands {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 860px) {
    .layout {
      grid-template-rows: auto minmax(0, 1fr) auto;
      grid-template-columns: 1fr;
    }

    .palette {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      grid-row: auto;
      border-block-end: 1px solid rgba(125, 211, 252, 0.08);
      border-inline-end: 0;
    }

    .flow-pane,
    .preview {
      grid-row: auto;
      grid-column: auto;
    }

    .slot-strip {
      grid-template-columns: 1fr;
    }

    .slot-strip div:nth-child(2),
    .slot-strip div:nth-child(3) {
      transform: none;
    }

    .preview-card {
      grid-template-columns: 1fr;
    }
  }
</style>
