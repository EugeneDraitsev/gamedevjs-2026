<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { Texture } from "three";
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
  const sealRotation = (seal: DoorSeal): Vec3 =>
    sealHorizontal(seal) ? [0, 0, 0] : [0, Math.PI / 2, 0];
  const sealSpan = (seal: DoorSeal) =>
    (sealHorizontal(seal) ? seal.args[0] : seal.args[2]) * 2;
  const sealOpacity = (seal: DoorSeal) => (seal.position[2] > 0 ? 0.28 : 1);
  const sealSolid = (seal: DoorSeal) => sealOpacity(seal) >= 1;
  const gateSides = [-1, 1];
  const gateChainLinks = [-1.05, -0.45, 0.15, 0.75];
  const gateBarOffsets = [-0.32, 0, 0.32];
  const gateRails = [-1.45, 0.95];
  const gearTeeth = Array.from({ length: 10 }, (_, index) => {
    const rotation = (index / 10) * Math.PI * 2;

    return { rotation, x: Math.cos(rotation), y: Math.sin(rotation) };
  });
</script>

{#each roomDoors as door (door.id)}
  <T.Group position={door.position}>
    <T.Mesh receiveShadow>
      <T.BoxGeometry args={door.args} />
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
      <T.Mesh position={[0, 0.035, 0]} receiveShadow>
        <T.BoxGeometry
          args={[door.args[0] * 1.35, 0.035, door.args[2] * 1.35]}
        />
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
      {#each gateSides as side}
        <T.Mesh
          castShadow={sealSolid(seal)}
          receiveShadow
          position={sealPosition(seal, side * (sealSpan(seal) * 0.5 + 0.34), 0)}
        >
          <T.BoxGeometry args={sealBox(seal, 0.42, seal.args[1] * 2.08, 0.5)} />
          <T.MeshStandardMaterial
            color="#25231d"
            metalness={0.34}
            opacity={sealOpacity(seal)}
            roughness={0.66}
            transparent={!sealSolid(seal)}
            depthWrite={sealSolid(seal)}
          />
        </T.Mesh>

        <T.Mesh
          castShadow={sealSolid(seal)}
          receiveShadow
          position={sealPosition(
            seal,
            side * (sealSpan(seal) * 0.5 + 0.34),
            -seal.args[1] - 0.1
          )}
        >
          <T.BoxGeometry args={sealBox(seal, 0.72, 0.24, 0.72)} />
          <T.MeshStandardMaterial
            color={seal.trimColor ?? "#5d4528"}
            metalness={0.58}
            opacity={sealOpacity(seal)}
            roughness={0.42}
            transparent={!sealSolid(seal)}
            depthWrite={sealSolid(seal)}
          />
        </T.Mesh>

        {#each gateChainLinks as y}
          <T.Mesh
            castShadow={sealSolid(seal)}
            position={sealPosition(seal, side * (sealSpan(seal) * 0.5 + 0.72), y)}
            rotation={sealRotation(seal)}
          >
            <T.TorusGeometry args={[0.13, 0.035, 6, 10]} />
            <T.MeshStandardMaterial
              color="#16110b"
              metalness={0.82}
              opacity={sealOpacity(seal)}
              roughness={0.34}
              transparent={!sealSolid(seal)}
              depthWrite={sealSolid(seal)}
            />
          </T.Mesh>
        {/each}
      {/each}

      {#each [-seal.args[1] - 0.02, seal.args[1] - 0.14] as y}
        <T.Mesh
          castShadow={sealSolid(seal)}
          receiveShadow
          position={sealPosition(seal, 0, y)}
        >
          <T.BoxGeometry
            args={sealBox(seal, sealSpan(seal) + 0.9, 0.22, 0.38)}
          />
          <T.MeshStandardMaterial
            color={seal.trimColor ?? "#5d4528"}
            metalness={0.62}
            opacity={sealOpacity(seal)}
            roughness={0.38}
            transparent={!sealSolid(seal)}
            depthWrite={sealSolid(seal)}
          />
        </T.Mesh>
      {/each}

      {#each gateSides as side}
        <T.Group
          position={sealPosition(
            seal,
            side * (sealSpan(seal) * 0.24 + doorOpenAmount * 0.95),
            0
          )}
        >
          {#each gateBarOffsets as offset}
            <T.Mesh
              castShadow={sealSolid(seal)}
              receiveShadow
              position={sealPosition(seal, offset, -0.1)}
            >
              <T.BoxGeometry
                args={sealBox(seal, 0.08, seal.args[1] * 1.55, 0.12)}
              />
              <T.MeshStandardMaterial
                color="#191712"
                metalness={0.78}
                opacity={sealOpacity(seal)}
                roughness={0.32}
                transparent={!sealSolid(seal)}
                depthWrite={sealSolid(seal)}
              />
            </T.Mesh>

            <T.Mesh
              castShadow={sealSolid(seal)}
              position={sealPosition(seal, offset, seal.args[1] * 0.74)}
            >
              <T.ConeGeometry args={[0.1, 0.34, 4]} />
              <T.MeshStandardMaterial
                color={seal.trimColor ?? "#5d4528"}
                metalness={0.78}
                opacity={sealOpacity(seal)}
                roughness={0.34}
                transparent={!sealSolid(seal)}
                depthWrite={sealSolid(seal)}
              />
            </T.Mesh>
          {/each}

          {#each gateRails as y}
            <T.Mesh
              castShadow={sealSolid(seal)}
              receiveShadow
              position={sealPosition(seal, 0, y)}
            >
              <T.BoxGeometry args={sealBox(seal, 0.9, 0.16, 0.16)} />
              <T.MeshStandardMaterial
                color={seal.trimColor ?? "#5d4528"}
                metalness={0.72}
                opacity={sealOpacity(seal)}
                roughness={0.36}
                transparent={!sealSolid(seal)}
                depthWrite={sealSolid(seal)}
              />
            </T.Mesh>
          {/each}

          <T.Mesh
            castShadow={sealSolid(seal)}
            position={sealPosition(seal, 0, -0.1)}
            rotation={sealRotation(seal)}
          >
            <T.TorusGeometry args={[0.28, 0.055, 8, 14]} />
            <T.MeshStandardMaterial
              color={seal.trimColor ?? "#5d4528"}
              emissive={seal.emissive ?? "#ff9d43"}
              emissiveIntensity={0.08}
              metalness={0.82}
              opacity={sealOpacity(seal)}
              roughness={0.32}
              transparent={!sealSolid(seal)}
              depthWrite={sealSolid(seal)}
            />
          </T.Mesh>
        </T.Group>
      {/each}

      <T.PointLight
        color={seal.emissive ?? "#ff9d43"}
        distance={4}
        intensity={Math.max(0, 1.5 * (1 - doorOpenAmount / 0.92))}
        position={sealPosition(seal, 0, -0.12)}
      />
      <T.Group visible={doorOpenAmount < 0.92}>
        <T.Mesh
          castShadow={sealSolid(seal)}
          position={sealPosition(seal, 0, -0.1)}
          rotation={sealRotation(seal)}
        >
          <T.TorusGeometry args={[0.42, 0.09, 10, 18]} />
          <T.MeshStandardMaterial
            color={seal.trimColor ?? "#5d4528"}
            emissive={seal.emissive ?? "#ff9d43"}
            emissiveIntensity={0.12}
            metalness={0.82}
            opacity={sealOpacity(seal)}
            roughness={0.3}
            transparent={!sealSolid(seal)}
            depthWrite={sealSolid(seal)}
          />
        </T.Mesh>

        {#each gearTeeth as tooth}
          <T.Mesh
            castShadow={sealSolid(seal)}
            position={sealPosition(seal, tooth.x * 0.42, -0.1 + tooth.y * 0.42)}
            rotation={sealHorizontal(seal)
              ? [0, 0, tooth.rotation]
              : [0, Math.PI / 2, tooth.rotation]}
          >
            <T.BoxGeometry args={sealBox(seal, 0.12, 0.26, 0.08)} />
            <T.MeshStandardMaterial
              color={seal.trimColor ?? "#5d4528"}
              emissive={seal.emissive ?? "#ff9d43"}
              emissiveIntensity={0.08}
              metalness={0.82}
              opacity={sealOpacity(seal)}
              roughness={0.32}
              transparent={!sealSolid(seal)}
              depthWrite={sealSolid(seal)}
            />
          </T.Mesh>
        {/each}
      </T.Group>
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
      <T.Mesh castShadow receiveShadow>
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
