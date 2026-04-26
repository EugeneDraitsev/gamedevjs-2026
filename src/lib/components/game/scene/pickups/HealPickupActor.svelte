<script module lang="ts">
  import {
    BoxGeometry,
    type BufferGeometry,
    CylinderGeometry,
    InstancedMesh,
    type Material,
    Matrix4,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    RingGeometry,
    SphereGeometry,
  } from "three";
  import { healPickupColors } from "./pickup-colors";

  const healBodyGeometry = new CylinderGeometry(0.7, 0.7, 0.24, 32);
  const healLensGeometry = new SphereGeometry(0.46, 18, 12);
  const healRingGeometry = new RingGeometry(0.45, 0.59, 40);
  const healTabGeometry = new BoxGeometry(0.34, 0.26, 0.46);
  const healLightGeometry = new SphereGeometry(0.055, 8, 6);
  const healCrossGeometry = new BoxGeometry(1, 1, 1);
  const healBodyMaterial = new MeshStandardMaterial({
    color: healPickupColors.body,
    emissive: healPickupColors.bodyEmissive,
    emissiveIntensity: 0.08,
    metalness: 0.62,
    roughness: 0.58,
  });
  const healTabMaterial = new MeshStandardMaterial({
    color: healPickupColors.tab,
    emissive: healPickupColors.bodyEmissive,
    emissiveIntensity: 0.08,
    metalness: 0.66,
    roughness: 0.6,
  });
  const healLightMaterial = new MeshBasicMaterial({
    color: healPickupColors.light,
    toneMapped: false,
  });
  const healRingMaterial = new MeshStandardMaterial({
    color: healPickupColors.ring,
    metalness: 0.72,
    roughness: 0.42,
  });
  const healLensMaterial = new MeshBasicMaterial({
    color: healPickupColors.lens,
    opacity: 0.82,
    toneMapped: false,
    transparent: true,
  });
  const healGlowMaterial = new MeshBasicMaterial({
    color: healPickupColors.glow,
    depthWrite: false,
    opacity: 0.58,
    toneMapped: false,
    transparent: true,
  });
  const healCrossMaterial = new MeshBasicMaterial({
    color: healPickupColors.cross,
    opacity: 0.9,
    transparent: true,
  });
  const healTabs: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
  }> = [
    { position: [0, 0, 0.72], rotation: [0, 0, 0] },
    { position: [0, 0, -0.72], rotation: [0, 0, 0] },
    { position: [0.72, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [-0.72, 0, 0], rotation: [0, Math.PI / 2, 0] },
  ];
  const healCrosses: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }> = [
    {
      position: [0, 0.43, 0],
      rotation: [0, 0, 0],
      scale: [0.46, 0.045, 0.14],
    },
    {
      position: [0, 0.431, 0],
      rotation: [0, 0, 0],
      scale: [0.14, 0.045, 0.46],
    },
  ];
  const healInstanceDummy = new Object3D();
  const healInstanceMatrix = new Matrix4();

  const createHealMesh = (
    geometry: BufferGeometry,
    material: Material,
    count: number,
    renderOrder = 0
  ) => {
    const mesh = new InstancedMesh(geometry, material, count);

    mesh.castShadow = false;
    mesh.count = count;
    mesh.frustumCulled = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = renderOrder;

    return mesh;
  };

  const setHealMatrix = (
    mesh: InstancedMesh,
    index: number,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number] = [1, 1, 1]
  ) => {
    healInstanceDummy.position.set(...position);
    healInstanceDummy.rotation.set(...rotation);
    healInstanceDummy.scale.set(...scale);
    healInstanceDummy.updateMatrix();
    healInstanceMatrix.copy(healInstanceDummy.matrix);
    mesh.setMatrixAt(index, healInstanceMatrix);
  };
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

  const healScale = $derived(
    pickup.radius * 1.05 * spawnScale * (0.28 + spawnEase * 0.72)
  );
  const healFloat = $derived(
    Math.sin(animationNow * 0.0013 + pickup.createdAt) * 0.02
  );
  const healPulse = $derived(
    0.5 + Math.sin(animationNow * 0.005 + pickup.createdAt) * 0.5
  );
  const healY = $derived(-pickup.position[1] + 0.34 + healFloat);

  const healBodyMesh = createHealMesh(healBodyGeometry, healBodyMaterial, 1);
  const healTabMesh = createHealMesh(
    healTabGeometry,
    healTabMaterial,
    healTabs.length
  );
  const healLightMesh = createHealMesh(
    healLightGeometry,
    healLightMaterial,
    healTabs.length
  );
  const healRingMesh = createHealMesh(healRingGeometry, healRingMaterial, 1);
  const healLensMesh = createHealMesh(healLensGeometry, healLensMaterial, 1);
  const healGlowMesh = createHealMesh(healLensGeometry, healGlowMaterial, 1, 9);
  const healCrossMesh = createHealMesh(
    healCrossGeometry,
    healCrossMaterial,
    healCrosses.length,
    10
  );

  $effect(() => {
    const lensPulse = 0.74 + healPulse * 0.08;
    const glowPulse = 0.58 + healPulse * 0.2;
    const crossPulse = 0.9 + healPulse * 0.1;

    healLensMaterial.opacity = spawnEase * lensPulse;
    healGlowMaterial.opacity = spawnEase * glowPulse;
    healCrossMaterial.opacity = spawnEase * crossPulse;

    setHealMatrix(healBodyMesh, 0, [0, 0, 0], [0, 0, 0]);

    healTabs.forEach((tab, index) => {
      setHealMatrix(healTabMesh, index, tab.position, tab.rotation);
      setHealMatrix(
        healLightMesh,
        index,
        [tab.position[0], 0.17, tab.position[2]],
        [0, 0, 0]
      );
    });

    setHealMatrix(healRingMesh, 0, [0, 0.25, 0], [-Math.PI / 2, 0, 0]);
    setHealMatrix(
      healLensMesh,
      0,
      [0, 0.2, 0],
      [0, 0, 0],
      [1 + healPulse * 0.02, 0.34, 1 + healPulse * 0.02]
    );
    setHealMatrix(
      healGlowMesh,
      0,
      [0, 0.215, 0],
      [0, 0, 0],
      [0.86 + healPulse * 0.06, 0.08, 0.86 + healPulse * 0.06]
    );

    healCrosses.forEach((cross, index) => {
      setHealMatrix(
        healCrossMesh,
        index,
        cross.position,
        cross.rotation,
        cross.scale
      );
    });

    healBodyMesh.instanceMatrix.needsUpdate = true;
    healTabMesh.instanceMatrix.needsUpdate = true;
    healLightMesh.instanceMatrix.needsUpdate = true;
    healRingMesh.instanceMatrix.needsUpdate = true;
    healLensMesh.instanceMatrix.needsUpdate = true;
    healGlowMesh.instanceMatrix.needsUpdate = true;
    healCrossMesh.instanceMatrix.needsUpdate = true;
  });
</script>

<T.Group position={[0, healY, 0]} scale={[healScale, healScale, healScale]}>
  <T is={healBodyMesh} />
  <T is={healTabMesh} />
  <T is={healLightMesh} />
  <T is={healRingMesh} />
  <T is={healLensMesh} />
  <T is={healGlowMesh} />
  <T is={healCrossMesh} />
</T.Group>
