<script lang="ts">
  import { T } from "@threlte/core";

  let {
    light = false,
    trimColor = "#7b4b22",
    x = 0,
    y = 0,
  }: {
    light?: boolean;
    trimColor?: string;
    x?: number;
    y?: number;
  } = $props();

  const bars = [-0.15, 0, 0.15];
</script>

<T.Group position={[x, y, 0.34]}>
  <T.PointLight
    color="#ff9d43"
    distance={light ? 4.6 : 3.2}
    intensity={light ? 1.35 : 0.72}
  />

  <T.Mesh castShadow position={[0, 0, -0.03]}>
    <T.BoxGeometry args={[0.44, 0.72, 0.12]} />
    <T.MeshStandardMaterial color="#1b1510" metalness={0.72} roughness={0.36} />
  </T.Mesh>
  <T.Mesh>
    <T.CylinderGeometry args={[0.13, 0.13, 0.52, 10]} />
    <T.MeshBasicMaterial color="#ffb257" />
  </T.Mesh>

  {#each bars as bar}
    <T.Mesh castShadow position={[bar, 0, 0.14]}>
      <T.BoxGeometry args={[0.035, 0.62, 0.04]} />
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.74}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  {#each [-0.3, 0.3] as row}
    <T.Mesh castShadow position={[0, row, 0.14]}>
      <T.BoxGeometry args={[0.38, 0.045, 0.05]} />
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.76}
        roughness={0.3}
      />
    </T.Mesh>
  {/each}
</T.Group>
