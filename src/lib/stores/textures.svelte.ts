import {
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import bossDoorTextureUrl from "$lib/assets/boss-door.svg";
import bossFloorTextureUrl from "$lib/assets/boss-floor.svg";
import foundryFloorTextureUrl from "$lib/assets/foundry-floor-atlas.png";
import foundryFloorDecalsTextureUrl from "$lib/assets/foundry-floor-decals.png";
import lavaSurfaceTextureUrl from "$lib/assets/lava-surface.svg";
import treasureFloorTextureUrl from "$lib/assets/treasure-floor.svg";

const makeTexture = (url: string, repeat = 1): Texture => {
  const texture = new TextureLoader().load(url);

  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;

  return texture;
};

export class TextureStore {
  bossDoor = $state<Texture | null>(null);
  bossFloor = $state<Texture | null>(null);
  foundryFloor = $state<Texture | null>(null);
  foundryFloorDecals = $state<Texture | null>(null);
  lavaSurface = $state<Texture | null>(null);
  treasureFloor = $state<Texture | null>(null);

  load() {
    this.bossDoor = makeTexture(bossDoorTextureUrl);
    this.bossFloor = makeTexture(bossFloorTextureUrl);
    this.foundryFloor = makeTexture(foundryFloorTextureUrl, 4);
    this.foundryFloorDecals = makeTexture(foundryFloorDecalsTextureUrl);
    this.lavaSurface = makeTexture(lavaSurfaceTextureUrl, 2.4);
    this.treasureFloor = makeTexture(treasureFloorTextureUrl);
  }

  advanceLava(delta: number) {
    if (!this.lavaSurface) {
      return;
    }

    this.lavaSurface.offset.x += delta * 0.18;
    this.lavaSurface.offset.y -= delta * 0.08;
  }
}
