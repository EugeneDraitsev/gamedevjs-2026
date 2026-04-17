<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { OrbitControls } from "@threlte/extras";
  import { Collider, Debug, RigidBody, World } from "@threlte/rapier";
  import {
    type DirectionalLight,
    type OrthographicCamera,
    PCFShadowMap,
  } from "three";
  import type { OrbitControls as OrbitControlsInstance } from "three/examples/jsm/controls/OrbitControls.js";
  import PlayerController from "$lib/components/player-controller.svelte";
  import Projectile, {
    type ProjectileData,
  } from "$lib/components/projectile.svelte";
  import ShootingTarget from "$lib/components/shooting-target.svelte";
  import type {
    DungeonLayout,
    DungeonRoom,
    DungeonRoomDirection,
  } from "$lib/config/dungeon-layout";
  import {
    copyWeaponBuild,
    getWeaponNodeTemplate,
    type WeaponBuild,
    type WeaponNodeType,
  } from "$lib/config/weapon-graph";

  type Vec3 = [number, number, number];
  type CameraMode = "follow" | "orbit";

  interface PhysicsShowcaseProps {
    ambientLightIntensity?: number;
    cameraFov?: number;
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
    collectedArtifactRoomIds?: string[];
    controlsLocked?: boolean;
    dungeon: DungeonLayout;
    followDistance?: number;
    followPitch?: number;
    followYaw?: number;
    gravityY?: number;
    jumpSpeed?: number;
    lookHeight?: number;
    moveResponsiveness?: number;
    moveSpeed?: number;
    onCollectArtifact?: (roomId: string, type: WeaponNodeType) => void;
    playerLinearDamping?: number;
    shadowBias?: number;
    shadowFar?: number;
    shadowFrustum?: number;
    shadowMapSize?: number;
    shadowNormalBias?: number;
    showDebugGeometry?: boolean;
    showPhysicsDebug?: boolean;
    sunIntensity?: number;
    sunPositionX?: number;
    sunPositionY?: number;
    sunPositionZ?: number;
    weaponBuild: WeaponBuild;
  }

  interface StaticWall {
    args: Vec3;
    color: string;
    id: string;
    opacity?: number;
    position: Vec3;
  }

  interface ActiveProjectile extends ProjectileData {
    build: WeaponBuild;
  }

  interface DoorMarker {
    args: Vec3;
    color: string;
    id: string;
    position: Vec3;
  }

  interface FloorTile {
    color: string;
    position: Vec3;
  }

  const doorwayHalfSpan = 1.2;
  const floorHalfDepth = 9.1;
  const floorHalfWidth = 10.4;
  const roomTransitionInsetX = 9.1;
  const roomTransitionInsetZ = 7.3;
  const roomTeleportX = 8;
  const roomTeleportZ = 6.6;
  const wallHalfHeight = 2.8;
  const wallThickness = 0.25;
  const wallHalfWidth = 9.9;
  const wallHalfDepth = 8.1;
  const wallY = 2.45;
  const wallSegmentHalfDepth = (wallHalfDepth - doorwayHalfSpan) * 0.5;
  const wallSegmentHalfWidth = (wallHalfWidth - doorwayHalfSpan) * 0.5;
  const wallSegmentOffsetDepth = doorwayHalfSpan + wallSegmentHalfDepth;
  const wallSegmentOffsetWidth = doorwayHalfSpan + wallSegmentHalfWidth;
  const floorTiles: FloorTile[] = Array.from({ length: 18 }, (_, row) =>
    Array.from({ length: 20 }, (_, column) => ({
      color: (row + column) % 2 === 0 ? "#284457" : "#173142",
      position: [column - 9.5, 0.01, row - 8.5] as Vec3,
    }))
  ).flat();

  const createRoomWalls = (room: DungeonRoom): StaticWall[] => {
    const walls: StaticWall[] = [];
    const pushHorizontalWall = (
      id: string,
      x: number,
      z: number,
      opacity = 1
    ) => {
      walls.push({
        args: [wallSegmentHalfWidth, wallHalfHeight, wallThickness],
        color: "#58a6c9",
        id,
        opacity,
        position: [x, wallY, z],
      });
    };
    const pushVerticalWall = (
      id: string,
      x: number,
      z: number,
      opacity = 1
    ) => {
      walls.push({
        args: [wallThickness, wallHalfHeight, wallSegmentHalfDepth],
        color: "#2a7ea8",
        id,
        opacity,
        position: [x, wallY, z],
      });
    };

    if (room.exits.north) {
      pushHorizontalWall(
        `${room.id}-north-west`,
        -wallSegmentOffsetWidth,
        -wallHalfDepth
      );
      pushHorizontalWall(
        `${room.id}-north-east`,
        wallSegmentOffsetWidth,
        -wallHalfDepth
      );
    } else {
      walls.push({
        args: [wallHalfWidth, wallHalfHeight, wallThickness],
        color: "#58a6c9",
        id: `${room.id}-north`,
        position: [0, wallY, -wallHalfDepth],
      });
    }

    if (room.exits.south) {
      pushHorizontalWall(
        `${room.id}-south-west`,
        -wallSegmentOffsetWidth,
        wallHalfDepth,
        0.2
      );
      pushHorizontalWall(
        `${room.id}-south-east`,
        wallSegmentOffsetWidth,
        wallHalfDepth,
        0.2
      );
    } else {
      walls.push({
        args: [wallHalfWidth, wallHalfHeight, wallThickness],
        color: "#58a6c9",
        id: `${room.id}-south`,
        opacity: 0.2,
        position: [0, wallY, wallHalfDepth],
      });
    }

    if (room.exits.west) {
      pushVerticalWall(
        `${room.id}-west-north`,
        -wallHalfWidth,
        -wallSegmentOffsetDepth
      );
      pushVerticalWall(
        `${room.id}-west-south`,
        -wallHalfWidth,
        wallSegmentOffsetDepth
      );
    } else {
      walls.push({
        args: [wallThickness, wallHalfHeight, wallHalfDepth],
        color: "#2a7ea8",
        id: `${room.id}-west`,
        position: [-wallHalfWidth, wallY, 0],
      });
    }

    if (room.exits.east) {
      pushVerticalWall(
        `${room.id}-east-north`,
        wallHalfWidth,
        -wallSegmentOffsetDepth
      );
      pushVerticalWall(
        `${room.id}-east-south`,
        wallHalfWidth,
        wallSegmentOffsetDepth
      );
    } else {
      walls.push({
        args: [wallThickness, wallHalfHeight, wallHalfDepth],
        color: "#2a7ea8",
        id: `${room.id}-east`,
        position: [wallHalfWidth, wallY, 0],
      });
    }

    return walls;
  };

  const createDoorMarkers = (room: DungeonRoom): DoorMarker[] => {
    const getDoorMarkerPosition = (direction: DungeonRoomDirection): Vec3 => {
      if (direction === "north") {
        return [0, 0.03, -7.6];
      }

      if (direction === "south") {
        return [0, 0.03, 7.6];
      }

      if (direction === "west") {
        return [-9.4, 0.03, 0];
      }

      return [9.4, 0.03, 0];
    };

    const getDoorColor = (targetRoom: DungeonRoom) => {
      if (targetRoom.kind === "boss") {
        return "#ffd166";
      }

      if (targetRoom.kind === "treasure") {
        return "#57d6a5";
      }

      return "#8ac6ff";
    };

    return (Object.entries(room.exits) as [DungeonRoomDirection, string][])
      .filter(([, target]) => Boolean(target))
      .map(([direction, target]) => {
        const targetRoom = dungeon.rooms[target];

        return {
          args:
            direction === "east" || direction === "west"
              ? [0.45, 0.05, 0.95]
              : [0.95, 0.05, 0.45],
          color: getDoorColor(targetRoom),
          id: `${room.id}-${direction}-door`,
          position: getDoorMarkerPosition(direction),
        };
      });
  };

  const getTransition = (room: DungeonRoom, position: Vec3) => {
    const [x, y, z] = position;

    if (
      room.exits.east &&
      x > roomTransitionInsetX &&
      Math.abs(z) < doorwayHalfSpan
    ) {
      return {
        roomId: room.exits.east,
        target: [-roomTeleportX, y, 0] as Vec3,
      };
    }

    if (
      room.exits.west &&
      x < -roomTransitionInsetX &&
      Math.abs(z) < doorwayHalfSpan
    ) {
      return { roomId: room.exits.west, target: [roomTeleportX, y, 0] as Vec3 };
    }

    if (
      room.exits.north &&
      z < -roomTransitionInsetZ &&
      Math.abs(x) < doorwayHalfSpan
    ) {
      return {
        roomId: room.exits.north,
        target: [0, y, roomTeleportZ] as Vec3,
      };
    }

    if (
      room.exits.south &&
      z > roomTransitionInsetZ &&
      Math.abs(x) < doorwayHalfSpan
    ) {
      return {
        roomId: room.exits.south,
        target: [0, y, -roomTeleportZ] as Vec3,
      };
    }

    return null;
  };

  const getRevealedDoors = (room: DungeonRoom, exploredRooms: Set<string>) =>
    (Object.entries(room.exits) as [DungeonRoomDirection, string][])
      .filter(([, target]) => exploredRooms.has(target))
      .map(([direction]) => direction);

  let orbitControls = $state<OrbitControlsInstance>();
  let projectiles = $state<ActiveProjectile[]>([]);
  let sunLight = $state<DirectionalLight>();
  let crosshairX = $state(0);
  let crosshairY = $state(0);

  let {
    ambientLightIntensity = 0.52,
    cameraFov = 63,
    cameraMode = "follow",
    cameraSmoothing = 8,
    collectedArtifactRoomIds = [],
    controlsLocked = false,
    dungeon,
    followDistance = 12.3,
    followPitch = 52,
    followYaw = 0,
    gravityY = -9.81,
    jumpSpeed = 6.2,
    lookHeight = 0.4,
    moveResponsiveness = 12,
    moveSpeed = 7.5,
    onCollectArtifact,
    playerLinearDamping = 1.6,
    shadowBias = -0.000_35,
    shadowFar = 32,
    shadowFrustum = 16,
    shadowMapSize = 2048,
    shadowNormalBias = 0.035,
    showPhysicsDebug = false,
    showDebugGeometry = false,
    sunIntensity = 2.2,
    sunPositionX = 6,
    sunPositionY = 10,
    sunPositionZ = 4,
    weaponBuild,
  }: PhysicsShowcaseProps = $props();

  let currentRoomId = $state("");
  let exploredRooms = $state<string[]>([]);
  let teleportNonce = $state(0);
  let teleportTarget = $state<Vec3 | null>(null);
  let lastRoomTransitionAt = 0;

  const roomList = $derived.by(() => Object.values(dungeon.rooms));
  const currentRoom = $derived(
    dungeon.rooms[currentRoomId] ?? dungeon.rooms[dungeon.startRoomId]
  );
  const roomWalls = $derived.by(() => createRoomWalls(currentRoom));
  const roomDoors = $derived.by(() => createDoorMarkers(currentRoom));
  const exploredRoomSet = $derived.by(() => new Set(exploredRooms));
  const collectedArtifactRoomSet = $derived.by(
    () => new Set(collectedArtifactRoomIds)
  );
  const minimapBounds = $derived.by(() => {
    const grids = roomList.map((room) => room.grid);
    const minX = Math.min(...grids.map(([x]) => x));
    const maxX = Math.max(...grids.map(([x]) => x));
    const minY = Math.min(...grids.map(([, y]) => y));
    const maxY = Math.max(...grids.map(([, y]) => y));

    return {
      columns: maxX - minX + 1,
      minX,
      minY,
      rows: maxY - minY + 1,
    };
  });
  const currentArtifactType = $derived(
    currentRoom.kind === "treasure" &&
      currentRoom.artifactType &&
      !collectedArtifactRoomSet.has(currentRoom.id)
      ? currentRoom.artifactType
      : null
  );
  const currentArtifactTemplate = $derived.by(() =>
    currentArtifactType ? getWeaponNodeTemplate(currentArtifactType) : null
  );

  $effect(() => {
    dungeon.seed;
    currentRoomId = dungeon.startRoomId;
    exploredRooms = [dungeon.startRoomId];
    projectiles = [];
    teleportTarget = null;
    teleportNonce = 0;
  });

  $effect(() => {
    const light = sunLight;

    if (!light) {
      return;
    }

    light.shadow.bias = shadowBias;
    light.shadow.camera.far = shadowFar;
    light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    light.shadow.normalBias = shadowNormalBias;

    const shadowCamera = light.shadow.camera as OrthographicCamera;
    shadowCamera.bottom = -shadowFrustum;
    shadowCamera.left = -shadowFrustum;
    shadowCamera.near = 0.5;
    shadowCamera.right = shadowFrustum;
    shadowCamera.top = shadowFrustum;
    shadowCamera.updateProjectionMatrix();

    light.shadow.needsUpdate = true;
  });

  const spawnProjectile = ({
    position,
    velocity,
  }: {
    position: Vec3;
    velocity: Vec3;
  }) => {
    const build = copyWeaponBuild(weaponBuild);
    const baseYaw = Math.atan2(velocity[0], velocity[2]);
    const horizontalSpeed = Math.hypot(velocity[0], velocity[2]) || build.speed;
    const rightX = Math.cos(baseYaw);
    const rightZ = -Math.sin(baseYaw);
    const nextProjectiles: ActiveProjectile[] = [];

    for (let index = 0; index < build.pelletCount; index += 1) {
      const spreadOffset =
        build.pelletCount === 1
          ? 0
          : (index / (build.pelletCount - 1) - 0.5) * build.spread;
      const shotYaw = baseYaw + spreadOffset;
      const laneOffset =
        build.pelletCount === 1
          ? 0
          : (index / (build.pelletCount - 1) - 0.5) * build.radius * 2.6;

      nextProjectiles.push({
        build,
        id: crypto.randomUUID(),
        position: [
          position[0] + rightX * laneOffset,
          position[1],
          position[2] + rightZ * laneOffset,
        ],
        velocity: [
          Math.sin(shotYaw) * horizontalSpeed,
          velocity[1],
          Math.cos(shotYaw) * horizontalSpeed,
        ],
      });
    }

    projectiles = [...projectiles, ...nextProjectiles];
  };

  const removeProjectile = (id: string) => {
    projectiles = projectiles.filter((projectile) => projectile.id !== id);
  };

  const handleMouseMove = (x: number, y: number) => {
    crosshairX = x;
    crosshairY = y;
  };

  const handlePlayerPositionChange = (position: Vec3) => {
    const transition = getTransition(currentRoom, position);

    if (!transition || performance.now() - lastRoomTransitionAt < 240) {
      if (
        currentRoom.kind === "treasure" &&
        currentRoom.artifactType &&
        !collectedArtifactRoomSet.has(currentRoom.id) &&
        Math.hypot(position[0], position[2]) < 1.5
      ) {
        onCollectArtifact?.(currentRoom.id, currentRoom.artifactType);
      }

      return;
    }

    lastRoomTransitionAt = performance.now();
    currentRoomId = transition.roomId;
    teleportTarget = transition.target;
    teleportNonce += 1;
    projectiles = [];

    if (!exploredRooms.includes(transition.roomId)) {
      exploredRooms = [...exploredRooms, transition.roomId];
    }
  };
</script>

<div class="scene">
  <Canvas shadows={PCFShadowMap} dpr={2}>
    <T.Color attach="background" args={['#040816']} />
    <T.Fog attach="fog" args={['#040816', 13, 24]} />

    <T.PerspectiveCamera makeDefault position={[0, 9, 6.4]} fov={cameraFov}>
      <OrbitControls
        bind:ref={orbitControls}
        enabled={cameraMode === "orbit"}
        enableDamping
        enablePan
        maxDistance={26}
        minDistance={4}
      />
    </T.PerspectiveCamera>

    <T.HemisphereLight args={['#9fd6ff', '#081221', 1.15]} />
    <T.AmbientLight intensity={ambientLightIntensity} />
    <T.DirectionalLight
      bind:ref={sunLight}
      castShadow
      intensity={sunIntensity}
      position={[sunPositionX, sunPositionY, sunPositionZ]}
    />

    <World gravity={[0, gravityY, 0]}>
      {#if showPhysicsDebug}
        <Debug />
      {/if}

      <T.Group position={[0, -0.35, 0]}>
        <RigidBody type="fixed">
          <Collider
            shape="cuboid"
            args={[floorHalfWidth, 0.35, floorHalfDepth]}
            friction={0.92}
            restitution={0.08}
          />

          {#each floorTiles as tile, index}
            <T.Mesh
              position={tile.position}
              receiveShadow
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <T.PlaneGeometry args={[0.96, 0.96]} />
              <T.MeshStandardMaterial
                color={tile.color}
                metalness={0.02}
                roughness={0.94}
              />
            </T.Mesh>
          {/each}
        </RigidBody>
      </T.Group>

      {#if currentRoom.kind === "polygon"}
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
                color="#1f6f78"
                roughness={0.78}
                metalness={0.08}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/if}

      {#each roomWalls as wall (wall.id)}
        <T.Group position={wall.position}>
          <RigidBody type="fixed">
            <Collider
              shape="cuboid"
              args={wall.args}
              friction={0.92}
              restitution={0.22}
            />

            <T.Mesh
              castShadow={!wall.opacity || wall.opacity >= 1}
              receiveShadow
            >
              <T.BoxGeometry
                args={[
                  wall.args[0] * 2,
                  wall.args[1] * 2,
                  wall.args[2] * 2,
                ]}
              />
              <T.MeshStandardMaterial
                color={wall.color}
                metalness={0.08}
                opacity={wall.opacity ?? 1}
                roughness={0.9}
                transparent={Boolean(wall.opacity && wall.opacity < 1)}
                depthWrite={!wall.opacity || wall.opacity >= 1}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/each}

      {#each roomDoors as door (door.id)}
        <T.Group position={door.position}>
          <T.Mesh receiveShadow>
            <T.BoxGeometry args={door.args} />
            <T.MeshStandardMaterial
              color={door.color}
              emissive={door.color}
              emissiveIntensity={0.2}
              metalness={0.28}
              roughness={0.36}
            />
          </T.Mesh>
        </T.Group>
      {/each}

      {#if currentRoom.kind === "polygon"}
        <T.Group position={[-2.2, 0.45, -2.4]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[0.6, 0.45, 0.6]} friction={0.95} />

            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry args={[1.2, 0.9, 1.2]} />
              <T.MeshStandardMaterial
                color="#ff7a59"
                metalness={0.08}
                roughness={0.42}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>

        <T.Group position={[0.2, 0.65, 2.1]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[0.9, 0.65, 0.9]} friction={0.95} />

            <T.Mesh castShadow receiveShadow>
              <T.BoxGeometry args={[1.8, 1.3, 1.8]} />
              <T.MeshStandardMaterial
                color="#4cc9f0"
                metalness={0.08}
                roughness={0.38}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>

        <ShootingTarget position={[-4, 0, -3.5]} color="#e63946" />
        <ShootingTarget position={[-3, 0, -3.5]} color="#e63946" />
        <ShootingTarget position={[-2, 0, -3.5]} color="#e63946" />

        <ShootingTarget
          position={[4.5, 0, -4]}
          color="#f4a261"
          height={2}
          width={0.3}
        />
        <ShootingTarget
          position={[5.5, 0, -4]}
          color="#f4a261"
          height={2}
          width={0.3}
        />

        <ShootingTarget
          position={[-5, 0, 3]}
          color="#2a9d8f"
          height={1.2}
          width={0.4}
        />
        <ShootingTarget
          position={[6, 0, 2]}
          color="#2a9d8f"
          height={1.2}
          width={0.4}
        />
      {/if}

      {#if currentArtifactTemplate}
        <T.Group position={[0, 0.9, 0]}>
          <T.Mesh castShadow receiveShadow>
            <T.CylinderGeometry args={[0.55, 0.72, 0.32, 20]} />
            <T.MeshStandardMaterial
              color="#193040"
              metalness={0.42}
              roughness={0.52}
            />
          </T.Mesh>

          <T.Mesh castShadow position={[0, 0.58, 0]}>
            <T.SphereGeometry args={[0.42, 24, 24]} />
            <T.MeshStandardMaterial
              color={currentArtifactTemplate.accent}
              emissive={currentArtifactTemplate.accent}
              emissiveIntensity={0.28}
              metalness={0.14}
              roughness={0.24}
            />
          </T.Mesh>

          <T.Mesh
            position={[0, -0.72, 0]}
            receiveShadow
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <T.RingGeometry args={[0.78, 1.02, 36]} />
            <T.MeshBasicMaterial
              color={currentArtifactTemplate.accent}
              opacity={0.84}
              transparent
            />
          </T.Mesh>
        </T.Group>
      {/if}

      <PlayerController
        {cameraMode}
        {cameraSmoothing}
        {controlsLocked}
        {followDistance}
        {followPitch}
        {followYaw}
        {jumpSpeed}
        {lookHeight}
        {moveResponsiveness}
        {moveSpeed}
        onMouseMove={handleMouseMove}
        onPositionChange={handlePlayerPositionChange}
        onShoot={spawnProjectile}
        {orbitControls}
        {playerLinearDamping}
        {showDebugGeometry}
        {teleportNonce}
        {teleportTarget}
        {weaponBuild}
      />

      {#each projectiles as projectile (projectile.id)}
        <Projectile data={projectile} onExpire={removeProjectile} />
      {/each}
    </World>
  </Canvas>

  {#if cameraMode === 'follow' && !controlsLocked}
    <div
      class="crosshair"
      style:left="{crosshairX}px"
      style:top="{crosshairY}px"
    >
      <div class="crosshair-dot"></div>
      <div class="crosshair-ring"></div>
    </div>
  {/if}

  <div class="minimap">
    <div class="minimap-head">
      <strong>Map</strong>
      <span>{currentRoom.label}</span>
    </div>

    <div class="minimap-seed">seed {dungeon.seed}</div>

    <div
      class="minimap-grid"
      style:grid-template-columns={`repeat(${minimapBounds.columns}, 1.05rem)`}
      style:grid-template-rows={`repeat(${minimapBounds.rows}, 1.05rem)`}
    >
      {#each roomList as room (room.id)}
        {#if exploredRoomSet.has(room.id)}
          <div
            class="minimap-room"
            class:boss={room.kind === "boss"}
            class:polygon={room.kind === "polygon"}
            class:current={room.id === currentRoom.id}
            class:treasure={room.kind === "treasure"}
            style:grid-column={room.grid[0] - minimapBounds.minX + 1}
            style:grid-row={room.grid[1] - minimapBounds.minY + 1}
          >
            {#each getRevealedDoors(room, exploredRoomSet) as direction}
              <span class={`door ${direction}`}></span>
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }

  .minimap {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 8;
    display: grid;
    gap: 0.55rem;
    padding: 0.8rem;
    color: rgba(244, 249, 255, 0.92);
    background:
      linear-gradient(180deg, rgba(5, 12, 22, 0.86), rgba(8, 18, 31, 0.9)),
      repeating-linear-gradient(
        90deg,
        transparent 0 12px,
        rgba(255, 255, 255, 0.03) 12px 13px
      );
    border: 1px solid rgba(138, 198, 255, 0.16);
    border-radius: 1rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 18px 34px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(10px);
  }

  .minimap::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background:
      radial-gradient(
        circle at 14px 14px,
        rgba(255, 255, 255, 0.16) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 14px) 14px,
        rgba(255, 255, 255, 0.16) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at 14px calc(100% - 14px),
        rgba(255, 255, 255, 0.16) 0 2px,
        transparent 2px
      ),
      radial-gradient(
        circle at calc(100% - 14px) calc(100% - 14px),
        rgba(255, 255, 255, 0.16) 0 2px,
        transparent 2px
      );
  }

  .minimap-head {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    justify-content: space-between;
  }

  .minimap-head strong,
  .minimap-head span {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .minimap-head span {
    color: rgba(174, 197, 223, 0.68);
  }

  .minimap-seed {
    font-size: 0.66rem;
    font-weight: 700;
    color: rgba(174, 197, 223, 0.56);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .minimap-grid {
    display: grid;
    gap: 0.55rem;
    place-items: center;
  }

  .minimap-room {
    position: relative;
    inline-size: 1.05rem;
    block-size: 1.05rem;
    background: linear-gradient(
      180deg,
      rgba(120, 146, 177, 0.42),
      rgba(76, 98, 124, 0.28)
    );
    border: 1px solid rgba(196, 216, 238, 0.42);
    border-radius: 0.3rem;
  }

  .minimap-room.current {
    background: linear-gradient(
      180deg,
      rgba(138, 198, 255, 0.92),
      rgba(83, 151, 212, 0.72)
    );
    box-shadow: 0 0 0 2px rgba(138, 198, 255, 0.18);
  }

  .minimap-room.boss {
    background: linear-gradient(
      180deg,
      rgba(255, 209, 102, 0.95),
      rgba(219, 159, 51, 0.72)
    );
    border-color: rgba(255, 233, 170, 0.68);
  }

  .minimap-room.treasure {
    background: linear-gradient(
      180deg,
      rgba(87, 214, 165, 0.92),
      rgba(37, 143, 109, 0.7)
    );
    border-color: rgba(176, 246, 219, 0.52);
  }

  .minimap-room.polygon {
    background: linear-gradient(
      180deg,
      rgba(104, 183, 255, 0.86),
      rgba(58, 112, 178, 0.68)
    );
    border-color: rgba(196, 227, 255, 0.52);
  }

  .door {
    position: absolute;
    background: rgba(207, 226, 247, 0.76);
    border-radius: 999px;
  }

  .door.north,
  .door.south {
    left: 50%;
    inline-size: 0.34rem;
    block-size: 0.16rem;
    translate: -50% 0;
  }

  .door.east,
  .door.west {
    top: 50%;
    inline-size: 0.16rem;
    block-size: 0.34rem;
    translate: 0 -50%;
  }

  .door.north {
    top: -0.26rem;
  }

  .door.south {
    bottom: -0.26rem;
  }

  .door.east {
    right: -0.26rem;
  }

  .door.west {
    left: -0.26rem;
  }

  .crosshair {
    position: fixed;
    z-index: 10;
    pointer-events: none;
    translate: -50% -50%;
  }

  .crosshair-dot {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: 4px;
    block-size: 4px;
    background: rgba(138, 198, 255, 0.95);
    border-radius: 50%;
    box-shadow: 0 0 6px 2px rgba(138, 198, 255, 0.5);
    translate: -50% -50%;
  }

  .crosshair-ring {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: 24px;
    block-size: 24px;
    border: 1.5px solid rgba(138, 198, 255, 0.6);
    border-radius: 50%;
    translate: -50% -50%;
  }

  @media (max-width: 900px) {
    .minimap {
      top: auto;
      right: 0.8rem;
      bottom: 4rem;
    }
  }
</style>
