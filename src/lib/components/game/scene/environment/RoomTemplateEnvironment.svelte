<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import ShootingTarget from "$lib/components/game/ShootingTarget.svelte";
  import type { RoomEnvironmentId } from "$lib/config/room-templates";
  import {
    bossGearMounts,
    gearTeeth,
    treasureGearMounts,
  } from "$lib/game/scene-layout";
  import type { SceneFloorPalette, Vec3 } from "$lib/types/game";

  const backdropGears: { position: Vec3; size: number }[] = [
    { position: [-8.5, 2.75, -7.72], size: 1.45 },
    { position: [8.5, 2.8, -7.72], size: 1.55 },
    { position: [-4.7, 4.0, -7.7], size: 0.8 },
    { position: [4.6, 4.0, -7.7], size: 0.8 },
  ];

  const backdropLamps: Vec3[] = [
    [-6.5, 2.05, -7.64],
    [6.5, 2.05, -7.64],
    [0, 3.25, -7.64],
  ];

  let {
    currentFloorPalette,
    environment = null,
  }: {
    currentFloorPalette: SceneFloorPalette;
    environment?: RoomEnvironmentId | null;
  } = $props();
</script>

<T.Mesh position={[0, -0.39, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
  <T.PlaneGeometry args={[32, 27]} />
  <T.MeshStandardMaterial color="#100c08" metalness={0.28} roughness={0.78} />
</T.Mesh>

<T.Mesh position={[0, 2.15, -10.2]} castShadow receiveShadow>
  <T.BoxGeometry args={[24, 4.9, 0.55]} />
  <T.MeshStandardMaterial color="#18120d" metalness={0.42} roughness={0.74} />
</T.Mesh>

<T.Mesh position={[-12.15, 2.05, -0.5]} castShadow receiveShadow>
  <T.BoxGeometry args={[0.55, 4.7, 19.5]} />
  <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
</T.Mesh>

<T.Mesh position={[12.15, 2.05, -0.5]} castShadow receiveShadow>
  <T.BoxGeometry args={[0.55, 4.7, 19.5]} />
  <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
</T.Mesh>

<T.Mesh position={[0, 2.28, -9.87]}>
  <T.BoxGeometry args={[2.8, 2.45, 0.08]} />
  <T.MeshBasicMaterial color="#ffbf78" opacity={0.2} transparent />
</T.Mesh>

<T.PointLight
  color="#ffae5f"
  distance={8}
  intensity={2.8}
  position={[0, 2.7, -7.8]}
/>

{#each backdropLamps as lamp}
  <T.PointLight
    color="#ff9f4a"
    distance={5.5}
    intensity={1.4}
    position={lamp}
  />
  <T.Mesh position={lamp}>
    <T.SphereGeometry args={[0.13, 12, 8]} />
    <T.MeshBasicMaterial color="#ffbd68" />
  </T.Mesh>
{/each}

{#each [-7.2, -3.6, 3.6, 7.2] as x}
  <T.Mesh position={[x, 2.35, -7.66]}>
    <T.CylinderGeometry args={[0.026, 0.026, 2.55, 6]} />
    <T.MeshStandardMaterial color="#17100a" metalness={0.7} roughness={0.48} />
  </T.Mesh>
{/each}

{#each backdropGears as gear}
  <T.Group position={gear.position}>
    <T.Mesh castShadow>
      <T.TorusGeometry args={[gear.size, 0.13, 12, 32]} />
      <T.MeshStandardMaterial
        color="#5d4325"
        metalness={0.74}
        roughness={0.4}
      />
    </T.Mesh>

    <T.Mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
      <T.CylinderGeometry args={[0.28, 0.28, 0.2, 16]} />
      <T.MeshStandardMaterial
        color="#2b2117"
        metalness={0.68}
        roughness={0.46}
      />
    </T.Mesh>

    {#each gearTeeth as tooth}
      <T.Mesh
        castShadow
        position={[tooth.x * gear.size, tooth.y * gear.size, 0.02]}
        rotation={[0, 0, tooth.rotation]}
      >
        <T.BoxGeometry args={[0.18, 0.38, 0.16]} />
        <T.MeshStandardMaterial
          color="#5d4325"
          metalness={0.72}
          roughness={0.42}
        />
      </T.Mesh>
    {/each}
  </T.Group>
{/each}

{#if environment === "training-range"}
  <T.Group position={[2.9, 0.65, -1.6]} rotation={[0, 0, -0.32]}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={[2.2, 0.18, 1.2]}
        friction={0.48}
        restitution={0.04}
      />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[4.4, 0.36, 2.4]} />
        <T.MeshStandardMaterial
          color={currentFloorPalette.trim}
          roughness={0.78}
          metalness={0.08}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>

  <T.Group position={[-2.2, 0.45, -2.4]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.6, 0.45, 0.6]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.2, 0.9, 1.2]} />
        <T.MeshStandardMaterial
          color="#ff7a59"
          metalness={0.08}
          roughness={0.42}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>

  <T.Group position={[0.2, 0.65, 2.1]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.9, 0.65, 0.9]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.8, 1.3, 1.8]} />
        <T.MeshStandardMaterial
          color="#4cc9f0"
          metalness={0.08}
          roughness={0.38}
        />
      </T.Mesh>
    </RigidBody>
  </T.Group>

  <ShootingTarget position={[-4, 0, -3.5]} color="#e63946" />
  <ShootingTarget position={[-3, 0, -3.5]} color="#e63946" />
  <ShootingTarget position={[-2, 0, -3.5]} color="#e63946" />
  <ShootingTarget
    position={[4.5, 0, -4]}
    color="#f4a261"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[5.5, 0, -4]}
    color="#f4a261"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[-5, 0, 3]}
    color="#2a9d8f"
    height={1.2}
    width={0.4}
  />
  <ShootingTarget
    position={[6, 0, 2]}
    color="#2a9d8f"
    height={1.2}
    width={0.4}
  />
{/if}

{#if environment === "treasure-gears"}
  {#each treasureGearMounts as mount, index}
    <T.Group position={mount.position}>
      <T.Mesh receiveShadow>
        <T.BoxGeometry args={mount.panel} />
        <T.MeshStandardMaterial
          color="#10202f"
          metalness={0.52}
          roughness={0.68}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0, 0.2]}>
        <T.TorusGeometry args={[mount.size, 0.16, 12, 30]} />
        <T.MeshStandardMaterial
          color={index < 2 ? "#ffd166" : "#8ac6ff"}
          emissive={index < 2 ? "#ffd166" : "#8ac6ff"}
          emissiveIntensity={0.08}
          metalness={0.74}
          roughness={0.34}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0, 0.22]}>
        <T.CylinderGeometry args={[0.34, 0.34, 0.24, 20]} />
        <T.MeshStandardMaterial
          color="#dfeeff"
          metalness={0.4}
          roughness={0.28}
        />
      </T.Mesh>

      {#each gearTeeth as tooth, toothIndex}
        <T.Mesh
          castShadow
          position={[tooth.x * mount.size, tooth.y * mount.size, 0.2]}
          rotation={[0, 0, tooth.rotation + (index + toothIndex) * 0.03]}
        >
          <T.BoxGeometry args={[0.26, 0.44, 0.2]} />
          <T.MeshStandardMaterial
            color={index < 2 ? "#ffd166" : "#8ac6ff"}
            metalness={0.7}
            roughness={0.38}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}
{/if}

{#if environment === "boss-gears"}
  {#each bossGearMounts as gear, index}
    <T.Group position={gear.position}>
      <T.Mesh receiveShadow>
        <T.BoxGeometry args={[gear.size * 2.4, gear.size * 2.4, 0.22]} />
        <T.MeshStandardMaterial
          color="#152737"
          metalness={0.48}
          roughness={0.72}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0, 0.18]}>
        <T.TorusGeometry args={[gear.size, 0.18, 14, 34]} />
        <T.MeshStandardMaterial
          color={gear.color}
          emissive={gear.color}
          emissiveIntensity={0.14}
          metalness={0.76}
          roughness={0.28}
        />
      </T.Mesh>

      {#each gearTeeth as tooth, toothIndex}
        <T.Mesh
          castShadow
          position={[tooth.x * gear.size, tooth.y * gear.size, 0.18]}
          rotation={[0, 0, tooth.rotation + (index + toothIndex) * 0.05]}
        >
          <T.BoxGeometry args={[0.28, 0.5, 0.16]} />
          <T.MeshStandardMaterial
            color={gear.color}
            metalness={0.74}
            roughness={0.3}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  <T.Mesh
    position={[0, 0.04, -5.4]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.RingGeometry args={[2.2, 3.25, 44]} />
    <T.MeshBasicMaterial color="#ffd166" opacity={0.8} transparent />
  </T.Mesh>
{/if}
