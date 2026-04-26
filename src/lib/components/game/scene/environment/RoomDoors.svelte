<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
  import FoundryDoorFrame from "$lib/components/game/scene/environment/walls/FoundryDoorFrame.svelte";
  import {
    markTransitionPhaseEnd,
    markTransitionPhaseStart,
  } from "$lib/debug/transition-perf";
  import { cachedBox } from "$lib/game/cached-geometries";
  import type { DoorMarker, DoorSeal, Vec3 } from "$lib/types/game";

  let {
    bossDoorTexture = null,
    doorOpenAmount,
    roomDoors,
    roomDoorSeals,
  }: {
    bossDoorTexture?: Texture | null;
    doorOpenAmount: number;
    roomDoors: DoorMarker[];
    roomDoorSeals: DoorSeal[];
  } = $props();

  const sealHorizontal = (seal: DoorSeal) => seal.args[0] > seal.args[2];
  const sealPosition = (seal: DoorSeal, offset: number, y: number): Vec3 =>
    sealHorizontal(seal) ? [offset, y, 0] : [0, y, offset];
  const sealBox = (
    seal: DoorSeal,
    width: number,
    height: number,
    depth: number
  ): Vec3 =>
    sealHorizontal(seal) ? [width, height, depth] : [depth, height, width];
  const sealBoxGeo = (
    seal: DoorSeal,
    width: number,
    height: number,
    depth: number
  ) => {
    const [w, h, d] = sealBox(seal, width, height, depth);

    return cachedBox(w, h, d);
  };
  const sealRotation = (seal: DoorSeal): Vec3 =>
    sealHorizontal(seal) ? [0, 0, 0] : [0, Math.PI / 2, 0];
  const sealSpan = (seal: DoorSeal) =>
    (sealHorizontal(seal) ? seal.args[0] : seal.args[2]) * 2;
  const sealOpacity = (seal: DoorSeal) => (seal.position[2] > 0 ? 0.28 : 1);
  const sealSolid = (seal: DoorSeal) => sealOpacity(seal) >= 1;
  const gateVisualOpacity = $derived(
    Math.max(0.001, Math.min(1, (0.998 - doorOpenAmount) / 0.018))
  );
  const sealVisualOpacity = (seal: DoorSeal) =>
    sealOpacity(seal) * gateVisualOpacity;
  const sealVisualDepthWrite = (seal: DoorSeal) =>
    sealSolid(seal) && gateVisualOpacity > 0.98;
  const gateSides = [-1, 1];
  const gateBarOffsets = [-0.28, 0, 0.28];
  const gateRails = [-1.24, 0.92];
  const gateRivetOffsets = [-0.34, 0.34];
  const gateRivetRows = [-0.72, 0.42];
  let flushStartedAt = 0;

  $effect.pre(() => {
    roomDoors;
    roomDoorSeals;
    doorOpenAmount;
    flushStartedAt = markTransitionPhaseStart();
  });

  $effect(() => {
    roomDoors;
    roomDoorSeals;
    doorOpenAmount;
    markTransitionPhaseEnd("flush-room-doors", flushStartedAt, () => ({
      doors: roomDoors.length,
      mechanicSeals: roomDoorSeals.filter((seal) => seal.style === "mechanic")
        .length,
      seals: roomDoorSeals.length,
    }));
  });
</script>

{#each roomDoors as door (door.id)}
  <T.Group position={door.position}>
    <T.Mesh
      geometry={cachedBox(door.args[0], door.args[1], door.args[2])}
      receiveShadow
    >
      <T.MeshStandardMaterial
        color={door.color}
        emissive={door.emissive ?? door.color}
        emissiveIntensity={0.2}
        map={door.boss ? bossDoorTexture : null}
        metalness={0.28}
        roughness={door.boss ? 0.18 : 0.36}
      />
    </T.Mesh>
    {#if door.style === "mechanic"}
      <T.Mesh
        geometry={cachedBox(door.args[0] * 1.35, 0.035, door.args[2] * 1.35)}
        position={[0, 0.035, 0]}
        receiveShadow
      >
        <T.MeshStandardMaterial
          color={door.trimColor ?? door.color}
          emissive={door.emissive ?? door.color}
          emissiveIntensity={0.08}
          metalness={0.58}
          roughness={0.34}
        />
      </T.Mesh>
    {/if}
  </T.Group>
{/each}

{#each roomDoorSeals as seal (seal.id)}
  {#if seal.style === "mechanic"}
    <T.Group position={seal.position}>
      {#if sealSolid(seal)}
        <T.Group
          position={sealPosition(seal, 0, 0.02)}
          rotation={sealRotation(seal)}
        >
          <FoundryDoorFrame
            height={seal.args[1] * 1.8}
            trimColor={seal.trimColor ?? "#5d4528"}
            width={sealSpan(seal) + 0.55}
          />
        </T.Group>
      {/if}

      {#if doorOpenAmount <= 1}
        {#each gateSides as side}
          <T.Mesh
            castShadow={false}
            geometry={sealBoxGeo(seal, 0.42, seal.args[1] * 2.08, 0.5)}
            position={sealPosition(
              seal,
              side * (sealSpan(seal) * 0.5 + 0.34),
              0
            )}
            receiveShadow
          >
            <T.MeshStandardMaterial
              color="#25231d"
              metalness={0.34}
              opacity={sealVisualOpacity(seal)}
              roughness={0.66}
              transparent
              depthWrite={sealVisualDepthWrite(seal)}
            />
          </T.Mesh>

          <T.Mesh
            castShadow={false}
            geometry={sealBoxGeo(seal, 0.72, 0.24, 0.72)}
            position={sealPosition(
              seal,
              side * (sealSpan(seal) * 0.5 + 0.34),
              -seal.args[1] - 0.1
            )}
            receiveShadow
          >
            <T.MeshStandardMaterial
              color={seal.trimColor ?? "#5d4528"}
              metalness={0.58}
              opacity={sealVisualOpacity(seal)}
              roughness={0.42}
              transparent
              depthWrite={sealVisualDepthWrite(seal)}
            />
          </T.Mesh>
        {/each}

        {#each [-seal.args[1] - 0.02, seal.args[1] - 0.14] as y}
          <T.Mesh
            castShadow={false}
            geometry={sealBoxGeo(seal, sealSpan(seal) + 0.9, 0.22, 0.38)}
            position={sealPosition(seal, 0, y)}
            receiveShadow
          >
            <T.MeshStandardMaterial
              color={seal.trimColor ?? "#5d4528"}
              metalness={0.62}
              opacity={sealVisualOpacity(seal)}
              roughness={0.38}
              transparent
              depthWrite={sealVisualDepthWrite(seal)}
            />
          </T.Mesh>
        {/each}

        {#each gateSides as side}
          <T.Group
            position={sealPosition(
              seal,
              side *
                (sealSpan(seal) * 0.2 + doorOpenAmount * sealSpan(seal) * 0.62),
              0
            )}
          >
            {#each gateBarOffsets as offset}
              <T.Mesh
                castShadow={false}
                geometry={sealBoxGeo(seal, 0.08, seal.args[1] * 1.4, 0.12)}
                position={sealPosition(seal, offset, -0.1)}
                receiveShadow
              >
                <T.MeshStandardMaterial
                  color="#191712"
                  metalness={0.78}
                  opacity={sealVisualOpacity(seal)}
                  roughness={0.32}
                  transparent
                  depthWrite={sealVisualDepthWrite(seal)}
                />
              </T.Mesh>
            {/each}

            {#each gateRails as y}
              <T.Mesh
                castShadow={false}
                geometry={sealBoxGeo(seal, 0.88, 0.14, 0.14)}
                position={sealPosition(seal, 0, y)}
                receiveShadow
              >
                <T.MeshStandardMaterial
                  color={seal.trimColor ?? "#5d4528"}
                  metalness={0.72}
                  opacity={sealVisualOpacity(seal)}
                  roughness={0.36}
                  transparent
                  depthWrite={sealVisualDepthWrite(seal)}
                />
              </T.Mesh>
            {/each}

            <T.Mesh
              castShadow={false}
              geometry={sealBoxGeo(seal, 0.38, 0.28, 0.18)}
              position={sealPosition(seal, 0, -0.38)}
              receiveShadow
            >
              <T.MeshStandardMaterial
                color={seal.trimColor ?? "#5d4528"}
                emissive={seal.emissive ?? "#1b130c"}
                emissiveIntensity={0.12}
                metalness={0.76}
                opacity={sealVisualOpacity(seal)}
                roughness={0.3}
                transparent
                depthWrite={sealVisualDepthWrite(seal)}
              />
            </T.Mesh>

            {#each gateRivetRows as y}
              {#each gateRivetOffsets as offset}
                <T.Mesh
                  castShadow={false}
                  geometry={sealBoxGeo(seal, 0.11, 0.11, 0.2)}
                  position={sealPosition(seal, offset, y)}
                >
                  <T.MeshStandardMaterial
                    color="#d18b3e"
                    emissive="#5d2d08"
                    emissiveIntensity={0.16}
                    metalness={0.78}
                    opacity={sealVisualOpacity(seal)}
                    roughness={0.26}
                    transparent
                    depthWrite={sealVisualDepthWrite(seal)}
                  />
                </T.Mesh>
              {/each}
            {/each}
          </T.Group>
        {/each}
      {/if}
    </T.Group>
  {/if}
{/each}

{#each roomDoorSeals as seal (seal.id)}
  <T.Group
    position={[
      seal.position[0],
      seal.position[1] + doorOpenAmount * 8,
      seal.position[2],
    ]}
  >
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={seal.args}
        friction={0.92}
        restitution={0.02}
      />
    </RigidBody>
  </T.Group>

  {#if seal.style !== "mechanic" && doorOpenAmount < 0.999}
    <T.Group
      position={[
        seal.position[0],
        seal.position[1] + doorOpenAmount * 3.4,
        seal.position[2],
      ]}
    >
      <T.Mesh castShadow={false} receiveShadow>
        <T.BoxGeometry
          args={[
            seal.args[0] * 2,
            Math.max(0.18, seal.args[1] * (1 - doorOpenAmount)) * 2,
            seal.args[2] * 2,
          ]}
        />
        <T.MeshStandardMaterial
          color={seal.color}
          emissive={seal.emissive ?? seal.color}
          emissiveIntensity={0.26}
          metalness={0.34}
          opacity={0.9 - doorOpenAmount * 0.35}
          roughness={0.28}
          transparent
        />
      </T.Mesh>
    </T.Group>
  {/if}
{/each}
