<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { PCFSoftShadowMap } from "three";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import {
    createDefaultMachineLoadout,
    type MachineLoadout,
    type MachineSlotId,
  } from "$lib/config/machine-modules";

  interface MachineBayOrbPreviewProps {
    highlightedSlotId?: MachineSlotId | null;
    machineLoadout?: MachineLoadout;
  }

  let {
    highlightedSlotId = null,
    machineLoadout = createDefaultMachineLoadout(),
  }: MachineBayOrbPreviewProps = $props();
</script>

<div class="orb-preview" role="img" aria-label="Machine chassis preview">
  <Canvas dpr={2} shadows={PCFSoftShadowMap}>
    <T.PerspectiveCamera fov={35} makeDefault position={[0, 0.48, 5.35]}>
      <OrbitControls
        enableDamping
        enablePan={false}
        enableZoom
        maxDistance={6.15}
        minDistance={3.45}
        maxPolarAngle={Math.PI * 0.68}
        minPolarAngle={Math.PI * 0.26}
        rotateSpeed={0.65}
        target={[0.05, 0, 0]}
        zoomSpeed={0.72}
      />
    </T.PerspectiveCamera>

    <T.AmbientLight intensity={0.6} />
    <T.HemisphereLight args={["#d8f8ff", "#17100a", 1.08]} />
    <T.DirectionalLight
      castShadow
      intensity={2.5}
      position={[3.4, 4.8, 3.8]}
      shadow.mapSize={[1024, 1024]}
    />
    <T.PointLight
      color="#78f7ff"
      distance={4.8}
      intensity={1.25}
      position={[0, -0.14, 1.6]}
    />

    <T.Group position={[0.02, -0.02, 0]} rotation={[-0.02, -0.22, 0]}>
      <OrbKnight
        autoRotate={false}
        {highlightedSlotId}
        {machineLoadout}
        scale={0.98}
      />
    </T.Group>
  </Canvas>
</div>

<style>
  .orb-preview {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
    overflow: hidden;
    cursor: grab;
    background:
      radial-gradient(
        circle at 52% 45%,
        rgba(89, 246, 255, 0.13),
        transparent 32%
      ),
      radial-gradient(
        circle at 48% 50%,
        rgba(251, 191, 36, 0.1),
        transparent 58%
      );
    border-radius: 50%;
    isolation: isolate;
  }

  .orb-preview:active {
    cursor: grabbing;
  }

  .orb-preview::after {
    position: absolute;
    inset-block-end: 13%;
    inset-inline: 16% 18%;
    block-size: 16%;
    pointer-events: none;
    content: "";
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.5), transparent 70%);
    filter: blur(8px);
  }

  .orb-preview :global(canvas) {
    display: block;
  }
</style>
