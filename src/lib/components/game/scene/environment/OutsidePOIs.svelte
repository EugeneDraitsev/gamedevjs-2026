<script lang="ts">
  import { T } from "@threlte/core";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  const plan = outsidePlan();

  const kindColor = (kind: string) => {
    switch (kind) {
      case "camp":
        return "#c19a5f";
      case "shrine":
        return "#9fd6ff";
      case "lookout":
        return "#d9b3ff";
      default:
        return "#d4c08a";
    }
  };
</script>

{#each plan.pois as poi (poi.id)}
  <T.Group position={[poi.x, poi.y, poi.z]} rotation={[0, poi.rotationY, 0]}>
    <!-- ground ring marker visible from any angle -->
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <T.RingGeometry args={[1.3, 1.8, 24]} />
      <T.MeshBasicMaterial color={kindColor(poi.kind)} transparent opacity={0.55} />
    </T.Mesh>
    {#if poi.kind === "camp"}
      <T.Mesh castShadow receiveShadow position={[-1.2, 0.42, -0.15]}>
        <T.BoxGeometry args={[1.8, 0.84, 1.1]} />
        <T.MeshStandardMaterial color="#7a6442" roughness={0.9} />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[1.2, 0.32, 0.55]}>
        <T.BoxGeometry args={[1.1, 0.64, 1.1]} />
        <T.MeshStandardMaterial color="#69533c" roughness={0.86} />
      </T.Mesh>
      <!-- firepit ring -->
      <T.Mesh
        castShadow
        position={[0.2, 0.36, -1.55]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <T.TorusGeometry args={[0.42, 0.08, 8, 16]} />
        <T.MeshStandardMaterial
          color="#b58b46"
          metalness={0.6}
          roughness={0.5}
        />
      </T.Mesh>
    {:else if poi.kind === "shrine"}
      <T.Mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <T.BoxGeometry args={[0.8, 1.8, 0.8]} />
        <T.MeshStandardMaterial
          color="#34404f"
          emissive="#9fd6ff"
          emissiveIntensity={0.32}
          roughness={0.5}
          metalness={0.45}
        />
      </T.Mesh>
      <T.PointLight
        color="#9fd6ff"
        intensity={1.3}
        distance={6}
        position={[0, 1.8, 0]}
      />
    {:else if poi.kind === "landmark" || poi.kind === "lookout"}
      <T.Mesh castShadow receiveShadow position={[0, 0.8, 0]}>
        <T.CylinderGeometry args={[0.45, 0.65, 1.6, 7]} />
        <T.MeshStandardMaterial color="#5f5545" roughness={0.95} />
      </T.Mesh>
      <T.Mesh castShadow position={[0.55, 0.25, 0.35]} rotation={[0, 0.4, 0.3]}>
        <T.CylinderGeometry args={[0.3, 0.4, 1.1, 6]} />
        <T.MeshStandardMaterial color="#524a3a" roughness={0.95} />
      </T.Mesh>
    {/if}
  </T.Group>
{/each}
