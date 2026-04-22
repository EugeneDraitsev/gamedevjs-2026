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
    const angle = (i / farMountainCount) * Math.PI * 2 + Math.sin(i * 7.3) * 0.1;
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
</script>

<T.Mesh geometry={skyGeometry} {material} renderOrder={-10} frustumCulled={false} />

<!-- distant silhouette mountains for horizon depth -->
{#each farMountains as m (m.id)}
  <T.Mesh position={[m.x, m.height / 2 - 4, m.z]} renderOrder={-5}>
    <T.ConeGeometry args={[m.base, m.height, 7]} />
    <T.MeshBasicMaterial color="#1d2333" fog={true} />
  </T.Mesh>
{/each}

<!-- A closer silhouette band (industrial ruins) -->
{#each Array.from({ length: 18 }) as _, i (i)}
  {@const ang = (i / 18) * Math.PI * 2 + Math.sin(i * 3.7) * 0.18}
  {@const r = 140 + Math.sin(i * 5.1) * 14}
  {@const h = 14 + ((i * 19) % 10)}
  {@const w = 8 + ((i * 7) % 6)}
  <T.Mesh position={[Math.cos(ang) * r, h / 2 - 2, Math.sin(ang) * r]} renderOrder={-4}>
    <T.BoxGeometry args={[w, h, 4]} />
    <T.MeshBasicMaterial color="#141826" fog={true} />
  </T.Mesh>
{/each}

<!-- spire/antenna silhouettes for broken-city feel -->
{#each Array.from({ length: 8 }) as _, i (i)}
  {@const ang = (i / 8) * Math.PI * 2 + 0.4}
  {@const r = 155 + Math.sin(i * 4.2) * 10}
  <T.Mesh position={[Math.cos(ang) * r, 12, Math.sin(ang) * r]} renderOrder={-4}>
    <T.CylinderGeometry args={[0.3, 0.45, 24, 5]} />
    <T.MeshBasicMaterial color="#0f1423" fog={true} />
  </T.Mesh>
{/each}
