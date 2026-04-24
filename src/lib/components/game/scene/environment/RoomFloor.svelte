<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import type { RoomTemplate } from "$lib/config/room-templates";
  import type { RoomBounds } from "$lib/game/scene-layout";

  let {
    bossFloorTexture = null,
    bounds,
    currentRoomTemplate,
    foundryFloorDecalTexture = null,
    foundryFloorTexture = null,
    treasureFloorTexture = null,
  }: {
    bossFloorTexture?: Texture | null;
    bounds: RoomBounds;
    currentRoomTemplate: RoomTemplate;
    foundryFloorDecalTexture?: Texture | null;
    foundryFloorTexture?: Texture | null;
    treasureFloorTexture?: Texture | null;
  } = $props();

  const outside = $derived(currentRoomTemplate.layout === "outside-yard");
</script>

<T.Group position={[0, -0.35, 0]}>
  <RigidBody type="fixed">
    <Collider
      shape="cuboid"
      args={[bounds.floorHalfWidth, 0.35, bounds.floorHalfDepth]}
      friction={0.92}
      restitution={0.08}
    />

    {#if !outside}
      <T.Mesh
        position={[0, 0.36, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.PlaneGeometry
          args={[bounds.floorHalfWidth * 2, bounds.floorHalfDepth * 2]}
        />
        <T.MeshStandardMaterial
          color="#ffffff"
          map={foundryFloorTexture}
          metalness={0.16}
          roughness={0.78}
        />
      </T.Mesh>
    {/if}

    {#if foundryFloorDecalTexture && !outside}
      <T.Mesh
        position={[0, 0.365, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, Math.PI]}
      >
        <T.PlaneGeometry
          args={[bounds.floorHalfWidth * 2, bounds.floorHalfDepth * 2]}
        />
        <T.MeshBasicMaterial
          map={foundryFloorDecalTexture}
          color="#312a21"
          transparent
          alphaTest={0.05}
          depthWrite={false}
          opacity={0.26}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </T.Mesh>
    {/if}
  </RigidBody>
</T.Group>

{#if currentRoomTemplate.layout === "gear-floor" && treasureFloorTexture}
  <T.Mesh
    position={[0, 0.031, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.PlaneGeometry
      args={[bounds.floorHalfWidth * 2, bounds.floorHalfDepth * 2]}
    />
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
    <T.PlaneGeometry
      args={[bounds.floorHalfWidth * 2, bounds.floorHalfDepth * 2]}
    />
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
