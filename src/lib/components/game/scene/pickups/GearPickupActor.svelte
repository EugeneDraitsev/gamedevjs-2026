<script module lang="ts">
  import {
    ExtrudeGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Path,
    RingGeometry,
    Shape,
  } from "three";
  import { gearPickupColors } from "./pickup-colors";

  const gearDepth = 12 / 44;
  const makeGearShape = () => {
    const shape = new Shape();
    const teeth = 12;

    for (let index = 0; index < teeth; index += 1) {
      const pitch = (Math.PI * 2) / teeth;
      const angle = index * pitch;
      const points = [
        [angle - pitch * 0.5, 72 / 88],
        [angle - pitch * 0.24, 72 / 88],
        [angle - pitch * 0.15, 1],
        [angle + pitch * 0.15, 1],
        [angle + pitch * 0.24, 72 / 88],
        [angle + pitch * 0.5, 72 / 88],
      ];

      for (const [pointAngle, radius] of points) {
        const x = Math.cos(pointAngle) * radius;
        const y = Math.sin(pointAngle) * radius;

        if (index === 0 && pointAngle === points[0][0]) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
    }

    const hole = new Path();

    hole.absellipse(0, 0, 12 / 44, 12 / 44, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    shape.closePath();

    return shape;
  };

  const gearBodyGeometry = new ExtrudeGeometry(makeGearShape(), {
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.035,
    depth: gearDepth,
    steps: 1,
  });
  gearBodyGeometry.computeVertexNormals();
  const gearOuterRingGeometry = new RingGeometry(0.5, 0.78, 96);
  const gearInnerRingGeometry = new RingGeometry(12 / 44, 0.44, 96);
  const gearGrooveGeometry = new RingGeometry(0.47, 0.49, 96);
  const gearBodyMaterial = new MeshStandardMaterial({
    color: gearPickupColors.body,
    emissive: gearPickupColors.bodyEmissive,
    emissiveIntensity: 0.18,
    metalness: 0.34,
    opacity: 1,
    roughness: 0.28,
    transparent: true,
  });
  const gearOuterRingMaterial = new MeshStandardMaterial({
    color: gearPickupColors.outerRing,
    metalness: 0.28,
    opacity: 1,
    roughness: 0.22,
    transparent: true,
  });
  const gearInnerRingMaterial = new MeshStandardMaterial({
    color: gearPickupColors.innerRing,
    metalness: 0.32,
    opacity: 1,
    roughness: 0.24,
    transparent: true,
  });
  const gearGrooveMaterial = new MeshBasicMaterial({
    color: gearPickupColors.groove,
    opacity: 0.8,
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

  const gearScale = $derived(pickup.radius * 1.18 * spawnScale);
  const gearFloat = $derived(
    Math.sin(animationNow * 0.0014 + pickup.createdAt) * 0.025
  );
  const gearTilt = $derived(
    Math.sin(animationNow * 0.0011 + pickup.createdAt) * 0.055
  );
  const gearY = $derived(-pickup.position[1] + 0.22 + gearFloat);

  $effect(() => {
    gearBodyMaterial.opacity = spawnEase;
    gearOuterRingMaterial.opacity = spawnEase;
    gearInnerRingMaterial.opacity = spawnEase;
    gearGrooveMaterial.opacity = spawnEase * 0.8;
  });
</script>

<T.Group
  position={[0, gearY, 0]}
  rotation={[-Math.PI / 2 + gearTilt, 0, 0]}
  scale={[gearScale, gearScale, gearScale]}
>
  <T.Mesh
    castShadow={false}
    geometry={gearBodyGeometry}
    material={gearBodyMaterial}
  />
  <T.Mesh
    geometry={gearOuterRingGeometry}
    material={gearOuterRingMaterial}
    position={[0, 0, gearDepth + 0.01]}
  />
  <T.Mesh
    geometry={gearInnerRingGeometry}
    material={gearInnerRingMaterial}
    position={[0, 0, gearDepth + 0.02]}
  />
  <T.Mesh
    geometry={gearGrooveGeometry}
    material={gearGrooveMaterial}
    position={[0, 0, gearDepth + 0.03]}
  />
</T.Group>
