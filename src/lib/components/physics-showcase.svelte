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
  import { copyWeaponBuild, type WeaponBuild } from "$lib/config/weapon-graph";

  type Vec3 = [number, number, number];
  type CameraMode = "follow" | "orbit";

  interface PhysicsShowcaseProps {
    ambientLightIntensity?: number;
    cameraFov?: number;
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
    controlsLocked?: boolean;
    followDistance?: number;
    followPitch?: number;
    followYaw?: number;
    gravityY?: number;
    jumpSpeed?: number;
    lookHeight?: number;
    moveResponsiveness?: number;
    moveSpeed?: number;
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
    position: Vec3;
  }

  interface ActiveProjectile extends ProjectileData {
    build: WeaponBuild;
  }

  const walls: StaticWall[] = [
    {
      args: [0.25, 2.8, 6.2],
      color: "#2a7ea8",
      id: "left-wall",
      position: [-7.6, 2.45, 0],
    },
    {
      args: [0.25, 2.8, 6.2],
      color: "#2a7ea8",
      id: "right-wall",
      position: [7.6, 2.45, 0],
    },
    {
      args: [7.6, 2.8, 0.25],
      color: "#58a6c9",
      id: "back-wall",
      position: [0, 2.45, -6.2],
    },
    {
      args: [7.6, 2.8, 0.25],
      color: "#58a6c9",
      id: "front-wall",
      position: [0, 2.45, 6.2],
    },
  ];

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
    controlsLocked = false,
    followDistance = 12.3,
    followPitch = 52,
    followYaw = 0,
    gravityY = -9.81,
    jumpSpeed = 6.2,
    lookHeight = 0.4,
    moveResponsiveness = 12,
    moveSpeed = 7.5,
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
            args={[8, 0.35, 7]}
            friction={0.92}
            restitution={0.08}
          />

          <T.Mesh receiveShadow>
            <T.BoxGeometry args={[16, 0.7, 14]} />
            <T.MeshStandardMaterial
              color="#14354a"
              roughness={0.95}
              metalness={0.05}
            />
          </T.Mesh>
        </RigidBody>
      </T.Group>

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

      {#each walls as wall (wall.id)}
        <T.Group position={wall.position}>
          <RigidBody type="fixed">
            <Collider
              shape="cuboid"
              args={wall.args}
              friction={0.92}
              restitution={0.22}
            />

            <T.Mesh castShadow={wall.id !== "front-wall"} receiveShadow>
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
                opacity={wall.id === "front-wall" ? 0.2 : 1}
                roughness={0.9}
                transparent={wall.id === "front-wall"}
                depthWrite={wall.id !== "front-wall"}
              />
            </T.Mesh>
          </RigidBody>
        </T.Group>
      {/each}

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
        onShoot={spawnProjectile}
        {orbitControls}
        {playerLinearDamping}
        {showDebugGeometry}
        {weaponBuild}
      />

      {#each projectiles as projectile (projectile.id)}
        <Projectile data={projectile} onExpire={removeProjectile} />
      {/each}

      <T.Group position={[0, 0.08, 0]}>
        <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <T.RingGeometry args={[1.1, 1.18, 48]} />
          <T.MeshBasicMaterial color="#8ac6ff" opacity={0.75} transparent />
        </T.Mesh>
      </T.Group>
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
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
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
</style>
