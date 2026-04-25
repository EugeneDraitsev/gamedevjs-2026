<script lang="ts">
  import { T } from "@threlte/core";

  let {
    animationNow,
    position = [0, 0, -5.5] as [number, number, number],
    rotationY = 0,
  }: {
    animationNow: number;
    position?: [number, number, number];
    rotationY?: number;
  } = $props();

  const bob = $derived(Math.sin(animationNow / 540) * 0.06);
  const eyePulse = $derived(0.85 + Math.sin(animationNow / 220) * 0.18);
  const coinSpin = $derived((animationNow / 1100) % (Math.PI * 2));
  const coinBob = $derived(Math.sin(animationNow / 460) * 0.05);
</script>

<T.Group
  position={[position[0], position[1], position[2]]}
  rotation={[0, rotationY, 0]}
>
  <!-- Stand / pedestal -->
  <T.Mesh castShadow position={[0, 0.18, 0]} receiveShadow>
    <T.CylinderGeometry args={[0.92, 1.05, 0.36, 12]} />
    <T.MeshStandardMaterial color="#1a1612" metalness={0.55} roughness={0.5} />
  </T.Mesh>

  <T.Mesh position={[0, 0.4, 0]}>
    <T.CylinderGeometry args={[0.78, 0.78, 0.08, 12]} />
    <T.MeshStandardMaterial
      color="#7c5a24"
      emissive="#3a2a10"
      emissiveIntensity={0.42}
      metalness={0.85}
      roughness={0.32}
    />
  </T.Mesh>

  <!-- Body -->
  <T.Group position={[0, 1.05 + bob, 0]}>
    <T.Mesh castShadow>
      <T.CylinderGeometry args={[0.55, 0.7, 0.95, 8]} />
      <T.MeshStandardMaterial
        color="#5a4220"
        emissive="#1a1006"
        emissiveIntensity={0.18}
        metalness={0.85}
        roughness={0.4}
      />
    </T.Mesh>

    <!-- Brass band -->
    <T.Mesh position={[0, -0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <T.TorusGeometry args={[0.7, 0.05, 8, 24]} />
      <T.MeshStandardMaterial color="#d39a38" metalness={1} roughness={0.32} />
    </T.Mesh>

    <T.Mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <T.TorusGeometry args={[0.6, 0.04, 8, 24]} />
      <T.MeshStandardMaterial color="#d39a38" metalness={1} roughness={0.32} />
    </T.Mesh>

    <!-- Front display panel -->
    <T.Mesh position={[0, 0.05, 0.56]}>
      <T.BoxGeometry args={[0.62, 0.32, 0.04]} />
      <T.MeshStandardMaterial
        color="#0c0e14"
        emissive="#0a3340"
        emissiveIntensity={0.25}
        metalness={0.42}
        roughness={0.38}
      />
    </T.Mesh>

    <T.Mesh position={[0, 0.05, 0.585]}>
      <T.BoxGeometry args={[0.5, 0.22, 0.005]} />
      <T.MeshBasicMaterial color="#7befff" toneMapped={false} />
    </T.Mesh>

    <!-- Side rivets -->
    {#each [-0.62, 0.62] as side (side)}
      <T.Mesh castShadow position={[side, 0.1, 0]}>
        <T.SphereGeometry args={[0.07, 12, 10]} />
        <T.MeshStandardMaterial color="#c28b31" metalness={1} roughness={0.3} />
      </T.Mesh>
      <T.Mesh castShadow position={[side, -0.18, 0]}>
        <T.SphereGeometry args={[0.06, 12, 10]} />
        <T.MeshStandardMaterial color="#c28b31" metalness={1} roughness={0.3} />
      </T.Mesh>
    {/each}
  </T.Group>

  <!-- Head -->
  <T.Group position={[0, 1.78 + bob, 0]}>
    <T.Mesh castShadow>
      <T.SphereGeometry args={[0.42, 24, 18]} />
      <T.MeshStandardMaterial
        color="#8f6424"
        emissive="#1a0900"
        emissiveIntensity={0.22}
        metalness={0.95}
        roughness={0.38}
      />
    </T.Mesh>

    <!-- Eye socket -->
    <T.Mesh position={[0, 0.06, 0.395]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
      <T.MeshStandardMaterial
        color="#15120f"
        metalness={0.65}
        roughness={0.32}
      />
    </T.Mesh>

    <!-- Eye lens -->
    <T.Mesh position={[0, 0.06, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.11, 0.11, 0.02, 24]} />
      <T.MeshBasicMaterial color="#ffd16a" toneMapped={false} />
    </T.Mesh>
    <T.PointLight
      color="#ffc26a"
      distance={2.1}
      intensity={eyePulse * 1.15}
      position={[0, 0.06, 0.5]}
    />

    <!-- Top hat brim -->
    <T.Mesh castShadow position={[0, 0.4, 0]}>
      <T.CylinderGeometry args={[0.46, 0.46, 0.06, 18]} />
      <T.MeshStandardMaterial
        color="#161108"
        metalness={0.65}
        roughness={0.55}
      />
    </T.Mesh>
    <T.Mesh castShadow position={[0, 0.6, 0]}>
      <T.CylinderGeometry args={[0.32, 0.34, 0.32, 18]} />
      <T.MeshStandardMaterial
        color="#161108"
        metalness={0.65}
        roughness={0.55}
      />
    </T.Mesh>
    <T.Mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <T.TorusGeometry args={[0.36, 0.025, 8, 18]} />
      <T.MeshStandardMaterial color="#d39a38" metalness={1} roughness={0.3} />
    </T.Mesh>
  </T.Group>

  <!-- Floating coin / gear over head -->
  <T.Group position={[0, 2.78 + coinBob, 0]} rotation={[0, coinSpin, 0]}>
    <T.Mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.18, 0.18, 0.04, 24]} />
      <T.MeshStandardMaterial
        color="#f7c66b"
        emissive="#f7c66b"
        emissiveIntensity={0.65}
        metalness={1}
        roughness={0.2}
      />
    </T.Mesh>
    <T.Mesh scale={[1.6, 1.6, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.18, 0.18, 0.005, 24]} />
      <T.MeshBasicMaterial
        color="#ffd99a"
        depthWrite={false}
        opacity={0.18}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  </T.Group>
</T.Group>
