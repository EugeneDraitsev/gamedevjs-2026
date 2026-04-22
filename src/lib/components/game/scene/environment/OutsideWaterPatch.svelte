<script module lang="ts">
  import { PlaneGeometry } from "three";
  import type { Vec3 } from "$lib/types/game";

  // Cache high-tessellation plane per unique length/width so the water
  // vertex displacement actually produces rolling waves.
  const geometries = new Map<string, PlaneGeometry>();
  const getGeometry = (sx: number, sz: number) => {
    const key = `${sx.toFixed(1)}x${sz.toFixed(1)}`;
    const cached = geometries.get(key);
    if (cached) return cached;
    const geo = new PlaneGeometry(sx, sz, 24, 48);
    geometries.set(key, geo);
    return geo;
  };
</script>

<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { createWaterMaterial } from "$lib/components/overworld/materials/water-material";

  interface Props {
    args: Vec3;
    position: Vec3;
    rotation?: number;
  }

  let { args, position, rotation = 0 }: Props = $props();

  // args: [halfWidthX, thickness, halfDepthZ] — the original cylinder
  // used (radius=1, height=args[1]*2) then scaled XZ by args[0]/args[2].
  // For a flat patch we want a plane sized 2*args[0] by 2*args[2].
  const sx = $derived(args[0] * 2);
  const sz = $derived(args[2] * 2);

  const { material, uniforms } = createWaterMaterial({
    deepColor: "#0e3140",
    shallowColor: "#428a92",
    foamColor: "#e6efe4",
    algaeColor: "#355f3a",
    useShoreMask: false,
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<T.Group {position} rotation={[0, rotation, 0]}>
  <T.Mesh
    geometry={getGeometry(sx, sz)}
    {material}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
  />
</T.Group>
