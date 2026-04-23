<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry } from "three";
  import { createWaterMaterial } from "$lib/components/overworld/materials/water-material";
  import {
    DEFAULT_CHUNK,
    type OutsideChunkParams,
  } from "$lib/game/outside-terrain-noise";

  interface Props {
    chunk?: Partial<OutsideChunkParams>;
  }

  let { chunk = {} }: Props = $props();
  const c = { ...DEFAULT_CHUNK, ...chunk };

  // One large body at water level. The heightmap-based terrain naturally
  // occludes it everywhere the ground is raised, so the shoreline comes
  // from the terrain geometry itself rather than a hand-drawn rectangle.
  const geometry = new PlaneGeometry(c.width, c.depth, 64, 120);

  const { material, uniforms } = createWaterMaterial({
    deepColor: "#0d2c3a",
    shallowColor: "#3d7a85",
    foamColor: "#e6efe0",
    algaeColor: "#355f3a",
    useShoreMask: false,
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<T.Mesh
  {geometry}
  {material}
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, c.waterLevel, 0]}
  receiveShadow
/>
