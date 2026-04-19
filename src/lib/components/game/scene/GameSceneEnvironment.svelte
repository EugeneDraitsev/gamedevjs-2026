<script lang="ts">
  import { getGameSceneContext } from "$lib/components/game/scene/context";
  import RoomArtifactPedestal from "$lib/components/game/scene/environment/RoomArtifactPedestal.svelte";
  import RoomDoors from "$lib/components/game/scene/environment/RoomDoors.svelte";
  import RoomFloor from "$lib/components/game/scene/environment/RoomFloor.svelte";
  import RoomHazards from "$lib/components/game/scene/environment/RoomHazards.svelte";
  import RoomPlatforms from "$lib/components/game/scene/environment/RoomPlatforms.svelte";
  import RoomTemplateEnvironment from "$lib/components/game/scene/environment/RoomTemplateEnvironment.svelte";
  import RoomWalls from "$lib/components/game/scene/environment/RoomWalls.svelte";

  const {
    animationNow,
    bossDoorTexture,
    bossFloorTexture,
    currentArtifactTemplate,
    currentFloorPalette,
    currentRoomTemplate,
    doorOpenAmount,
    lavaSurfaceTexture,
    roomDoorSeals,
    roomDoors,
    roomEnvironment,
    roomHazards,
    roomPlatforms,
    roomWalls,
    treasureFloorTexture,
  } = getGameSceneContext();
</script>

<RoomFloor
  bossFloorTexture={$bossFloorTexture}
  currentFloorPalette={$currentFloorPalette}
  currentRoomTemplate={$currentRoomTemplate}
  treasureFloorTexture={$treasureFloorTexture}
/>

<RoomWalls roomWalls={$roomWalls} />

<RoomDoors
  bossDoorTexture={$bossDoorTexture}
  doorOpenAmount={$doorOpenAmount}
  roomDoors={$roomDoors}
  roomDoorSeals={$roomDoorSeals}
/>

<RoomHazards
  lavaSurfaceTexture={$lavaSurfaceTexture}
  roomHazards={$roomHazards}
/>

<RoomPlatforms roomPlatforms={$roomPlatforms} />

<RoomTemplateEnvironment
  currentFloorPalette={$currentFloorPalette}
  environment={$roomEnvironment}
/>

<RoomArtifactPedestal
  animationNow={$animationNow}
  currentArtifactTemplate={$currentArtifactTemplate}
/>
