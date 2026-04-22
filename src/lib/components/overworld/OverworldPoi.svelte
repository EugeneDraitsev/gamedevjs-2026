<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import type { Group, Mesh, MeshStandardMaterial } from "three";
  import type {
    OverworldPOI,
    OverworldPOIKind,
  } from "$lib/config/overworld-layout";

  interface Props {
    highlighted?: boolean;
    poi: OverworldPOI;
  }

  let { poi, highlighted = false }: Props = $props();

  const accentColor = $derived(poi.color ?? "#f1c671");

  let beaconGroup = $state.raw<Group>();
  let ringMesh = $state.raw<Mesh>();
  let ringMaterial = $state.raw<MeshStandardMaterial>();

  let time = 0;

  useTask((delta) => {
    time += delta;

    if (beaconGroup) {
      beaconGroup.position.y = 1.3 + Math.sin(time * 1.6) * 0.12;
      beaconGroup.rotation.y += delta * 0.5;
    }

    if (ringMesh && ringMaterial) {
      const pulse = 1 + (highlighted ? 0.25 : 0.1) * Math.sin(time * 3.2);
      ringMesh.scale.set(pulse, pulse, 1);
      ringMaterial.opacity = highlighted ? 0.85 : 0.42;
    }
  });
</script>

<T.Group position={poi.position}>
  {#if poi.kind === "dungeon"}
    <!-- dungeon gate: stone base + glowing archway -->
    <T.Mesh position={[0, 0.5, 0]} receiveShadow castShadow>
      <T.CylinderGeometry args={[1.8, 2.1, 1, 12]} />
      <T.MeshStandardMaterial color="#2b2730" roughness={0.9} metalness={0.1} />
    </T.Mesh>
    <T.Mesh position={[-1.2, 2.2, 0]} castShadow>
      <T.BoxGeometry args={[0.5, 3.4, 0.5]} />
      <T.MeshStandardMaterial color="#3a2f26" roughness={0.7} metalness={0.2} />
    </T.Mesh>
    <T.Mesh position={[1.2, 2.2, 0]} castShadow>
      <T.BoxGeometry args={[0.5, 3.4, 0.5]} />
      <T.MeshStandardMaterial color="#3a2f26" roughness={0.7} metalness={0.2} />
    </T.Mesh>
    <T.Mesh position={[0, 3.9, 0]} castShadow>
      <T.BoxGeometry args={[2.8, 0.5, 0.5]} />
      <T.MeshStandardMaterial color="#4a3a2c" roughness={0.6} metalness={0.3} />
    </T.Mesh>
    <!-- portal glow fill -->
    <T.Mesh position={[0, 2.3, 0]}>
      <T.PlaneGeometry args={[1.9, 3.1]} />
      <T.MeshBasicMaterial
        color={accentColor}
        transparent
        opacity={highlighted ? 0.55 : 0.32}
      />
    </T.Mesh>
    <T.PointLight
      position={[0, 2.3, 0.2]}
      color={accentColor}
      intensity={highlighted ? 3.2 : 1.8}
      distance={10}
    />
  {:else if poi.kind === "shrine"}
    <!-- humming obelisk -->
    <T.Mesh position={[0, 0.2, 0]} receiveShadow>
      <T.CylinderGeometry args={[1.1, 1.3, 0.4, 8]} />
      <T.MeshStandardMaterial color="#1f2530" roughness={0.9} />
    </T.Mesh>
    <T.Mesh position={[0, 1.3, 0]} castShadow>
      <T.BoxGeometry args={[0.7, 2, 0.7]} />
      <T.MeshStandardMaterial
        color="#31404f"
        emissive={accentColor}
        emissiveIntensity={0.3}
        roughness={0.5}
        metalness={0.5}
      />
    </T.Mesh>
    <T.Group bind:ref={beaconGroup} position={[0, 1.3, 0]}>
      <T.Mesh>
        <T.OctahedronGeometry args={[0.3, 0]} />
        <T.MeshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.8}
        />
      </T.Mesh>
    </T.Group>
    <T.PointLight
      position={[0, 2, 0]}
      color={accentColor}
      intensity={highlighted ? 2.4 : 1.3}
      distance={8}
    />
  {:else if poi.kind === "landmark"}
    <!-- ruined arch / column cluster -->
    <T.Mesh position={[0, 1.1, 0]} castShadow receiveShadow>
      <T.CylinderGeometry args={[0.5, 0.6, 2.2, 6]} />
      <T.MeshStandardMaterial color="#6a604d" roughness={0.95} />
    </T.Mesh>
    <T.Mesh
      position={[0.9, 0.7, 0.2]}
      rotation={[0, 0.3, 0.4]}
      castShadow
      receiveShadow
    >
      <T.CylinderGeometry args={[0.4, 0.5, 1.6, 6]} />
      <T.MeshStandardMaterial color="#5c5140" roughness={0.95} />
    </T.Mesh>
    <T.Mesh
      position={[-0.7, 0.3, -0.4]}
      rotation={[0.1, 0, -0.2]}
      receiveShadow
    >
      <T.BoxGeometry args={[0.9, 0.6, 0.9]} />
      <T.MeshStandardMaterial color="#4c4433" roughness={0.95} />
    </T.Mesh>
  {:else}
    <!-- scenery: rocks -->
    <T.Mesh position={[0, 0.35, 0]} castShadow receiveShadow>
      <T.DodecahedronGeometry args={[0.7, 0]} />
      <T.MeshStandardMaterial color="#3c3a34" roughness={0.98} />
    </T.Mesh>
    <T.Mesh position={[0.6, 0.2, 0.3]} castShadow receiveShadow>
      <T.DodecahedronGeometry args={[0.42, 0]} />
      <T.MeshStandardMaterial color="#4a4640" roughness={0.98} />
    </T.Mesh>
  {/if}

  <!-- proximity ring on ground for interactable POIs -->
  {#if poi.kind === "dungeon" || poi.kind === "shrine"}
    <T.Mesh
      bind:ref={ringMesh}
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.RingGeometry args={[2.1, 2.6, 48]} />
      <T.MeshStandardMaterial
        bind:ref={ringMaterial}
        color={accentColor}
        emissive={accentColor}
        emissiveIntensity={highlighted ? 1.4 : 0.6}
        transparent
        opacity={0.42}
      />
    </T.Mesh>
  {/if}
</T.Group>
