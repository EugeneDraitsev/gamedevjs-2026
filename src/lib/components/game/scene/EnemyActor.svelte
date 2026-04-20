<script module lang="ts">
  import {
    BoxGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
    SphereGeometry,
  } from "three";

  export const enemyRingGeometry = new RingGeometry(1.15, 1.45, 36);
  export const enemyBodyGeometry = new SphereGeometry(1, 24, 24);
  export const enemyEyeGeometry = new SphereGeometry(1, 16, 16);
  export const enemyGunGeometry = new BoxGeometry(1, 1, 1);
  export const enemyHealthBarGeometry = new BoxGeometry(1.1, 0.11, 0.06);
  export const enemyEyeMaterial = new MeshStandardMaterial({
    color: "#f5fbff",
    metalness: 0.04,
    roughness: 0.22,
  });
  export const enemyHealthBackMaterial = new MeshBasicMaterial({
    color: "#09131f",
    opacity: 0.88,
    transparent: true,
  });
  export const enemyHealthFillMaterial = new MeshBasicMaterial({
    color: "#57d6a5",
  });
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { ActiveEnemy } from "$lib/types/game";

  let {
    animationNow,
    enemy,
  }: {
    animationNow: number;
    enemy: ActiveEnemy;
  } = $props();

  const bomberSatellites = $derived.by(() => {
    if (enemy.behavior !== "bomber") {
      return [];
    }

    const orbit = enemy.radius * 1.18;
    const spin = animationNow * 0.0018;

    return [0, 1, 2].map((index) => {
      const yaw = spin + (index / 3) * Math.PI * 2;

      return {
        index,
        position: [
          Math.sin(yaw) * orbit,
          enemy.radius * 0.18 + Math.sin(spin * 3 + index) * 0.08,
          Math.cos(yaw) * orbit,
        ] as [number, number, number],
      };
    });
  });
</script>

<T.Group position={enemy.position}>
  {#if enemy.radius > 1}
    <T.Mesh
      geometry={enemyRingGeometry}
      position={[0, -enemy.radius + 0.1, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[enemy.radius, enemy.radius, 1]}
    >
      <T.MeshBasicMaterial color={enemy.color} opacity={0.4} transparent />
    </T.Mesh>
  {/if}

  <T.Mesh
    geometry={enemyBodyGeometry}
    castShadow
    receiveShadow
    scale={[enemy.radius, enemy.radius, enemy.radius]}
  >
    <T.MeshStandardMaterial
      color={animationNow - enemy.lastHitAt < 130 ? "#fff4da" : enemy.color}
      emissive={enemy.color}
      emissiveIntensity={animationNow - enemy.lastHitAt < 130 ? 0.52 : 0.18}
      metalness={0.16}
      roughness={0.36}
    />
  </T.Mesh>

  <T.Mesh
    geometry={enemyEyeGeometry}
    material={enemyEyeMaterial}
    castShadow
    position={[0, enemy.radius * 0.92, 0]}
    scale={[
      enemy.radius * 0.38,
      enemy.radius * 0.38,
      enemy.radius * 0.38,
    ]}
  />

  {#if enemy.behavior === "shooter"}
    <T.Mesh
      geometry={enemyGunGeometry}
      castShadow
      position={[0, enemy.radius * 0.34, enemy.radius * 0.8]}
      scale={[
        enemy.radius * 0.52,
        enemy.radius * 0.28,
        enemy.radius * 0.92,
      ]}
    >
      <T.MeshStandardMaterial
        color={enemy.shotColor ?? enemy.color}
        emissive={enemy.shotColor ?? enemy.color}
        emissiveIntensity={0.12}
        metalness={0.28}
        roughness={0.26}
      />
    </T.Mesh>
  {/if}

  {#each bomberSatellites as satellite (satellite.index)}
    <T.Mesh
      castShadow
      position={satellite.position}
      scale={[enemy.radius * 0.24, enemy.radius * 0.24, enemy.radius * 0.24]}
    >
      <T.SphereGeometry args={[1, 12, 12]} />
      <T.MeshStandardMaterial
        color={enemy.bombColor ?? enemy.color}
        emissive={enemy.bombColor ?? enemy.color}
        emissiveIntensity={0.6}
        metalness={0.22}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  <T.Group position={[0, enemy.radius + 0.38, 0]}>
    <T.Mesh
      geometry={enemyHealthBarGeometry}
      material={enemyHealthBackMaterial}
      position={[0, 0, -0.02]}
    />

    <T.Mesh
      geometry={enemyHealthBarGeometry}
      material={enemyHealthFillMaterial}
      position={[-0.55 * (1 - enemy.hp / enemy.maxHp) * 0.5, 0, 0]}
      scale={[enemy.hp / enemy.maxHp, 1, 1]}
    />
  </T.Group>
</T.Group>
