<script lang="ts">
  import { T } from "@threlte/core";
  import { SRGBColorSpace, type Texture, TextureLoader } from "three";
  import { getMachineModuleIconUrl } from "$lib/config/machine-module-icons";
  import {
    getMachineModuleKindAccent,
    type MachineModuleTemplate,
  } from "$lib/config/machine-modules";

  let {
    animationNow,
    currentArtifactTemplate = null,
  }: {
    animationNow: number;
    currentArtifactTemplate?: MachineModuleTemplate | null;
  } = $props();

  let iconTexture = $state<Texture | null>(null);
  const moduleAccent = $derived(
    currentArtifactTemplate
      ? getMachineModuleKindAccent(currentArtifactTemplate.kind)
      : "#ef4444"
  );

  $effect(() => {
    const moduleId = currentArtifactTemplate?.id;

    if (!moduleId) {
      iconTexture = null;
      return;
    }

    let cancelled = false;

    new TextureLoader().load(getMachineModuleIconUrl(moduleId), (texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;

      if (cancelled) {
        texture.dispose();
        return;
      }

      iconTexture = texture;
    });

    return () => {
      cancelled = true;
    };
  });
</script>

{#if currentArtifactTemplate}
  <T.Group position={[0, 0.9 + Math.sin(animationNow * 0.006) * 0.08, 0]}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[0.55, 0.72, 0.32, 20]} />
      <T.MeshStandardMaterial
        color="#193040"
        metalness={0.42}
        roughness={0.52}
      />
    </T.Mesh>

    <T.Group position={[0, 0.72, 0]}>
      <T.Mesh castShadow>
        <T.SphereGeometry args={[0.55, 36, 24]} />
        <T.MeshStandardMaterial
          color={moduleAccent}
          emissive={moduleAccent}
          emissiveIntensity={0.24}
          metalness={0.16}
          opacity={0.58}
          roughness={0.14}
          transparent
        />
      </T.Mesh>

      <T.Group rotation={[0, animationNow * 0.0017, 0]}>
        <T.Mesh rotation={[-Math.PI / 2, 0, 0]}>
          <T.RingGeometry args={[0.64, 0.74, 48]} />
          <T.MeshBasicMaterial
            color={moduleAccent}
            opacity={0.48}
            transparent
          />
        </T.Mesh>
        <T.Mesh rotation={[0, 0, Math.PI / 2]}>
          <T.RingGeometry args={[0.64, 0.72, 48]} />
          <T.MeshBasicMaterial
            color={moduleAccent}
            opacity={0.34}
            transparent
          />
        </T.Mesh>
      </T.Group>

      {#if iconTexture}
        <T.Sprite position={[0, 0, 0]} scale={[0.86, 0.86, 0.86]}>
          <T.SpriteMaterial
            color="#ffffff"
            depthTest={false}
            depthWrite={false}
            map={iconTexture}
            opacity={0.98}
            transparent
          />
        </T.Sprite>
      {/if}

      <T.Mesh>
        <T.SphereGeometry args={[0.63, 36, 24]} />
        <T.MeshBasicMaterial
          color={moduleAccent}
          opacity={0.16}
          transparent
          wireframe
        />
      </T.Mesh>
    </T.Group>
  </T.Group>
{/if}
