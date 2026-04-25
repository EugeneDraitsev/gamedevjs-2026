<script lang="ts">
  import { T } from "@threlte/core";
  import { AdditiveBlending, DoubleSide, GreaterDepth } from "three";
  import { meleeHeightOffset } from "$lib/components/game/player/melee-trail";
  import { createHolographicAxeBladeShape } from "$lib/game/holographic-axe";
  import type { PlayerMeleeVisualsProps } from "$lib/types/game-components";

  let {
    isSwingingVisual,
    meleeParams,
    meleeShowSword,
    meleeSwordOpacity,
    meleeWeaponForm = "sword",
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
  const trailVisibleOpacity = $derived(
    isSwingingVisual ? 0.24 * swingLingerFade : 0
  );
  const axeBladeShape = createHolographicAxeBladeShape();
  const axeShaftLength = $derived(swingBladeLength * 1.02);
  const axeShaftMidZ = $derived(
    meleeParams.innerRadius + axeShaftLength / 2 + 0.02
  );
  const axeHeadZ = $derived(meleeParams.innerRadius + axeShaftLength + 0.14);
  const axeShaftEndZ = $derived(
    meleeParams.innerRadius + axeShaftLength + 0.08
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
    castShadow={swordVisibleOpacity > 0.001}
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

  <T.Mesh
    castShadow={swordVisibleOpacity > 0.001}
    position={[0, 0, meleeParams.innerRadius]}
  >
    <T.CylinderGeometry args={[0.035, 0.035, 0.46, 16]} />
    <T.MeshStandardMaterial
      color="#c08a2f"
      metalness={1}
      opacity={swordVisibleOpacity}
      roughness={0.3}
      transparent
    />
  </T.Mesh>

  {#if meleeWeaponForm === "axe"}
    <T.Mesh position={[0, 0, axeShaftMidZ]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.03, 0.05, axeShaftLength, 8]} />
      <T.MeshBasicMaterial
        color="#eaffff"
        opacity={0.82 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0.014, axeShaftMidZ]}
      scale={[0.1, 0.032, axeShaftLength]}
    >
      <T.BoxGeometry args={[1, 1, 1]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#5ee9ff"
        depthWrite={false}
        opacity={0.32 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh position={[0, 0, axeShaftMidZ]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.07, 0.1, axeShaftLength + 0.06, 12]} />
      <T.MeshBasicMaterial
        color="#56efff"
        depthFunc={GreaterDepth}
        depthWrite={false}
        opacity={0.38 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0, axeShaftEndZ - 0.08]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.CylinderGeometry args={[0.09, 0.09, 0.18, 8]} />
      <T.MeshBasicMaterial
        color="#56efff"
        opacity={0.62 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0.02, axeHeadZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0.66, 0.76, 0.66]}
    >
      <T.ShapeGeometry args={[axeBladeShape, 8]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#5ee9ff"
        depthWrite={false}
        opacity={0.5 * swordVisibleOpacity * (0.64 + swingActiveFlare * 0.36)}
        side={DoubleSide}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0.04, axeHeadZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[0.74, 0.84, 0.74]}
    >
      <T.ShapeGeometry args={[axeBladeShape, 8]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#eaffff"
        depthWrite={false}
        opacity={0.24 * swordVisibleOpacity}
        side={DoubleSide}
        toneMapped={false}
        transparent
        wireframe
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.05, axeHeadZ]}>
      <T.CylinderGeometry args={[0.16, 0.18, 0.06, 8]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#eaffff"
        depthWrite={false}
        opacity={0.55 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.09, axeHeadZ]} rotation={[0, 0, Math.PI / 4]}>
      <T.BoxGeometry args={[0.16, 0.035, 0.16]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#eaffff"
        depthWrite={false}
        opacity={0.65 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>

    <T.Mesh
      position={[0, 0.02, axeHeadZ + 0.22]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <T.ConeGeometry args={[0.07, 0.15, 4]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#56efff"
        depthWrite={false}
        opacity={0.42 * swordVisibleOpacity}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  {:else}
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
      <T.CylinderGeometry args={[0.08, 0.12, swingBladeLength + 0.1, 20]} />
      <T.MeshBasicMaterial
        color="#eaffff"
        depthFunc={GreaterDepth}
        depthWrite={false}
        opacity={0.38 * swordVisibleOpacity}
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
  {/if}

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

<T.Mesh
  geometry={trailGeometry}
  position={[
    swingCenter[0],
    swingCenter[1] + meleeHeightOffset + 0.05,
    swingCenter[2],
  ]}
  rotation={[0, swingFacingYaw, 0]}
  renderOrder={28}
  frustumCulled={false}
  visible={trailVisibleOpacity > 0.001}
>
  <T.MeshBasicMaterial
    color="#eaffff"
    depthFunc={GreaterDepth}
    depthWrite={false}
    opacity={trailVisibleOpacity}
    transparent
  />
</T.Mesh>

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
