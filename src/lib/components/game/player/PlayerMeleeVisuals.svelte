<script lang="ts">
  import { T } from "@threlte/core";
  import { AdditiveBlending } from "three";
  import { meleeHeightOffset } from "$lib/components/game/player/melee-trail";
  import type { PlayerMeleeVisualsProps } from "$lib/types/game-components";

  let {
    isSwingingVisual,
    meleeParams,
    meleeShowSword,
    meleeSwordOpacity,
    meleeTrailSettings,
    swingActiveFlare,
    swingBladeLength,
    swingBladeMidZ,
    swingBladeTipZ,
    swingCenter,
    swingFacingYaw,
    swingLightRadial,
    swingLingerFade,
    swordRotationY,
    trailGeometry,
    trailMaterial,
  }: PlayerMeleeVisualsProps = $props();

  const swordVisibleOpacity = $derived(
    meleeShowSword && isSwingingVisual ? meleeSwordOpacity * swingLingerFade : 0
  );
  const trailLightIntensity = $derived(
    isSwingingVisual ? 6 * swingLingerFade : 0
  );
</script>

<T.Group
  position={[
    swingCenter[0],
    swingCenter[1] + meleeHeightOffset,
    swingCenter[2],
  ]}
  rotation={[0, swordRotationY, 0]}
>
  <T.Mesh
    castShadow
    position={[0, 0, meleeParams.innerRadius - 0.18]}
    rotation={[Math.PI / 2, 0, 0]}
  >
    <T.CylinderGeometry args={[0.045, 0.045, 0.36, 16]} />
    <T.MeshStandardMaterial
      color="#18120d"
      metalness={0.8}
      opacity={swordVisibleOpacity}
      roughness={0.45}
      transparent
    />
  </T.Mesh>

  <T.Mesh castShadow position={[0, 0, meleeParams.innerRadius]}>
    <T.CylinderGeometry args={[0.035, 0.035, 0.46, 16]} />
    <T.MeshStandardMaterial
      color="#c08a2f"
      metalness={1}
      opacity={swordVisibleOpacity}
      roughness={0.3}
      transparent
    />
  </T.Mesh>

  <T.Mesh position={[0, 0, swingBladeMidZ]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.026, 0.055, swingBladeLength, 20]} />
    <T.MeshBasicMaterial
      color="#eaffff"
      opacity={swordVisibleOpacity}
      toneMapped={false}
      transparent
    />
  </T.Mesh>

  <T.Mesh position={[0, 0, swingBladeMidZ]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.09, 0.13, swingBladeLength + 0.03, 24]} />
    <T.MeshBasicMaterial
      blending={AdditiveBlending}
      color="#56efff"
      depthWrite={false}
      opacity={0.28 * swordVisibleOpacity * (0.5 + swingActiveFlare * 0.6)}
      toneMapped={false}
      transparent
    />
  </T.Mesh>

  <T.Mesh position={[0, 0, swingBladeTipZ]} rotation={[Math.PI / 2, 0, 0]}>
    <T.ConeGeometry args={[0.055, 0.16, 20]} />
    <T.MeshBasicMaterial
      color="#eaffff"
      opacity={swordVisibleOpacity}
      toneMapped={false}
      transparent
    />
  </T.Mesh>

  <T.PointLight
    color="#62f4ff"
    decay={1.8}
    distance={3.1}
    intensity={2.1 * swordVisibleOpacity * swingActiveFlare}
    position={[0, 0, swingBladeTipZ - 0.14]}
  />
</T.Group>

<T.Mesh
  geometry={trailGeometry}
  material={trailMaterial}
  position={[
    swingCenter[0],
    swingCenter[1] + meleeHeightOffset + 0.05,
    swingCenter[2],
  ]}
  rotation={[0, swingFacingYaw, 0]}
  renderOrder={3}
  frustumCulled={false}
/>

<T.PointLight
  color={meleeTrailSettings.edgeColor}
  decay={1.6}
  distance={6.5}
  intensity={trailLightIntensity}
  position={[
    swingCenter[0] + Math.sin(swordRotationY) * swingLightRadial,
    swingCenter[1] + meleeHeightOffset + 0.12,
    swingCenter[2] + Math.cos(swordRotationY) * swingLightRadial,
  ]}
/>
