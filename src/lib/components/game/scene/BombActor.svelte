<script module lang="ts">
  import {
    BoxGeometry,
    CircleGeometry,
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
  const bombDangerDiscGeometry = new CircleGeometry(1, 64);
  const bombRingGeometry = new RingGeometry(0.86, 1, 64);
  const bombInnerRingGeometry = new RingGeometry(0.34, 0.4, 48);
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
  const warningPulse = $derived(
    armed ? 0.5 + Math.sin(animationNow * 0.018) * 0.5 : 0.2 + armProgress * 0.8
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
    geometry={bombDangerDiscGeometry}
    position={[0, -bomb.position[1] + 0.052, 0]}
    renderOrder={8}
    rotation={[-Math.PI / 2, 0, 0]}
    scale={[
      bomb.explosionRadius * (0.98 + warningPulse * 0.05),
      bomb.explosionRadius * (0.98 + warningPulse * 0.05),
      1,
    ]}
  >
    <T.MeshBasicMaterial
      color={armed ? "#ff3b2f" : "#ff7a3d"}
      depthWrite={false}
      opacity={armed ? 0.26 + warningPulse * 0.14 : 0.12 + armProgress * 0.12}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    geometry={bombRingGeometry}
    position={[0, -bomb.position[1] + 0.06, 0]}
    renderOrder={9}
    rotation={[-Math.PI / 2, 0, 0]}
    scale={[bomb.explosionRadius * pulse, bomb.explosionRadius * pulse, 1]}
  >
    <T.MeshBasicMaterial
      color={armed ? "#fff0b0" : bomb.color}
      depthWrite={false}
      opacity={armed ? 0.92 : 0.46 + armProgress * 0.2}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    geometry={bombInnerRingGeometry}
    position={[0, -bomb.position[1] + 0.066, 0]}
    renderOrder={10}
    rotation={[-Math.PI / 2, 0, animationNow * 0.004]}
    scale={[
      bomb.explosionRadius * (0.92 + warningPulse * 0.18),
      bomb.explosionRadius * (0.92 + warningPulse * 0.18),
      1,
    ]}
  >
    <T.MeshBasicMaterial
      color="#ffcf5b"
      depthWrite={false}
      opacity={armed ? 0.72 : 0.24 + armProgress * 0.18}
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
