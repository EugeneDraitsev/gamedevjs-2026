<script module lang="ts">
  import { DoubleSide, PlaneGeometry } from "three";

  const makeDecalGeometry = (
    width: number,
    height: number,
    u: number,
    v: number,
    uSize: number,
    vSize: number
  ) => {
    const geometry = new PlaneGeometry(width, height);
    const uv = geometry.attributes.uv;

    uv.setXY(0, u, v);
    uv.setXY(1, u + uSize, v);
    uv.setXY(2, u, v + vSize);
    uv.setXY(3, u + uSize, v + vSize);
    uv.needsUpdate = true;

    return geometry;
  };

  const wallDecalSources = [
    makeDecalGeometry(0.86, 0.3, 0.76, 0.04, 0.2, 0.1),
    makeDecalGeometry(0.72, 0.26, 0.78, 0.36, 0.2, 0.16),
    makeDecalGeometry(0.68, 0.32, 0.72, 0.78, 0.22, 0.18),
  ];
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";
  import { cachedBox } from "$lib/game/cached-geometries";

  let {
    baseColor = "#2f332f",
    decalSeed = 0,
    height = 3.95,
    trimColor = "#7b4b22",
    wallDecalTexture = null,
    wallTexture = null,
    width = 2.1,
  }: {
    baseColor?: string;
    decalSeed?: number;
    height?: number;
    trimColor?: string;
    wallDecalTexture?: Texture | null;
    wallTexture?: Texture | null;
    width?: number;
  } = $props();

  const postX = $derived(width / 2 - 0.16);
  const railY = $derived(height / 2 - 0.17);
  const wallNoise = (salt: number) => {
    const value = Math.sin((decalSeed + salt) * 12.9898) * 43_758.5453;

    return value - Math.floor(value);
  };
  const wallDecals = $derived(
    [0, 1].map((index) => ({
      geometry: wallDecalSources[(decalSeed + index) % wallDecalSources.length],
      rotation: (wallNoise(index * 11) - 0.5) * 0.5,
      x: (wallNoise(index * 13 + 3) - 0.5) * width * 0.42,
      y: (wallNoise(index * 17 + 5) - 0.5) * 2.3,
    }))
  );
</script>

<T.Group>
  <T.Mesh
    castShadow
    geometry={cachedBox(width, height, 0.1)}
    position={[0, 0, 0.02]}
    receiveShadow
  >
    <T.MeshStandardMaterial
      map={wallTexture}
      color="#8d7c6a"
      metalness={0.12}
      roughness={0.86}
    />
  </T.Mesh>

  {#if wallDecalTexture}
    {#each wallDecals as decal}
      <T.Mesh
        geometry={decal.geometry}
        position={[decal.x, decal.y, 0.11]}
        rotation={[0, 0, decal.rotation]}
      >
        <T.MeshBasicMaterial
          map={wallDecalTexture}
          color="#c27535"
          opacity={0.28}
          transparent
          alphaTest={0.06}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          side={DoubleSide}
        />
      </T.Mesh>
    {/each}
  {/if}

  {#each [-1, 1] as side}
    <T.Mesh
      castShadow
      geometry={cachedBox(0.28, height + 0.04, 0.3)}
      position={[side * postX, 0, 0.17]}
      receiveShadow
    >
      <T.MeshStandardMaterial
        color="#2a2923"
        metalness={0.54}
        roughness={0.48}
      />
    </T.Mesh>

    {#each [-1, 1] as capY}
      <T.Mesh
        castShadow
        geometry={cachedBox(0.42, 0.28, 0.3)}
        position={[side * postX, capY * railY, 0.3]}
        receiveShadow
      >
        <T.MeshStandardMaterial
          color={trimColor}
          metalness={0.72}
          roughness={0.32}
        />
      </T.Mesh>
    {/each}
  {/each}

  {#each [-1, 1] as side}
    <T.Mesh
      castShadow
      geometry={cachedBox(width + 0.08, 0.18, 0.24)}
      position={[0, side * railY, 0.24]}
      receiveShadow
    >
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.72}
        roughness={0.34}
      />
    </T.Mesh>
  {/each}
</T.Group>
