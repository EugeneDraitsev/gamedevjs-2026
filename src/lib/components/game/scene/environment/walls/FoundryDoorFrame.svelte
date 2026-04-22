<script lang="ts">
  import { T } from "@threlte/core";

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
    <T.Mesh castShadow receiveShadow position={[side * postX, 0, 0.18]}>
      <T.BoxGeometry args={[0.32, height, 0.36]} />
      <T.MeshStandardMaterial
        color="#2a2923"
        metalness={0.58}
        roughness={0.44}
      />
    </T.Mesh>
    <T.Mesh castShadow position={[side * postX * 0.78, 0, 0.38]}>
      <T.BoxGeometry args={[0.12, height * 0.62, 0.1]} />
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.72}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  <T.Mesh castShadow receiveShadow position={[0, railY, 0.22]}>
    <T.BoxGeometry args={[width + 0.55, 0.32, 0.4]} />
    <T.MeshStandardMaterial
      color={trimColor}
      metalness={0.74}
      roughness={0.32}
    />
  </T.Mesh>
</T.Group>
