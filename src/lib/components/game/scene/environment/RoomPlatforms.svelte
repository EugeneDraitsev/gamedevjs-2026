<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { RoomPlatform } from "$lib/types/game";

  let {
    animationNow = 0,
    roomPlatforms,
  }: { animationNow?: number; roomPlatforms: RoomPlatform[] } = $props();

  const beltSlots = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const beltSlotZ = (slot: number, platform: RoomPlatform) => {
    const spacing = 0.14;
    const conveyorZ = platform.conveyor?.[2] ?? 0;
    const offset =
      (((animationNow * conveyorZ) / (1000 * platform.args[2])) % spacing) +
      spacing;

    return (slot * spacing + (offset % spacing)) * platform.args[2];
  };
</script>

{#each roomPlatforms as platform (platform.id)}
  <T.Group position={platform.position}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={platform.args}
        friction={0.94}
        restitution={0.04}
      />
      <T.Mesh castShadow receiveShadow>
        {#if platform.shape === "hex"}
          <T.CylinderGeometry
            args={[platform.args[0], platform.args[0], platform.args[1] * 2, 6]}
          />
        {:else}
          <T.BoxGeometry
            args={[
              platform.args[0] * 2,
              platform.args[1] * 2,
              platform.args[2] * 2,
            ]}
          />
        {/if}
        <T.MeshStandardMaterial
          color={platform.color}
          flatShading={platform.shape === "hex"}
          metalness={0.32}
          roughness={0.64}
        />
      </T.Mesh>

      {#if platform.shape === "hex"}
        <T.Mesh
          castShadow
          receiveShadow
          position={[0, platform.args[1] + 0.03, 0]}
        >
          <T.CylinderGeometry
            args={[platform.args[0] * 0.94, platform.args[0] * 0.94, 0.06, 6]}
          />
          <T.MeshStandardMaterial
            color="#8a5c31"
            metalness={0.66}
            roughness={0.38}
          />
        </T.Mesh>
        <T.Mesh
          castShadow
          receiveShadow
          position={[0, platform.args[1] + 0.07, 0]}
        >
          <T.CylinderGeometry
            args={[platform.args[0] * 0.74, platform.args[0] * 0.74, 0.05, 6]}
          />
          <T.MeshStandardMaterial
            color="#223642"
            metalness={0.38}
            roughness={0.62}
          />
        </T.Mesh>
      {:else}
        <T.Mesh
          castShadow
          receiveShadow
          position={[0, platform.args[1] + 0.025, 0]}
        >
          <T.BoxGeometry
            args={[platform.args[0] * 1.72, 0.05, platform.args[2] * 1.72]}
          />
          <T.MeshStandardMaterial
            color="#223642"
            metalness={0.38}
            roughness={0.62}
          />
        </T.Mesh>

        {#if platform.conveyor}
          {#each [-1, 1] as end}
            <T.Mesh
              castShadow
              receiveShadow
              position={[0, platform.args[1] + 0.12, end * platform.args[2] * 0.88]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <T.CylinderGeometry
                args={[0.16, 0.16, platform.args[0] * 1.72, 14]}
              />
              <T.MeshStandardMaterial
                color="#b06f38"
                metalness={0.78}
                roughness={0.3}
              />
            </T.Mesh>
          {/each}

          {#each beltSlots as slot}
            <T.Mesh
              castShadow
              receiveShadow
              position={[0, platform.args[1] + 0.145, beltSlotZ(slot, platform)]}
            >
              <T.BoxGeometry args={[platform.args[0] * 1.42, 0.08, 0.08]} />
              <T.MeshStandardMaterial
                color="#b06f38"
                emissive="#6b2f10"
                emissiveIntensity={0.16}
                metalness={0.68}
                roughness={0.34}
              />
            </T.Mesh>
          {/each}

          {#each [-1, 1] as side}
            <T.Mesh
              castShadow
              receiveShadow
              position={[
                side * platform.args[0] * 1.04,
                platform.args[1] + 0.02,
                0,
              ]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <T.CylinderGeometry
                args={[0.05, 0.05, platform.args[2] * 1.64, 8]}
              />
              <T.MeshStandardMaterial
                color="#8f5a30"
                metalness={0.72}
                roughness={0.34}
              />
            </T.Mesh>
          {/each}
        {:else}
          <T.Mesh
            castShadow
            receiveShadow
            position={[0, platform.args[1] + 0.065, 0]}
          >
            <T.BoxGeometry args={[platform.args[0] * 1.2, 0.03, 0.045]} />
            <T.MeshStandardMaterial
              color="#314c5d"
              metalness={0.42}
              roughness={0.58}
            />
          </T.Mesh>
          <T.Mesh
            castShadow
            receiveShadow
            position={[0, platform.args[1] + 0.065, 0]}
          >
            <T.BoxGeometry args={[0.045, 0.03, platform.args[2] * 1.2]} />
            <T.MeshStandardMaterial
              color="#314c5d"
              metalness={0.42}
              roughness={0.58}
            />
          </T.Mesh>
        {/if}

        {#each [-1, 1] as side}
          <T.Mesh
            castShadow
            receiveShadow
            position={[0, platform.args[1] + 0.07, side * platform.args[2] * 0.92]}
          >
            <T.BoxGeometry args={[platform.args[0] * 1.9, 0.08, 0.12]} />
            <T.MeshStandardMaterial
              color="#8a5c31"
              metalness={0.66}
              roughness={0.38}
            />
          </T.Mesh>
          <T.Mesh
            castShadow
            receiveShadow
            position={[side * platform.args[0] * 0.92, platform.args[1] + 0.07, 0]}
          >
            <T.BoxGeometry args={[0.12, 0.08, platform.args[2] * 1.9]} />
            <T.MeshStandardMaterial
              color="#8a5c31"
              metalness={0.66}
              roughness={0.38}
            />
          </T.Mesh>
        {/each}

        {#each [-1, 1] as x}
          {#each [-1, 1] as z}
            <T.Mesh
              castShadow
              receiveShadow
              position={[
                x * platform.args[0] * 0.76,
                platform.args[1] + 0.11,
                z * platform.args[2] * 0.76,
              ]}
            >
              <T.BoxGeometry args={[0.2, 0.1, 0.2]} />
              <T.MeshStandardMaterial
                color="#b77b42"
                metalness={0.68}
                roughness={0.34}
              />
            </T.Mesh>
          {/each}
        {/each}
      {/if}
    </RigidBody>
  </T.Group>
{/each}
