<script lang="ts">
  import { Background, MarkerType, SvelteFlow } from "@xyflow/svelte";
  import WeaponFlowNode from "$lib/components/weapon-lab/WeaponFlowNode.svelte";
  import type {
    WeaponFlowEdge,
    WeaponFlowNode as WeaponFlowNodeType,
  } from "$lib/config/weapon-graph";

  interface WeaponLabCanvasProps {
    edges: WeaponFlowEdge[];
    nodes: WeaponFlowNodeType[];
    resetLayout: () => void;
    slotStates: Array<WeaponFlowNodeType | null>;
  }

  const nodeTypes = { weapon: WeaponFlowNode };

  let {
    edges = $bindable(),
    nodes = $bindable(),
    resetLayout,
    slotStates,
  }: WeaponLabCanvasProps = $props();
</script>

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
    <Background bgColor="#07111d" gap={18} patternColor="#17324b" size={1.2} />
  </SvelteFlow>
</div>
