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
  import type { SceneFloorPalette } from "$lib/types/game";

  let {
    currentFloorPalette,
    environment = null,
  }: {
    currentFloorPalette: SceneFloorPalette;
    environment?: RoomEnvironmentId | null;
  } = $props();
</script>

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
