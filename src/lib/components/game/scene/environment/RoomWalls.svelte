<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import FoundryWallKit from "$lib/components/game/scene/environment/walls/FoundryWallKit.svelte";
  import type { StaticWall, WallFacing } from "$lib/types/game";

  let {
    animationNow = 0,
    decoratedWallFacings = null,
    gearlessWallFacings = null,
    foundryWallDecalTexture = null,
    foundryWallTexture = null,
    roomWalls,
    showWallKit = true,
  }: {
    animationNow?: number;
    decoratedWallFacings?: WallFacing[] | null;
    gearlessWallFacings?: WallFacing[] | null;
    foundryWallDecalTexture?: Texture | null;
    foundryWallTexture?: Texture | null;
    roomWalls: StaticWall[];
    showWallKit?: boolean;
  } = $props();

  const showDecor = (wall: StaticWall) =>
    !decoratedWallFacings || decoratedWallFacings.includes(wall.facing);
  const showGears = (wall: StaticWall) =>
    !gearlessWallFacings?.includes(wall.facing);
</script>

{#each roomWalls as wall (wall.id)}
  <T.Group position={wall.position}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={wall.args}
        friction={0.92}
        restitution={0.22}
      />

      <T.Mesh
        castShadow={!wall.opacity || wall.opacity >= 1}
        position={[0, -0.25, 0]}
        receiveShadow
      >
        <T.BoxGeometry
          args={[wall.args[0] * 2, wall.args[1] * 1.55, wall.args[2] * 2]}
        />
        <T.MeshStandardMaterial
          color={wall.color}
          metalness={0.1}
          opacity={wall.opacity ?? 1}
          roughness={0.86}
          transparent={Boolean(wall.opacity && wall.opacity < 1)}
          depthWrite={!wall.opacity || wall.opacity >= 1}
        />
      </T.Mesh>

      {#if showWallKit &&
        wall.style === "mechanic" &&
        (!wall.opacity || wall.opacity >= 1)}
        <FoundryWallKit
          {animationNow}
          showDecor={showDecor(wall)}
          showGears={showGears(wall)}
          {wall}
          wallDecalTexture={foundryWallDecalTexture}
          wallTexture={foundryWallTexture}
        />
      {/if}
    </RigidBody>
  </T.Group>
{/each}
