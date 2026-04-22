<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { World } from "@threlte/rapier";
  import { PCFSoftShadowMap } from "three";
  import OverworldPoi from "$lib/components/overworld/OverworldPoi.svelte";
  import OverworldScenery from "$lib/components/overworld/OverworldScenery.svelte";
  import { createOverworldLayout } from "$lib/config/overworld-layout";

  const seed = "polygon-001";
  const layout = createOverworldLayout(seed);

  const avoidList: Array<[number, number, number]> = [
    ...layout.pois.map(
      (p) =>
        [p.position[0], p.position[1], p.position[2]] as [number, number, number]
    ),
    ...layout.chests.map(
      (c) =>
        [c.position[0], c.position[1], c.position[2]] as [number, number, number]
    ),
    ...layout.healthPickups.map(
      (p) =>
        [p.position[0], p.position[1], p.position[2]] as [number, number, number]
    ),
    ...layout.rivers.map(
      (r) =>
        [r.position[0], r.position[1], r.position[2]] as [number, number, number]
    ),
  ];

  const initialDpr =
    typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio) : 2;
</script>

<svelte:head><title>Overworld preview</title></svelte:head>

<main class="stage">
  <Canvas shadows={PCFSoftShadowMap} dpr={initialDpr}>
    <T.PerspectiveCamera
      makeDefault
      position={[10, 8, 30]}
      fov={55}
      far={600}
    />
    <OrbitControls
      enableDamping
      target={[0, 2, 0]}
      minDistance={6}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />

    <World gravity={[0, -9.81, 0]}>
      <OverworldScenery {layout} playerPosition={[0, 0, 0]} {avoidList} />

      {#each layout.pois as poi (poi.id)}
        <OverworldPoi {poi} highlighted={false} />
      {/each}
    </World>
  </Canvas>

  <div class="hint">
    orbit: drag · zoom: scroll · pan: right-drag — post-apoc canyon overworld preview
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #040816;
    color: #f4e8c7;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }
  :global(html) {
    overflow: hidden;
  }
  .stage {
    position: relative;
    inline-size: 100%;
    block-size: 100vh;
    overflow: hidden;
  }
  :global(.stage > :first-child) {
    position: absolute;
    inset: 0;
  }
  .hint {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.45rem 0.9rem;
    font-size: 0.82rem;
    color: rgba(221, 205, 171, 0.72);
    background: rgba(8, 12, 22, 0.66);
    border: 1px solid rgba(212, 190, 132, 0.2);
    border-radius: 0.6rem;
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
</style>
