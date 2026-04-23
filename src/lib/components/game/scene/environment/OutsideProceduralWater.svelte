<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry } from "three";
  import { createWaterMaterial } from "$lib/components/overworld/materials/water-material";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  // One big water plane at waterLevel; terrain geometry occludes it
  // everywhere the ground sits above zero, so the shoreline follows
  // the plan's heightmap exactly.
  const plan = outsidePlan();
  const geometry = new PlaneGeometry(plan.size.width, plan.size.depth, 64, 120);

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
  position={[0, 0, 0]}
  receiveShadow
/>
