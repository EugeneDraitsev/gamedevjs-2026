<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import RoomWallShadows from "$lib/components/game/scene/environment/RoomWallShadows.svelte";
  import InstancedFoundryWallKits from "$lib/components/game/scene/environment/walls/InstancedFoundryWallKits.svelte";
  import {
    markTransitionPhaseEnd,
    markTransitionPhaseStart,
  } from "$lib/debug/transition-perf";
  import { cachedBox } from "$lib/game/cached-geometries";
  import type { StaticWall, WallFacing } from "$lib/types/game";

  let {
    animationNow = 0,
    decoratedWallFacings = null,
    gearlessWallFacings = null,
    foundryWallDecalTexture = null,
    foundryWallTexture = null,
    castWallShadows = true,
    roomWalls,
    showWallKit = true,
  }: {
    animationNow?: number;
    castWallShadows?: boolean;
    decoratedWallFacings?: WallFacing[] | null;
    gearlessWallFacings?: WallFacing[] | null;
    foundryWallDecalTexture?: Texture | null;
    foundryWallTexture?: Texture | null;
    roomWalls: StaticWall[];
    showWallKit?: boolean;
  } = $props();

  const wallOpacity = (wall: StaticWall) => wall.opacity ?? 1;
  const wallOpaque = (wall: StaticWall) => wallOpacity(wall) >= 1;
  const wallKitTarget = $derived(
    roomWalls.filter((wall) => wall.style === "mechanic" && wallOpaque(wall))
      .length
  );
  const wallKitLimit = $derived(showWallKit ? wallKitTarget : 0);
  let flushStartedAt = 0;
  let wallKitFlushStartedAt = 0;

  $effect.pre(() => {
    roomWalls;
    showWallKit;
    decoratedWallFacings;
    gearlessWallFacings;
    flushStartedAt = markTransitionPhaseStart();
  });

  $effect(() => {
    roomWalls;
    showWallKit;
    decoratedWallFacings;
    gearlessWallFacings;
    markTransitionPhaseEnd("flush-room-walls", flushStartedAt, () => ({
      mechanic: roomWalls.filter((wall) => wall.style === "mechanic").length,
      opaque: roomWalls.filter((wall) => wallOpaque(wall)).length,
      showWallKit,
      wallKitTarget,
      walls: roomWalls.length,
    }));
  });

  $effect.pre(() => {
    wallKitLimit;
    wallKitFlushStartedAt = markTransitionPhaseStart();
  });

  $effect(() => {
    wallKitLimit;

    if (wallKitLimit <= 0) {
      return;
    }

    markTransitionPhaseEnd(
      "flush-wall-kit-reveal",
      wallKitFlushStartedAt,
      () => ({
        limit: wallKitLimit,
        target: wallKitTarget,
        walls: roomWalls.length,
      })
    );
  });
</script>

<RoomWallShadows {roomWalls} />

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
        castShadow={castWallShadows && wallOpaque(wall)}
        geometry={cachedBox(
          wall.args[0] * 2,
          wall.args[1] * 1.55,
          wall.args[2] * 2
        )}
        position={[0, -0.25, 0]}
        receiveShadow
      >
        <T.MeshStandardMaterial
          color={wall.color}
          metalness={0.1}
          opacity={wallOpacity(wall)}
          roughness={0.86}
          transparent={wallOpacity(wall) < 1}
          depthWrite={wallOpaque(wall)}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>
{/each}

{#if showWallKit && wallKitLimit > 0}
  <InstancedFoundryWallKits
    {animationNow}
    {decoratedWallFacings}
    {gearlessWallFacings}
    limit={wallKitLimit}
    {roomWalls}
    wallDecalTexture={foundryWallDecalTexture}
    wallTexture={foundryWallTexture}
  />
{/if}
