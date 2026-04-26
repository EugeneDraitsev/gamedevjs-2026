<script lang="ts">
  import { T } from "@threlte/core";
  import {
    cachedBox,
    cachedCylinder,
    cachedTorus,
  } from "$lib/game/cached-geometries";

  let {
    scale = 1,
    trimColor = "#7b4b22",
    x = 0,
    y = 0,
  }: {
    scale?: number;
    trimColor?: string;
    x?: number;
    y?: number;
  } = $props();

  const spokes = [0, Math.PI / 3, (Math.PI * 2) / 3];
</script>

<T.Group position={[x, y, 0.5]} scale={[scale, scale, scale]}>
  <T.Mesh castShadow geometry={cachedTorus(0.42, 0.055, 8, 32)}>
    <T.MeshStandardMaterial
      color={trimColor}
      metalness={0.78}
      roughness={0.32}
    />
  </T.Mesh>

  {#each spokes as spoke}
    <T.Mesh
      castShadow
      geometry={cachedBox(0.72, 0.045, 0.08)}
      rotation={[0, 0, spoke]}
    >
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.76}
        roughness={0.34}
      />
    </T.Mesh>
  {/each}

  <T.Mesh
    castShadow
    geometry={cachedCylinder(0.13, 0.13, 0.12, 14)}
    rotation={[Math.PI / 2, 0, 0]}
  >
    <T.MeshStandardMaterial color="#21160d" metalness={0.64} roughness={0.38} />
  </T.Mesh>

  <T.Group position={[0.42, -0.42, 0.02]} scale={[0.52, 0.52, 0.52]}>
    <T.Mesh castShadow geometry={cachedTorus(0.42, 0.055, 8, 32)}>
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.78}
        roughness={0.32}
      />
    </T.Mesh>

    {#each spokes as spoke}
      <T.Mesh
        castShadow
        geometry={cachedBox(0.72, 0.045, 0.08)}
        rotation={[0, 0, spoke]}
      >
        <T.MeshStandardMaterial
          color={trimColor}
          metalness={0.76}
          roughness={0.34}
        />
      </T.Mesh>
    {/each}
  </T.Group>
</T.Group>
