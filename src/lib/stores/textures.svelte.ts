import {
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import artifactFloorTextureUrl from "$lib/assets/artifact-floor-foundry.png";
import bossBannerTextureUrl from "$lib/assets/boss-banner-foundry.png";
import bossDoorTextureUrl from "$lib/assets/boss-door.svg";
import bossFloorTextureUrl from "$lib/assets/boss-floor-foundry.png";
import foundryFloorTextureUrl from "$lib/assets/foundry-floor-atlas.png";
import foundryFloorDecalsTextureUrl from "$lib/assets/foundry-floor-decals.png";
import foundryWallTextureUrl from "$lib/assets/foundry-wall-panel.png";
import lavaSurfaceTextureUrl from "$lib/assets/lava-surface.png";

const textureCache = new Map<string, Texture>();
const textureLoader = new TextureLoader();

const makeTexture = (url: string, repeat = 1): Texture => {
  const cached = textureCache.get(url);

  if (cached) {
    return cached;
  }

  const texture = textureLoader.load(url);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  textureCache.set(url, texture);

  return texture;
};

export class TextureStore {
  bossBanner = $state<Texture | null>(null);
  bossDoor = $state<Texture | null>(null);
  bossFloor = $state<Texture | null>(null);
  environmentMap = $state<Texture | null>(null);
  foundryFloor = $state<Texture | null>(null);
  foundryFloorDecals = $state<Texture | null>(null);
  foundryWall = $state<Texture | null>(null);
  lavaSurface = $state<Texture | null>(null);
  treasureFloor = $state<Texture | null>(null);

  load() {
    this.bossBanner = makeTexture(bossBannerTextureUrl);
    this.bossDoor = makeTexture(bossDoorTextureUrl);
    this.bossFloor = makeTexture(bossFloorTextureUrl);
    this.environmentMap = null;
    this.foundryFloor = makeTexture(foundryFloorTextureUrl, 4);
    this.foundryFloorDecals = makeTexture(foundryFloorDecalsTextureUrl);
    this.foundryWall = makeTexture(foundryWallTextureUrl);
    this.lavaSurface = makeTexture(lavaSurfaceTextureUrl);
    this.treasureFloor = makeTexture(artifactFloorTextureUrl);
  }

  advanceLava(delta: number) {
    if (!this.lavaSurface) {
      return;
    }

    this.lavaSurface.offset.x =
      (this.lavaSurface.offset.x + delta * 0.0243) % 1;
    this.lavaSurface.offset.y =
      (this.lavaSurface.offset.y + delta * 0.0054) % 1;
  }
}
