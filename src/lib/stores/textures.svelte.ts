import {
  LinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import artifactFloorTextureUrl from "$lib/assets/artifact-floor-foundry.png";
import artifactFloorHeightTextureUrl from "$lib/assets/artifact-floor-foundry-height.png";
import artifactFloorNormalTextureUrl from "$lib/assets/artifact-floor-foundry-normal.png";
import bossBannerTextureUrl from "$lib/assets/boss-banner-foundry.png";
import bossDoorTextureUrl from "$lib/assets/boss-door.svg";
import bossFloorTextureUrl from "$lib/assets/boss-floor-foundry.png";
import bossFloorHeightTextureUrl from "$lib/assets/boss-floor-foundry-height.png";
import bossFloorNormalTextureUrl from "$lib/assets/boss-floor-foundry-normal.png";
import foundryFloorTextureUrl from "$lib/assets/foundry-floor-atlas.png";
import foundryFloorDecalsTextureUrl from "$lib/assets/foundry-floor-decals.png";
import foundryWallTextureUrl from "$lib/assets/foundry-wall-panel.png";
import lavaSurfaceTextureUrl from "$lib/assets/lava-surface.png";
import outsideEarthTextureUrl from "$lib/assets/outside-earth.png";
import outsideEarthDecalTextureUrl from "$lib/assets/outside-earth-decals.png";
import outsideRockDecalTextureUrl from "$lib/assets/outside-rock-decals.png";
import outsideRocksTextureUrl from "$lib/assets/outside-rocks.png";
import outsideWaterTextureUrl from "$lib/assets/outside-water.png";
import outsideWaterDecalTextureUrl from "$lib/assets/outside-water-decals.png";

const textureCache = new Map<string, Texture>();
const textureLoader = new TextureLoader();

const makeTexture = (
  url: string,
  repeat = 1,
  colorSpace: Texture["colorSpace"] = SRGBColorSpace
): Texture => {
  const cached = textureCache.get(url);

  if (cached) {
    return cached;
  }

  const texture = textureLoader.load(url);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = colorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  textureCache.set(url, texture);

  return texture;
};

export class TextureStore {
  bossBanner = $state<Texture | null>(null);
  bossDoor = $state<Texture | null>(null);
  bossFloor = $state<Texture | null>(null);
  bossFloorHeight = $state<Texture | null>(null);
  bossFloorNormal = $state<Texture | null>(null);
  environmentMap = $state<Texture | null>(null);
  foundryFloor = $state<Texture | null>(null);
  foundryFloorDecals = $state<Texture | null>(null);
  foundryWall = $state<Texture | null>(null);
  lavaSurface = $state<Texture | null>(null);
  outsideEarth = $state<Texture | null>(null);
  outsideEarthDecals = $state<Texture | null>(null);
  outsideRockDecals = $state<Texture | null>(null);
  outsideRocks = $state<Texture | null>(null);
  outsideWater = $state<Texture | null>(null);
  outsideWaterDecals = $state<Texture | null>(null);
  treasureFloor = $state<Texture | null>(null);
  treasureFloorHeight = $state<Texture | null>(null);
  treasureFloorNormal = $state<Texture | null>(null);

  load() {
    this.bossBanner = makeTexture(bossBannerTextureUrl);
    this.bossDoor = makeTexture(bossDoorTextureUrl);
    this.bossFloor = makeTexture(bossFloorTextureUrl);
    this.bossFloorHeight = makeTexture(
      bossFloorHeightTextureUrl,
      1,
      NoColorSpace
    );
    this.bossFloorNormal = makeTexture(
      bossFloorNormalTextureUrl,
      1,
      NoColorSpace
    );
    this.environmentMap = null;
    this.foundryFloor = makeTexture(foundryFloorTextureUrl, 4);
    this.foundryFloorDecals = makeTexture(foundryFloorDecalsTextureUrl);
    this.foundryWall = makeTexture(foundryWallTextureUrl);
    this.lavaSurface = makeTexture(lavaSurfaceTextureUrl);
    this.outsideEarth = makeTexture(outsideEarthTextureUrl);
    this.outsideEarthDecals = makeTexture(outsideEarthDecalTextureUrl);
    this.outsideRockDecals = makeTexture(outsideRockDecalTextureUrl);
    this.outsideRocks = makeTexture(outsideRocksTextureUrl);
    this.outsideWater = makeTexture(outsideWaterTextureUrl);
    this.outsideWaterDecals = makeTexture(outsideWaterDecalTextureUrl);
    this.treasureFloor = makeTexture(artifactFloorTextureUrl);
    this.treasureFloorHeight = makeTexture(
      artifactFloorHeightTextureUrl,
      1,
      NoColorSpace
    );
    this.treasureFloorNormal = makeTexture(
      artifactFloorNormalTextureUrl,
      1,
      NoColorSpace
    );
  }

  advanceLava(delta: number) {
    if (this.lavaSurface) {
      this.lavaSurface.offset.x =
        (this.lavaSurface.offset.x + delta * 0.032) % 1;
      this.lavaSurface.offset.y =
        (this.lavaSurface.offset.y + delta * 0.0072) % 1;
    }

    if (this.outsideWater) {
      this.outsideWater.offset.x =
        (this.outsideWater.offset.x + delta * 0.006) % 1;
      this.outsideWater.offset.y =
        (this.outsideWater.offset.y + delta * 0.012) % 1;
    }
  }
}
