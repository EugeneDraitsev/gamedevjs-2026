<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import FoundryDoorFrame from "$lib/components/game/scene/environment/walls/FoundryDoorFrame.svelte";
  import FoundryGearSet from "$lib/components/game/scene/environment/walls/FoundryGearSet.svelte";
  import FoundryLamp from "$lib/components/game/scene/environment/walls/FoundryLamp.svelte";
  import FoundryPipeCluster from "$lib/components/game/scene/environment/walls/FoundryPipeCluster.svelte";
  import FoundryValveSet from "$lib/components/game/scene/environment/walls/FoundryValveSet.svelte";
  import FoundryVent from "$lib/components/game/scene/environment/walls/FoundryVent.svelte";
  import FoundryWallKit from "$lib/components/game/scene/environment/walls/FoundryWallKit.svelte";
  import FoundryWallModule, {
    type FoundryWallVariant,
  } from "$lib/components/game/scene/environment/walls/FoundryWallModule.svelte";
  import type { StaticWall } from "$lib/types/game";

  type Mode = "assembled" | "modules" | "pieces";

  let {
    height = "620px",
    mode = "assembled",
  }: {
    height?: string;
    mode?: Mode;
  } = $props();

  const trimColor = "#7b4b22";
  const animationNow = 0;
  const wall: StaticWall = {
    args: [5.2, 2.8, 0.25],
    color: "#30352f",
    facing: "south",
    id: "storybook-wall",
    lamp: true,
    position: [0, 2.45, 0],
    style: "mechanic",
    trimColor,
  };
  const variants: FoundryWallVariant[] = ["gear", "valve", "pipe", "plain"];
</script>

<div class="stage" style:--h={height}>
  <Canvas dpr={1} shadows>
    <T.PerspectiveCamera fov={34} makeDefault position={[0, 3.2, 8.5]}>
      <OrbitControls
        enableDamping
        enableZoom
        maxDistance={12}
        minDistance={3.5}
        target={[0, 1.9, 0]}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={["#f4d8a3", "#130d08", 1.45]} />
    <T.AmbientLight intensity={0.45} />
    <T.DirectionalLight
      castShadow
      intensity={2.8}
      position={[4, 7, 5]}
      shadow.mapSize={[1024, 1024]}
    />

    {#if mode === "assembled"}
      <T.Group position={wall.position}>
        <T.Mesh castShadow receiveShadow>
          <T.BoxGeometry
            args={[wall.args[0] * 2, wall.args[1] * 2, wall.args[2] * 2]}
          />
          <T.MeshStandardMaterial
            color={wall.color}
            metalness={0.08}
            roughness={0.9}
          />
        </T.Mesh>
        <FoundryWallKit {wall} />
      </T.Group>
    {:else if mode === "modules"}
      {#each variants as variant, index}
        <T.Group position={[(index - 1.5) * 2.22, 2.2, 0]}>
          <FoundryWallModule
            {animationNow}
            baseColor={wall.color}
            light={index === 1}
            {trimColor}
            {variant}
          />
        </T.Group>
      {/each}
    {:else}
      <T.Group position={[-3.5, 2.1, 0]}>
        <FoundryGearSet {animationNow} {trimColor} />
      </T.Group>
      <T.Group position={[-1.7, 1.15, 0]}>
        <FoundryLamp light {trimColor} />
      </T.Group>
      <T.Group position={[0, 1.15, 0]}>
        <FoundryVent {trimColor} width={0.8} />
      </T.Group>
      <T.Group position={[1.55, 2.05, 0]}>
        <FoundryValveSet {trimColor} />
      </T.Group>
      <T.Group position={[2.9, 1.2, 0]}>
        <FoundryPipeCluster {trimColor} />
      </T.Group>
      <T.Group position={[2.7, 2.18, 0]}>
        <FoundryDoorFrame {trimColor} />
      </T.Group>
    {/if}

    <T.Mesh
      position={[0, -0.04, 0.18]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.PlaneGeometry args={[12, 5]} />
      <T.MeshStandardMaterial color="#17130e" roughness={0.95} />
    </T.Mesh>
  </Canvas>
</div>

<style>
  .stage {
    inline-size: 100%;
    block-size: var(--h);
    background: #080604;
  }
</style>
