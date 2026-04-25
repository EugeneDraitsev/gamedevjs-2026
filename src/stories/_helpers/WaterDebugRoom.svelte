<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { PCFSoftShadowMap } from "three";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import WaterDebugScene from "./WaterDebugScene.svelte";
</script>

<div class="stage">
  <Canvas shadows={PCFSoftShadowMap} dpr={1}>
    <SceneRendererConfig backgroundColor="#14100b" exposure={0.86} />
    <T.Fog attach="fog" args={["#15100b", 16, 34]} />

    <T.PerspectiveCamera makeDefault position={[0, 8.4, 8.8]} fov={48}>
      <OrbitControls
        enableDamping
        maxDistance={18}
        minDistance={5}
        target={[0, 0, 0]}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={["#f0d19a", "#21170f", 0.95]} />
    <T.AmbientLight intensity={0.42} />
    <T.DirectionalLight
      castShadow
      color="#ffd08a"
      intensity={3.1}
      position={[-5, 8, 4]}
    />

    <WaterDebugScene />
  </Canvas>
</div>

<style>
  .stage {
    position: relative;
    inline-size: 100%;
    block-size: 100vh;
    background: #14100b;
  }
</style>
