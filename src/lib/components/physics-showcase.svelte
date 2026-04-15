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

  type Vec3 = [number, number, number];
  type CameraMode = "follow" | "orbit";

  interface PhysicsShowcaseProps {
    ambientLightIntensity?: number;
    cameraFov?: number;
    cameraMode?: CameraMode;
    cameraSmoothing?: number;
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
  }

  interface StaticWall {
    args: Vec3;
    color: string;
    id: string;
    position: Vec3;
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
  let sunLight = $state<DirectionalLight>();

  let {
    ambientLightIntensity = 0.52,
    cameraFov = 44,
    cameraMode = "follow",
    cameraSmoothing = 10,
    followDistance = 10.8,
    followPitch = 58,
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

            <T.Mesh castShadow receiveShadow>
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
                roughness={0.9}
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

      <PlayerController
        {cameraMode}
        {cameraSmoothing}
        {followDistance}
        {followPitch}
        {followYaw}
        {jumpSpeed}
        {lookHeight}
        {moveResponsiveness}
        {moveSpeed}
        {orbitControls}
        {playerLinearDamping}
        {showDebugGeometry}
      />

      <T.Group position={[0, 0.08, 0]}>
        <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <T.RingGeometry args={[1.1, 1.18, 48]} />
          <T.MeshBasicMaterial color="#8ac6ff" opacity={0.75} transparent />
        </T.Mesh>
      </T.Group>
    </World>
  </Canvas>
</div>

<style>
  .scene {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }
</style>
