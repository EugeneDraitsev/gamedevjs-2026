<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import type { RoomTemplate } from "$lib/config/room-templates";
  import {
    floorHalfDepth,
    floorHalfWidth,
    floorTiles,
  } from "$lib/game/scene-layout";
  import type { SceneFloorPalette } from "$lib/types/game";

  let {
    bossFloorTexture = null,
    currentFloorPalette,
    currentRoomTemplate,
    treasureFloorTexture = null,
  }: {
    bossFloorTexture?: Texture | null;
    currentFloorPalette: SceneFloorPalette;
    currentRoomTemplate: RoomTemplate;
    treasureFloorTexture?: Texture | null;
  } = $props();
</script>

<T.Group position={[0, -0.35, 0]}>
  <RigidBody type="fixed">
    <Collider
      shape="cuboid"
      args={[floorHalfWidth, 0.35, floorHalfDepth]}
      friction={0.92}
      restitution={0.08}
    />

    {#each floorTiles as tile}
      <T.Mesh
        position={tile.position}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.PlaneGeometry args={[0.96, 0.96]} />
        <T.MeshStandardMaterial
          color={tile.even ? currentFloorPalette.even : currentFloorPalette.odd}
          metalness={0.02}
          roughness={0.94}
        />
      </T.Mesh>
    {/each}
  </RigidBody>
</T.Group>

{#if currentRoomTemplate.layout === "gear-floor" && treasureFloorTexture}
  <T.Mesh
    position={[0, 0.031, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.PlaneGeometry args={[floorHalfWidth * 2, floorHalfDepth * 2]} />
    <T.MeshStandardMaterial
      map={treasureFloorTexture}
      transparent
      alphaTest={0.08}
      metalness={0.22}
      opacity={0.92}
      roughness={0.72}
    />
  </T.Mesh>
{/if}

{#if (currentRoomTemplate.layout === "boss-foundry" ||
  currentRoomTemplate.layout === "boss-crucible" ||
  currentRoomTemplate.layout === "boss-bomber") &&
  bossFloorTexture}
  <T.Mesh
    position={[0, 0.032, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.PlaneGeometry args={[floorHalfWidth * 2, floorHalfDepth * 2]} />
    <T.MeshStandardMaterial
      map={bossFloorTexture}
      color="#ffd0b2"
      emissive="#ff8f70"
      emissiveIntensity={0.18}
      transparent
      alphaTest={0.08}
      metalness={0.26}
      opacity={0.94}
      roughness={0.66}
    />
  </T.Mesh>
{/if}
