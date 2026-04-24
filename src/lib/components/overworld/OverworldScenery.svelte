<script lang="ts">
  import { T } from "@threlte/core";
  import {
    OVERWORLD_SEA_INNER_RADIUS,
    OVERWORLD_SEA_OUTER_RADIUS,
    type OverworldLayout,
  } from "$lib/config/overworld-layout";
  import OverworldCanyon from "./OverworldCanyon.svelte";
  import OverworldFlora from "./OverworldFlora.svelte";
  import OverworldRuins from "./OverworldRuins.svelte";
  import OverworldSky from "./OverworldSky.svelte";
  import OverworldTerrain from "./OverworldTerrain.svelte";
  import OverworldWater from "./OverworldWater.svelte";

  interface Props {
    avoidList?: [number, number, number][];
    layout: OverworldLayout;
    playerPosition?: [number, number, number];
    withColliders?: boolean;
  }

  let {
    layout,
    playerPosition = [0, 0, 0],
    avoidList = [],
    withColliders = false,
  }: Props = $props();

  const canyonInner = OVERWORLD_SEA_INNER_RADIUS - 4;
  const canyonHeight = 28;
  const terrainRadius = OVERWORLD_SEA_OUTER_RADIUS * 0.65;
</script>

<!-- Sun direction: warm low-angle for hopeful dusk-dawn mood -->
<T.HemisphereLight args={["#d2b78a", "#1a2614", 0.55]} />
<T.AmbientLight intensity={0.45} color="#cfbb8e" />
<T.DirectionalLight
  castShadow
  color="#ffd8a6"
  intensity={1.25}
  position={[52, 58, 32]}
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
  shadow.camera.near={0.5}
  shadow.camera.far={180}
  shadow.camera.left={-100}
  shadow.camera.right={100}
  shadow.camera.top={100}
  shadow.camera.bottom={-100}
  shadow.bias={-0.0006}
  shadow.normalBias={0.04}
/>

<T.Fog attach="fog" args={["#b58668", 68, 220]} />

<OverworldSky />

<OverworldTerrain
  radius={terrainRadius}
  playableRadius={layout.playableRadius}
  {playerPosition}
  collider={withColliders}
/>

<OverworldCanyon
  innerRadius={canyonInner}
  wallHeight={canyonHeight}
  thickness={14}
  barrierSegments={56}
/>

<OverworldWater
  seaInnerRadius={OVERWORLD_SEA_INNER_RADIUS}
  seaOuterRadius={OVERWORLD_SEA_OUTER_RADIUS}
  rivers={layout.rivers}
  shorelineRadius={OVERWORLD_SEA_INNER_RADIUS + 2}
/>

<OverworldFlora
  count={7500}
  playableRadius={layout.playableRadius}
  seed={17}
  avoid={avoidList}
  avoidRadius={3}
/>

<OverworldRuins
  seed={53}
  count={18}
  playableRadius={layout.playableRadius - 2}
  avoid={avoidList}
  avoidRadius={5}
/>

<!-- Stylized living trees from the layout -->
{#each layout.trees as tree (tree.id)}
  <T.Group position={[tree.position[0], 0, tree.position[2]]}>
    <T.Mesh position={[0, 0.55 * tree.scale, 0]} castShadow>
      <T.CylinderGeometry
        args={[0.16 * tree.scale, 0.24 * tree.scale, 1.1 * tree.scale, 7]}
      />
      <T.MeshStandardMaterial color="#3a2a1a" roughness={0.95} />
    </T.Mesh>
    <T.Mesh position={[0, 1.8 * tree.scale, 0]} castShadow>
      <T.IcosahedronGeometry args={[1.2 * tree.scale, 1]} />
      <T.MeshStandardMaterial
        color={tree.foliageColor}
        roughness={0.9}
        flatShading
      />
    </T.Mesh>
    <T.Mesh
      position={[0.55 * tree.scale, 2.3 * tree.scale, 0.2 * tree.scale]}
      castShadow
    >
      <T.IcosahedronGeometry args={[0.75 * tree.scale, 1]} />
      <T.MeshStandardMaterial
        color={tree.foliageColor}
        roughness={0.9}
        flatShading
      />
    </T.Mesh>
    <T.Mesh
      position={[-0.45 * tree.scale, 2.55 * tree.scale, -0.1 * tree.scale]}
      castShadow
    >
      <T.IcosahedronGeometry args={[0.62 * tree.scale, 1]} />
      <T.MeshStandardMaterial
        color={tree.foliageColor}
        roughness={0.9}
        flatShading
      />
    </T.Mesh>
  </T.Group>
{/each}
