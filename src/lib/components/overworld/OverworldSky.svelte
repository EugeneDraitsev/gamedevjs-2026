<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { SphereGeometry } from "three";
  import { createSkyMaterial } from "./materials/sky-material";

  const { material, uniforms } = createSkyMaterial();
  const skyGeometry = new SphereGeometry(480, 48, 32);

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });

  const farMountainCount = 28;
  const farMountains = Array.from({ length: farMountainCount }, (_, i) => {
    const angle =
      (i / farMountainCount) * Math.PI * 2 + Math.sin(i * 7.3) * 0.1;
    const radius = 220 + Math.sin(i * 11.1) * 40;
    const height = 26 + ((i * 37) % 18);
    const base = 32 + ((i * 13) % 10);
    return {
      id: `far-${i}`,
      angle,
      radius,
      height,
      base,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  });
  const citySilhouettes = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + Math.sin(i * 3.7) * 0.18;
    const radius = 140 + Math.sin(i * 5.1) * 14;
    const height = 14 + ((i * 19) % 10);
    return {
      id: `city-${i}`,
      height,
      width: 8 + ((i * 7) % 6),
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  });
  const spires = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + 0.4;
    const radius = 155 + Math.sin(i * 4.2) * 10;
    return {
      id: `spire-${i}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
  });
</script>

<T.Mesh
  geometry={skyGeometry}
  {material}
  renderOrder={-10}
  frustumCulled={false}
/>

<!-- distant silhouette mountains for horizon depth -->
{#each farMountains as m (m.id)}
  <T.Mesh position={[m.x, m.height / 2 - 4, m.z]} renderOrder={-5}>
    <T.ConeGeometry args={[m.base, m.height, 7]} />
    <T.MeshBasicMaterial color="#1d2333" fog={true} />
  </T.Mesh>
{/each}

<!-- A closer silhouette band (industrial ruins) -->
{#each citySilhouettes as silhouette (silhouette.id)}
  <T.Mesh
    position={[silhouette.x, silhouette.height / 2 - 2, silhouette.z]}
    renderOrder={-4}
  >
    <T.BoxGeometry args={[silhouette.width, silhouette.height, 4]} />
    <T.MeshBasicMaterial color="#141826" fog={true} />
  </T.Mesh>
{/each}

<!-- spire/antenna silhouettes for broken-city feel -->
{#each spires as spire (spire.id)}
  <T.Mesh position={[spire.x, 12, spire.z]} renderOrder={-4}>
    <T.CylinderGeometry args={[0.3, 0.45, 24, 5]} />
    <T.MeshBasicMaterial color="#0f1423" fog={true} />
  </T.Mesh>
{/each}
