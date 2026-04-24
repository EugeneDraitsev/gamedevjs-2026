<script lang="ts">
  import { T } from "@threlte/core";
  import { DoubleSide } from "three";

  let {
    active,
    animationNow,
    openAmount,
  }: {
    active: boolean;
    animationNow: number;
    openAmount: number;
  } = $props();

  const visibleAmount = $derived(
    active ? Math.max(0, Math.min(1, openAmount)) : 0
  );
  const visibleScale = $derived(Math.max(0.001, visibleAmount));
  const easedOpen = $derived(visibleAmount * visibleAmount);
  const pulse = $derived(0.82 + Math.sin(animationNow * 0.006) * 0.18);
</script>

<T.Group position={[0, 2.18, -7.22]}>
  <T.Mesh
    renderOrder={6}
    scale={[
      visibleScale * (0.95 + easedOpen * 0.42),
      visibleScale * (1.28 + easedOpen * 0.46),
      1,
    ]}
  >
    <T.CircleGeometry args={[1, 72]} />
    <T.MeshBasicMaterial
      color="#020816"
      depthWrite={false}
      opacity={visibleAmount * (0.36 + visibleAmount * 0.42)}
      side={DoubleSide}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    renderOrder={7}
    scale={[
      visibleScale * (1.02 + easedOpen * 0.46),
      visibleScale * (1.36 + easedOpen * 0.5),
      1,
    ]}
  >
    <T.RingGeometry args={[0.82, 1, 72]} />
    <T.MeshBasicMaterial
      color="#7dd3fc"
      depthWrite={false}
      opacity={visibleAmount * (0.36 + pulse * 0.34)}
      side={DoubleSide}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    renderOrder={8}
    rotation={[0, 0, -animationNow * 0.0018]}
    scale={[
      visibleScale * (1.18 + easedOpen * 0.52),
      visibleScale * (1.58 + easedOpen * 0.58),
      1,
    ]}
  >
    <T.RingGeometry args={[0.94, 1, 72]} />
    <T.MeshBasicMaterial
      color="#fbbf24"
      depthWrite={false}
      opacity={visibleAmount * (0.18 + pulse * 0.24)}
      side={DoubleSide}
      transparent
    />
  </T.Mesh>

  <T.PointLight
    color="#7dd3fc"
    distance={5.8}
    intensity={visibleAmount * (1.25 + pulse * 0.7)}
    position={[0, 0.02, 0.6]}
  />

  {#each [-1, 1] as side}
    <T.Mesh
      castShadow={visibleAmount > 0.02}
      receiveShadow={visibleAmount > 0.02}
      position={[
        side * (0.72 + easedOpen * 0.78),
        -0.06,
        0.02,
      ]}
      rotation={[0, 0, side * easedOpen * 0.08]}
      scale={[visibleScale, visibleScale, visibleScale]}
    >
      <T.BoxGeometry args={[0.34, 2.82, 0.16]} />
      <T.MeshStandardMaterial
        color="#31424b"
        emissive="#0e2633"
        emissiveIntensity={visibleAmount * 0.16}
        metalness={0.64}
        opacity={visibleAmount * Math.max(0.18, 1 - easedOpen * 0.28)}
        roughness={0.42}
        transparent
      />
    </T.Mesh>
  {/each}

  <T.Mesh
    castShadow={visibleAmount > 0.02}
    receiveShadow={visibleAmount > 0.02}
    position={[0, 1.5 + easedOpen * 0.52, 0.02]}
    scale={[
      visibleScale,
      visibleScale * Math.max(0.18, 1 - easedOpen * 0.42),
      visibleScale,
    ]}
  >
    <T.BoxGeometry args={[2.3, 0.24, 0.18]} />
    <T.MeshStandardMaterial
      color="#7b5430"
      emissive="#3d2110"
      emissiveIntensity={visibleAmount * 0.12}
      metalness={0.72}
      opacity={visibleAmount}
      roughness={0.32}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    renderOrder={5}
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, -2.08, 0.72]}
    scale={[
      visibleScale * (0.52 + easedOpen * 0.45),
      visibleScale * (0.8 + easedOpen * 0.2),
      1,
    ]}
  >
    <T.RingGeometry args={[0.72, 0.98, 64]} />
    <T.MeshBasicMaterial
      color="#7dd3fc"
      depthWrite={false}
      opacity={visibleAmount * 0.34}
      transparent
    />
  </T.Mesh>
</T.Group>
