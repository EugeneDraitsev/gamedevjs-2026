<script lang="ts">
  import { T } from "@threlte/core";
  import RoomArtifactPedestal from "$lib/components/game/scene/environment/RoomArtifactPedestal.svelte";
  import RoomDoors from "$lib/components/game/scene/environment/RoomDoors.svelte";
  import RoomFloor from "$lib/components/game/scene/environment/RoomFloor.svelte";
  import RoomHazards from "$lib/components/game/scene/environment/RoomHazards.svelte";
  import RoomPlatforms from "$lib/components/game/scene/environment/RoomPlatforms.svelte";
  import RoomTemplateEnvironment from "$lib/components/game/scene/environment/RoomTemplateEnvironment.svelte";
  import RoomWalls from "$lib/components/game/scene/environment/RoomWalls.svelte";
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type { Vec3, WallFacing } from "$lib/types/game";

  const scene = getGameSceneContext();
  const { room, textures, timing } = scene;
  const bossDecoratedWallFacings: WallFacing[] = ["east", "south", "west"];
  const bossGearlessWallFacings: WallFacing[] = ["south"];
  const lampLightSlots = [0, 1, 2, 3, 4, 5, 6, 7];
  const hiddenLampLightPosition: Vec3 = [0, -100, 0];
  const decoratedWallFacings = $derived(
    scene.currentRoom.kind === "boss" ? bossDecoratedWallFacings : null
  );
  const gearlessWallFacings = $derived(
    scene.currentRoom.kind === "boss" ? bossGearlessWallFacings : null
  );
  const lampLightPositions = $derived(
    scene.roomWalls
      .filter(
        (wall) =>
          wall.lamp &&
          wall.style === "mechanic" &&
          (!wall.opacity || wall.opacity >= 1)
      )
      .slice(0, lampLightSlots.length)
      .map((wall) => {
        const horizontal = wall.args[0] > wall.args[2];
        const span = (horizontal ? wall.args[0] : wall.args[2]) * 2;
        const count = Math.max(1, Math.round(span / 3.2));
        const offset =
          (Math.floor(count / 2) - (count - 1) / 2) * (span / count);
        const sign = wall.facing === "south" || wall.facing === "east" ? 1 : -1;

        return horizontal
          ? ([
              wall.position[0] + offset * sign,
              wall.position[1] - 0.86,
              wall.position[2] + (wall.args[2] + 0.52) * sign,
            ] as Vec3)
          : ([
              wall.position[0] + (wall.args[0] + 0.52) * sign,
              wall.position[1] - 0.86,
              wall.position[2] - offset * sign,
            ] as Vec3);
      })
  );
</script>

<RoomFloor
  bossFloorTexture={textures.bossFloor}
  currentRoomId={scene.currentRoom.id}
  currentRoomTemplate={scene.currentRoomTemplate}
  foundryFloorDecalTexture={textures.foundryFloorDecals}
  foundryFloorTexture={textures.foundryFloor}
  treasureFloorTexture={textures.treasureFloor}
/>

<RoomWalls
  animationNow={timing.now}
  {decoratedWallFacings}
  {gearlessWallFacings}
  foundryWallDecalTexture={textures.foundryFloorDecals}
  foundryWallTexture={textures.foundryWall}
  roomWalls={scene.roomWalls}
  showWallKit
/>

{#each lampLightSlots as slot}
  <T.PointLight
    color="#ff9d43"
    decay={1.6}
    distance={lampLightPositions[slot] ? 5.4 : 0.1}
    intensity={lampLightPositions[slot] ? 0.7 : 0}
    position={lampLightPositions[slot] ?? hiddenLampLightPosition}
  />
{/each}

<RoomDoors
  bossDoorTexture={textures.bossDoor}
  doorOpenAmount={room.doorOpenAmount}
  roomDoors={scene.roomDoors}
  roomDoorSeals={scene.roomDoorSeals}
/>

<RoomHazards
  animationNow={timing.now}
  lavaSurfaceTexture={textures.lavaSurface}
  roomHazards={scene.roomHazards}
/>

<RoomPlatforms animationNow={timing.now} roomPlatforms={scene.roomPlatforms} />

<RoomTemplateEnvironment
  bossBannerTexture={textures.bossBanner}
  currentFloorPalette={scene.currentFloorPalette}
  environment={scene.roomEnvironment}
/>

<RoomArtifactPedestal
  animationNow={timing.now}
  currentArtifactTemplate={scene.currentArtifactTemplate}
/>

<T.Group position={[0, 0.08, 0]} scale={[0.001, 0.001, 0.001]}>
  {#each [textures.treasureFloor, textures.bossFloor, textures.bossDoor, textures.lavaSurface, textures.bossBanner] as texture}
    {#if texture}
      <T.Mesh rotation={[-Math.PI / 2, 0, 0]}>
        <T.PlaneGeometry args={[4, 4]} />
        <T.MeshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.08}
          metalness={0.26}
          roughness={0.66}
        />
      </T.Mesh>
    {/if}
  {/each}

  <T.Mesh>
    <T.BoxGeometry args={[1, 1, 1]} />
    <T.MeshStandardMaterial
      color="#d18b3e"
      emissive="#5d2d08"
      emissiveIntensity={0.16}
      metalness={0.78}
      roughness={0.26}
    />
  </T.Mesh>

  <T.Mesh>
    <T.TorusGeometry args={[1, 0.12, 12, 32]} />
    <T.MeshBasicMaterial color="#ffd166" transparent opacity={0.01} />
  </T.Mesh>

  <T.Mesh>
    <T.CylinderGeometry args={[1, 1, 0.2, 6]} />
    <T.MeshStandardMaterial
      color="#223642"
      flatShading
      metalness={0.38}
      roughness={0.62}
    />
  </T.Mesh>

  <T.Mesh>
    <T.CylinderGeometry args={[0.16, 0.16, 1, 14]} />
    <T.MeshStandardMaterial color="#b06f38" metalness={0.78} roughness={0.3} />
  </T.Mesh>

  <T.Mesh>
    <T.ConeGeometry args={[0.22, 0.48, 6]} />
    <T.MeshStandardMaterial
      color="#af6b32"
      emissive="#5d190c"
      emissiveIntensity={0.18}
      metalness={0.54}
      roughness={0.42}
    />
  </T.Mesh>
</T.Group>
