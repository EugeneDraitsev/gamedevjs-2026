<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import type { StaticWall, Vec3 } from "$lib/types/game";

  let { roomWalls }: { roomWalls: StaticWall[] } = $props();

  const panelRows = [-0.55, 0, 0.55];
  const panelSlots = [-0.52, 0, 0.52];
  const isHorizontal = (wall: StaticWall) => wall.args[0] > wall.args[2];
  const wallSolid = (wall: StaticWall) =>
    wall.opacity === undefined || wall.opacity >= 1;
  const wallSpan = (wall: StaticWall) =>
    (isHorizontal(wall) ? wall.args[0] : wall.args[2]) * 2;
  const faceSign = (wall: StaticWall) =>
    wall.facing === "south" || wall.facing === "east" ? 1 : -1;
  const facePosition = (
    wall: StaticWall,
    along: number,
    y: number,
    lift = 0.05
  ): Vec3 =>
    isHorizontal(wall)
      ? [along, y, faceSign(wall) * (wall.args[2] + lift)]
      : [faceSign(wall) * (wall.args[0] + lift), y, along];
  const faceBox = (
    wall: StaticWall,
    width: number,
    height: number,
    depth: number
  ): Vec3 =>
    isHorizontal(wall) ? [width, height, depth] : [depth, height, width];
</script>

{#each roomWalls as wall (wall.id)}
  <T.Group position={wall.position}>
    <RigidBody type="fixed">
      <Collider
        shape="cuboid"
        args={wall.args}
        friction={0.92}
        restitution={0.22}
      />

      <T.Mesh castShadow={wallSolid(wall)} receiveShadow>
        <T.BoxGeometry
          args={[wall.args[0] * 2, wall.args[1] * 2, wall.args[2] * 2]}
        />
        <T.MeshStandardMaterial
          color={wall.color}
          metalness={0.08}
          opacity={wall.opacity ?? 1}
          roughness={0.9}
          transparent={wall.opacity !== undefined && wall.opacity < 1}
          depthWrite={wallSolid(wall)}
        />
      </T.Mesh>

      {#if wall.style === "mechanic" && wallSolid(wall)}
        {#each panelRows as row}
          {#each panelSlots as slot}
            <T.Mesh
              castShadow
              receiveShadow
              position={facePosition(wall, slot * wallSpan(wall) * 0.42, row, 0.08)}
            >
              <T.BoxGeometry
                args={faceBox(wall, wallSpan(wall) * 0.24, 0.42, 0.1)}
              />
              <T.MeshStandardMaterial
                color={wall.color}
                metalness={0.24}
                roughness={0.76}
              />
            </T.Mesh>
          {/each}
        {/each}

        {#each [-1, 1] as side}
          <T.Mesh
            castShadow
            receiveShadow
            position={facePosition(wall, side * wallSpan(wall) * 0.42, 0, 0.14)}
          >
            <T.BoxGeometry
              args={faceBox(wall, 0.58, wall.args[1] * 2.04, 0.22)}
            />
            <T.MeshStandardMaterial
              color={wall.trimColor ?? wall.color}
              metalness={0.42}
              roughness={0.58}
            />
          </T.Mesh>
        {/each}

        <T.Mesh
          castShadow
          receiveShadow
          position={facePosition(wall, 0, wall.args[1] + 0.1, 0.12)}
        >
          <T.BoxGeometry
            args={faceBox(wall, wallSpan(wall) + 0.34, 0.24, 0.4)}
          />
          <T.MeshStandardMaterial
            color="#211b14"
            metalness={0.34}
            roughness={0.62}
          />
        </T.Mesh>

        {#if wall.lamp && wallSpan(wall) > 3}
          <T.PointLight
            color="#ff9d43"
            distance={5}
            intensity={1.7}
            position={facePosition(wall, 0, -0.08, 0.58)}
          />
          <T.Mesh position={facePosition(wall, 0, 0.18, 0.18)}>
            <T.BoxGeometry args={faceBox(wall, 0.42, 0.24, 0.12)} />
            <T.MeshStandardMaterial
              color={wall.trimColor ?? "#6b4b28"}
              metalness={0.68}
              roughness={0.36}
            />
          </T.Mesh>
          <T.Mesh position={facePosition(wall, 0, -0.12, 0.24)}>
            <T.SphereGeometry args={[0.2, 12, 8]} />
            <T.MeshBasicMaterial color="#ffb257" />
          </T.Mesh>
        {/if}

        {#each [-0.28, 0.28] as slot}
          <T.Mesh
            castShadow
            position={facePosition(wall, slot * wallSpan(wall), -0.18, 0.2)}
          >
            <T.CylinderGeometry args={[0.035, 0.035, 1.6, 6]} />
            <T.MeshStandardMaterial
              color="#15100a"
              metalness={0.8}
              roughness={0.36}
            />
          </T.Mesh>
        {/each}
      {/if}
    </RigidBody>
  </T.Group>
{/each}
