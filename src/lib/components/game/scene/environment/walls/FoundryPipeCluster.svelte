<script lang="ts">
  import { T } from "@threlte/core";

  let {
    trimColor = "#7b4b22",
    x = 0,
    y = 0,
  }: {
    trimColor?: string;
    x?: number;
    y?: number;
  } = $props();

  const pipes = [-0.18, 0.18];
</script>

<T.Group position={[x, y, 0.35]}>
  {#each pipes as pipe}
    <T.Mesh castShadow position={[pipe, 0, 0]}>
      <T.CylinderGeometry args={[0.06, 0.06, 1.24, 8]} />
      <T.MeshStandardMaterial
        color="#17110c"
        metalness={0.84}
        roughness={0.34}
      />
    </T.Mesh>
    <T.Mesh castShadow position={[pipe, -0.7, 0]}>
      <T.CylinderGeometry args={[0.11, 0.11, 0.11, 8]} />
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.78}
        roughness={0.3}
      />
    </T.Mesh>
  {/each}

  <T.Mesh castShadow position={[0, 0.63, 0]} rotation={[0, 0, Math.PI / 2]}>
    <T.CylinderGeometry args={[0.06, 0.06, 0.36, 8]} />
    <T.MeshStandardMaterial color="#17110c" metalness={0.84} roughness={0.34} />
  </T.Mesh>
</T.Group>
