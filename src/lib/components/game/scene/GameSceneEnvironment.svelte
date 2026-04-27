<script lang="ts">
  import { T } from "@threlte/core";
  import FloorExitPortal from "$lib/components/game/scene/environment/FloorExitPortal.svelte";
  import RoomArtifactPedestal from "$lib/components/game/scene/environment/RoomArtifactPedestal.svelte";
  import RoomDoors from "$lib/components/game/scene/environment/RoomDoors.svelte";
  import RoomFloor from "$lib/components/game/scene/environment/RoomFloor.svelte";
  import RoomHazards from "$lib/components/game/scene/environment/RoomHazards.svelte";
  import RoomPlatforms from "$lib/components/game/scene/environment/RoomPlatforms.svelte";
  import RoomTemplateEnvironment from "$lib/components/game/scene/environment/RoomTemplateEnvironment.svelte";
  import RoomWallShadows from "$lib/components/game/scene/environment/RoomWallShadows.svelte";
  import RoomWalls from "$lib/components/game/scene/environment/RoomWalls.svelte";
  import InstancedFoundryWallKits from "$lib/components/game/scene/environment/walls/InstancedFoundryWallKits.svelte";
  import { getMachineModule } from "$lib/config/machine-modules";
  import { roomTemplateById } from "$lib/config/room-templates";
  import {
    markTransitionPhaseEnd,
    markTransitionPhaseStart,
  } from "$lib/debug/transition-perf";
  import { cachedBox, cachedPlane } from "$lib/game/cached-geometries";
  import { foundryWallKitLampPositions } from "$lib/game/foundry-wall-kit-layout";
  import {
    createDoorMarkers,
    createDoorSeals,
    createRoomWalls,
    getRoomBounds,
    getRoomHazards,
    getRoomPlatforms,
    getRoomSkin,
  } from "$lib/game/scene-layout";
  import { getGameSceneContext } from "$lib/stores/scene-context";
  import type {
    DoorMarker,
    DoorSeal,
    RoomPlatform,
    StaticWall,
    Vec3,
    WallFacing,
  } from "$lib/types/game";

  interface Props {
    corePrisonSealBrokenAt?: number;
    corePrisonSealHits?: number;
    corePrisonSealHitsRequired?: number;
    corePrisonSealLocked?: boolean;
    outsideDetailLevel?: number;
    warmupVisible?: boolean;
  }

  let {
    corePrisonSealBrokenAt = 0,
    corePrisonSealHits = 0,
    corePrisonSealHitsRequired = 2,
    corePrisonSealLocked = true,
    outsideDetailLevel = 3,
    warmupVisible = false,
  }: Props = $props();

  const scene = getGameSceneContext();
  const { room, textures, timing } = scene;
  const outside = $derived(scene.currentRoomTemplate.layout === "outside-yard");
  const outsideGateUnlocked = $derived(
    outside && scene.room.clearedSet.has(scene.currentRoom.id)
  );
  const bossDecoratedWallFacings: WallFacing[] = ["east", "south", "west"];
  const bossGearlessWallFacings: WallFacing[] = ["south"];
  const inactiveLightPosition: Vec3 = [0, -32, 0];
  const maxLampLights = 8;
  const lavaHazardWarmups = [
    ...getRoomHazards("lava-lane"),
    ...getRoomHazards("lava-ring"),
    ...getRoomHazards("lava-bridge"),
    ...getRoomHazards("lava-cross"),
    ...getRoomHazards("lava-gauntlet"),
    ...getRoomHazards("boss-bomber"),
  ];
  const artifactPedestalWarmupTemplate = getMachineModule("arc-splitter-coil");
  const wallKitWarmups: StaticWall[] = [
    {
      args: [8, 1.9, 0.16],
      color: "#2f332f",
      facing: "north",
      id: "warmup-wallkit-long",
      lamp: true,
      position: [0, 2.1, 0],
      style: "mechanic",
      trimColor: "#7b4b22",
    },
    {
      args: [4.8, 1.9, 0.16],
      color: "#2f332f",
      facing: "south",
      id: "warmup-wallkit-three",
      lamp: true,
      position: [0, 2.1, 2],
      style: "mechanic",
      trimColor: "#7b4b22",
    },
  ];
  const roomDoorWarmups: DoorMarker[] = [
    {
      args: [0.95, 0.05, 0.45],
      boss: true,
      color: "#ffd166",
      emissive: "#ffd166",
      id: "warmup-boss-door",
      position: [0, 0.03, 0],
      style: "mechanic",
      trimColor: "#7b4b22",
    },
  ];
  const roomDoorSealWarmups: DoorSeal[] = [
    {
      args: [1.8, 2.2, 0.16],
      color: "#9dd6ff",
      emissive: "#ffd166",
      id: "warmup-mechanic-seal",
      position: [0, 2.1, 0],
      style: "mechanic",
      trimColor: "#7b4b22",
    },
  ];
  const roomPlatformWarmups: RoomPlatform[] = [
    {
      args: [2.2, 0.2, 1.2],
      color: "#2f4559",
      id: "warmup-box-platform",
      position: [0, 0.2, 0],
    },
    {
      args: [1.1, 0.46, 1.1],
      color: "#55738a",
      id: "warmup-hex-platform",
      position: [3.4, 0.46, 0],
      shape: "hex",
    },
    {
      args: [1.15, 0.18, 2.2],
      color: "#31495f",
      conveyor: [0, 0, 3.08],
      id: "warmup-conveyor-platform",
      position: [-3.4, 0.18, 0],
    },
  ];
  const decoratedWallFacings = $derived(
    scene.currentRoom.kind === "boss" ? bossDecoratedWallFacings : null
  );
  const gearlessWallFacings = $derived(
    scene.currentRoom.kind === "boss" ? bossGearlessWallFacings : null
  );
  const warmupBossRoom = $derived.by(
    () =>
      Object.values(scene.dungeon.rooms).find((candidate) => {
        if (candidate.kind !== "boss") {
          return false;
        }

        const template = roomTemplateById[candidate.templateId];

        return template?.environment === "boss-gears";
      }) ?? null
  );
  const warmupBossTemplate = $derived(
    warmupBossRoom ? roomTemplateById[warmupBossRoom.templateId] : null
  );
  const warmupBossSkin = $derived(
    warmupBossRoom && warmupBossTemplate
      ? getRoomSkin(warmupBossRoom, warmupBossTemplate)
      : null
  );
  const warmupBossBounds = $derived(
    warmupBossTemplate ? getRoomBounds(warmupBossTemplate.layout) : null
  );
  const warmupBossWalls = $derived.by(() => {
    if (!(warmupBossRoom && warmupBossSkin)) {
      return [] as StaticWall[];
    }

    return createRoomWalls(
      warmupBossRoom,
      scene.currentWallPalette,
      warmupBossSkin
    );
  });
  const warmupBossWallKitLimit = $derived(
    warmupBossWalls.filter(
      (wall) => wall.style === "mechanic" && (wall.opacity ?? 1) >= 1
    ).length
  );
  const warmupBossDoors = $derived(
    warmupBossRoom && warmupBossSkin
      ? createDoorMarkers(warmupBossRoom, scene.dungeon, warmupBossSkin)
      : []
  );
  const warmupBossDoorSeals = $derived(
    warmupBossRoom && warmupBossSkin
      ? createDoorSeals(warmupBossRoom, warmupBossSkin)
      : []
  );
  const warmupBossHazards = $derived(
    warmupBossTemplate ? getRoomHazards(warmupBossTemplate.layout) : []
  );
  const warmupBossPlatforms = $derived(
    warmupBossTemplate ? getRoomPlatforms(warmupBossTemplate.layout) : []
  );
  const lampLights = $derived.by(() => {
    if (outside) {
      return Array.from({ length: maxLampLights }, (_unused, slot) => ({
        id: `room-lamp-${slot}`,
        intensity: 0,
        position: inactiveLightPosition,
      }));
    }

    const positions = foundryWallKitLampPositions({
      decoratedWallFacings,
      limit: scene.roomWalls.length,
      roomWalls: scene.roomWalls,
    }).slice(0, maxLampLights);

    return Array.from({ length: maxLampLights }, (_unused, slot) => {
      const position = positions[slot];

      return {
        id: `room-lamp-${slot}`,
        intensity: position ? 0.7 : 0,
        position: position ?? inactiveLightPosition,
      };
    });
  });
  let environmentFlushStartedAt = 0;

  $effect.pre(() => {
    scene.currentRoom.id;
    scene.currentRoomTemplate.id;
    scene.roomWalls;
    scene.roomDoors;
    scene.roomDoorSeals;
    scene.roomHazards;
    scene.roomPlatforms;
    environmentFlushStartedAt = markTransitionPhaseStart();
  });

  $effect(() => {
    scene.currentRoom.id;
    scene.currentRoomTemplate.id;
    scene.roomWalls;
    scene.roomDoors;
    scene.roomDoorSeals;
    scene.roomHazards;
    scene.roomPlatforms;
    markTransitionPhaseEnd(
      "flush-scene-environment",
      environmentFlushStartedAt,
      () => ({
        doors: scene.roomDoors.length,
        hazards: scene.roomHazards.length,
        platforms: scene.roomPlatforms.length,
        roomId: scene.currentRoom.id,
        templateId: scene.currentRoomTemplate.id,
        walls: scene.roomWalls.length,
      })
    );
  });
</script>

<RoomFloor
  bossFloorHeightTexture={scene.floorReliefMaps ? textures.bossFloorHeight : null}
  bossFloorNormalTexture={scene.floorReliefMaps ? textures.bossFloorNormal : null}
  bossFloorTexture={textures.bossFloor}
  bounds={scene.roomBounds}
  currentRoomId={scene.currentRoom.id}
  currentRoomTemplate={scene.currentRoomTemplate}
  floorReliefStrength={scene.floorReliefStrength}
  foundryFloorDecalTexture={textures.foundryFloorDecals}
  foundryFloorTexture={textures.foundryFloor}
  treasureFloorHeightTexture={scene.floorReliefMaps ? textures.treasureFloorHeight : null}
  treasureFloorNormalTexture={scene.floorReliefMaps ? textures.treasureFloorNormal : null}
  treasureFloorTexture={textures.treasureFloor}
/>

<RoomWalls
  animationNow={timing.now}
  {decoratedWallFacings}
  {gearlessWallFacings}
  foundryWallDecalTexture={textures.foundryFloorDecals}
  foundryWallTexture={textures.foundryWall}
  roomWalls={scene.roomWalls}
  showWallKit={!outside}
/>

{#each lampLights as light (light.id)}
  <T.PointLight
    color="#ff9d43"
    decay={1.6}
    distance={5.4}
    intensity={light.intensity}
    position={light.position}
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
  animationNow={timing.now}
  bossBannerTexture={textures.bossBanner}
  {corePrisonSealBrokenAt}
  {corePrisonSealHits}
  {corePrisonSealHitsRequired}
  {corePrisonSealLocked}
  currentFloorPalette={scene.currentFloorPalette}
  environment={scene.roomEnvironment}
  floorExitOpenAmount={scene.floorExitOpenAmount}
  {outsideGateUnlocked}
  {outsideDetailLevel}
  startAnimationAt={timing.floorIntroStartedAt}
  outsideEarthDecalTexture={textures.outsideEarthDecals}
  outsideEarthTexture={textures.outsideEarth}
  outsideRockDecalTexture={textures.outsideRockDecals}
  outsideRocksTexture={textures.outsideRocks}
  outsideWaterDecalTexture={textures.outsideWaterDecals}
  outsideWaterTexture={textures.outsideWater}
/>

<RoomArtifactPedestal
  animationNow={timing.now}
  currentArtifactTemplate={scene.currentArtifactTemplate}
/>

<FloorExitPortal
  active={scene.floorExitActive}
  animationNow={timing.now}
  openAmount={scene.floorExitOpenAmount}
/>

{#if warmupBossRoom && warmupBossTemplate && warmupBossBounds}
  <T.Group position={[0, 0, 0]} visible={warmupVisible}>
    <T.Mesh
      geometry={cachedPlane(
        warmupBossBounds.floorHalfWidth * 2,
        warmupBossBounds.floorHalfDepth * 2
      )}
      position={[0, 0.045, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.MeshStandardMaterial
        map={textures.bossFloor}
        bumpMap={scene.floorReliefMaps ? textures.bossFloorHeight : null}
        bumpScale={18 * scene.floorReliefStrength}
        metalness={0.24}
        normalMap={scene.floorReliefMaps && !textures.bossFloorHeight
          ? textures.bossFloorNormal
          : null}
        normalScale={[2.2, 2.2]}
        roughness={0.64}
      />
    </T.Mesh>

    <RoomWallShadows roomWalls={warmupBossWalls} />

    {#each warmupBossWalls as wall (wall.id)}
      <T.Mesh
        castShadow={(wall.opacity ?? 1) >= 1}
        geometry={cachedBox(
          wall.args[0] * 2,
          wall.args[1] * 1.55,
          wall.args[2] * 2
        )}
        position={[
          wall.position[0],
          wall.position[1] - 0.25,
          wall.position[2],
        ]}
        receiveShadow
      >
        <T.MeshStandardMaterial
          color={wall.color}
          depthWrite={(wall.opacity ?? 1) >= 1}
          metalness={0.1}
          opacity={wall.opacity ?? 1}
          roughness={0.86}
          transparent={(wall.opacity ?? 1) < 1}
        />
      </T.Mesh>
    {/each}

    <InstancedFoundryWallKits
      animationNow={0}
      decoratedWallFacings={bossDecoratedWallFacings}
      gearlessWallFacings={bossGearlessWallFacings}
      limit={warmupBossWallKitLimit}
      roomWalls={warmupBossWalls}
      wallDecalTexture={textures.foundryFloorDecals}
      wallTexture={textures.foundryWall}
    />

    <RoomDoors
      bossDoorTexture={textures.bossDoor}
      doorOpenAmount={0}
      physicsEnabled={false}
      roomDoors={warmupBossDoors}
      roomDoorSeals={warmupBossDoorSeals}
    />

    <RoomHazards
      animationNow={0}
      lavaSurfaceTexture={textures.lavaSurface}
      roomHazards={warmupBossHazards}
    />

    <RoomPlatforms animationNow={0} roomPlatforms={warmupBossPlatforms} />

    <RoomTemplateEnvironment
      animationNow={0}
      bossBannerTexture={textures.bossBanner}
      corePrisonSealBrokenAt={0}
      corePrisonSealHits={0}
      corePrisonSealHitsRequired={2}
      corePrisonSealLocked={false}
      currentFloorPalette={scene.currentFloorPalette}
      environment={warmupBossTemplate.environment}
      floorExitOpenAmount={0}
      outsideGateUnlocked={false}
      outsideDetailLevel={0}
      startAnimationAt={0}
      outsideEarthDecalTexture={null}
      outsideEarthTexture={null}
      outsideRockDecalTexture={null}
      outsideRocksTexture={null}
      outsideWaterDecalTexture={null}
      outsideWaterTexture={null}
    />
  </T.Group>
{/if}

<T.Group
  position={[0, 0.08, 0]}
  scale={[0.001, 0.001, 0.001]}
  visible={warmupVisible}
>
  <RoomHazards
    animationNow={0}
    lavaSurfaceTexture={textures.lavaSurface}
    roomHazards={lavaHazardWarmups}
  />

  <RoomArtifactPedestal
    animationNow={0}
    currentArtifactTemplate={artifactPedestalWarmupTemplate}
  />

  <RoomDoors
    bossDoorTexture={textures.bossDoor}
    doorOpenAmount={0}
    physicsEnabled={false}
    roomDoors={roomDoorWarmups}
    roomDoorSeals={roomDoorSealWarmups}
  />

  <RoomPlatforms animationNow={0} roomPlatforms={roomPlatformWarmups} />

  <T.Mesh
    castShadow
    geometry={cachedBox(19.8, 4.34, 0.5)}
    position={[0, 2.1, 0]}
    receiveShadow={false}
  >
    <T.MeshStandardMaterial color="#3b3025" metalness={0.1} roughness={0.86} />
  </T.Mesh>

  <T.Mesh
    castShadow
    geometry={cachedBox(0.5, 4.34, 16.2)}
    position={[0, 2.1, 0]}
    receiveShadow={false}
  >
    <T.MeshStandardMaterial color="#241d17" metalness={0.1} roughness={0.86} />
  </T.Mesh>

  <InstancedFoundryWallKits
    limit={wallKitWarmups.length}
    roomWalls={wallKitWarmups}
    wallDecalTexture={textures.foundryFloorDecals}
    wallTexture={textures.foundryWall}
  />

  {#each [textures.treasureFloor, textures.bossFloor, textures.bossDoor, textures.lavaSurface, textures.bossBanner, textures.foundryFloor, textures.foundryWall] as texture}
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

  {#if textures.bossFloor && textures.bossFloorHeight}
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <T.PlaneGeometry args={[4, 4]} />
      <T.MeshStandardMaterial
        map={textures.bossFloor}
        bumpMap={textures.bossFloorHeight}
        bumpScale={1.4}
        metalness={0.24}
        roughness={0.64}
      />
    </T.Mesh>
  {/if}

  {#if textures.bossFloor && textures.bossFloorNormal}
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <T.PlaneGeometry args={[4, 4]} />
      <T.MeshStandardMaterial
        map={textures.bossFloor}
        normalMap={textures.bossFloorNormal}
        normalScale={[2.2, 2.2]}
        metalness={0.24}
        roughness={0.64}
      />
    </T.Mesh>
  {/if}

  {#if textures.treasureFloor && textures.treasureFloorHeight}
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <T.PlaneGeometry args={[4, 4]} />
      <T.MeshStandardMaterial
        map={textures.treasureFloor}
        bumpMap={textures.treasureFloorHeight}
        bumpScale={22.4}
        normalMap={null}
        normalScale={[2, 2]}
        transparent
        alphaTest={0.08}
        metalness={0.22}
        opacity={0.92}
        roughness={0.66}
      />
    </T.Mesh>
  {/if}

  {#if textures.treasureFloor && textures.treasureFloorNormal}
    <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <T.PlaneGeometry args={[4, 4]} />
      <T.MeshStandardMaterial
        map={textures.treasureFloor}
        bumpMap={null}
        normalMap={textures.treasureFloorNormal}
        normalScale={[2, 2]}
        transparent
        alphaTest={0.08}
        metalness={0.22}
        opacity={0.92}
        roughness={0.66}
      />
    </T.Mesh>
  {/if}

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

  <RoomTemplateEnvironment
    animationNow={0}
    bossBannerTexture={textures.bossBanner}
    corePrisonSealBrokenAt={0}
    corePrisonSealHits={0}
    corePrisonSealHitsRequired={2}
    corePrisonSealLocked={false}
    currentFloorPalette={scene.currentFloorPalette}
    environment="boss-gears"
    floorExitOpenAmount={0}
    outsideGateUnlocked={false}
    outsideDetailLevel={0}
    startAnimationAt={0}
    outsideEarthDecalTexture={null}
    outsideEarthTexture={null}
    outsideRockDecalTexture={null}
    outsideRocksTexture={null}
    outsideWaterDecalTexture={null}
    outsideWaterTexture={null}
  />

  <RoomTemplateEnvironment
    animationNow={0}
    bossBannerTexture={null}
    corePrisonSealBrokenAt={0}
    corePrisonSealHits={0}
    corePrisonSealHitsRequired={2}
    corePrisonSealLocked={false}
    currentFloorPalette={scene.currentFloorPalette}
    environment="treasure-gears"
    floorExitOpenAmount={0}
    outsideGateUnlocked={false}
    outsideDetailLevel={0}
    startAnimationAt={0}
    outsideEarthDecalTexture={null}
    outsideEarthTexture={null}
    outsideRockDecalTexture={null}
    outsideRocksTexture={null}
    outsideWaterDecalTexture={null}
    outsideWaterTexture={null}
  />
</T.Group>
