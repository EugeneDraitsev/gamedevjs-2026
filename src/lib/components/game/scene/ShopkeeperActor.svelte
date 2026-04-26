<script module lang="ts">
  import {
    BoxGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    TorusGeometry,
  } from "three";

  const standGeometry = new CylinderGeometry(0.92, 1.05, 0.36, 12);
  const standTopGeometry = new CylinderGeometry(0.78, 0.78, 0.08, 12);
  const bodyGeometry = new CylinderGeometry(0.55, 0.7, 0.95, 8);
  const lowerBandGeometry = new TorusGeometry(0.7, 0.05, 8, 24);
  const upperBandGeometry = new TorusGeometry(0.6, 0.04, 8, 24);
  const panelFrameGeometry = new BoxGeometry(0.62, 0.32, 0.04);
  const panelGlowGeometry = new BoxGeometry(0.5, 0.22, 0.005);
  const rivetLargeGeometry = new SphereGeometry(0.07, 12, 10);
  const rivetSmallGeometry = new SphereGeometry(0.06, 12, 10);
  const headGeometry = new SphereGeometry(0.42, 24, 18);
  const eyeSocketGeometry = new CylinderGeometry(0.18, 0.18, 0.04, 24);
  const eyeLensGeometry = new CylinderGeometry(0.11, 0.11, 0.02, 24);
  const hatBrimGeometry = new CylinderGeometry(0.46, 0.46, 0.06, 18);
  const hatTopGeometry = new CylinderGeometry(0.32, 0.34, 0.32, 18);
  const hatBandGeometry = new TorusGeometry(0.36, 0.025, 8, 18);
  const coinGeometry = new CylinderGeometry(0.18, 0.18, 0.04, 24);
  const coinGlowGeometry = new CylinderGeometry(0.18, 0.18, 0.005, 24);
  const standMaterial = new MeshStandardMaterial({
    color: "#1a1612",
    metalness: 0.55,
    roughness: 0.5,
  });
  const standTopMaterial = new MeshStandardMaterial({
    color: "#7c5a24",
    emissive: "#3a2a10",
    emissiveIntensity: 0.42,
    metalness: 0.85,
    roughness: 0.32,
  });
  const bodyMaterial = new MeshStandardMaterial({
    color: "#5a4220",
    emissive: "#1a1006",
    emissiveIntensity: 0.18,
    metalness: 0.85,
    roughness: 0.4,
  });
  const brassMaterial = new MeshStandardMaterial({
    color: "#d39a38",
    metalness: 1,
    roughness: 0.32,
  });
  const panelFrameMaterial = new MeshStandardMaterial({
    color: "#0c0e14",
    emissive: "#0a3340",
    emissiveIntensity: 0.25,
    metalness: 0.42,
    roughness: 0.38,
  });
  const panelGlowMaterial = new MeshBasicMaterial({
    color: "#7befff",
    toneMapped: false,
  });
  const rivetMaterial = new MeshStandardMaterial({
    color: "#c28b31",
    metalness: 1,
    roughness: 0.3,
  });
  const headMaterial = new MeshStandardMaterial({
    color: "#8f6424",
    emissive: "#1a0900",
    emissiveIntensity: 0.22,
    metalness: 0.95,
    roughness: 0.38,
  });
  const eyeSocketMaterial = new MeshStandardMaterial({
    color: "#15120f",
    metalness: 0.65,
    roughness: 0.32,
  });
  const eyeLensMaterial = new MeshBasicMaterial({
    color: "#ffd16a",
    toneMapped: false,
  });
  const hatMaterial = new MeshStandardMaterial({
    color: "#161108",
    metalness: 0.65,
    roughness: 0.55,
  });
  const coinMaterial = new MeshStandardMaterial({
    color: "#f7c66b",
    emissive: "#f7c66b",
    emissiveIntensity: 0.65,
    metalness: 1,
    roughness: 0.2,
  });
  const coinGlowMaterial = new MeshBasicMaterial({
    color: "#ffd99a",
    depthWrite: false,
    opacity: 0.18,
    toneMapped: false,
    transparent: true,
  });
</script>

<script lang="ts">
  import { T } from "@threlte/core";

  let {
    animationNow,
    lightEnabled = true,
    position = [0, 0, -5.5] as [number, number, number],
    rotationY = 0,
  }: {
    animationNow: number;
    lightEnabled?: boolean;
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
  <T.Mesh
    castShadow
    geometry={standGeometry}
    material={standMaterial}
    position={[0, 0.18, 0]}
    receiveShadow
  />

  <T.Mesh
    geometry={standTopGeometry}
    material={standTopMaterial}
    position={[0, 0.4, 0]}
  />

  <!-- Body -->
  <T.Group position={[0, 1.05 + bob, 0]}>
    <T.Mesh castShadow geometry={bodyGeometry} material={bodyMaterial} />

    <!-- Brass band -->
    <T.Mesh
      geometry={lowerBandGeometry}
      material={brassMaterial}
      position={[0, -0.34, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    />

    <T.Mesh
      geometry={upperBandGeometry}
      material={brassMaterial}
      position={[0, 0.3, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    />

    <!-- Front display panel -->
    <T.Mesh
      geometry={panelFrameGeometry}
      material={panelFrameMaterial}
      position={[0, 0.05, 0.56]}
    />

    <T.Mesh
      geometry={panelGlowGeometry}
      material={panelGlowMaterial}
      position={[0, 0.05, 0.585]}
    />

    <!-- Side rivets -->
    {#each [-0.62, 0.62] as side (side)}
      <T.Mesh
        castShadow
        geometry={rivetLargeGeometry}
        material={rivetMaterial}
        position={[side, 0.1, 0]}
      />
      <T.Mesh
        castShadow
        geometry={rivetSmallGeometry}
        material={rivetMaterial}
        position={[side, -0.18, 0]}
      />
    {/each}
  </T.Group>

  <!-- Head -->
  <T.Group position={[0, 1.78 + bob, 0]}>
    <T.Mesh castShadow geometry={headGeometry} material={headMaterial} />

    <!-- Eye socket -->
    <T.Mesh
      geometry={eyeSocketGeometry}
      material={eyeSocketMaterial}
      position={[0, 0.06, 0.395]}
      rotation={[Math.PI / 2, 0, 0]}
    />

    <!-- Eye lens -->
    <T.Mesh
      geometry={eyeLensGeometry}
      material={eyeLensMaterial}
      position={[0, 0.06, 0.42]}
      rotation={[Math.PI / 2, 0, 0]}
    />
    {#if lightEnabled}
      <T.PointLight
        color="#ffc26a"
        distance={2.1}
        intensity={eyePulse * 1.15}
        position={[0, 0.06, 0.5]}
      />
    {/if}

    <!-- Top hat brim -->
    <T.Mesh
      castShadow
      geometry={hatBrimGeometry}
      material={hatMaterial}
      position={[0, 0.4, 0]}
    />
    <T.Mesh
      castShadow
      geometry={hatTopGeometry}
      material={hatMaterial}
      position={[0, 0.6, 0]}
    />
    <T.Mesh
      geometry={hatBandGeometry}
      material={brassMaterial}
      position={[0, 0.46, 0]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  </T.Group>

  <!-- Floating coin / gear over head -->
  <T.Group position={[0, 2.78 + coinBob, 0]} rotation={[0, coinSpin, 0]}>
    <T.Mesh
      castShadow
      geometry={coinGeometry}
      material={coinMaterial}
      rotation={[Math.PI / 2, 0, 0]}
    />
    <T.Mesh
      geometry={coinGlowGeometry}
      material={coinGlowMaterial}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[1.6, 1.6, 1.6]}
    />
  </T.Group>
</T.Group>
