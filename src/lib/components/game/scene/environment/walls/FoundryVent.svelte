<script lang="ts">
  import { T } from "@threlte/core";
  import { cachedBox } from "$lib/game/cached-geometries";

  let {
    trimColor = "#7b4b22",
    width = 0.66,
    x = 0,
    y = 0,
  }: {
    trimColor?: string;
    width?: number;
    x?: number;
    y?: number;
  } = $props();

  const slats = [-0.22, -0.11, 0, 0.11, 0.22];
</script>

<T.Group position={[x, y, 0.34]}>
  <T.Mesh castShadow geometry={cachedBox(width, 0.66, 0.1)} receiveShadow>
    <T.MeshStandardMaterial color="#14100c" metalness={0.64} roughness={0.42} />
  </T.Mesh>

  {#each slats as slat}
    <T.Mesh
      castShadow
      geometry={cachedBox(width * 0.84, 0.045, 0.1)}
      position={[0, slat, 0.08]}
    >
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.72}
        roughness={0.34}
      />
    </T.Mesh>
  {/each}
</T.Group>
