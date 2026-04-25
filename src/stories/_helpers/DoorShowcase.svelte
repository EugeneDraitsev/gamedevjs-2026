<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { World } from "@threlte/rapier";
  import RoomDoors from "$lib/components/game/scene/environment/RoomDoors.svelte";
  import type { DoorMarker, DoorSeal } from "$lib/types/game";

  let {
    doorOpenAmount = 0,
    height = "520px",
  }: {
    doorOpenAmount?: number;
    height?: string;
  } = $props();

  const roomDoors: DoorMarker[] = [];
  const roomDoorSeals: DoorSeal[] = [
    {
      args: [1.2, 2.2, 0.16],
      color: "#ffc06d",
      emissive: "#ff9b46",
      id: "north-seal",
      position: [0, 2.1, 0],
      style: "mechanic",
      trimColor: "#5d4528",
    },
  ];
</script>

<div class="stage" style:--h={height}>
  <Canvas dpr={1} shadows>
    <T.PerspectiveCamera fov={46} makeDefault position={[0, 2.8, 6.2]}>
      <OrbitControls enableDamping enableZoom target={[0, 1.9, 0]} />
    </T.PerspectiveCamera>
    <T.HemisphereLight args={["#f4d8a3", "#160d08", 1.4]} />
    <T.AmbientLight intensity={0.45} />
    <T.DirectionalLight castShadow intensity={2.2} position={[3, 6, 4]} />

    <T.Mesh position={[0, 2.1, -0.24]} receiveShadow>
      <T.BoxGeometry args={[4.4, 4.4, 0.18]} />
      <T.MeshStandardMaterial
        color="#211a14"
        metalness={0.28}
        roughness={0.78}
      />
    </T.Mesh>

    <World gravity={[0, 0, 0]}>
      <RoomDoors {doorOpenAmount} {roomDoors} {roomDoorSeals} />
    </World>
  </Canvas>
</div>

<style>
  .stage {
    inline-size: 100%;
    block-size: var(--h);
    background: #080604;
  }
</style>
