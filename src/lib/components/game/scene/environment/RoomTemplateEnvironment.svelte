<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { DoubleSide, type Texture } from "three";
  import ShootingTarget from "$lib/components/game/ShootingTarget.svelte";
  import type { RoomEnvironmentId } from "$lib/config/room-templates";
  import { gearTeeth, treasureGearMounts } from "$lib/game/scene-layout";
  import type { SceneFloorPalette } from "$lib/types/game";

  let {
    bossBannerTexture = null,
    currentFloorPalette,
    environment = null,
  }: {
    bossBannerTexture?: Texture | null;
    currentFloorPalette: SceneFloorPalette;
    environment?: RoomEnvironmentId | null;
  } = $props();

  const bannerFallbackColor = (index: number) =>
    index === 1 ? "#5b1718" : "#342016";
</script>

<T.Mesh position={[0, -0.39, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
  <T.PlaneGeometry args={[32, 27]} />
  <T.MeshStandardMaterial color="#100c08" metalness={0.28} roughness={0.78} />
</T.Mesh>

<T.Mesh position={[0, 2.15, -10.2]} castShadow receiveShadow>
  <T.PlaneGeometry args={[24, 4.9]} />
  <T.MeshStandardMaterial color="#18120d" metalness={0.42} roughness={0.74} />
</T.Mesh>

<T.Mesh
  position={[-12.15, 2.05, -0.5]}
  castShadow
  receiveShadow
  rotation={[0, Math.PI / 2, 0]}
>
  <T.PlaneGeometry args={[19.5, 4.7]} />
  <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
</T.Mesh>

<T.Mesh
  position={[12.15, 2.05, -0.5]}
  castShadow
  receiveShadow
  rotation={[0, -Math.PI / 2, 0]}
>
  <T.PlaneGeometry args={[19.5, 4.7]} />
  <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
</T.Mesh>

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
          color="#1b2935"
          roughness={0.7}
          metalness={0.34}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.23, 0]}>
        <T.BoxGeometry args={[4.6, 0.07, 2.55]} />
        <T.MeshStandardMaterial
          color="#24384a"
          metalness={0.36}
          roughness={0.64}
        />
      </T.Mesh>

      {#each [-1, 1] as side}
        <T.Mesh castShadow receiveShadow position={[0, 0.31, side * 1.24]}>
          <T.BoxGeometry args={[4.65, 0.1, 0.14]} />
          <T.MeshStandardMaterial
            color="#8a5c31"
            metalness={0.66}
            roughness={0.38}
          />
        </T.Mesh>
      {/each}

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh castShadow receiveShadow position={[x * 2.1, 0.34, z * 1.02]}>
            <T.BoxGeometry args={[0.36, 0.1, 0.36]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <T.Group position={[-2.2, 0.45, -2.4]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.6, 0.45, 0.6]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.2, 0.9, 1.2]} />
        <T.MeshStandardMaterial
          color="#1f3442"
          metalness={0.32}
          roughness={0.64}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.49, 0]}>
        <T.BoxGeometry args={[1.28, 0.08, 1.28]} />
        <T.MeshStandardMaterial
          color="#263d4f"
          metalness={0.38}
          roughness={0.58}
        />
      </T.Mesh>

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh
            castShadow
            receiveShadow
            position={[x * 0.47, 0.58, z * 0.47]}
          >
            <T.BoxGeometry args={[0.24, 0.16, 0.24]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <T.Group position={[0.2, 0.65, 2.1]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.9, 0.65, 0.9]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.8, 1.3, 1.8]} />
        <T.MeshStandardMaterial
          color="#20394a"
          metalness={0.32}
          roughness={0.64}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.69, 0]}>
        <T.BoxGeometry args={[1.9, 0.09, 1.9]} />
        <T.MeshStandardMaterial
          color="#2a4356"
          metalness={0.38}
          roughness={0.58}
        />
      </T.Mesh>

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh
            castShadow
            receiveShadow
            position={[x * 0.76, 0.81, z * 0.76]}
          >
            <T.BoxGeometry args={[0.32, 0.18, 0.32]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <ShootingTarget position={[-4, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget position={[-3, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget position={[-2, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget
    position={[4.5, 0, -4]}
    color="#a8793d"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[5.5, 0, -4]}
    color="#a8793d"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[-5, 0, 3]}
    color="#1f7475"
    height={1.2}
    width={0.4}
  />
  <ShootingTarget
    position={[6, 0, 2]}
    color="#1f7475"
    height={1.2}
    width={0.4}
  />
{/if}

{#if environment === "treasure-gears"}
  <T.Group position={[0, 0.18, 0]}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[1.55, 1.92, 0.36, 8]} />
      <T.MeshStandardMaterial
        color="#10283a"
        metalness={0.42}
        roughness={0.58}
      />
    </T.Mesh>

    <T.Mesh
      receiveShadow
      position={[0, 0.21, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.RingGeometry args={[1.68, 2.12, 8]} />
      <T.MeshBasicMaterial color="#ffd166" opacity={0.42} transparent />
    </T.Mesh>

    <T.Mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <T.RingGeometry args={[0.72, 0.9, 48]} />
      <T.MeshBasicMaterial color="#8ac6ff" opacity={0.62} transparent />
    </T.Mesh>

    {#each [-1, 1] as x}
      {#each [-1, 1] as z}
        <T.Group position={[x * 2.55, 0.15, z * 2.2]}>
          <T.Mesh castShadow receiveShadow>
            <T.CylinderGeometry args={[0.22, 0.34, 0.5, 6]} />
            <T.MeshStandardMaterial
              color="#183142"
              metalness={0.48}
              roughness={0.48}
            />
          </T.Mesh>
          <T.Mesh castShadow position={[0, 0.39, 0]}>
            <T.SphereGeometry args={[0.18, 14, 10]} />
            <T.MeshStandardMaterial
              color="#8ac6ff"
              emissive="#8ac6ff"
              emissiveIntensity={0.46}
              roughness={0.18}
            />
          </T.Mesh>
        </T.Group>
      {/each}
    {/each}
  </T.Group>

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
          color={mount.position[2] < 0 ? "#ffd166" : "#8ac6ff"}
          emissive={mount.position[2] < 0 ? "#ffd166" : "#8ac6ff"}
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
  <T.Group position={[0, 2.25, -7.28]}>
    <T.Mesh castShadow receiveShadow position={[0, 1.62, 0.12]}>
      <T.BoxGeometry args={[15.2, 0.18, 0.18]} />
      <T.MeshStandardMaterial
        color="#7b5430"
        metalness={0.72}
        roughness={0.32}
      />
    </T.Mesh>

    {#each [-5.2, 0, 5.2] as x, index}
      <T.Group position={[x, 0, 0.15]}>
        <T.Mesh castShadow receiveShadow position={[0, 0.04, 0]}>
          <T.PlaneGeometry
            args={[index === 1 ? 2.7 : 2.35, index === 1 ? 3.25 : 2.85]}
          />
          <T.MeshStandardMaterial
            color={index === 1 && bossBannerTexture
              ? "#ffffff"
              : bannerFallbackColor(index)}
            emissive={index === 1 ? "#210708" : "#120907"}
            emissiveIntensity={0.12}
            map={index === 1 ? bossBannerTexture : null}
            metalness={0.02}
            roughness={0.92}
            side={DoubleSide}
          />
        </T.Mesh>
        {#each [-1, 1] as side}
          <T.Mesh castShadow receiveShadow position={[side * 0.98, 0.03, 0.03]}>
            <T.BoxGeometry args={[0.08, index === 1 ? 2.92 : 2.52, 0.08]} />
            <T.MeshStandardMaterial
              color="#9b6938"
              metalness={0.68}
              roughness={0.38}
            />
          </T.Mesh>
        {/each}
        <T.Mesh castShadow receiveShadow position={[0, -1.33, 0.04]}>
          <T.BoxGeometry args={[1.75, 0.08, 0.08]} />
          <T.MeshStandardMaterial
            color="#c08545"
            metalness={0.7}
            roughness={0.34}
          />
        </T.Mesh>
      </T.Group>
    {/each}
  </T.Group>

  {#each [-1, 1] as side}
    <T.Group position={[side * 6.4, 0.46, -4.95]}>
      <T.Mesh castShadow receiveShadow>
        <T.CylinderGeometry args={[0.46, 0.62, 0.38, 6]} />
        <T.MeshStandardMaterial
          color="#22160f"
          metalness={0.5}
          roughness={0.62}
        />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[0, 0.62, 0]}>
        <T.BoxGeometry args={[0.72, 0.9, 0.72]} />
        <T.MeshStandardMaterial
          color="#382516"
          metalness={0.42}
          roughness={0.58}
        />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[0, 1.18, 0]}>
        <T.ConeGeometry args={[0.38, 0.58, 6]} />
        <T.MeshStandardMaterial
          color="#af6b32"
          emissive="#5d190c"
          emissiveIntensity={0.16}
          metalness={0.54}
          roughness={0.42}
        />
      </T.Mesh>
    </T.Group>
  {/each}
{/if}
