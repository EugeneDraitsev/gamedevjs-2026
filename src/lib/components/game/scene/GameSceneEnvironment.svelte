<script lang="ts">
  import RoomArtifactPedestal from "$lib/components/game/scene/environment/RoomArtifactPedestal.svelte";
  import RoomDoors from "$lib/components/game/scene/environment/RoomDoors.svelte";
  import RoomFloor from "$lib/components/game/scene/environment/RoomFloor.svelte";
  import RoomHazards from "$lib/components/game/scene/environment/RoomHazards.svelte";
  import RoomPlatforms from "$lib/components/game/scene/environment/RoomPlatforms.svelte";
  import RoomTemplateEnvironment from "$lib/components/game/scene/environment/RoomTemplateEnvironment.svelte";
  import RoomWalls from "$lib/components/game/scene/environment/RoomWalls.svelte";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  const scene = getGameSceneContext();
  const { room, textures, timing } = scene;
</script>

<RoomFloor
  bossFloorTexture={textures.bossFloor}
  currentRoomTemplate={scene.currentRoomTemplate}
  foundryFloorDecalTexture={textures.foundryFloorDecals}
  foundryFloorTexture={textures.foundryFloor}
  treasureFloorTexture={textures.treasureFloor}
/>

<RoomWalls roomWalls={scene.roomWalls} />

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
  currentFloorPalette={scene.currentFloorPalette}
  environment={scene.roomEnvironment}
/>

<RoomArtifactPedestal
  animationNow={timing.now}
  currentArtifactTemplate={scene.currentArtifactTemplate}
/>
