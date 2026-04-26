<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import {
    type MeshStandardMaterial,
    PlaneGeometry,
    type Texture,
  } from "three";
  import type { RoomTemplate } from "$lib/config/room-templates";
  import { cachedPlane } from "$lib/game/cached-geometries";
  import type { RoomBounds } from "$lib/game/scene-layout";

  const roomNoise = (roomId: string, salt: number) => {
    let hash = 17;
    const key = `${roomId}:${salt}`;

    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 131 + key.charCodeAt(index) * (index + 7)) % 1_000_003;
    }

    const value = Math.sin(hash * 12.9898) * 43_758.5453;

    return value - Math.floor(value);
  };

  const makeDecalGeometry = (
    width: number,
    depth: number,
    u: number,
    v: number,
    uSize: number,
    vSize: number
  ) => {
    const geometry = new PlaneGeometry(width, depth);
    const uv = geometry.attributes.uv;

    uv.setXY(0, u, v);
    uv.setXY(1, u + uSize, v);
    uv.setXY(2, u, v + vSize);
    uv.setXY(3, u + uSize, v + vSize);
    uv.needsUpdate = true;

    return geometry;
  };

  const decalSources = [
    { u: 0.02, v: 0.82, width: 0.18, height: 0.14 },
    { u: 0.18, v: 0.78, width: 0.19, height: 0.2 },
    { u: 0.45, v: 0.74, width: 0.26, height: 0.23 },
    { u: 0.72, v: 0.78, width: 0.22, height: 0.18 },
    { u: 0.44, v: 0.48, width: 0.31, height: 0.36 },
    { u: 0.62, v: 0.5, width: 0.29, height: 0.34 },
    { u: 0.02, v: 0.57, width: 0.2, height: 0.18 },
    { u: 0.27, v: 0.52, width: 0.19, height: 0.2 },
    { u: 0.78, v: 0.36, width: 0.2, height: 0.16 },
  ].map((source) => ({
    ...source,
    aspect: source.width / source.height,
    geometry: makeDecalGeometry(
      1,
      1,
      source.u,
      source.v,
      source.width,
      source.height
    ),
  }));

  let {
    bossFloorHeightTexture = null,
    bossFloorNormalTexture = null,
    bossFloorTexture = null,
    bounds,
    currentRoomId,
    currentRoomTemplate,
    floorReliefStrength = 1.4,
    foundryFloorDecalTexture = null,
    foundryFloorTexture = null,
    treasureFloorHeightTexture = null,
    treasureFloorNormalTexture = null,
    treasureFloorTexture = null,
  }: {
    bossFloorHeightTexture?: Texture | null;
    bossFloorNormalTexture?: Texture | null;
    bossFloorTexture?: Texture | null;
    bounds: RoomBounds;
    currentRoomId: string;
    currentRoomTemplate: RoomTemplate;
    floorReliefStrength?: number;
    foundryFloorDecalTexture?: Texture | null;
    foundryFloorTexture?: Texture | null;
    treasureFloorHeightTexture?: Texture | null;
    treasureFloorNormalTexture?: Texture | null;
    treasureFloorTexture?: Texture | null;
  } = $props();

  const outside = $derived(currentRoomTemplate.layout === "outside-yard");
  const bossBumpScale = 18;
  const bossNormalScale: [number, number] = [2.2, 2.2];
  const treasureBumpScale = 16;
  const treasureNormalScale: [number, number] = [2, 2];
  let bossFloorMaterial = $state<MeshStandardMaterial>();
  let treasureFloorMaterial = $state<MeshStandardMaterial>();
  const isBossFloor = $derived(
    currentRoomTemplate.layout === "boss-foundry" ||
      currentRoomTemplate.layout === "boss-crucible" ||
      currentRoomTemplate.layout === "boss-bomber"
  );
  const floorMarks = $derived.by(() =>
    Array.from({ length: 54 }, (_, index) => {
      const source =
        decalSources[
          Math.floor(
            roomNoise(currentRoomId, 101 + index * 37) * decalSources.length
          )
        ];
      const depth = 0.5 + roomNoise(currentRoomId, 307 + index * 41) * 1.35;
      const width =
        depth *
        source.aspect *
        (0.8 + roomNoise(currentRoomId, 509 + index * 43) * 0.55);

      return {
        depth,
        geometry: source.geometry,
        opacity: 0.2 + roomNoise(currentRoomId, 701 + index * 47) * 0.16,
        rotation: roomNoise(currentRoomId, 907 + index * 53) * Math.PI * 2,
        width,
        x:
          (roomNoise(currentRoomId, 1103 + index * 59) - 0.5) *
          bounds.floorHalfWidth *
          1.55,
        z:
          (roomNoise(currentRoomId, 1301 + index * 61) - 0.5) *
          bounds.floorHalfDepth *
          1.55,
      };
    })
  );

  $effect(() => {
    bossFloorHeightTexture;
    bossFloorNormalTexture;
    if (bossFloorMaterial) {
      bossFloorMaterial.needsUpdate = true;
    }
  });

  $effect(() => {
    treasureFloorHeightTexture;
    treasureFloorNormalTexture;
    if (treasureFloorMaterial) {
      treasureFloorMaterial.needsUpdate = true;
    }
  });
</script>

<T.Group position={[0, -0.35, 0]}>
  <RigidBody type="fixed">
    <Collider
      shape="cuboid"
      args={[bounds.floorHalfWidth, 0.35, bounds.floorHalfDepth]}
      friction={0.92}
      restitution={0.08}
    />

    {#if !(outside || isBossFloor)}
      <T.Mesh
        geometry={cachedPlane(
          bounds.floorHalfWidth * 2,
          bounds.floorHalfDepth * 2
        )}
        position={[0, 0.36, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <T.MeshStandardMaterial
          map={foundryFloorTexture}
          metalness={0.16}
          roughness={0.78}
        />
      </T.Mesh>

      {#if foundryFloorDecalTexture}
        {#each floorMarks as mark, index}
          <T.Mesh
            geometry={mark.geometry}
            position={[mark.x, 0.365 + index * 0.0002, mark.z]}
            rotation={[-Math.PI / 2, 0, mark.rotation]}
            scale={[mark.width, mark.depth, 1]}
          >
            <T.MeshBasicMaterial
              map={foundryFloorDecalTexture}
              color="#312a21"
              transparent
              alphaTest={0.04}
              depthWrite={false}
              opacity={mark.opacity}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </T.Mesh>
        {/each}
      {/if}
    {/if}
  </RigidBody>
</T.Group>

{#if currentRoomTemplate.layout === "gear-floor" && treasureFloorTexture}
  <T.Mesh
    geometry={cachedPlane(
      bounds.floorHalfWidth * 2,
      bounds.floorHalfDepth * 2
    )}
    position={[0, 0.031, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.MeshStandardMaterial
      bind:ref={treasureFloorMaterial}
      map={treasureFloorTexture}
      bumpMap={treasureFloorHeightTexture}
      bumpScale={treasureBumpScale * floorReliefStrength}
      normalMap={treasureFloorHeightTexture ? null : treasureFloorNormalTexture}
      normalScale={treasureNormalScale}
      transparent
      alphaTest={0.08}
      metalness={0.22}
      opacity={0.92}
      roughness={0.66}
    />
  </T.Mesh>
{/if}

{#if isBossFloor && bossFloorTexture}
  <T.Mesh
    geometry={cachedPlane(
      bounds.floorHalfWidth * 2,
      bounds.floorHalfDepth * 2
    )}
    position={[0, 0.045, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.MeshStandardMaterial
      bind:ref={bossFloorMaterial}
      map={bossFloorTexture}
      bumpMap={bossFloorHeightTexture}
      bumpScale={bossBumpScale * floorReliefStrength}
      metalness={0.24}
      normalMap={bossFloorHeightTexture ? null : bossFloorNormalTexture}
      normalScale={bossNormalScale}
      roughness={0.64}
    />
  </T.Mesh>
{/if}
