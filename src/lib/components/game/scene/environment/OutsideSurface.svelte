<script module lang="ts">
  import { CylinderGeometry } from "three";
  import type { Vec3 } from "$lib/types/game";

  const geometries = new Map<string, CylinderGeometry>();

  const getGeometry = (args: Vec3) => {
    const key = `${args[1]}`;
    const cached = geometries.get(key);

    if (cached) {
      return cached;
    }

    const geometry = new CylinderGeometry(1, 1, args[1] * 2, 18);

    geometries.set(key, geometry);

    return geometry;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";

  let {
    args,
    color = "#ffffff",
    metalness = 0.03,
    opacity = 1,
    position,
    rotation = 0,
    roughness = 0.9,
    texture = null,
  }: {
    args: Vec3;
    color?: string;
    metalness?: number;
    opacity?: number;
    position: Vec3;
    rotation?: number;
    roughness?: number;
    texture?: Texture | null;
  } = $props();
</script>

<T.Group {position} rotation={[0, rotation, 0]}>
  <T.Mesh
    geometry={getGeometry(args)}
    receiveShadow
    scale={[args[0], 1, args[2]]}
  >
    <T.MeshStandardMaterial
      {color}
      map={texture}
      {metalness}
      {opacity}
      polygonOffset
      polygonOffsetFactor={-2}
      {roughness}
      transparent={opacity < 1}
    />
  </T.Mesh>
</T.Group>
