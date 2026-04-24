<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { PlaneGeometry } from "three";
  import OrbKnight from "$lib/components/game/OrbKnight.svelte";
  import WaterWake from "$lib/components/game/scene/WaterWake.svelte";
  import { createWaterMaterial } from "$lib/components/overworld/materials/water-material";
  import type { Vec3 } from "$lib/types/game";

  const waterGeometry = new PlaneGeometry(14, 5.4, 64, 24);
  const { material, uniforms } = createWaterMaterial({
    deepColor: "#12475d",
    shallowColor: "#63b7c9",
    foamColor: "#e7fbf6",
    algaeColor: "#4f7f68",
    useShoreMask: false,
  });
  const walls: [number, number, number, number, number, number][] = [
    [0, 0.45, -6.1, 18, 0.9, 0.4],
    [0, 0.45, 6.1, 18, 0.9, 0.4],
    [-9.1, 0.45, 0, 0.4, 0.9, 12],
    [9.1, 0.45, 0, 0.4, 0.9, 12],
  ];
  const bankXs = [-6, -2, 2, 6];
  const banks: [number, number, number, number][] = [
    [0, -4.55, 18, 3.1],
    [0, 4.55, 18, 3.1],
    [-8.1, 0, 1.8, 6.2],
    [8.1, 0, 1.8, 6.2],
  ];

  let time = 0;
  let yaw = $state(0);
  let position = $state<Vec3>([-4.8, 0.5, 0]);

  useTask((delta) => {
    time += delta;
    uniforms.uTime.value += delta;
    const next: Vec3 = [
      Math.sin(time * 0.62) * 3.6,
      0.5,
      Math.sin(time * 1.24) * 0.95,
    ];
    yaw = Math.atan2(next[0] - position[0], next[2] - position[2]);
    position = next;
  });
</script>

<T.Group>
  <T.Mesh
    position={[0, -0.18, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.PlaneGeometry args={[18, 12]} />
    <T.MeshStandardMaterial color="#594028" roughness={0.92} />
  </T.Mesh>

  {#each banks as bank}
    <T.Mesh position={[bank[0], 0.02, bank[1]]} castShadow receiveShadow>
      <T.BoxGeometry args={[bank[2], 0.2, bank[3]]} />
      <T.MeshStandardMaterial color="#5b3b21" roughness={0.9} />
    </T.Mesh>
  {/each}

  <T.Mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <T.PlaneGeometry args={[14.8, 6.2]} />
    <T.MeshStandardMaterial color="#947247" roughness={0.98} />
  </T.Mesh>

  <T.Mesh
    geometry={waterGeometry}
    {material}
    position={[0, 0.04, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  />

  {#each walls as wall}
    <T.Mesh position={[wall[0], wall[1], wall[2]]} castShadow receiveShadow>
      <T.BoxGeometry args={[wall[3], wall[4], wall[5]]} />
      <T.MeshStandardMaterial color="#36291d" roughness={0.86} />
    </T.Mesh>
  {/each}

  {#each bankXs as x}
    <T.Mesh position={[x, 0.12, -3.35]} castShadow receiveShadow>
      <T.BoxGeometry args={[1.6, 0.22, 0.32]} />
      <T.MeshStandardMaterial color="#312316" roughness={0.9} />
    </T.Mesh>
    <T.Mesh position={[x, 0.12, 3.35]} castShadow receiveShadow>
      <T.BoxGeometry args={[1.6, 0.22, 0.32]} />
      <T.MeshStandardMaterial color="#312316" roughness={0.9} />
    </T.Mesh>
  {/each}
</T.Group>

<WaterWake active opacity={0.55} {position} radius={0.55} />
<T.Group {position} rotation={[0, yaw, 0]}>
  <OrbKnight autoRotate={false} scale={0.42} />
</T.Group>
