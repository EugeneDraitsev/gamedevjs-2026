<script lang="ts">
  import { T } from "@threlte/core";
  import { cachedBox } from "$lib/game/cached-geometries";

  let {
    height = 4.05,
    trimColor = "#7b4b22",
    width = 1.65,
  }: {
    height?: number;
    trimColor?: string;
    width?: number;
  } = $props();

  const postX = $derived(width / 2);
  const railY = $derived(height / 2 - 0.16);
</script>

<T.Group>
  {#each [-1, 1] as side}
    <T.Mesh
      castShadow={false}
      geometry={cachedBox(0.32, height, 0.36)}
      position={[side * postX, 0, 0.18]}
      receiveShadow
    >
      <T.MeshStandardMaterial
        color="#2a2923"
        metalness={0.58}
        roughness={0.44}
      />
    </T.Mesh>
    <T.Mesh
      castShadow={false}
      geometry={cachedBox(0.12, height * 0.62, 0.1)}
      position={[side * postX * 0.78, 0, 0.38]}
    >
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.72}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  <T.Mesh
    castShadow={false}
    geometry={cachedBox(width + 0.55, 0.32, 0.4)}
    position={[0, railY, 0.22]}
    receiveShadow
  >
    <T.MeshStandardMaterial
      color={trimColor}
      metalness={0.74}
      roughness={0.32}
    />
  </T.Mesh>
</T.Group>
