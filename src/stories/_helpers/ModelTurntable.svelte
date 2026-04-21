<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import type { Snippet } from "svelte";

  interface Props {
    autoRotate?: boolean;
    background?: string;
    cameraTargetY?: number;
    children: Snippet;
    groundY?: number;
    height?: string;
    label?: string;
    rotateSpeed?: number;
  }

  let {
    autoRotate = false,
    background = "#040816",
    cameraTargetY = 0.2,
    children,
    groundY = -1,
    height = "260px",
    label,
    rotateSpeed = 0.4,
  }: Props = $props();
</script>

<div class="turntable" style:--bg={background} style:--h={height}>
  {#if label}
    <header>{label}</header>
  {/if}

  <div class="canvas">
    <Canvas dpr={2} shadows>
      <T.PerspectiveCamera fov={42} makeDefault position={[3.4, 2.4, 4.6]}>
        <OrbitControls
          {autoRotate}
          autoRotateSpeed={rotateSpeed * 10}
          enableDamping
          enableZoom
          maxDistance={9}
          minDistance={1.4}
          target={[0, cameraTargetY, 0]}
        />
      </T.PerspectiveCamera>

      <T.HemisphereLight args={["#cfe7ff", "#1c2436", 1]} />
      <T.AmbientLight intensity={0.6} />
      <T.DirectionalLight
        castShadow
        intensity={2}
        position={[5, 8, 4]}
        shadow.mapSize={[1024, 1024]}
      />

      <T.Mesh
        position={[0, groundY, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.CircleGeometry args={[3.2, 48]} />
        <T.MeshStandardMaterial color="#0f1a2c" roughness={0.96} />
      </T.Mesh>

      {@render children()}
    </Canvas>
  </div>
</div>

<style>
  .turntable {
    overflow: hidden;
    font-family: "Segoe UI", system-ui, sans-serif;
    color: #cfe2ff;
    background: var(--bg);
    border: 1px solid rgba(127, 216, 255, 0.18);
    border-radius: 12px;
  }

  header {
    padding: 8px 14px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: rgba(8, 18, 33, 0.8);
    border-bottom: 1px solid rgba(127, 216, 255, 0.15);
  }

  .canvas {
    position: relative;
    inline-size: 100%;
    block-size: var(--h);
  }
</style>
