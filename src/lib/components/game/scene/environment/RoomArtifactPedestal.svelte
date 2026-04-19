<script lang="ts">
  import { T } from "@threlte/core";
  import type { WeaponNodeTemplate } from "$lib/config/weapon-graph";

  let {
    animationNow,
    currentArtifactTemplate = null,
  }: {
    animationNow: number;
    currentArtifactTemplate?: WeaponNodeTemplate | null;
  } = $props();
</script>

{#if currentArtifactTemplate}
  <T.Group
    position={[0, 0.9 + Math.sin(animationNow * 0.006) * 0.08, 0]}
    rotation={[0, animationNow * 0.0014, 0]}
  >
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.55, 0.72, 0.32, 20]} />
      <T.MeshStandardMaterial
        color="#193040"
        metalness={0.42}
        roughness={0.52}
      />
    </T.Mesh>

    <T.Mesh castShadow position={[0, 0.58, 0]}>
      <T.SphereGeometry args={[0.42, 24, 24]} />
      <T.MeshStandardMaterial
        color={currentArtifactTemplate.accent}
        emissive={currentArtifactTemplate.accent}
        emissiveIntensity={0.28}
        metalness={0.14}
        roughness={0.24}
      />
    </T.Mesh>

    <T.Mesh
      position={[0, -0.72, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, animationNow * 0.0018, 0]}
    >
      <T.RingGeometry args={[0.78, 1.02, 36]} />
      <T.MeshBasicMaterial
        color={currentArtifactTemplate.accent}
        opacity={0.84}
        transparent
      />
    </T.Mesh>
  </T.Group>
{/if}
