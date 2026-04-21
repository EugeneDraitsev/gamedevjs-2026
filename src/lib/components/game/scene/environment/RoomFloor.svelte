<script module lang="ts">
  import { DataTexture, NearestFilter, SRGBColorSpace } from "three";
  import type { SceneFloorPalette as FloorTexturePalette } from "$lib/types/game";

  const floorTextureCache = new Map<string, DataTexture>();
  const hexToRgb = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);

    return [
      Math.floor(value / 65_536) % 256,
      Math.floor(value / 256) % 256,
      value % 256,
    ] as const;
  };

  const getFloorTexture = (palette: FloorTexturePalette) => {
    const key = `${palette.even}:${palette.odd}`;
    const cached = floorTextureCache.get(key);

    if (cached) {
      return cached;
    }

    const tileSize = 4;
    const columns = 20;
    const rows = 18;
    const width = columns * tileSize;
    const height = rows * tileSize;
    const data = new Uint8Array(width * height * 4);
    const even = hexToRgb(palette.even);
    const odd = hexToRgb(palette.odd);
    const grout = hexToRgb("#090705");

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const border = x % tileSize === 0 || y % tileSize === 0;
        let color = grout;

        if (!border) {
          color =
            (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
              ? even
              : odd;
        }

        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = 255;
      }
    }

    const texture = new DataTexture(data, width, height);

    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;
    floorTextureCache.set(key, texture);

    return texture;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import type { RoomTemplate } from "$lib/config/room-templates";
  import { floorHalfDepth, floorHalfWidth } from "$lib/game/scene-layout";
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

  const floorTexture = $derived(getFloorTexture(currentFloorPalette));
</script>

<T.Group position={[0, -0.35, 0]}>
  <RigidBody type="fixed">
    <Collider
      shape="cuboid"
      args={[floorHalfWidth, 0.35, floorHalfDepth]}
      friction={0.92}
      restitution={0.08}
    />

    <T.Mesh
      position={[0, 0.36, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.PlaneGeometry args={[floorHalfWidth * 2, floorHalfDepth * 2]} />
      <T.MeshStandardMaterial
        map={floorTexture}
        metalness={0.22}
        roughness={0.58}
      />
    </T.Mesh>
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
