<script module lang="ts">
  import {
    BoxGeometry,
    CylinderGeometry,
    RingGeometry,
    SphereGeometry,
  } from "three";
  import { healPickupColors } from "./pickup-colors";

  const healBodyGeometry = new CylinderGeometry(0.7, 0.7, 0.24, 64);
  const healLensGeometry = new SphereGeometry(0.46, 28, 18);
  const healRingGeometry = new RingGeometry(0.45, 0.59, 64);
  const healTabGeometry = new BoxGeometry(0.34, 0.26, 0.46);
  const healLightGeometry = new SphereGeometry(0.055, 12, 10);
  const healCrossGeometry = new BoxGeometry(1, 1, 1);
  const healTabs: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { position: [0, 0, 0.72], rotation: [0, 0, 0] },
    { position: [0, 0, -0.72], rotation: [0, 0, 0] },
    { position: [0.72, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [-0.72, 0, 0], rotation: [0, Math.PI / 2, 0] },
  ];
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { ActivePickup } from "$lib/types/game";

  let {
    animationNow,
    pickup,
    spawnEase,
    spawnScale,
  }: {
    animationNow: number;
    pickup: ActivePickup;
    spawnEase: number;
    spawnScale: number;
  } = $props();

  const healScale = $derived(pickup.radius * 1.05 * spawnScale);
  const healFloat = $derived(
    Math.sin(animationNow * 0.0013 + pickup.createdAt) * 0.02
  );
  const healPulse = $derived(
    0.5 + Math.sin(animationNow * 0.005 + pickup.createdAt) * 0.5
  );
  const healY = $derived(-pickup.position[1] + 0.34 + healFloat);
</script>

<T.Group position={[0, healY, 0]} scale={[healScale, healScale, healScale]}>
  <T.Mesh castShadow geometry={healBodyGeometry}>
    <T.MeshStandardMaterial
      color={healPickupColors.body}
      emissive={healPickupColors.bodyEmissive}
      emissiveIntensity={0.08}
      metalness={0.62}
      opacity={spawnEase}
      roughness={0.58}
      transparent
    />
  </T.Mesh>
  {#each healTabs as tab, index (index)}
    <T.Mesh
      castShadow
      geometry={healTabGeometry}
      position={tab.position}
      rotation={tab.rotation}
    >
      <T.MeshStandardMaterial
        color={healPickupColors.tab}
        emissive={healPickupColors.bodyEmissive}
        emissiveIntensity={0.08}
        metalness={0.66}
        opacity={spawnEase}
        roughness={0.6}
        transparent
      />
    </T.Mesh>
    <T.Mesh
      geometry={healLightGeometry}
      position={[tab.position[0], 0.17, tab.position[2]]}
    >
      <T.MeshStandardMaterial
        color={healPickupColors.light}
        emissive={healPickupColors.lightEmissive}
        emissiveIntensity={2.8 + healPulse}
        opacity={spawnEase}
        roughness={0.08}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  {/each}

  <T.Mesh
    geometry={healRingGeometry}
    position={[0, 0.25, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.MeshStandardMaterial
      color={healPickupColors.ring}
      metalness={0.72}
      opacity={spawnEase}
      roughness={0.42}
      transparent
    />
  </T.Mesh>
  <T.Mesh
    geometry={healLensGeometry}
    position={[0, 0.2, 0]}
    scale={[1 + healPulse * 0.02, 0.34, 1 + healPulse * 0.02]}
  >
    <T.MeshStandardMaterial
      color={healPickupColors.lens}
      emissive={healPickupColors.lensEmissive}
      emissiveIntensity={2.2 + healPulse}
      metalness={0}
      opacity={spawnEase * 0.82}
      roughness={0}
      toneMapped={false}
      transparent
    />
  </T.Mesh>
  <T.Mesh
    geometry={healLensGeometry}
    position={[0, 0.215, 0]}
    scale={[0.86 + healPulse * 0.06, 0.08, 0.86 + healPulse * 0.06]}
  >
    <T.MeshBasicMaterial
      color={healPickupColors.glow}
      opacity={spawnEase * (0.58 + healPulse * 0.2)}
      toneMapped={false}
      transparent
    />
  </T.Mesh>
  <T.Mesh
    geometry={healCrossGeometry}
    position={[0, 0.43, 0]}
    scale={[0.46, 0.045, 0.14]}
  >
    <T.MeshBasicMaterial
      color={healPickupColors.cross}
      opacity={spawnEase * (0.9 + healPulse * 0.1)}
      transparent
    />
  </T.Mesh>
  <T.Mesh
    geometry={healCrossGeometry}
    position={[0, 0.431, 0]}
    scale={[0.14, 0.045, 0.46]}
  >
    <T.MeshBasicMaterial
      color={healPickupColors.cross}
      opacity={spawnEase * (0.9 + healPulse * 0.1)}
      transparent
    />
  </T.Mesh>
</T.Group>
