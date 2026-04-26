<script module lang="ts">
  import { MeshStandardMaterial } from "three";

  const platformBodyMaterialCache = new Map<string, MeshStandardMaterial>();

  const getPlatformBodyMaterial = (color: string, flatShading: boolean) => {
    const key = `${color}|${flatShading ? "f" : "s"}`;
    const cached = platformBodyMaterialCache.get(key);

    if (cached) {
      return cached;
    }

    const material = new MeshStandardMaterial({
      color,
      flatShading,
      metalness: 0.32,
      roughness: 0.64,
    });

    platformBodyMaterialCache.set(key, material);
    return material;
  };

  const platformHexTopMaterial = new MeshStandardMaterial({
    color: "#8a5c31",
    metalness: 0.66,
    roughness: 0.38,
  });
  const platformInnerPlateMaterial = new MeshStandardMaterial({
    color: "#223642",
    metalness: 0.38,
    roughness: 0.62,
  });
  const platformConveyorRollerMaterial = new MeshStandardMaterial({
    color: "#b06f38",
    metalness: 0.78,
    roughness: 0.3,
  });
  const platformConveyorSlatMaterial = new MeshStandardMaterial({
    color: "#b06f38",
    emissive: "#6b2f10",
    emissiveIntensity: 0.16,
    metalness: 0.68,
    roughness: 0.34,
  });
  const platformConveyorRailMaterial = new MeshStandardMaterial({
    color: "#8f5a30",
    metalness: 0.72,
    roughness: 0.34,
  });
  const platformCrossBraceMaterial = new MeshStandardMaterial({
    color: "#314c5d",
    metalness: 0.42,
    roughness: 0.58,
  });
  const platformSideTrimMaterial = new MeshStandardMaterial({
    color: "#8a5c31",
    metalness: 0.66,
    roughness: 0.38,
  });
  const platformCornerStudMaterial = new MeshStandardMaterial({
    color: "#b77b42",
    metalness: 0.68,
    roughness: 0.34,
  });
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { cachedBox, cachedCylinder } from "$lib/game/cached-geometries";
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
      <T.Mesh
        castShadow
        geometry={platform.shape === "hex"
          ? cachedCylinder(
              platform.args[0],
              platform.args[0],
              platform.args[1] * 2,
              6
            )
          : cachedBox(
              platform.args[0] * 2,
              platform.args[1] * 2,
              platform.args[2] * 2
            )}
        material={getPlatformBodyMaterial(
          platform.color,
          platform.shape === "hex"
        )}
        receiveShadow
      />

      {#if platform.shape === "hex"}
        <T.Mesh
          castShadow
          geometry={cachedCylinder(
            platform.args[0] * 0.94,
            platform.args[0] * 0.94,
            0.06,
            6
          )}
          material={platformHexTopMaterial}
          position={[0, platform.args[1] + 0.03, 0]}
          receiveShadow
        />
        <T.Mesh
          castShadow
          geometry={cachedCylinder(
            platform.args[0] * 0.74,
            platform.args[0] * 0.74,
            0.05,
            6
          )}
          material={platformInnerPlateMaterial}
          position={[0, platform.args[1] + 0.07, 0]}
          receiveShadow
        />
      {:else}
        <T.Mesh
          castShadow
          geometry={cachedBox(
            platform.args[0] * 1.72,
            0.05,
            platform.args[2] * 1.72
          )}
          material={platformInnerPlateMaterial}
          position={[0, platform.args[1] + 0.025, 0]}
          receiveShadow
        />

        {#if platform.conveyor}
          {#each [-1, 1] as end}
            <T.Mesh
              castShadow
              geometry={cachedCylinder(0.16, 0.16, platform.args[0] * 1.72, 14)}
              material={platformConveyorRollerMaterial}
              position={[0, platform.args[1] + 0.12, end * platform.args[2] * 0.88]}
              receiveShadow
              rotation={[0, 0, Math.PI / 2]}
            />
          {/each}

          {#each beltSlots as slot}
            <T.Mesh
              castShadow
              geometry={cachedBox(platform.args[0] * 1.42, 0.08, 0.08)}
              material={platformConveyorSlatMaterial}
              position={[0, platform.args[1] + 0.145, beltSlotZ(slot, platform)]}
              receiveShadow
            />
          {/each}

          {#each [-1, 1] as side}
            <T.Mesh
              castShadow
              geometry={cachedCylinder(0.05, 0.05, platform.args[2] * 1.64, 8)}
              material={platformConveyorRailMaterial}
              position={[
                side * platform.args[0] * 1.04,
                platform.args[1] + 0.02,
                0,
              ]}
              receiveShadow
              rotation={[Math.PI / 2, 0, 0]}
            />
          {/each}
        {:else}
          <T.Mesh
            castShadow
            geometry={cachedBox(platform.args[0] * 1.2, 0.03, 0.045)}
            material={platformCrossBraceMaterial}
            position={[0, platform.args[1] + 0.065, 0]}
            receiveShadow
          />
          <T.Mesh
            castShadow
            geometry={cachedBox(0.045, 0.03, platform.args[2] * 1.2)}
            material={platformCrossBraceMaterial}
            position={[0, platform.args[1] + 0.065, 0]}
            receiveShadow
          />
        {/if}

        {#each [-1, 1] as side}
          <T.Mesh
            castShadow
            geometry={cachedBox(platform.args[0] * 1.9, 0.08, 0.12)}
            material={platformSideTrimMaterial}
            position={[0, platform.args[1] + 0.07, side * platform.args[2] * 0.92]}
            receiveShadow
          />
          <T.Mesh
            castShadow
            geometry={cachedBox(0.12, 0.08, platform.args[2] * 1.9)}
            material={platformSideTrimMaterial}
            position={[side * platform.args[0] * 0.92, platform.args[1] + 0.07, 0]}
            receiveShadow
          />
        {/each}

        {#each [-1, 1] as x}
          {#each [-1, 1] as z}
            <T.Mesh
              castShadow
              geometry={cachedBox(0.2, 0.1, 0.2)}
              material={platformCornerStudMaterial}
              position={[
                x * platform.args[0] * 0.76,
                platform.args[1] + 0.11,
                z * platform.args[2] * 0.76,
              ]}
              receiveShadow
            />
          {/each}
        {/each}
      {/if}
    </RigidBody>
  </T.Group>
{/each}
