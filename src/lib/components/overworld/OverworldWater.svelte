<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry, RingGeometry } from "three";
  import type { OverworldRiverSegment } from "$lib/config/overworld-layout";
  import { createWaterMaterial } from "./materials/water-material";

  interface Props {
    rivers: OverworldRiverSegment[];
    seaInnerRadius: number;
    seaOuterRadius: number;
    shorelineRadius: number;
  }

  let { seaInnerRadius, seaOuterRadius, rivers, shorelineRadius }: Props =
    $props();

  const createSeaMaterial = () =>
    createWaterMaterial({
      deepColor: "#061b2a",
      shallowColor: "#2a6a7a",
      foamColor: "#e8f2ec",
      algaeColor: "#2b5138",
      shoreRadius: shorelineRadius,
      foamEdge: 4.5,
      useShoreMask: true,
    });

  const sea = createSeaMaterial();

  const riverMat = createWaterMaterial({
    deepColor: "#0c324a",
    shallowColor: "#3a7ca5",
    foamColor: "#d4e6dc",
    algaeColor: "#35623d",
    useShoreMask: false,
  });

  // High-tessellation ring so wave vertex shader produces rolling water
  const createSeaGeometry = () =>
    new RingGeometry(seaInnerRadius, seaOuterRadius, 96, 16);

  const seaGeometry = createSeaGeometry();

  const createRiverGeometries = () =>
    rivers.map((r) => new PlaneGeometry(r.width, r.length, 24, 48));

  const riverGeometries = createRiverGeometries();

  useTask((delta) => {
    sea.uniforms.uTime.value += delta;
    riverMat.uniforms.uTime.value += delta;
  });
</script>

<!-- sea ring -->
<T.Mesh
  geometry={seaGeometry}
  material={sea.material}
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, -0.1, 0]}
/>

<!-- riverbed silt under each river for depth -->
{#each rivers as river, i (river.id)}
  <T.Group position={river.position} rotation={[0, river.yaw, 0]}>
    <!-- riverbed (dark) -->
    <T.Mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.08, 0]}
      receiveShadow
    >
      <T.PlaneGeometry args={[river.width * 1.35, river.length * 1.1]} />
      <T.MeshStandardMaterial color="#2a2016" roughness={0.95} />
    </T.Mesh>
    <!-- river surface (animated shader) -->
    <T.Mesh
      geometry={riverGeometries[i]}
      material={riverMat.material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
    />
  </T.Group>
{/each}
