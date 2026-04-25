<script lang="ts">
  import { T } from "@threlte/core";
  import { HTML as Sticker } from "@threlte/extras";
  import gearCurrencyUrl from "$lib/assets/gear-currency.svg";
  import {
    getMachineModule,
    type MachineModuleId,
  } from "$lib/config/machine-modules";
  import type { ShopOffer } from "$lib/config/shop-offers";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  let {
    animationNow,
    offer,
  }: {
    animationNow: number;
    offer: ShopOffer;
  } = $props();

  const scene = getGameSceneContext();
  const accent = $derived.by(() => {
    if (offer.kind === "module" && offer.moduleId) {
      return getMachineModule(offer.moduleId as MachineModuleId).accent;
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
  const offerName = $derived.by(() => {
    if (offer.kind === "module" && offer.moduleId) {
      return getMachineModule(offer.moduleId as MachineModuleId).shortLabel;
    }
    return offer.kind === "heal-big" ? "Repair +3" : "Repair +1";
  });
  const affordable = $derived(scene.pickups.gears >= offer.price);
</script>

<T.Group position={[offer.position[0], 0, offer.position[2]]}>
  <T.Mesh castShadow position={[0, 0.18, 0]}>
    <T.CylinderGeometry args={[0.62, 0.7, 0.36, 24]} />
    <T.MeshStandardMaterial color="#1a1612" metalness={0.6} roughness={0.45} />
  </T.Mesh>

  <T.Mesh position={[0, 0.38, 0]}>
    <T.CylinderGeometry args={[0.55, 0.55, 0.04, 24]} />
    <T.MeshStandardMaterial
      color={accent}
      emissive={accent}
      emissiveIntensity={0.32}
      metalness={0.85}
      roughness={0.18}
    />
  </T.Mesh>

  <T.Group position={[0, 0.92 + bobOffset, 0]} rotation={[0, spin, 0]}>
    {#if offer.kind === "module"}
      <T.Mesh castShadow>
        <T.IcosahedronGeometry args={[0.32, 0]} />
        <T.MeshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.65}
          metalness={0.78}
          roughness={0.22}
        />
      </T.Mesh>

      <T.Mesh scale={[1.45, 1.45, 1.45]}>
        <T.IcosahedronGeometry args={[0.32, 0]} />
        <T.MeshBasicMaterial
          color={accent}
          depthWrite={false}
          opacity={0.18}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
    {:else}
      <T.Mesh castShadow>
        <T.BoxGeometry args={[armLong, armShort, armShort]} />
        <T.MeshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.78}
          metalness={0.5}
          roughness={0.2}
        />
      </T.Mesh>
      <T.Mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <T.BoxGeometry args={[armLong, armShort, armShort]} />
        <T.MeshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.78}
          metalness={0.5}
          roughness={0.2}
        />
      </T.Mesh>

      <T.Mesh scale={[1.6, 1.6, 1.6]}>
        <T.SphereGeometry args={[armLong * 0.7, 12, 12]} />
        <T.MeshBasicMaterial
          color={accent}
          depthWrite={false}
          opacity={0.22}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
    {/if}
  </T.Group>

  <T.PointLight
    color={accent}
    distance={3.4}
    intensity={0.85}
    position={[0, 1.05, 0]}
  />

  <Sticker center pointerEvents="none" position={[0, 1.65, 0]} sprite>
    <div class="shop-tag" class:affordable>
      <span class="shop-tag-name">{offerName}</span>
      <span class="shop-tag-price">
        <img alt="" class="shop-tag-gear" src={gearCurrencyUrl}>
        <span>{offer.price}</span>
      </span>
    </div>
  </Sticker>
</T.Group>

<style>
  :global(.shop-tag) {
    display: grid;
    gap: 0.18rem;
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
