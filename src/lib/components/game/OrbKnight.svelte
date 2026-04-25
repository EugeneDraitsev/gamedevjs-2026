<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import {
    AdditiveBlending,
    DoubleSide,
    GreaterDepth,
    type Group,
  } from "three";
  import { getMachineVisualState } from "$lib/config/machine-module-visuals";
  import {
    createDefaultMachineLoadout,
    type MachineLoadout,
    type MachineSlotId,
  } from "$lib/config/machine-modules";
  import { createHolographicAxeBladeShape } from "$lib/game/holographic-axe";

  interface Props {
    autoRotate?: boolean;
    highlightedSlotId?: MachineSlotId | null;
    hitFlash?: number;
    machineLoadout?: MachineLoadout;
    scale?: number;
    showAttachments?: boolean;
    showWeaponAttachment?: boolean;
  }

  const defaultLoadout = createDefaultMachineLoadout();
  const rivets: [number, number, number][] = [
    [-0.64, 0.34, 0.75],
    [-0.48, -0.3, 0.82],
    [0.5, 0.38, 0.78],
    [0.64, -0.18, 0.74],
    [0.05, -0.68, 0.72],
  ];
  const axeBladeShape = createHolographicAxeBladeShape();

  let {
    scale = 1,
    autoRotate = true,
    hitFlash = 0,
    highlightedSlotId = null,
    machineLoadout = defaultLoadout,
    showAttachments = true,
    showWeaponAttachment = true,
  }: Props = $props();

  let root = $state.raw<Group>();
  let time = 0;

  const visual = $derived(getMachineVisualState(machineLoadout));
  const attackHighlighted = $derived(highlightedSlotId === "attack");
  const bodyHighlighted = $derived(highlightedSlotId === "body");
  const utilityHighlighted = $derived(
    highlightedSlotId === "utility-a" || highlightedSlotId === "utility-b"
  );
  const swordHighlighted = $derived(highlightedSlotId === "utility-c");

  const bodyColor = $derived(hitFlash > 0.05 ? "#ff8b6b" : visual.body.color);
  const bodyEmissive = $derived(
    hitFlash > 0.05 ? "#ff4020" : visual.body.emissive
  );
  const bodyEmissiveIntensity = $derived(
    hitFlash > 0.05
      ? 0.6 + hitFlash * 0.8
      : visual.body.emissiveIntensity + (bodyHighlighted ? 0.22 : 0)
  );
  const bodyGlowOpacity = $derived(
    Math.min(0.34, visual.body.glowOpacity + (bodyHighlighted ? 0.16 : 0))
  );
  const eyeLightIntensity = $derived(attackHighlighted ? 2.2 : 1.05);
  const swordLightIntensity = $derived.by(() => {
    if (!(visual.utilities.reflector || visual.utilities.axe)) {
      return 0;
    }

    return swordHighlighted ? 2.25 : 1.05;
  });
  const utilityLightIntensity = $derived(utilityHighlighted ? 1.5 : 0.45);

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
  <T.Mesh renderOrder={30} scale={[1.09, 1.09, 1.09]}>
    <T.SphereGeometry args={[1, 32, 16]} />
    <T.MeshBasicMaterial
      color={visual.body.glow}
      depthFunc={GreaterDepth}
      opacity={bodyGlowOpacity}
      transparent
      depthWrite={false}
    />
  </T.Mesh>

  <T.Mesh castShadow receiveShadow>
    <T.SphereGeometry args={[1, 72, 36]} />
    <T.MeshStandardMaterial
      color={bodyColor}
      metalness={0.95}
      roughness={visual.body.armor === "plate" ? 0.34 : 0.42}
      emissive={bodyEmissive}
      emissiveIntensity={bodyEmissiveIntensity}
    />
  </T.Mesh>

  <T.Mesh rotation={[Math.PI / 2, 0, 0]}>
    <T.TorusGeometry args={[1.01, 0.018, 10, 96]} />
    <T.MeshStandardMaterial
      color={visual.body.seam}
      metalness={1}
      roughness={0.35}
    />
  </T.Mesh>

  <T.Mesh rotation={[0, Math.PI / 2, 0]}>
    <T.TorusGeometry args={[1.012, 0.012, 10, 96]} />
    <T.MeshStandardMaterial
      color={visual.body.seamDark}
      metalness={0.8}
      roughness={0.55}
    />
  </T.Mesh>

  <T.Mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
    <T.TorusGeometry args={[1.014, 0.012, 10, 96]} />
    <T.MeshStandardMaterial
      color={visual.body.seamDark}
      metalness={0.8}
      roughness={0.55}
    />
  </T.Mesh>

  {#if visual.body.armor === "plate"}
    <T.Mesh position={[-0.42, 0.24, 0.9]} rotation={[0.38, -0.22, -0.42]}>
      <T.BoxGeometry args={[0.42, 0.12, 0.035]} />
      <T.MeshStandardMaterial
        color="#d4dde6"
        metalness={0.95}
        roughness={0.32}
      />
    </T.Mesh>
    <T.Mesh position={[0.38, -0.18, 0.91]} rotation={[-0.28, 0.2, 0.46]}>
      <T.BoxGeometry args={[0.44, 0.12, 0.035]} />
      <T.MeshStandardMaterial
        color="#4b5563"
        metalness={0.9}
        roughness={0.42}
      />
    </T.Mesh>
  {/if}

  <T.Mesh position={[0, 0.22, 0.965]} rotation={[Math.PI / 2, 0, 0]} castShadow>
    <T.CylinderGeometry args={[0.31, 0.31, 0.055, 40]} />
    <T.MeshStandardMaterial
      color={visual.eye.socket}
      emissive={attackHighlighted ? visual.eye.glow : "#000000"}
      emissiveIntensity={attackHighlighted ? 0.38 : 0}
      metalness={0.7}
      roughness={0.35}
    />
  </T.Mesh>

  <T.Mesh
    position={[0, 0.22, 1.004]}
    rotation={[Math.PI / 2, 0, 0]}
    scale={[visual.eye.xScale, visual.eye.yScale, 1]}
  >
    <T.CylinderGeometry args={[0.19, 0.19, 0.035, 40]} />
    <T.MeshBasicMaterial
      blending={AdditiveBlending}
      color={visual.eye.lens}
      opacity={attackHighlighted ? 1 : 0.88}
      toneMapped={false}
      transparent
    />
  </T.Mesh>

  {#if visual.eye.mode === "splitter"}
    {#each [-0.16, 0, 0.16] as lensOffset}
      <T.Mesh
        position={[lensOffset, 0.06, 1.045]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <T.CylinderGeometry args={[0.045, 0.045, 0.025, 18]} />
        <T.MeshBasicMaterial color={visual.eye.glow} toneMapped={false} />
      </T.Mesh>
    {/each}
  {:else if visual.eye.mode === "lance"}
    <T.Mesh position={[0, 0.22, 1.13]} rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.055, 0.12, 0.26, 28]} />
      <T.MeshStandardMaterial
        color="#211018"
        emissive={visual.eye.glow}
        emissiveIntensity={0.28}
        metalness={0.8}
        roughness={0.28}
      />
    </T.Mesh>
  {/if}

  <T.PointLight
    color={visual.eye.glow}
    intensity={eyeLightIntensity}
    distance={2.7}
    position={[0, 0.22, 1.08]}
  />

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

  {#each rivets as rivet}
    <T.Mesh position={rivet} castShadow>
      <T.SphereGeometry args={[0.045, 14, 10]} />
      <T.MeshStandardMaterial
        color={visual.body.armor === "plate" ? "#d6dde5" : "#c28b31"}
        metalness={1}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  {#if showAttachments && visual.utilities.ammoHopper}
    <T.Group position={[-0.24, 0.9, 0.2]} rotation={[0.1, 0.2, -0.18]}>
      <T.Mesh castShadow>
        <T.CylinderGeometry args={[0.19, 0.28, 0.34, 6]} />
        <T.MeshStandardMaterial
          color="#d6a14a"
          metalness={0.9}
          roughness={0.36}
        />
      </T.Mesh>
      <T.Mesh position={[0, -0.28, 0]}>
        <T.CylinderGeometry args={[0.09, 0.13, 0.26, 16]} />
        <T.MeshStandardMaterial
          color="#31200d"
          metalness={0.7}
          roughness={0.42}
        />
      </T.Mesh>
    </T.Group>
  {/if}

  {#if showAttachments && visual.utilities.overclock}
    <T.Mesh rotation={[Math.PI / 2, 0.35, 0.5]}>
      <T.TorusGeometry args={[1.09, 0.018, 8, 96]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#c084fc"
        opacity={0.78}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
    <T.PointLight
      color="#a855f7"
      distance={3.4}
      intensity={utilityLightIntensity}
      position={[0.2, 0.65, 1.05]}
    />
  {/if}

  {#if showAttachments && visual.utilities.magnet}
    <T.Group position={[-0.78, -0.18, 0.55]} rotation={[0.24, 0.42, -0.2]}>
      <T.Mesh>
        <T.TorusGeometry args={[0.24, 0.035, 12, 34, Math.PI * 1.45]} />
        <T.MeshStandardMaterial
          color="#2dd4bf"
          emissive="#0f766e"
          emissiveIntensity={utilityHighlighted ? 0.5 : 0.18}
          metalness={0.85}
          roughness={0.28}
        />
      </T.Mesh>
      <T.Mesh position={[-0.13, -0.17, 0]}>
        <T.BoxGeometry args={[0.12, 0.1, 0.1]} />
        <T.MeshStandardMaterial
          color="#e5e7eb"
          metalness={0.9}
          roughness={0.3}
        />
      </T.Mesh>
      <T.Mesh position={[0.13, -0.17, 0]}>
        <T.BoxGeometry args={[0.12, 0.1, 0.1]} />
        <T.MeshStandardMaterial
          color="#e5e7eb"
          metalness={0.9}
          roughness={0.3}
        />
      </T.Mesh>
    </T.Group>
  {/if}

  {#if showAttachments && showWeaponAttachment && visual.utilities.reflector}
    <T.Group
      position={[1.12, -0.9, 0.7]}
      rotation={[0.02, -0.12, -0.05]}
      scale={[0.82, 0.82, 0.82]}
    >
      <T.Mesh castShadow position={[0, 0.16, 0]}>
        <T.CylinderGeometry args={[0.045, 0.045, 0.38, 16]} />
        <T.MeshStandardMaterial
          color="#17110c"
          metalness={0.8}
          roughness={0.45}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0.4, 0]}>
        <T.CylinderGeometry args={[0.04, 0.04, 0.52, 16]} />
        <T.MeshStandardMaterial
          color="#f5c869"
          emissive="#f59e0b"
          emissiveIntensity={swordHighlighted ? 0.34 : 0.12}
          metalness={1}
          roughness={0.3}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0.64, 0]} scale={[0.42, 0.055, 0.07]}>
        <T.BoxGeometry args={[1, 1, 1]} />
        <T.MeshStandardMaterial
          color="#d19a38"
          metalness={1}
          roughness={0.28}
        />
      </T.Mesh>

      <T.Mesh position={[0, 1.27, 0]}>
        <T.CylinderGeometry args={[0.024, 0.064, 1.24, 20]} />
        <T.MeshStandardMaterial
          color="#d9f5f8"
          emissive="#0b2b34"
          emissiveIntensity={swordHighlighted ? 0.16 : 0.04}
          metalness={0.28}
          roughness={0.22}
        />
      </T.Mesh>

      <T.Mesh position={[0, 1.27, 0]}>
        <T.CylinderGeometry args={[0.09, 0.14, 1.34, 24]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#56efff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.34 : 0.16}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0, 1.99, 0]}>
        <T.ConeGeometry args={[0.058, 0.2, 20]} />
        <T.MeshStandardMaterial
          color="#d9f5f8"
          emissive="#0b2b34"
          emissiveIntensity={swordHighlighted ? 0.14 : 0.04}
          metalness={0.22}
          roughness={0.24}
        />
      </T.Mesh>

      <T.PointLight
        color="#62f4ff"
        decay={1.8}
        distance={3.2}
        intensity={swordLightIntensity}
        position={[0, 1.38, 0.04]}
      />
    </T.Group>
  {/if}

  {#if showAttachments && showWeaponAttachment && visual.utilities.axe}
    <T.Group
      position={[1.14, -0.92, 0.72]}
      rotation={[0.04, -0.16, -0.1]}
      scale={[0.82, 0.82, 0.82]}
    >
      <T.Mesh castShadow position={[0, 0.16, 0]}>
        <T.CylinderGeometry args={[0.05, 0.05, 0.32, 16]} />
        <T.MeshStandardMaterial
          color="#17110c"
          metalness={0.8}
          roughness={0.45}
        />
      </T.Mesh>

      <T.Mesh position={[0, 0.86, 0]}>
        <T.CylinderGeometry args={[0.034, 0.046, 1.24, 8]} />
        <T.MeshBasicMaterial
          color="#eaffff"
          opacity={swordHighlighted ? 0.78 : 0.52}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0, 0.86, 0]}>
        <T.CylinderGeometry args={[0.08, 0.12, 1.28, 12]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#56efff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.3 : 0.15}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0, 1.3, 0]}>
        <T.CylinderGeometry args={[0.08, 0.08, 0.14, 8]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#eaffff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.52 : 0.34}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0.02, 1.46, 0.03]} scale={[0.5, 0.48, 0.5]}>
        <T.ShapeGeometry args={[axeBladeShape, 8]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#5ee9ff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.54 : 0.32}
          side={DoubleSide}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0.02, 1.46, 0.06]} scale={[0.58, 0.55, 0.58]}>
        <T.ShapeGeometry args={[axeBladeShape, 8]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#eaffff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.26 : 0.14}
          side={DoubleSide}
          toneMapped={false}
          transparent
          wireframe
        />
      </T.Mesh>

      <T.Mesh position={[0, 1.5, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <T.CylinderGeometry args={[0.13, 0.16, 0.06, 8]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#eaffff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.58 : 0.36}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh
        position={[0, 1.5, 0.13]}
        rotation={[0, 0, Math.PI / 4]}
        scale={[0.1, 0.1, 0.035]}
      >
        <T.BoxGeometry args={[1, 1, 1]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#eaffff"
          depthWrite={false}
          opacity={swordHighlighted ? 0.7 : 0.42}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 1.14, 0]} scale={[0.32, 0.04, 0.055]}>
        <T.BoxGeometry args={[1, 1, 1]} />
        <T.MeshStandardMaterial
          color="#17110c"
          metalness={0.82}
          roughness={0.38}
        />
      </T.Mesh>

      <T.PointLight
        color="#62f4ff"
        decay={1.8}
        distance={3}
        intensity={swordLightIntensity}
        position={[0.28, 1.48, 0.06]}
      />
    </T.Group>
  {/if}
</T.Group>
