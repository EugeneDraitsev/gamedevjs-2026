<script module lang="ts">
  import {
    BoxGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    TorusGeometry,
  } from "three";

  const keyHaloGeometry = new TorusGeometry(0.42, 0.055, 12, 32);
  const keyRingGeometry = new TorusGeometry(0.36, 0.075, 12, 36);
  const keyStemGeometry = new BoxGeometry(1.18, 0.16, 0.16);
  const keyToothGeometry = new BoxGeometry(0.14, 0.46, 0.15);
  const keyCoreGeometry = new SphereGeometry(0.13, 16, 10);
  const keyHaloMaterial = new MeshBasicMaterial({
    color: "#72ffe7",
    opacity: 0.28,
    transparent: true,
  });
  const keyRingMaterial = new MeshStandardMaterial({
    color: "#d8c276",
    emissive: "#3b2206",
    emissiveIntensity: 0.26,
    metalness: 0.78,
    opacity: 1,
    roughness: 0.26,
    transparent: true,
  });
  const keyStemMaterial = new MeshStandardMaterial({
    color: "#c78f3e",
    emissive: "#2e1402",
    emissiveIntensity: 0.18,
    metalness: 0.82,
    opacity: 1,
    roughness: 0.24,
    transparent: true,
  });
  const keyToothMaterial = new MeshStandardMaterial({
    color: "#d7a856",
    emissive: "#311704",
    emissiveIntensity: 0.2,
    metalness: 0.84,
    opacity: 1,
    roughness: 0.24,
    transparent: true,
  });
  const keyCoreMaterial = new MeshBasicMaterial({
    color: "#9fffee",
    opacity: 0.58,
    transparent: true,
  });
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

  const keyScale = $derived(pickup.radius * 1.28 * spawnScale);
  const keyFloat = $derived(
    Math.sin(animationNow * 0.0015 + pickup.createdAt) * 0.055
  );
  const keySpin = $derived(animationNow * 0.0014 + pickup.createdAt * 0.01);
  const keyPulse = $derived(
    0.72 + Math.sin(animationNow * 0.006 + pickup.createdAt) * 0.28
  );
  const keyY = $derived(-pickup.position[1] + 0.44 + keyFloat);

  $effect(() => {
    keyHaloMaterial.opacity = spawnEase * 0.28;
    keyRingMaterial.opacity = spawnEase;
    keyStemMaterial.opacity = spawnEase;
    keyToothMaterial.opacity = spawnEase;
    keyCoreMaterial.opacity = spawnEase * (0.58 + keyPulse * 0.28);
  });
</script>

<T.Group
  position={[0, keyY, 0]}
  rotation={[0.18, keySpin, Math.PI / 2]}
  scale={[keyScale, keyScale, keyScale]}
>
  <T.Mesh
    geometry={keyHaloGeometry}
    material={keyHaloMaterial}
    renderOrder={10}
    scale={[1.22, 1.22, 1.22]}
  />

  <T.Mesh
    castShadow={false}
    geometry={keyRingGeometry}
    material={keyRingMaterial}
  />

  <T.Mesh
    castShadow={false}
    geometry={keyStemGeometry}
    material={keyStemMaterial}
    position={[0.78, 0, 0]}
  />

  {#each [0.98, 1.24] as x}
    <T.Mesh
      castShadow={false}
      geometry={keyToothGeometry}
      material={keyToothMaterial}
      position={[x, -0.18, 0]}
    />
  {/each}

  <T.Mesh
    geometry={keyCoreGeometry}
    material={keyCoreMaterial}
    position={[0.16, 0, 0.04]}
  />
</T.Group>
