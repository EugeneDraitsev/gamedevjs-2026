<script module lang="ts">
  import { DataTexture, LinearFilter, SRGBColorSpace } from "three";
  import type { SceneFloorPalette as FloorTexturePalette } from "$lib/types/game";

  type Rgb = [number, number, number];

  interface Decal {
    dark: number;
    radius: number;
    warmth: number;
    x: number;
    y: number;
  }

  interface FloorPattern {
    bronze: Rgb;
    cracks: Crack[];
    decals: Decal[];
    grout: Rgb;
    height: number;
    seed: number;
    stone: Rgb;
    tileSize: number;
    width: number;
  }

  interface Crack {
    width: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  }

  const floorTextureCache = new Map<string, DataTexture>();
  const hexToRgb = (hex: string): Rgb => {
    const value = Number.parseInt(hex.slice(1), 16);

    return [
      Math.floor(value / 65_536) % 256,
      Math.floor(value / 256) % 256,
      value % 256,
    ];
  };

  const clampByte = (value: number) => Math.max(0, Math.min(255, value));
  const mixRgb = (left: Rgb, right: Rgb, amount: number): Rgb => [
    clampByte(left[0] + (right[0] - left[0]) * amount),
    clampByte(left[1] + (right[1] - left[1]) * amount),
    clampByte(left[2] + (right[2] - left[2]) * amount),
  ];
  const shadeRgb = (color: Rgb, amount: number): Rgb => [
    clampByte(color[0] + amount),
    clampByte(color[1] + amount),
    clampByte(color[2] + amount),
  ];
  const clampNumber = (value: number, min = 0, max = 1) =>
    Math.max(min, Math.min(max, value));
  const lerp = (left: number, right: number, amount: number) =>
    left + (right - left) * amount;
  const smooth = (value: number) => value * value * (3 - value * 2);
  const seedFromText = (text: string) =>
    [...text].reduce((total, char) => total + char.charCodeAt(0), 0);

  const randomFromSeed = (seed: number) => {
    let state = seed || 1;

    return () => {
      state = (state * 16_807) % 2_147_483_647;

      return (state - 1) / 2_147_483_646;
    };
  };

  const hashNoise = (x: number, y: number, seed: number) => {
    const value =
      Math.sin(x * 12.9898 + y * 78.233 + seed * 0.013) * 43_758.5453;

    return value - Math.floor(value);
  };

  const valueNoise = (x: number, y: number, scale: number, seed: number) => {
    const px = x / scale;
    const py = y / scale;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const sx = smooth(px - x0);
    const sy = smooth(py - y0);
    const north = lerp(
      hashNoise(x0, y0, seed),
      hashNoise(x0 + 1, y0, seed),
      sx
    );
    const south = lerp(
      hashNoise(x0, y0 + 1, seed),
      hashNoise(x0 + 1, y0 + 1, seed),
      sx
    );

    return lerp(north, south, sy);
  };

  const distanceSquaredToCrack = (crack: Crack, x: number, y: number) => {
    const length = (crack.x2 - crack.x1) ** 2 + (crack.y2 - crack.y1) ** 2 || 1;
    const t = clampNumber(
      ((x - crack.x1) * (crack.x2 - crack.x1) +
        (y - crack.y1) * (crack.y2 - crack.y1)) /
        length,
      0,
      1
    );

    return (
      (x - lerp(crack.x1, crack.x2, t)) ** 2 +
      (y - lerp(crack.y1, crack.y2, t)) ** 2
    );
  };

  const createCracks = (
    random: () => number,
    width: number,
    height: number
  ) => {
    const cracks: Crack[] = [];

    for (let i = 0; i < 12; i += 1) {
      let angle = random() * Math.PI * 2;
      let x = random() * width;
      let y = random() * height;

      for (let step = 0; step < 3 + Math.floor(random() * 4); step += 1) {
        const length = 8 + random() * 20;
        const x2 = clampNumber(x + Math.cos(angle) * length, 4, width - 4);
        const y2 = clampNumber(y + Math.sin(angle) * length, 4, height - 4);

        cracks.push({
          width: 0.28 + random() * 0.58,
          x1: x,
          x2,
          y1: y,
          y2,
        });

        if (random() > 0.64) {
          const branch = angle + (random() > 0.5 ? 0.85 : -0.85);
          const branchLength = 7 + random() * 18;

          cracks.push({
            width: 0.28 + random() * 0.45,
            x1: lerp(x, x2, 0.45),
            x2: clampNumber(
              lerp(x, x2, 0.45) + Math.cos(branch) * branchLength,
              4,
              width - 4
            ),
            y1: lerp(y, y2, 0.45),
            y2: clampNumber(
              lerp(y, y2, 0.45) + Math.sin(branch) * branchLength,
              4,
              height - 4
            ),
          });
        }

        angle += (random() - 0.5) * 1.15;
        x = x2;
        y = y2;
      }
    }

    return cracks;
  };

  const createFloorPattern = (
    palette: FloorTexturePalette,
    textureSeed: string
  ): FloorPattern => {
    const columns = 16;
    const rows = 14;
    const tileSize = 32;
    const seed = seedFromText(`${textureSeed}:plates`);
    const random = randomFromSeed(seed);
    const width = columns * tileSize;
    const height = rows * tileSize;

    return {
      bronze: hexToRgb("#3b3327"),
      cracks: createCracks(random, width, height),
      decals: Array.from({ length: 12 }, () => ({
        dark: 10 + random() * 30,
        radius: 26 + random() * 92,
        warmth: random() * 0.08,
        x: random() * width,
        y: random() * height,
      })),
      grout: hexToRgb("#070707"),
      height,
      seed,
      stone: mixRgb(hexToRgb("#222723"), hexToRgb(palette.odd), 0.06),
      tileSize,
      width,
    };
  };

  const getDecalWear = (pattern: FloorPattern, x: number, y: number) => {
    let shade = 0;
    let warmth = 0;

    for (const decal of pattern.decals) {
      const dx = x - decal.x;
      const dy = y - decal.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > decal.radius * decal.radius) {
        continue;
      }

      const amount = 1 - Math.sqrt(distanceSquared) / decal.radius;
      const wear =
        amount + (valueNoise(x, y, 19, pattern.seed + 29) - 0.5) * 0.6;

      if (wear > 0.1) {
        shade -= decal.dark * wear;
        warmth += decal.warmth * wear;
      }
    }

    return { shade, warmth };
  };

  const getCrackShade = (pattern: FloorPattern, x: number, y: number) => {
    let shade = 0;

    for (const crack of pattern.cracks) {
      const distanceSquared = distanceSquaredToCrack(crack, x, y);
      const widthSquared = crack.width * crack.width;
      const featherSquared = (crack.width + 1.2) ** 2;

      if (distanceSquared < widthSquared) {
        const noise = valueNoise(x, y, 11, pattern.seed + 97);

        shade -= 17 + noise * 12;
      } else if (distanceSquared < featherSquared) {
        const noise = valueNoise(x, y, 11, pattern.seed + 97);

        shade -= 4 + noise * 4;
      }
    }

    return shade;
  };

  const getRivetColor = (
    pattern: FloorPattern,
    x: number,
    y: number,
    localX: number,
    localY: number
  ) => {
    const nearestX = localX < pattern.tileSize / 2 ? 0 : pattern.tileSize;
    const nearestY = localY < pattern.tileSize / 2 ? 0 : pattern.tileSize;
    const dx = localX - nearestX;
    const dy = localY - nearestY;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > 2.25 ** 2) {
      return null;
    }

    const core = mixRgb(
      pattern.stone,
      pattern.bronze,
      distanceSquared < 0.9 ** 2 ? 0.1 : 0.32
    );

    return shadeRgb(core, valueNoise(x, y, 5, pattern.seed + 13) * 8 - 10);
  };

  const getFloorColor = (pattern: FloorPattern, x: number, y: number) => {
    const tileX = Math.floor(x / pattern.tileSize);
    const tileY = Math.floor(y / pattern.tileSize);
    const localX = x % pattern.tileSize;
    const localY = y % pattern.tileSize;
    const seam = Math.min(
      localX,
      localY,
      pattern.tileSize - localX,
      pattern.tileSize - localY
    );
    const rivet = getRivetColor(pattern, x, y, localX, localY);

    if (rivet) {
      return rivet;
    }

    if (seam < 2.2) {
      return shadeRgb(
        pattern.grout,
        valueNoise(x, y, 9, pattern.seed + 71) * 12 - 7
      );
    }

    const decal = getDecalWear(pattern, x, y);
    const tileTint = (hashNoise(tileX, tileY, pattern.seed) - 0.5) * 18;
    const edgeShade = seam < 9 ? (seam - 9) * 1.3 : Math.min(5, seam * 0.04);
    const shade =
      tileTint +
      (valueNoise(x, y, 42, pattern.seed) - 0.5) * 24 +
      (valueNoise(x, y, 12, pattern.seed + 11) - 0.5) * 9 +
      (hashNoise(x, y, pattern.seed) - 0.5) * 4 +
      edgeShade +
      getCrackShade(pattern, x, y) +
      decal.shade;
    let color = shadeRgb(pattern.stone, shade);

    if (seam < 6) {
      color = mixRgb(color, pattern.bronze, (1 - seam / 6) * 0.03);
    }

    return mixRgb(color, pattern.bronze, clampNumber(decal.warmth));
  };

  const getFloorTexture = (
    palette: FloorTexturePalette,
    textureSeed: string
  ) => {
    const key = `${palette.even}:${palette.odd}:${palette.trim}:${textureSeed}`;
    const cached = floorTextureCache.get(key);

    if (cached) {
      return cached;
    }

    const pattern = createFloorPattern(palette, textureSeed);
    const data = new Uint8Array(pattern.width * pattern.height * 4);

    for (let y = 0; y < pattern.height; y += 1) {
      for (let x = 0; x < pattern.width; x += 1) {
        const offset = (y * pattern.width + x) * 4;
        const color = getFloorColor(pattern, x, y);

        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = 255;
      }
    }

    const texture = new DataTexture(data, pattern.width, pattern.height);

    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
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
    textureSeed = currentRoomTemplate.id,
    treasureFloorTexture = null,
  }: {
    bossFloorTexture?: Texture | null;
    currentFloorPalette: SceneFloorPalette;
    currentRoomTemplate: RoomTemplate;
    textureSeed?: string;
    treasureFloorTexture?: Texture | null;
  } = $props();

  const floorTexture = $derived(
    getFloorTexture(currentFloorPalette, textureSeed)
  );
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
        metalness={0.14}
        roughness={0.82}
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
