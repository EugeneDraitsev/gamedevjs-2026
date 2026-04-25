<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import {
    AdditiveBlending,
    GreaterDepth,
    NormalBlending,
    PCFSoftShadowMap,
  } from "three";
  import type { MachineSlotId } from "$lib/config/machine-modules";

  type Vec3 = [number, number, number];

  interface MachineBayOrbPreviewProps {
    highlightedSlotId?: MachineSlotId | null;
  }

  const rivets: Vec3[] = [
    [-0.64, 0.34, 0.75],
    [-0.48, -0.3, 0.82],
    [0.5, 0.38, 0.78],
    [0.64, -0.18, 0.74],
    [0.05, -0.68, 0.72],
  ];

  const scratches = [
    {
      position: [-0.28, 0.6, 0.82],
      rotation: [0.42, -0.18, -0.75],
      scale: [0.018, 0.34, 0.018],
    },
    {
      position: [-0.15, 0.43, 0.93],
      rotation: [0.18, 0.1, 0.35],
      scale: [0.014, 0.23, 0.018],
    },
    {
      position: [0.34, -0.18, 0.88],
      rotation: [-0.25, 0.16, -0.5],
      scale: [0.014, 0.29, 0.018],
    },
  ] satisfies { position: Vec3; rotation: Vec3; scale: Vec3 }[];

  const utilitySockets = {
    "utility-a": {
      position: [-0.54, -0.25, 0.83],
      rotation: [Math.PI / 2, 0.12, -0.18],
    },
    "utility-b": {
      position: [0.48, 0.34, 0.82],
      rotation: [Math.PI / 2, -0.08, 0.18],
    },
  } satisfies Record<
    Extract<MachineSlotId, "utility-a" | "utility-b">,
    { position: Vec3; rotation: Vec3 }
  >;

  let { highlightedSlotId = null }: MachineBayOrbPreviewProps = $props();

  const isActive = (slotId: MachineSlotId) => highlightedSlotId === slotId;

  const inspectionActive = $derived(highlightedSlotId !== null);

  const eyeShellColor = $derived(isActive("attack") ? "#20363a" : "#15120f");

  const eyeGlassColor = $derived(isActive("attack") ? "#eaffff" : "#8ff7ff");

  const bodyShellColor = $derived(isActive("body") ? "#bb7721" : "#8f6424");

  const bodyShellEmissive = $derived(isActive("body") ? "#3a1f08" : "#120900");

  const bodyShellEmissiveIntensity = $derived(isActive("body") ? 0.48 : 0.25);

  const bodyGlowOpacity = $derived(isActive("body") ? 0.16 : 0);

  const swordGlowOpacity = $derived(isActive("utility-c") ? 0.22 : 0);

  const swordLightIntensity = $derived(isActive("utility-c") ? 1.35 : 0);

  const utilityFillOpacityFor = (slotId: MachineSlotId) => {
    return isActive(slotId) ? 1 : 0.72;
  };
</script>

<div class="orb-preview" role="img" aria-label="Machine chassis part preview">
  <Canvas dpr={2} shadows={PCFSoftShadowMap}>
    <T.PerspectiveCamera fov={35} makeDefault position={[0, 0.5, 5.35]}>
      <OrbitControls
        enableDamping
        enablePan={false}
        enableZoom
        maxDistance={6.15}
        minDistance={3.45}
        maxPolarAngle={Math.PI * 0.68}
        minPolarAngle={Math.PI * 0.26}
        rotateSpeed={0.65}
        target={[0.05, 0, 0]}
        zoomSpeed={0.72}
      />
    </T.PerspectiveCamera>

    <T.AmbientLight intensity={0.66} />
    <T.HemisphereLight args={["#d8f8ff", "#17100a", 1.08]} />
    <T.DirectionalLight
      castShadow
      intensity={2.45}
      position={[3.4, 4.8, 3.8]}
      shadow.mapSize={[1024, 1024]}
    />
    <T.PointLight
      color="#78f7ff"
      distance={4.8}
      intensity={inspectionActive ? 1.35 : 1.65}
      position={[0, -0.14, 1.6]}
    />

    <T.Group
      position={[0.02, -0.02, 0]}
      rotation={[-0.02, -0.22, 0]}
      scale={[1.1, 1.1, 1.1]}
    >
      <T.Group position={[-0.34, 0, 0]} scale={[0.86, 0.86, 0.86]}>
        <T.Mesh renderOrder={30} scale={[1.08, 1.08, 1.08]}>
          <T.SphereGeometry args={[1, 32, 16]} />
          <T.MeshBasicMaterial
            color="#ffc267"
            depthFunc={GreaterDepth}
            opacity={bodyGlowOpacity}
            transparent
            depthWrite={false}
          />
        </T.Mesh>

        <T.Mesh castShadow receiveShadow>
          <T.SphereGeometry args={[1, 72, 36]} />
          <T.MeshStandardMaterial
            color={bodyShellColor}
            emissive={bodyShellEmissive}
            emissiveIntensity={bodyShellEmissiveIntensity}
            metalness={0.95}
            roughness={isActive("body") ? 0.32 : 0.42}
          />
        </T.Mesh>

        <T.Mesh rotation={[Math.PI / 2, 0, 0]}>
          <T.TorusGeometry args={[1.01, 0.018, 10, 96]} />
          <T.MeshStandardMaterial
            color="#d39a38"
            emissive="#000000"
            emissiveIntensity={0}
            metalness={1}
            roughness={0.35}
          />
        </T.Mesh>

        <T.Mesh rotation={[0, Math.PI / 2, 0]}>
          <T.TorusGeometry args={[1.012, 0.012, 10, 96]} />
          <T.MeshStandardMaterial
            color="#3a2412"
            metalness={0.8}
            roughness={0.55}
          />
        </T.Mesh>

        <T.Mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
          <T.TorusGeometry args={[1.014, 0.012, 10, 96]} />
          <T.MeshStandardMaterial
            color="#3a2412"
            metalness={0.8}
            roughness={0.55}
          />
        </T.Mesh>

        <T.Mesh position={[0, 0.22, 0.965]} rotation={[Math.PI / 2, 0, 0]}>
          <T.CylinderGeometry args={[0.31, 0.31, 0.055, 40]} />
          <T.MeshStandardMaterial
            color={eyeShellColor}
            emissive={isActive("attack") ? "#35e9ff" : "#000000"}
            emissiveIntensity={isActive("attack") ? 0.42 : 0}
            metalness={0.7}
            roughness={0.35}
          />
        </T.Mesh>

        <T.Mesh position={[0, 0.22, 1.003]} rotation={[Math.PI / 2, 0, 0]}>
          <T.CylinderGeometry args={[0.19, 0.19, 0.035, 40]} />
          <T.MeshBasicMaterial
            blending={isActive("attack") ? AdditiveBlending : NormalBlending}
            color={eyeGlassColor}
            opacity={isActive("attack") ? 1 : 0.82}
            toneMapped={false}
            transparent
          />
        </T.Mesh>

        {#if isActive("attack")}
          <T.PointLight
            color="#7befff"
            intensity={2.4}
            distance={2.8}
            position={[0, 0.22, 1.08]}
          />
        {/if}

        {#if isActive("body")}
          <T.PointLight
            color="#ffb84f"
            intensity={1.35}
            distance={3.3}
            position={[-0.2, 0.18, 1.2]}
          />
        {/if}

        {#each scratches as scratch}
          <T.Mesh
            position={scratch.position}
            rotation={scratch.rotation}
            scale={scratch.scale}
          >
            <T.BoxGeometry args={[1, 1, 1]} />
            <T.MeshStandardMaterial color="#16100b" roughness={0.8} />
          </T.Mesh>
        {/each}

        {#each rivets as rivet}
          <T.Mesh position={rivet} castShadow>
            <T.SphereGeometry args={[0.045, 14, 10]} />
            <T.MeshStandardMaterial
              color="#c28b31"
              emissive="#000000"
              emissiveIntensity={0}
              metalness={1}
              roughness={0.32}
            />
          </T.Mesh>
        {/each}

        {#each Object.entries(utilitySockets) as [ slotId, socket ]}
          <T.Group position={socket.position} rotation={socket.rotation}>
            <T.Mesh>
              <T.TorusGeometry args={[0.16, 0.022, 12, 32]} />
              <T.MeshStandardMaterial
                color={isActive(slotId as MachineSlotId) ? "#ffffff" : "#e5e7eb"}
                emissive={isActive(slotId as MachineSlotId)
                  ? "#f8fafc"
                  : "#000000"}
                emissiveIntensity={isActive(slotId as MachineSlotId) ? 0.9 : 0}
                metalness={0.65}
                roughness={0.28}
              />
            </T.Mesh>
            <T.Mesh position={[0, 0, 0.02]}>
              <T.CircleGeometry args={[0.105, 24]} />
              <T.MeshBasicMaterial
                blending={isActive(slotId as MachineSlotId)
                  ? AdditiveBlending
                  : NormalBlending}
                color={isActive(slotId as MachineSlotId) ? "#ffffff" : "#27313a"}
                opacity={utilityFillOpacityFor(slotId as MachineSlotId)}
                toneMapped={false}
                transparent
              />
            </T.Mesh>
          </T.Group>
        {/each}
      </T.Group>

      <T.Group
        position={[0.72, -0.86, 0.58]}
        rotation={[0.02, -0.06, -0.05]}
        scale={[0.82, 0.82, 0.82]}
      >
        <T.Mesh castShadow position={[0, 0.16, 0]}>
          <T.CylinderGeometry args={[0.045, 0.045, 0.38, 16]} />
          <T.MeshStandardMaterial
            color={isActive("utility-c") ? "#272018" : "#17110c"}
            metalness={0.8}
            roughness={0.45}
          />
        </T.Mesh>

        <T.Mesh castShadow position={[0, 0.4, 0]}>
          <T.CylinderGeometry args={[0.04, 0.04, 0.52, 16]} />
          <T.MeshStandardMaterial
            color={isActive("utility-c") ? "#f5c869" : "#c08a2f"}
            emissive={isActive("utility-c") ? "#f59e0b" : "#000000"}
            emissiveIntensity={isActive("utility-c") ? 0.32 : 0}
            metalness={1}
            roughness={0.3}
          />
        </T.Mesh>

        <T.Mesh castShadow position={[0, 0.64, 0]} scale={[0.42, 0.055, 0.07]}>
          <T.BoxGeometry args={[1, 1, 1]} />
          <T.MeshStandardMaterial
            color={isActive("utility-c") ? "#f5c869" : "#d19a38"}
            metalness={1}
            roughness={0.28}
          />
        </T.Mesh>

        <T.Mesh position={[0, 1.27, 0]}>
          <T.CylinderGeometry args={[0.024, 0.064, 1.24, 20]} />
          <T.MeshStandardMaterial
            color="#cdeff4"
            emissive="#0f3a44"
            emissiveIntensity={isActive("utility-c") ? 0.14 : 0.03}
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
            opacity={swordGlowOpacity}
            toneMapped={false}
            transparent
          />
        </T.Mesh>

        <T.Mesh position={[0, 1.99, 0]}>
          <T.ConeGeometry args={[0.058, 0.2, 20]} />
          <T.MeshStandardMaterial
            color="#d9f5f8"
            emissive="#0b2b34"
            emissiveIntensity={isActive("utility-c") ? 0.12 : 0.02}
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

      {#if isActive("utility-a")}
        <T.PointLight
          color="#f8fafc"
          distance={3.2}
          intensity={1.7}
          position={[-1.03, -0.22, 1.1]}
        />
      {:else if isActive("utility-b")}
        <T.PointLight
          color="#f8fafc"
          distance={3.2}
          intensity={1.7}
          position={[-0.2, 0.32, 1.1]}
        />
      {/if}
    </T.Group>
  </Canvas>
</div>

<style>
  .orb-preview {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
    overflow: hidden;
    cursor: grab;
    background:
      radial-gradient(
        circle at 52% 45%,
        rgba(89, 246, 255, 0.13),
        transparent 32%
      ),
      radial-gradient(
        circle at 48% 50%,
        rgba(251, 191, 36, 0.1),
        transparent 58%
      );
    border-radius: 50%;
    isolation: isolate;
  }

  .orb-preview:active {
    cursor: grabbing;
  }

  .orb-preview::after {
    position: absolute;
    inset-block-end: 13%;
    inset-inline: 16% 18%;
    block-size: 16%;
    pointer-events: none;
    content: "";
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.5), transparent 70%);
    filter: blur(8px);
  }

  .orb-preview :global(canvas) {
    display: block;
  }
</style>
