<script module lang="ts">
  import {
    BoxGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
    SphereGeometry,
    SpriteMaterial,
    type Texture,
  } from "three";

  const offerBaseGeometry = new CylinderGeometry(0.62, 0.7, 0.36, 24);
  const offerTopGeometry = new CylinderGeometry(0.55, 0.55, 0.04, 24);
  const moduleOrbGeometry = new SphereGeometry(0.43, 36, 24);
  const moduleRingWideGeometry = new RingGeometry(0.49, 0.57, 48);
  const moduleRingThinGeometry = new RingGeometry(0.49, 0.55, 48);
  const moduleWireGeometry = new SphereGeometry(0.43, 36, 24);
  const healArmGeometry = new BoxGeometry(1, 1, 1);
  const healGlowGeometry = new SphereGeometry(1, 12, 12);
  const offerBaseMaterial = new MeshStandardMaterial({
    color: "#1a1612",
    metalness: 0.6,
    roughness: 0.45,
  });
  const offerMaterialCache = new Map<
    string,
    {
      healArm: MeshStandardMaterial;
      healGlow: MeshBasicMaterial;
      moduleOrb: MeshStandardMaterial;
      moduleRingThin: MeshBasicMaterial;
      moduleRingWide: MeshBasicMaterial;
      moduleWire: MeshBasicMaterial;
      top: MeshStandardMaterial;
    }
  >();
  const iconSpriteMaterialCache = new WeakMap<Texture, SpriteMaterial>();

  const getOfferMaterials = (accent: string) => {
    const cached = offerMaterialCache.get(accent);

    if (cached) {
      return cached;
    }

    const materials = {
      healArm: new MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.42,
        metalness: 0.5,
        roughness: 0.2,
      }),
      healGlow: new MeshBasicMaterial({
        color: accent,
        depthWrite: false,
        opacity: 0.12,
        toneMapped: false,
        transparent: true,
      }),
      moduleOrb: new MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.13,
        metalness: 0.18,
        opacity: 0.42,
        roughness: 0.14,
        transparent: true,
      }),
      moduleRingThin: new MeshBasicMaterial({
        color: accent,
        opacity: 0.2,
        transparent: true,
      }),
      moduleRingWide: new MeshBasicMaterial({
        color: accent,
        opacity: 0.28,
        transparent: true,
      }),
      moduleWire: new MeshBasicMaterial({
        color: accent,
        depthWrite: false,
        opacity: 0.08,
        toneMapped: false,
        transparent: true,
        wireframe: true,
      }),
      top: new MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.16,
        metalness: 0.85,
        roughness: 0.18,
      }),
    };

    offerMaterialCache.set(accent, materials);
    return materials;
  };

  const getIconSpriteMaterial = (texture: Texture) => {
    const cached = iconSpriteMaterialCache.get(texture);

    if (cached) {
      return cached;
    }

    const material = new SpriteMaterial({
      color: "#ffffff",
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0.98,
      transparent: true,
    });

    iconSpriteMaterialCache.set(texture, material);
    return material;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { HTML as Sticker } from "@threlte/extras";
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";
  import {
    getMachineModule,
    getMachineModuleKindAccent,
    type MachineModuleId,
  } from "$lib/config/machine-modules";
  import type { ShopOffer } from "$lib/config/shop-offers";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  let {
    animationNow,
    labelOpacity = 1,
    lightEnabled = true,
    offer,
    showLabel = true,
  }: {
    animationNow: number;
    labelOpacity?: number;
    lightEnabled?: boolean;
    offer: ShopOffer;
    showLabel?: boolean;
  } = $props();

  const scene = getGameSceneContext();
  const baseY = $derived(
    scene.currentRoomTemplate.layout === "outside-yard" ? offer.position[1] : 0
  );
  const moduleId = $derived(
    offer.kind === "module" ? offer.moduleId : undefined
  );
  const moduleTemplate = $derived(
    moduleId ? getMachineModule(moduleId as MachineModuleId) : null
  );
  const accent = $derived.by(() => {
    if (moduleTemplate) {
      return getMachineModuleKindAccent(moduleTemplate.kind);
    }
    return offer.kind === "heal-big" ? "#22c55e" : "#7dffd7";
  });
  const bobOffset = $derived(
    Math.sin(animationNow / 380 + offer.position[0]) * 0.08
  );
  const spin = $derived(
    (animationNow / 720 + offer.position[0]) % (Math.PI * 2)
  );
  const isBigHeal = $derived(offer.kind === "heal-big");
  const armLong = $derived(isBigHeal ? 0.36 : 0.26);
  const armShort = $derived(isBigHeal ? 0.12 : 0.08);
  const healGlowScale = $derived(armLong * 0.7);
  const offerName = $derived.by(() => {
    if (moduleTemplate) {
      return moduleTemplate.shortLabel;
    }
    return offer.kind === "heal-big" ? "Repair +3" : "Repair +1";
  });
  const affordable = $derived(scene.pickups.gears >= offer.price);
  const iconTexture = $derived(
    moduleId
      ? (scene.textures.machineModuleIcons[moduleId as MachineModuleId] ?? null)
      : null
  );
  const offerMaterials = $derived(getOfferMaterials(accent));
  const iconSpriteMaterial = $derived(
    iconTexture ? getIconSpriteMaterial(iconTexture) : null
  );
</script>

<T.Group position={[offer.position[0], baseY, offer.position[2]]}>
  <T.Mesh
    castShadow
    geometry={offerBaseGeometry}
    material={offerBaseMaterial}
    position={[0, 0.18, 0]}
  />

  <T.Mesh
    geometry={offerTopGeometry}
    material={offerMaterials.top}
    position={[0, 0.38, 0]}
  />

  <T.Group position={[0, 0.92 + bobOffset, 0]} rotation={[0, spin, 0]}>
    {#if offer.kind === "module"}
      <T.Mesh
        castShadow
        geometry={moduleOrbGeometry}
        material={offerMaterials.moduleOrb}
      />

      <T.Mesh
        geometry={moduleRingWideGeometry}
        material={offerMaterials.moduleRingWide}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <T.Mesh
        geometry={moduleRingThinGeometry}
        material={offerMaterials.moduleRingThin}
        rotation={[0, 0, Math.PI / 2]}
      />

      {#if iconSpriteMaterial}
        <T.Sprite
          material={iconSpriteMaterial}
          position={[0, 0, 0]}
          scale={[0.66, 0.66, 0.66]}
        />
      {/if}

      <T.Mesh
        geometry={moduleWireGeometry}
        material={offerMaterials.moduleWire}
        scale={[1.34, 1.34, 1.34]}
      />
    {:else}
      <T.Mesh
        castShadow
        geometry={healArmGeometry}
        material={offerMaterials.healArm}
        scale={[armLong, armShort, armShort]}
      />
      <T.Mesh
        castShadow
        geometry={healArmGeometry}
        material={offerMaterials.healArm}
        rotation={[0, 0, Math.PI / 2]}
        scale={[armLong, armShort, armShort]}
      />

      <T.Mesh
        geometry={healGlowGeometry}
        material={offerMaterials.healGlow}
        scale={[
          healGlowScale * 1.6,
          healGlowScale * 1.6,
          healGlowScale * 1.6,
        ]}
      />
    {/if}
  </T.Group>

  {#if lightEnabled}
    <T.PointLight
      color={accent}
      distance={2.55}
      intensity={0.32}
      position={[0, 1.05, 0]}
    />
  {/if}

  {#if showLabel}
    <Sticker
      pointerEvents="none"
      position={[0, 0.5, 0.78]}
      sprite
      zIndexRange={[7, 0]}
    >
      <div class="shop-tag" class:affordable style:opacity={labelOpacity}>
        <span class="shop-tag-name">{offerName}</span>
        <span class="shop-tag-price">
          <img alt="" class="shop-tag-gear" src={gearCurrencyUrl}>
          <span>{offer.price}</span>
        </span>
      </div>
    </Sticker>
  {/if}
</T.Group>

<style>
  :global(.shop-tag) {
    display: grid;
    gap: 0.18rem;
    min-inline-size: 4rem;
    padding: 0.32rem 0.5rem;
    font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(248, 244, 230, 0.94);
    text-align: center;
    letter-spacing: 0.02em;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
    pointer-events: none;
    user-select: none;
    background: rgba(8, 12, 18, 0.78);
    border: 1px solid rgba(255, 220, 168, 0.22);
    border-radius: 0.5rem;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.32),
      0 0.6rem 1.2rem rgba(0, 0, 0, 0.42);
    transform: translate(-50%, 26px);
  }

  :global(.shop-tag-name) {
    font-size: 0.62rem;
    color: rgba(214, 226, 236, 0.86);
    text-transform: uppercase;
    letter-spacing: 0.16em;
  }

  :global(.shop-tag-price) {
    display: inline-flex;
    gap: 0.28rem;
    align-items: center;
    justify-content: center;
    font-size: 0.92rem;
    color: rgba(255, 132, 96, 0.96);
  }

  :global(.shop-tag.affordable .shop-tag-price) {
    color: #ffe7a3;
  }

  :global(.shop-tag-gear) {
    inline-size: 0.95rem;
    block-size: 0.95rem;
    filter: drop-shadow(0 0 0.32rem rgba(255, 184, 77, 0.4));
  }
</style>
