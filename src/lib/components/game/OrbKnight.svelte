<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { GreaterDepth, type Group } from "three";

  interface Props {
    autoRotate?: boolean;
    hitFlash?: number;
    scale?: number;
  }

  let { scale = 1, autoRotate = true, hitFlash = 0 }: Props = $props();

  let root = $state.raw<Group>();

  const rivets: [number, number, number][] = [
    [-0.64, 0.34, 0.75],
    [-0.48, -0.3, 0.82],
    [0.5, 0.38, 0.78],
    [0.64, -0.18, 0.74],
    [0.05, -0.68, 0.72],
  ];

  let time = 0;

  const bodyColor = $derived(hitFlash > 0.05 ? "#ff8b6b" : "#8f6424");
  const bodyEmissive = $derived(hitFlash > 0.05 ? "#ff4020" : "#120900");
  const bodyEmissiveIntensity = $derived(
    hitFlash > 0.05 ? 0.6 + hitFlash * 0.8 : 0.25
  );

  useTask((delta) => {
    time += delta;

    if (autoRotate && root) {
      root.rotation.y += delta * 0.25;
      root.position.y = Math.sin(time * 1.8) * 0.045;
    }
  });
</script>

<T.Group
  bind:ref={root}
  rotation={[0, autoRotate ? -0.28 : 0, 0]}
  scale={[scale, scale, scale]}
>
  <!-- Main brass orb body -->
  <T.Mesh renderOrder={30} scale={[1.08, 1.08, 1.08]}>
    <T.SphereGeometry args={[1, 32, 16]} />
    <T.MeshBasicMaterial
      color="#f4fbff"
      depthFunc={GreaterDepth}
      opacity={0.2}
      transparent
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh castShadow receiveShadow>
    <T.SphereGeometry args={[1, 72, 36]} />
    <T.MeshStandardMaterial
      color={bodyColor}
      metalness={0.95}
      roughness={0.42}
      emissive={bodyEmissive}
      emissiveIntensity={bodyEmissiveIntensity}
    />
  </T.Mesh>

  <!-- Outer armor seams -->
  <T.Mesh rotation={[Math.PI / 2, 0, 0]}>
    <T.TorusGeometry args={[1.01, 0.018, 10, 96]} />
    <T.MeshStandardMaterial color="#d39a38" metalness={1} roughness={0.35} />
  </T.Mesh>

  <T.Mesh rotation={[0, Math.PI / 2, 0]}>
    <T.TorusGeometry args={[1.012, 0.012, 10, 96]} />
    <T.MeshStandardMaterial color="#3a2412" metalness={0.8} roughness={0.55} />
  </T.Mesh>

  <T.Mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
    <T.TorusGeometry args={[1.014, 0.012, 10, 96]} />
    <T.MeshStandardMaterial color="#3a2412" metalness={0.8} roughness={0.55} />
  </T.Mesh>

  <!-- Front sensor socket -->
  <T.Mesh position={[0, 0.22, 0.965]} rotation={[Math.PI / 2, 0, 0]} castShadow>
    <T.CylinderGeometry args={[0.31, 0.31, 0.055, 40]} />
    <T.MeshStandardMaterial color="#15120f" metalness={0.7} roughness={0.35} />
  </T.Mesh>

  <!-- Blue eye lens -->
  <T.Mesh position={[0, 0.22, 1.003]} rotation={[Math.PI / 2, 0, 0]}>
    <T.CylinderGeometry args={[0.19, 0.19, 0.035, 40]} />
    <T.MeshBasicMaterial color="#8ff7ff" toneMapped={false} />
  </T.Mesh>

  <!-- Small eye glow -->
  <T.PointLight
    color="#7befff"
    intensity={0.9}
    distance={2.4}
    position={[0, 0.22, 1.08]}
  />

  <!-- Scratches and cracks on the shell -->
  <T.Mesh
    position={[-0.28, 0.6, 0.82]}
    rotation={[0.42, -0.18, -0.75]}
    scale={[0.018, 0.34, 0.018]}
  >
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial color="#16100b" roughness={0.8} />
  </T.Mesh>

  <T.Mesh
    position={[-0.15, 0.43, 0.93]}
    rotation={[0.18, 0.1, 0.35]}
    scale={[0.014, 0.23, 0.018]}
  >
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial color="#15100b" roughness={0.8} />
  </T.Mesh>

  <T.Mesh
    position={[0.34, -0.18, 0.88]}
    rotation={[-0.25, 0.16, -0.5]}
    scale={[0.014, 0.29, 0.018]}
  >
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial color="#18110b" roughness={0.8} />
  </T.Mesh>

  <!-- Rivets around front armor -->
  {#each rivets as rivet}
    <T.Mesh position={rivet} castShadow>
      <T.SphereGeometry args={[0.045, 14, 10]} />
      <T.MeshStandardMaterial color="#c28b31" metalness={1} roughness={0.32} />
    </T.Mesh>
  {/each}
</T.Group>
