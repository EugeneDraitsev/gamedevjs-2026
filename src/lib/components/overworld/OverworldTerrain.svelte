<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry } from "three";
  import OverworldTerrainCollider from "./OverworldTerrainCollider.svelte";
  import { createGroundMaterial } from "./materials/ground-material";

  interface Props {
    radius?: number;
    playableRadius?: number;
    playerPosition?: [number, number, number];
    collider?: boolean;
  }

  let {
    radius = 90,
    playableRadius = 58,
    playerPosition = [0, 0, 0],
    collider = false,
  }: Props = $props();

  const { material, uniforms } = createGroundMaterial();
  uniforms.uPlayableRadius.value = playableRadius;

  // Dense tessellation so vertex displacement creates actual topology
  const terrainGeometry = new PlaneGeometry(radius * 2, radius * 2, 180, 180);

  useTask((delta) => {
    uniforms.uTime.value += delta;
    uniforms.uPlayerPos.value = playerPosition;
  });
</script>

<T.Mesh
  geometry={terrainGeometry}
  {material}
  rotation={[-Math.PI / 2, 0, 0]}
  receiveShadow
/>

{#if collider}
  <OverworldTerrainCollider {playableRadius} />
{/if}
