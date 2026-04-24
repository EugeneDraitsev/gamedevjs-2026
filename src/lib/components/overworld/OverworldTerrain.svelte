<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry } from "three";
  import { createGroundMaterial } from "./materials/ground-material";
  import OverworldTerrainCollider from "./OverworldTerrainCollider.svelte";

  interface Props {
    collider?: boolean;
    playableRadius?: number;
    playerPosition?: [number, number, number];
    radius?: number;
  }

  let {
    radius = 90,
    playableRadius = 58,
    playerPosition = [0, 0, 0],
    collider = false,
  }: Props = $props();

  const createTerrainMaterial = () => {
    const result = createGroundMaterial();
    result.uniforms.uPlayableRadius.value = playableRadius;
    return result;
  };

  const { material, uniforms } = createTerrainMaterial();

  // Dense tessellation so vertex displacement creates actual topology
  const createTerrainGeometry = () =>
    new PlaneGeometry(radius * 2, radius * 2, 180, 180);

  const terrainGeometry = createTerrainGeometry();

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
