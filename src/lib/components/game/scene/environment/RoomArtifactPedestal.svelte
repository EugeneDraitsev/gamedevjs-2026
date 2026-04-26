<script module lang="ts">
  import {
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
    SphereGeometry,
    SpriteMaterial,
    type Texture,
  } from "three";

  const pedestalBaseGeometry = new CylinderGeometry(0.55, 0.72, 0.32, 20);
  const artifactOrbGeometry = new SphereGeometry(0.55, 36, 24);
  const artifactOuterRingGeometry = new RingGeometry(0.64, 0.74, 48);
  const artifactInnerRingGeometry = new RingGeometry(0.64, 0.72, 48);
  const artifactWireGeometry = new SphereGeometry(0.63, 36, 24);
  const pedestalBaseMaterial = new MeshStandardMaterial({
    color: "#193040",
    metalness: 0.42,
    roughness: 0.52,
  });
  const artifactMaterialCache = new Map<
    string,
    {
      innerRing: MeshBasicMaterial;
      orb: MeshStandardMaterial;
      outerRing: MeshBasicMaterial;
      wire: MeshBasicMaterial;
    }
  >();
  const iconSpriteMaterialCache = new WeakMap<Texture, SpriteMaterial>();

  const getArtifactMaterials = (accent: string) => {
    const cached = artifactMaterialCache.get(accent);

    if (cached) {
      return cached;
    }

    const materials = {
      innerRing: new MeshBasicMaterial({
        color: accent,
        opacity: 0.34,
        transparent: true,
      }),
      orb: new MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.24,
        metalness: 0.16,
        opacity: 0.58,
        roughness: 0.14,
        transparent: true,
      }),
      outerRing: new MeshBasicMaterial({
        color: accent,
        opacity: 0.48,
        transparent: true,
      }),
      wire: new MeshBasicMaterial({
        color: accent,
        opacity: 0.16,
        transparent: true,
        wireframe: true,
      }),
    };

    artifactMaterialCache.set(accent, materials);
    return materials;
  };

  const getIconSpriteMaterial = (texture: Texture) => {
    const cached = iconSpriteMaterialCache.get(texture);

    if (cached) {
      return cached;
    }

    const material = new SpriteMaterial({
      color: "#ffffff",
      depthTest: false,
      depthWrite: false,
      map: texture,
      opacity: 0.98,
      transparent: true,
    });

    iconSpriteMaterialCache.set(texture, material);
    return material;
  };
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import {
    getMachineModuleKindAccent,
    type MachineModuleTemplate,
  } from "$lib/config/machine-modules";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  let {
    animationNow,
    currentArtifactTemplate = null,
  }: {
    animationNow: number;
    currentArtifactTemplate?: MachineModuleTemplate | null;
  } = $props();

  const scene = getGameSceneContext();
  const moduleAccent = $derived(
    currentArtifactTemplate
      ? getMachineModuleKindAccent(currentArtifactTemplate.kind)
      : "#ef4444"
  );
  const artifactMaterials = $derived(getArtifactMaterials(moduleAccent));
  const iconTexture = $derived(
    currentArtifactTemplate
      ? (scene.textures.machineModuleIcons[currentArtifactTemplate.id] ?? null)
      : null
  );
  const iconSpriteMaterial = $derived(
    iconTexture ? getIconSpriteMaterial(iconTexture) : null
  );
</script>

{#if currentArtifactTemplate}
  <T.Group position={[0, 0.9 + Math.sin(animationNow * 0.006) * 0.08, 0]}>
    <T.Mesh
      castShadow={false}
      geometry={pedestalBaseGeometry}
      material={pedestalBaseMaterial}
      receiveShadow
    />

    <T.Group position={[0, 0.72, 0]}>
      <T.Mesh
        castShadow={false}
        geometry={artifactOrbGeometry}
        material={artifactMaterials.orb}
      />

      <T.Group rotation={[0, animationNow * 0.0017, 0]}>
        <T.Mesh
          geometry={artifactOuterRingGeometry}
          material={artifactMaterials.outerRing}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <T.Mesh
          geometry={artifactInnerRingGeometry}
          material={artifactMaterials.innerRing}
          rotation={[0, 0, Math.PI / 2]}
        />
      </T.Group>

      {#if iconSpriteMaterial}
        <T.Sprite
          material={iconSpriteMaterial}
          position={[0, 0, 0]}
          scale={[0.86, 0.86, 0.86]}
        />
      {/if}

      <T.Mesh
        geometry={artifactWireGeometry}
        material={artifactMaterials.wire}
      />
    </T.Group>
  </T.Group>
{/if}
