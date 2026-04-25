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
</script>

<T.Group
  position={[0, keyY, 0]}
  rotation={[0.18, keySpin, Math.PI / 2]}
  scale={[keyScale, keyScale, keyScale]}
>
  <T.PointLight
    color="#8fffee"
    distance={4.6}
    intensity={spawnEase * (0.9 + keyPulse * 0.75)}
    position={[0, 0, 0.2]}
  />

  <T.Mesh renderOrder={10} scale={[1.22, 1.22, 1.22]}>
    <T.TorusGeometry args={[0.42, 0.055, 12, 32]} />
    <T.MeshBasicMaterial
      color="#72ffe7"
      opacity={spawnEase * 0.28}
      transparent
    />
  </T.Mesh>

  <T.Mesh castShadow receiveShadow>
    <T.TorusGeometry args={[0.36, 0.075, 12, 36]} />
    <T.MeshStandardMaterial
      color="#d8c276"
      emissive="#3b2206"
      emissiveIntensity={0.26}
      metalness={0.78}
      opacity={spawnEase}
      roughness={0.26}
      transparent
    />
  </T.Mesh>

  <T.Mesh castShadow receiveShadow position={[0.78, 0, 0]}>
    <T.BoxGeometry args={[1.18, 0.16, 0.16]} />
    <T.MeshStandardMaterial
      color="#c78f3e"
      emissive="#2e1402"
      emissiveIntensity={0.18}
      metalness={0.82}
      opacity={spawnEase}
      roughness={0.24}
      transparent
    />
  </T.Mesh>

  {#each [0.98, 1.24] as x}
    <T.Mesh castShadow receiveShadow position={[x, -0.18, 0]}>
      <T.BoxGeometry args={[0.14, 0.46, 0.15]} />
      <T.MeshStandardMaterial
        color="#d7a856"
        emissive="#311704"
        emissiveIntensity={0.2}
        metalness={0.84}
        opacity={spawnEase}
        roughness={0.24}
        transparent
      />
    </T.Mesh>
  {/each}

  <T.Mesh position={[0.16, 0, 0.04]}>
    <T.SphereGeometry args={[0.13, 16, 10]} />
    <T.MeshBasicMaterial
      color="#9fffee"
      opacity={spawnEase * (0.58 + keyPulse * 0.28)}
      transparent
    />
  </T.Mesh>
</T.Group>
