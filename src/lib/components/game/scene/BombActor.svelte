<script module lang="ts">
  import {
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    RingGeometry,
    SphereGeometry,
  } from "three";

  const bombBodyGeometry = new SphereGeometry(1, 20, 20);
  const bombFuseGeometry = new CylinderGeometry(0.12, 0.18, 1, 8);
  const bombFuseCapGeometry = new SphereGeometry(0.22, 10, 10);
  const bombSparkGeometry = new ConeGeometry(0.22, 0.36, 8);
  const bombRingGeometry = new RingGeometry(0.97, 1, 48);
  const bombArmBarGeometry = new BoxGeometry(1, 0.09, 0.05);
  const bombArmBackMaterial = new MeshBasicMaterial({
    color: "#09131f",
    opacity: 0.88,
    transparent: true,
  });
  const bombArmFillMaterial = new MeshBasicMaterial({ color: "#ffbf4d" });
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { ActiveBomb } from "$lib/types/game";

  interface Props {
    animationNow: number;
    bomb: ActiveBomb;
  }

  let { animationNow, bomb }: Props = $props();

  const armProgress = $derived.by(() => {
    const total = bomb.armAt - bomb.spawnedAt;

    if (total <= 0) {
      return 1;
    }

    return Math.max(0, Math.min(1, (animationNow - bomb.spawnedAt) / total));
  });
  const armed = $derived(animationNow >= bomb.armAt);
  const pulse = $derived(
    armed ? 0.88 + Math.sin(animationNow * 0.012) * 0.1 : 1
  );
  const hitFlash = $derived(animationNow - bomb.lastHitAt < 130);
  const sparkScale = $derived(
    armed
      ? 1.15 + Math.sin(animationNow * 0.028) * 0.35
      : 0.4 + armProgress * 0.6
  );
  const bodyColor = $derived(hitFlash ? "#fff4da" : "#1a1420");
  const fuseHeight = $derived(bomb.radius * 0.9);
</script>

<T.Group position={bomb.position}>
  <T.Mesh
    geometry={bombRingGeometry}
    position={[0, -bomb.position[1] + 0.03, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
    scale={[bomb.explosionRadius * pulse, bomb.explosionRadius * pulse, 1]}
  >
    <T.MeshBasicMaterial
      color={bomb.color}
      opacity={armed ? 0.7 : 0.26}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    geometry={bombBodyGeometry}
    castShadow
    scale={[bomb.radius, bomb.radius, bomb.radius]}
  >
    <T.MeshStandardMaterial
      color={bodyColor}
      emissive={bomb.color}
      emissiveIntensity={armed
        ? 0.26 + Math.sin(animationNow * 0.02) * 0.18
        : 0.08}
      metalness={0.62}
      roughness={0.32}
    />
  </T.Mesh>

  <T.Group position={[0, bomb.radius * 0.92, 0]}>
    <T.Mesh
      geometry={bombFuseGeometry}
      castShadow
      position={[0, fuseHeight / 2, 0]}
      scale={[bomb.radius * 0.6, fuseHeight, bomb.radius * 0.6]}
    >
      <T.MeshStandardMaterial
        color="#2a1d16"
        metalness={0.12}
        roughness={0.82}
      />
    </T.Mesh>

    <T.Mesh
      geometry={bombFuseCapGeometry}
      position={[0, fuseHeight + 0.02, 0]}
      scale={[bomb.radius, bomb.radius, bomb.radius]}
    >
      <T.MeshStandardMaterial
        color="#3a2a1c"
        metalness={0.16}
        roughness={0.6}
      />
    </T.Mesh>

    <T.Mesh
      geometry={bombSparkGeometry}
      position={[0, fuseHeight + bomb.radius * 0.46, 0]}
      scale={[
        bomb.radius * sparkScale,
        bomb.radius * sparkScale,
        bomb.radius * sparkScale,
      ]}
    >
      <T.MeshStandardMaterial
        color={armed ? "#ffe2a8" : bomb.color}
        emissive={armed ? "#ffb347" : bomb.color}
        emissiveIntensity={armed ? 1.6 : 0.6 + armProgress * 0.8}
        metalness={0.04}
        roughness={0.18}
        transparent
        opacity={0.92}
      />
    </T.Mesh>
  </T.Group>

  <T.Group position={[0, bomb.radius + 0.42, 0]}>
    <T.Mesh
      geometry={bombArmBarGeometry}
      material={bombArmBackMaterial}
      position={[0, 0, -0.02]}
      scale={[0.9, 1, 1]}
    />

    <T.Mesh
      geometry={bombArmBarGeometry}
      material={bombArmFillMaterial}
      position={[-0.45 * (1 - armProgress) * 0.9, 0, 0]}
      scale={[armProgress * 0.9, 1, 1]}
    />
  </T.Group>
</T.Group>
