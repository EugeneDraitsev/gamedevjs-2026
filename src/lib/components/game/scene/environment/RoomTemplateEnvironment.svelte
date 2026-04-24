<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { Color, DoubleSide, type Texture } from "three";
  import ShootingTarget from "$lib/components/game/ShootingTarget.svelte";
  import OutsideAtmosphere from "$lib/components/game/scene/environment/OutsideAtmosphere.svelte";
  import OutsideDecal from "$lib/components/game/scene/environment/OutsideDecal.svelte";
  import OutsideFoliage from "$lib/components/game/scene/environment/OutsideFoliage.svelte";
  import OutsideMountainCollider from "$lib/components/game/scene/environment/OutsideMountainCollider.svelte";
  import OutsidePoIs from "$lib/components/game/scene/environment/OutsidePoIs.svelte";
  import OutsideProceduralWater from "$lib/components/game/scene/environment/OutsideProceduralWater.svelte";
  import OutsideRoad from "$lib/components/game/scene/environment/OutsideRoad.svelte";
  import OutsideSurface from "$lib/components/game/scene/environment/OutsideSurface.svelte";
  import OutsideTerrain from "$lib/components/game/scene/environment/OutsideTerrain.svelte";
  import OutsideVegetationColliders from "$lib/components/game/scene/environment/OutsideVegetationColliders.svelte";
  import FoundryGearSet from "$lib/components/game/scene/environment/walls/FoundryGearSet.svelte";
  import type { RoomEnvironmentId } from "$lib/config/room-templates";
  import { outsideGroundY } from "$lib/game/outside-chunk-context";
  import { gearTeeth, treasureGearMounts } from "$lib/game/scene-layout";
  import type { SceneFloorPalette, Vec3 } from "$lib/types/game";

  const outsideRoads: { args: Vec3; position: Vec3; rotation?: number }[] = [
    { args: [1.15, 0.035, 12], position: [0.8, 0.035, 63], rotation: 0.07 },
    { args: [1.05, 0.035, 12], position: [-0.7, 0.035, 39], rotation: -0.06 },
    { args: [1.2, 0.035, 12], position: [0.65, 0.035, 15], rotation: 0.055 },
    { args: [1.05, 0.035, 12], position: [-0.75, 0.035, -9], rotation: -0.07 },
    { args: [1.15, 0.035, 12], position: [0.55, 0.035, -33], rotation: 0.05 },
    { args: [1, 0.035, 12], position: [-0.35, 0.035, -57], rotation: -0.035 },
    {
      args: [9, 0.032, 0.95],
      position: [-10, 0.045, 35],
      rotation: -0.18,
    },
    {
      args: [10, 0.032, 0.95],
      position: [9, 0.045, -15],
      rotation: 0.16,
    },
    {
      args: [9, 0.032, 0.95],
      position: [-8, 0.045, -60],
      rotation: -0.08,
    },
  ];
  const outsideClearings: { args: Vec3; position: Vec3 }[] = [
    { args: [7.2, 0.045, 5.2], position: [-17, 0.055, 36] },
    { args: [7, 0.045, 5], position: [17, 0.055, -16] },
    { args: [7.5, 0.045, 5.4], position: [-14, 0.055, -59] },
    { args: [4.2, 0.045, 3.4], position: [0, 0.055, -76] },
  ];
  const outsideWater: { args: Vec3; position: Vec3 }[] = [
    { args: [7.5, 0.025, 16], position: [-26, 0.065, 45] },
    { args: [6.5, 0.025, 18], position: [26, 0.065, -26] },
    { args: [2, 0.02, 17], position: [-22, 0.067, -6] },
    { args: [4.8, 0.02, 5.5], position: [20, 0.067, 36] },
  ];
  const outsideGrass: { args: Vec3; position: Vec3 }[] = [
    { args: [7, 0.04, 8], position: [-24, 0.09, 62] },
    { args: [6, 0.04, 7], position: [24, 0.09, 54] },
    { args: [6, 0.04, 9], position: [-27, 0.09, 10] },
    { args: [6, 0.04, 9], position: [26, 0.09, 10] },
    { args: [6.5, 0.04, 8.5], position: [-24, 0.09, -34] },
    { args: [6, 0.04, 8], position: [24, 0.09, -52] },
    { args: [5.5, 0.04, 6], position: [2, 0.09, -68] },
  ];
  const outsideHills: {
    color: string;
    height: number;
    position: Vec3;
    radius: number;
  }[] = [
    { color: "#76715c", height: 0.85, position: [-15, 0, 57], radius: 3.2 },
    { color: "#7f7960", height: 1.1, position: [12, 0, 36], radius: 4.2 },
    { color: "#70755f", height: 1.35, position: [-13, 0, -6], radius: 4.6 },
    { color: "#78735c", height: 1.2, position: [12, 0, -39], radius: 4.3 },
    { color: "#656651", height: 4.8, position: [-31, 0, -64], radius: 7 },
    { color: "#6e6b55", height: 4.4, position: [30, 0, -55], radius: 6 },
    { color: "#626750", height: 3.8, position: [-30, 0, -18], radius: 5.5 },
    { color: "#6d6954", height: 4.5, position: [31, 0, 26], radius: 6.5 },
    { color: "#667050", height: 3.7, position: [-28, 0, 70], radius: 5.8 },
    { color: "#746d52", height: 3.2, position: [25, 0, 76], radius: 5 },
  ];
  const outsideRocks: {
    args: Vec3;
    color: string;
    position: Vec3;
    rotation?: number;
  }[] = [
    { args: [1.1, 0.85, 1.1], color: "#5d6359", position: [-8, 0.85, 51] },
    { args: [1.35, 0.65, 0.9], color: "#6c6c5d", position: [9, 0.65, 48] },
    { args: [1.7, 0.7, 1.2], color: "#666b5f", position: [-25, 0.7, 22] },
    {
      args: [2.8, 0.55, 1.2],
      color: "#555f56",
      position: [24, 0.55, 5],
      rotation: 0.35,
    },
    { args: [1.1, 1.4, 1.1], color: "#626c58", position: [7, 1.4, -38] },
    { args: [1.4, 1.1, 1.4], color: "#6f705f", position: [-25, 1.1, -50] },
    { args: [1.2, 1, 1.2], color: "#73705d", position: [22, 1, -67] },
  ];
  const outsideLogs: {
    length: number;
    position: Vec3;
    rotation?: Vec3;
  }[] = [
    { length: 4.6, position: [8, 0.7, 54], rotation: [0, 0, Math.PI / 2] },
    { length: 4.2, position: [-7, 0.7, 20], rotation: [Math.PI / 2, 0, 0] },
    { length: 8, position: [-25, 0.7, -4], rotation: [0, 0, Math.PI / 2] },
    { length: 9, position: [24, 0.7, -42], rotation: [Math.PI / 2, 0, 0] },
    { length: 7, position: [8, 0.7, -70], rotation: [Math.PI / 2, 0, 0] },
  ];
  const outsideTrees: { crown: number; position: Vec3; trunk: number }[] = [
    { crown: 1.8, position: [-29, 0, 68], trunk: 1.6 },
    { crown: 1.5, position: [-18, 0, 58], trunk: 1.35 },
    { crown: 1.7, position: [20, 0, 62], trunk: 1.55 },
    { crown: 1.45, position: [29, 0, 40], trunk: 1.25 },
    { crown: 1.45, position: [-29, 0, 30], trunk: 1.3 },
    { crown: 1.4, position: [-25, 0, 6], trunk: 1.25 },
    { crown: 1.55, position: [26, 0, 8], trunk: 1.35 },
    { crown: 1.8, position: [-27, 0, -18], trunk: 1.6 },
    { crown: 1.6, position: [26, 0, -38], trunk: 1.45 },
    { crown: 1.5, position: [-29, 0, -43], trunk: 1.35 },
    { crown: 1.7, position: [27, 0, -61], trunk: 1.5 },
    { crown: 1.65, position: [-23, 0, -73], trunk: 1.42 },
    { crown: 1.5, position: [18, 0, -75], trunk: 1.35 },
  ];
  const outsideBushes: {
    color: string;
    position: Vec3;
    radius: number;
  }[] = [
    { color: "#4f7148", position: [-9, 0, 55], radius: 0.65 },
    { color: "#65783f", position: [6, 0, 49], radius: 0.48 },
    { color: "#476747", position: [-19, 0, 19], radius: 0.72 },
    { color: "#5c743e", position: [22, 0, 21], radius: 0.58 },
    { color: "#536f42", position: [-6, 0, -24], radius: 0.52 },
    { color: "#486946", position: [17, 0, -43], radius: 0.68 },
    { color: "#627743", position: [-20, 0, -70], radius: 0.58 },
  ];
  const outsideGrassTufts: {
    color: string;
    position: Vec3;
    rotation: number;
  }[] = [
    { color: "#7f8d4f", position: [-3, 0, 61], rotation: 0.2 },
    { color: "#6d8249", position: [11, 0, 57], rotation: -0.4 },
    { color: "#849156", position: [-18, 0, 43], rotation: 0.8 },
    { color: "#6c814b", position: [21, 0, 34], rotation: -0.8 },
    { color: "#7c8a51", position: [-24, 0, 4], rotation: 0.4 },
    { color: "#72884d", position: [18, 0, 3], rotation: -0.2 },
    { color: "#849459", position: [-11, 0, -14], rotation: 1.1 },
    { color: "#6f834c", position: [25, 0, -31], rotation: 0.5 },
    { color: "#7b8b50", position: [-23, 0, -45], rotation: -0.7 },
    { color: "#71864b", position: [8, 0, -58], rotation: 0.3 },
    { color: "#839257", position: [-7, 0, -72], rotation: -0.5 },
  ];
  const outsideCanyon: {
    color: string;
    position: Vec3;
    rotation?: number;
    scale: Vec3;
  }[] = [
    {
      color: "#6d6548",
      position: [-39, 5.8, -68],
      rotation: 0.2,
      scale: [8, 7, 18],
    },
    {
      color: "#5f6046",
      position: [-39, 5.2, -30],
      rotation: -0.1,
      scale: [7, 6, 24],
    },
    {
      color: "#70684c",
      position: [-40, 6.2, 16],
      rotation: 0.28,
      scale: [8, 7, 25],
    },
    {
      color: "#64664b",
      position: [-39, 5.5, 61],
      rotation: -0.25,
      scale: [7, 6, 22],
    },
    {
      color: "#6b684d",
      position: [39, 5.4, -62],
      rotation: -0.18,
      scale: [7, 6, 21],
    },
    {
      color: "#5d6149",
      position: [40, 6.1, -18],
      rotation: 0.18,
      scale: [8, 7, 25],
    },
    {
      color: "#71694f",
      position: [39, 5.4, 32],
      rotation: -0.24,
      scale: [7, 6, 24],
    },
    {
      color: "#62674d",
      position: [39, 5.9, 73],
      rotation: 0.16,
      scale: [8, 7, 18],
    },
    {
      color: "#71664a",
      position: [-25, 5.2, -101],
      rotation: 0.1,
      scale: [22, 6, 8],
    },
    {
      color: "#62634a",
      position: [16, 5.8, -102],
      rotation: -0.18,
      scale: [25, 7, 8],
    },
    {
      color: "#6c684c",
      position: [0, 4.7, 101],
      rotation: 0.08,
      scale: [33, 5, 8],
    },
  ];
  const outsidePoiMarkers: { color: string; position: Vec3 }[] = [
    { color: "#c6ad67", position: [-17, 0.15, 36] },
    { color: "#7aa4a0", position: [26, 0.15, -26] },
    { color: "#a99a78", position: [17, 0.15, -16] },
    { color: "#8ba46d", position: [-14, 0.15, -59] },
  ];
  const outsideCamps: { position: Vec3; rotation?: number }[] = [
    { position: [-17, 0.14, 36], rotation: 0.2 },
    { position: [17, 0.14, -16], rotation: -0.55 },
    { position: [-14, 0.14, -59], rotation: 0.5 },
  ];
  const outsideWrecks: { color: string; position: Vec3; rotation: number }[] = [
    { color: "#6b3e27", position: [-9, 0, 49], rotation: -0.28 },
    { color: "#405045", position: [12, 0, -35], rotation: 0.38 },
    { color: "#6a5a3c", position: [-18, 0, -12], rotation: 0.72 },
  ];
  const outsideBarriers: { position: Vec3; rotation: number }[] = [
    { position: [5.5, 0, 35], rotation: -0.22 },
    { position: [-6.5, 0, 4], rotation: 0.18 },
    { position: [7, 0, -55], rotation: -0.14 },
  ];
  const outsideDecals: {
    args: Vec3;
    kind: "earth" | "rock" | "water";
    opacity?: number;
    position: Vec3;
    rotation?: number;
  }[] = [
    {
      args: [22, 0, 16],
      kind: "earth",
      opacity: 0.24,
      position: [-8, 0.62, 55],
      rotation: 0.2,
    },
    {
      args: [23, 0, 17],
      kind: "earth",
      opacity: 0.26,
      position: [10, 0.63, 18],
      rotation: -0.5,
    },
    {
      args: [22, 0, 17],
      kind: "earth",
      opacity: 0.24,
      position: [-10, 0.64, -21],
      rotation: 0.85,
    },
    {
      args: [23, 0, 16],
      kind: "earth",
      opacity: 0.26,
      position: [7, 0.65, -58],
      rotation: -0.25,
    },
    {
      args: [10, 0, 7],
      kind: "earth",
      opacity: 0.44,
      position: [-4, 0.64, 66],
      rotation: -0.35,
    },
    {
      args: [9, 0, 6],
      kind: "earth",
      opacity: 0.4,
      position: [13, 0.63, 43],
      rotation: 0.65,
    },
    {
      args: [8, 0, 6],
      kind: "earth",
      opacity: 0.42,
      position: [-16, 0.64, 6],
      rotation: -0.8,
    },
    {
      args: [7.5, 0, 12],
      kind: "water",
      opacity: 0.48,
      position: [-26, 0.72, 45],
      rotation: -0.1,
    },
    {
      args: [6.5, 0, 13],
      kind: "water",
      opacity: 0.48,
      position: [26, 0.72, -26],
      rotation: 0.35,
    },
    {
      args: [3.2, 0, 13],
      kind: "water",
      opacity: 0.44,
      position: [-22, 0.72, -6],
      rotation: -0.2,
    },
    {
      args: [5.2, 0, 4.8],
      kind: "water",
      opacity: 0.44,
      position: [20, 0.72, 36],
      rotation: 0.7,
    },
    {
      args: [7, 0, 4.5],
      kind: "rock",
      opacity: 0.62,
      position: [-28, 0.78, -63],
      rotation: 0.2,
    },
    {
      args: [6, 0, 4],
      kind: "rock",
      opacity: 0.58,
      position: [26, 0.78, -55],
      rotation: -0.6,
    },
    {
      args: [6, 0, 4.6],
      kind: "rock",
      opacity: 0.6,
      position: [-28, 0.78, -18],
      rotation: 0.45,
    },
    {
      args: [6.8, 0, 4.8],
      kind: "rock",
      opacity: 0.6,
      position: [30, 0.78, 27],
      rotation: -0.3,
    },
    {
      args: [6.4, 0, 4.4],
      kind: "rock",
      opacity: 0.6,
      position: [-27, 0.78, 70],
      rotation: 0.55,
    },
    {
      args: [5.5, 0, 3.8],
      kind: "rock",
      opacity: 0.56,
      position: [24, 0.78, 75],
      rotation: -0.15,
    },
  ];
  const outsideHazeUniforms = {
    bottomColor: { value: new Color("#87926d") },
    topColor: { value: new Color("#d9e1d9") },
  };
  const outsideHazeVertex = `
                    varying vec2 vUv;
                    void main() {
                      vUv = uv;
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                  `;
  const outsideHazeFragment = `
                    varying vec2 vUv;
                    uniform vec3 bottomColor;
                    uniform vec3 topColor;
                    void main() {
                      vec3 color = mix(bottomColor, topColor, smoothstep(0.08, 1.0, vUv.y));
                      gl_FragColor = vec4(color, 0.42);
                    }
                  `;

  let {
    animationNow = 0,
    bossBannerTexture = null,
    currentFloorPalette,
    environment = null,
    floorExitOpenAmount = 0,
    outsideEarthDecalTexture = null,
    outsideEarthTexture = null,
    outsideRockDecalTexture = null,
    outsideRocksTexture = null,
    outsideWaterDecalTexture = null,
    outsideWaterTexture = null,
  }: {
    animationNow?: number;
    bossBannerTexture?: Texture | null;
    currentFloorPalette: SceneFloorPalette;
    environment?: RoomEnvironmentId | null;
    floorExitOpenAmount?: number;
    outsideEarthDecalTexture?: Texture | null;
    outsideEarthTexture?: Texture | null;
    outsideRockDecalTexture?: Texture | null;
    outsideRocksTexture?: Texture | null;
    outsideWaterDecalTexture?: Texture | null;
    outsideWaterTexture?: Texture | null;
  } = $props();

  const outside = $derived(environment === "outside-start");
  const exitReveal = $derived(Math.max(0, Math.min(1, floorExitOpenAmount)));
  const bannerLift = $derived(exitReveal * exitReveal);

  // Snap a hardcoded Codex prop position onto the procedural heightmap
  // so nothing floats above or sinks into the new terrain. The original
  // y acts as an "offset from ground" — e.g. rocks authored at y=0.85
  // keep their ~0.85 clearance above whatever the ground is now.
  const onGround = (pos: Vec3, baseOffsetY = 0): Vec3 => [
    pos[0],
    outsideGroundY(pos[0], pos[2]) + (pos[1] ?? 0) + baseOffsetY,
    pos[2],
  ];
  const getOutsideDecalTexture = (
    kind: (typeof outsideDecals)[number]["kind"]
  ) => {
    if (kind === "water") {
      return outsideWaterDecalTexture;
    }

    if (kind === "rock") {
      return outsideRockDecalTexture;
    }

    return outsideEarthDecalTexture;
  };
  const getOutsideDecalColor = (
    kind: (typeof outsideDecals)[number]["kind"]
  ) => {
    if (kind === "water") {
      return "#c4fff1";
    }

    if (kind === "rock") {
      return "#7d765e";
    }

    return "#626739";
  };
  const getOutsideDecalOpacity = (decal: (typeof outsideDecals)[number]) => {
    if (decal.kind === "water") {
      return (decal.opacity ?? 0.68) * 1.15;
    }

    if (decal.kind === "rock") {
      return (decal.opacity ?? 0.68) * 0.55;
    }

    return (decal.opacity ?? 0.68) * 0.9;
  };
</script>

{#if !outside}
  <T.Mesh
    position={[0, -0.39, 0]}
    receiveShadow
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.PlaneGeometry args={[32, 27]} />
    <T.MeshStandardMaterial color="#100c08" metalness={0.28} roughness={0.78} />
  </T.Mesh>

  <T.Mesh position={[0, 2.15, -10.2]} castShadow receiveShadow>
    <T.PlaneGeometry args={[24, 4.9]} />
    <T.MeshStandardMaterial color="#18120d" metalness={0.42} roughness={0.74} />
  </T.Mesh>

  <T.Mesh
    position={[-12.15, 2.05, -0.5]}
    castShadow
    receiveShadow
    rotation={[0, Math.PI / 2, 0]}
  >
    <T.PlaneGeometry args={[19.5, 4.7]} />
    <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
  </T.Mesh>

  <T.Mesh
    position={[12.15, 2.05, -0.5]}
    castShadow
    receiveShadow
    rotation={[0, -Math.PI / 2, 0]}
  >
    <T.PlaneGeometry args={[19.5, 4.7]} />
    <T.MeshStandardMaterial color="#120e0a" metalness={0.38} roughness={0.78} />
  </T.Mesh>
{/if}

{#if outside}
  <OutsideAtmosphere
    grassCount={5500}
    bounds={{ xMin: -36, xMax: 36, zMin: -88, zMax: 82 }}
    avoid={[
      // roads (central thoroughfare + side spurs)
      ...outsideRoads.map((r) => ({
        x: r.position[0],
        z: r.position[2],
        r: Math.max(r.args[0], r.args[2]) + 1.4,
      })),
      // clearings, water, explicit grass patches (keep visible surface)
      ...outsideClearings.map((c) => ({
        x: c.position[0],
        z: c.position[2],
        r: Math.max(c.args[0], c.args[2]) + 0.6,
      })),
      ...outsideWater.map((w) => ({
        x: w.position[0],
        z: w.position[2],
        r: Math.max(w.args[0], w.args[2]) + 0.8,
      })),
      ...outsideGrass.map((g) => ({
        x: g.position[0],
        z: g.position[2],
        r: Math.max(g.args[0], g.args[2]) + 0.4,
      })),
      // hills, rocks, trees, camps — don't plant grass on top of them
      ...outsideHills.map((h) => ({
        x: h.position[0],
        z: h.position[2],
        r: h.radius + 1,
      })),
      ...outsideRocks.map((rk) => ({
        x: rk.position[0],
        z: rk.position[2],
        r: Math.max(rk.args[0], rk.args[2]) + 0.6,
      })),
      ...outsideTrees.map((t) => ({
        x: t.position[0],
        z: t.position[2],
        r: 1.4,
      })),
      ...outsideCamps.map((c) => ({
        x: c.position[0],
        z: c.position[2],
        r: 2.4,
      })),
      ...outsideWrecks.map((w) => ({
        x: w.position[0],
        z: w.position[2],
        r: 2.5,
      })),
      ...outsidePoiMarkers.map((p) => ({
        x: p.position[0],
        z: p.position[2],
        r: 2.6,
      })),
    ]}
  />

  <OutsideTerrain texture={outsideEarthTexture} />

  <T.Mesh position={[0, 12, -112]} rotation={[-0.14, 0, 0]}>
    <T.PlaneGeometry args={[150, 58]} />
    <T.ShaderMaterial
      depthWrite={false}
      fragmentShader={outsideHazeFragment}
      transparent
      uniforms={outsideHazeUniforms}
      vertexShader={outsideHazeVertex}
    />
  </T.Mesh>

  <!-- Mountain ring is now carved directly into the terrain heightmap;
       we only need the invisible collider wall so the player can't walk
       out of the chunk. -->
  <OutsideMountainCollider />

  <!-- Winding procedural road ribbon following the seed-driven centerline -->
  <OutsideRoad />

  {#each outsideWrecks as wreck}
    <T.Group
      position={onGround(wreck.position, 0.08)}
      rotation={[0, wreck.rotation, 0]}
    >
      <T.Group position={[0, 0.52, 0]}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={[1.42, 0.52, 0.72]} friction={0.92} />
        </RigidBody>
      </T.Group>
      <T.Mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <T.BoxGeometry args={[2.7, 0.5, 1.25]} />
        <T.MeshStandardMaterial
          color={wreck.color}
          metalness={0.18}
          roughness={0.93}
        />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[0.18, 0.68, -0.05]}>
        <T.BoxGeometry args={[1.1, 0.55, 1.02]} />
        <T.MeshStandardMaterial
          color="#27332d"
          metalness={0.1}
          roughness={0.96}
        />
      </T.Mesh>
      <T.Mesh position={[0.2, 0.72, -0.58]} rotation={[0.12, 0, 0]}>
        <T.BoxGeometry args={[0.9, 0.04, 0.52]} />
        <T.MeshBasicMaterial color="#8fb1a1" opacity={0.23} transparent />
      </T.Mesh>
      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh
            castShadow
            position={[x * 0.95, 0.1, z * 0.64]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <T.CylinderGeometry args={[0.22, 0.22, 0.18, 10]} />
            <T.MeshStandardMaterial color="#151512" roughness={0.9} />
          </T.Mesh>
        {/each}
      {/each}
    </T.Group>
  {/each}

  {#each outsideBarriers as barrier}
    <T.Group
      position={onGround(barrier.position, 0.12)}
      rotation={[0, barrier.rotation, 0]}
    >
      <T.Group position={[0, 0.16, 0]}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={[1.4, 0.16, 0.12]} friction={0.9} />
        </RigidBody>
      </T.Group>
      {#each [-1, 1] as x}
        <T.Group position={[x * 1.08, 0.52, 0]}>
          <RigidBody type="fixed">
            <Collider shape="cuboid" args={[0.08, 0.4, 0.08]} friction={0.9} />
          </RigidBody>
        </T.Group>
      {/each}
      <T.Mesh castShadow receiveShadow position={[0, 0.16, 0]}>
        <T.BoxGeometry args={[2.8, 0.32, 0.24]} />
        <T.MeshStandardMaterial color="#77705e" roughness={0.95} />
      </T.Mesh>
      {#each [-1, 1] as x}
        <T.Mesh castShadow receiveShadow position={[x * 1.08, 0.52, 0]}>
          <T.BoxGeometry args={[0.16, 0.8, 0.16]} />
          <T.MeshStandardMaterial
            color="#4d4437"
            metalness={0.3}
            roughness={0.82}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  {#each outsideClearings as slab}
    <OutsideSurface
      args={slab.args}
      color="#8f8b74"
      opacity={0.2}
      position={[
        slab.position[0],
        outsideGroundY(slab.position[0], slab.position[2]) + 0.045,
        slab.position[2],
      ]}
      roughness={0.96}
    />
  {/each}

  <!-- One procedural water body; the terrain heightmap occludes it
       everywhere ground is raised above waterLevel, so the shoreline
       follows the plan's actual rivers. Old codex water / earth /
       rock decal overlays removed — they floated above the new
       heightmap and the shader handles surface detail now. -->
  <OutsideProceduralWater />

  <!-- Procedural trees + bushes + rocks — driven by the chunk plan.
       Visual meshes and colliders are split so the renderer can
       batch instanced meshes while rapier still gets one collider
       per solid tree / rock. -->
  <OutsideFoliage />
  <OutsideVegetationColliders />

  <!-- Rocks, camps, POIs etc are now picked procedurally by the
       outside-chunk pipeline and rendered via OutsidePoIs / the rock
       instance pass inside OutsideFoliage. The codex hand-authored
       arrays were still around but conflicted with the plan's
       landmark selection. -->
  <OutsidePoIs />

  <T.Mesh position={[0, 4.8, -82.4]}>
    <T.PlaneGeometry args={[86, 12]} />
    <T.MeshBasicMaterial
      color="#26341d"
      opacity={0.82}
      side={DoubleSide}
      transparent
      depthWrite={false}
    />
  </T.Mesh>

  {#each [-34, -27, -20, -13, -6, 1, 8, 15, 22, 29, 36] as x, index}
    <T.Group
      position={onGround([x, 0, -79.5 - (index % 2) * 2.4], 0)}
      rotation={[0, (index % 3) * 0.28, 0]}
    >
      <T.Mesh castShadow position={[0, 1.2, 0]}>
        <T.CylinderGeometry args={[0.42, 0.58, 2.4, 6]} />
        <T.MeshStandardMaterial color="#3b2b1d" roughness={0.9} />
      </T.Mesh>
      <T.Mesh castShadow position={[0, 3.2, 0]}>
        <T.SphereGeometry args={[2.1 + (index % 3) * 0.35, 7, 5]} />
        <T.MeshStandardMaterial color="#334d23" roughness={0.94} />
      </T.Mesh>
      <T.Mesh castShadow position={[0.8, 4.2, -0.5]}>
        <T.SphereGeometry args={[1.45 + (index % 2) * 0.32, 7, 5]} />
        <T.MeshStandardMaterial color="#425d2b" roughness={0.94} />
      </T.Mesh>
    </T.Group>
  {/each}
{/if}

{#if environment === "training-range"}
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
          color="#1b2935"
          roughness={0.7}
          metalness={0.34}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.23, 0]}>
        <T.BoxGeometry args={[4.6, 0.07, 2.55]} />
        <T.MeshStandardMaterial
          color="#24384a"
          metalness={0.36}
          roughness={0.64}
        />
      </T.Mesh>

      {#each [-1, 1] as side}
        <T.Mesh castShadow receiveShadow position={[0, 0.31, side * 1.24]}>
          <T.BoxGeometry args={[4.65, 0.1, 0.14]} />
          <T.MeshStandardMaterial
            color="#8a5c31"
            metalness={0.66}
            roughness={0.38}
          />
        </T.Mesh>
      {/each}

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh castShadow receiveShadow position={[x * 2.1, 0.34, z * 1.02]}>
            <T.BoxGeometry args={[0.36, 0.1, 0.36]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <T.Group position={[-2.2, 0.45, -2.4]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.6, 0.45, 0.6]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.2, 0.9, 1.2]} />
        <T.MeshStandardMaterial
          color="#1f3442"
          metalness={0.32}
          roughness={0.64}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.49, 0]}>
        <T.BoxGeometry args={[1.28, 0.08, 1.28]} />
        <T.MeshStandardMaterial
          color="#263d4f"
          metalness={0.38}
          roughness={0.58}
        />
      </T.Mesh>

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh
            castShadow
            receiveShadow
            position={[x * 0.47, 0.58, z * 0.47]}
          >
            <T.BoxGeometry args={[0.24, 0.16, 0.24]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <T.Group position={[0.2, 0.65, 2.1]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[0.9, 0.65, 0.9]} friction={0.95} />

      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[1.8, 1.3, 1.8]} />
        <T.MeshStandardMaterial
          color="#20394a"
          metalness={0.32}
          roughness={0.64}
        />
      </T.Mesh>

      <T.Mesh castShadow receiveShadow position={[0, 0.69, 0]}>
        <T.BoxGeometry args={[1.9, 0.09, 1.9]} />
        <T.MeshStandardMaterial
          color="#2a4356"
          metalness={0.38}
          roughness={0.58}
        />
      </T.Mesh>

      {#each [-1, 1] as x}
        {#each [-1, 1] as z}
          <T.Mesh
            castShadow
            receiveShadow
            position={[x * 0.76, 0.81, z * 0.76]}
          >
            <T.BoxGeometry args={[0.32, 0.18, 0.32]} />
            <T.MeshStandardMaterial
              color="#b77b42"
              metalness={0.68}
              roughness={0.34}
            />
          </T.Mesh>
        {/each}
      {/each}
    </RigidBody>
  </T.Group>

  <ShootingTarget position={[-4, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget position={[-3, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget position={[-2, 0, -3.5]} color="#a94b3d" />
  <ShootingTarget
    position={[4.5, 0, -4]}
    color="#a8793d"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[5.5, 0, -4]}
    color="#a8793d"
    height={2}
    width={0.3}
  />
  <ShootingTarget
    position={[-5, 0, 3]}
    color="#1f7475"
    height={1.2}
    width={0.4}
  />
  <ShootingTarget
    position={[6, 0, 2]}
    color="#1f7475"
    height={1.2}
    width={0.4}
  />
{/if}

{#if environment === "treasure-gears"}
  <T.Group position={[0, 0.18, 0]}>
    <T.Mesh castShadow receiveShadow>
      <T.CylinderGeometry args={[1.55, 1.92, 0.36, 8]} />
      <T.MeshStandardMaterial
        color="#10283a"
        metalness={0.42}
        roughness={0.58}
      />
    </T.Mesh>

    <T.Mesh
      receiveShadow
      position={[0, 0.21, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <T.RingGeometry args={[1.68, 2.12, 8]} />
      <T.MeshBasicMaterial color="#ffd166" opacity={0.42} transparent />
    </T.Mesh>

    <T.Mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <T.RingGeometry args={[0.72, 0.9, 48]} />
      <T.MeshBasicMaterial color="#8ac6ff" opacity={0.62} transparent />
    </T.Mesh>

    {#each [-1, 1] as x}
      {#each [-1, 1] as z}
        <T.Group position={[x * 2.55, 0.15, z * 2.2]}>
          <T.Mesh castShadow receiveShadow>
            <T.CylinderGeometry args={[0.22, 0.34, 0.5, 6]} />
            <T.MeshStandardMaterial
              color="#183142"
              metalness={0.48}
              roughness={0.48}
            />
          </T.Mesh>
          <T.Mesh castShadow position={[0, 0.39, 0]}>
            <T.SphereGeometry args={[0.18, 14, 10]} />
            <T.MeshStandardMaterial
              color="#8ac6ff"
              emissive="#8ac6ff"
              emissiveIntensity={0.46}
              roughness={0.18}
            />
          </T.Mesh>
        </T.Group>
      {/each}
    {/each}
  </T.Group>

  {#each treasureGearMounts as mount, index}
    <T.Group position={mount.position}>
      <T.Mesh receiveShadow>
        <T.BoxGeometry args={mount.panel} />
        <T.MeshStandardMaterial
          color="#10202f"
          metalness={0.52}
          roughness={0.68}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0, 0.2]}>
        <T.TorusGeometry args={[mount.size, 0.16, 12, 30]} />
        <T.MeshStandardMaterial
          color={mount.position[2] < 0 ? "#ffd166" : "#8ac6ff"}
          emissive={mount.position[2] < 0 ? "#ffd166" : "#8ac6ff"}
          emissiveIntensity={0.08}
          metalness={0.74}
          roughness={0.34}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, 0, 0.22]}>
        <T.CylinderGeometry args={[0.34, 0.34, 0.24, 20]} />
        <T.MeshStandardMaterial
          color="#dfeeff"
          metalness={0.4}
          roughness={0.28}
        />
      </T.Mesh>

      {#each gearTeeth as tooth, toothIndex}
        <T.Mesh
          castShadow
          position={[tooth.x * mount.size, tooth.y * mount.size, 0.2]}
          rotation={[0, 0, tooth.rotation + (index + toothIndex) * 0.03]}
        >
          <T.BoxGeometry args={[0.26, 0.44, 0.2]} />
          <T.MeshStandardMaterial
            color={index < 2 ? "#ffd166" : "#8ac6ff"}
            metalness={0.7}
            roughness={0.38}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}
{/if}

{#if environment === "boss-gears"}
  <T.Group position={[0, 2.25, -7.28]}>
    <T.Mesh castShadow receiveShadow position={[0, 1.62, 0.12]}>
      <T.BoxGeometry args={[15.2, 0.18, 0.18]} />
      <T.MeshStandardMaterial
        color="#7b5430"
        metalness={0.72}
        roughness={0.32}
      />
    </T.Mesh>

    {#each [-5.2, 0, 5.2] as x}
      <T.Group
        position={[
          x,
          x === 0 ? bannerLift * 3.65 : 0,
          x === 0 ? 0.15 - bannerLift * 0.16 : 0.15,
        ]}
        scale={[1, x === 0 ? Math.max(0.08, 1 - bannerLift * 0.72) : 1, 1]}
      >
        <T.Mesh castShadow receiveShadow position={[0, 0.04, 0]}>
          <T.PlaneGeometry args={[2.7, 3.25]} />
          <T.MeshStandardMaterial
            color={bossBannerTexture ? "#ffffff" : "#5b1718"}
            emissive="#210708"
            emissiveIntensity={0.12}
            map={bossBannerTexture}
            metalness={0.02}
            opacity={x === 0 ? Math.max(0, 1 - bannerLift * 1.24) : 1}
            roughness={0.92}
            side={DoubleSide}
            transparent={x === 0}
          />
        </T.Mesh>
        {#each [-1, 1] as side}
          <T.Mesh castShadow receiveShadow position={[side * 0.98, 0.03, 0.03]}>
            <T.BoxGeometry args={[0.08, 2.92, 0.08]} />
            <T.MeshStandardMaterial
              color="#9b6938"
              metalness={0.68}
              opacity={x === 0 ? Math.max(0, 1 - bannerLift * 1.18) : 1}
              roughness={0.38}
              transparent={x === 0}
            />
          </T.Mesh>
        {/each}
        <T.Mesh castShadow receiveShadow position={[0, -1.33, 0.04]}>
          <T.BoxGeometry args={[1.75, 0.08, 0.08]} />
          <T.MeshStandardMaterial
            color="#c08545"
            metalness={0.7}
            opacity={x === 0 ? Math.max(0, 1 - bannerLift * 1.18) : 1}
            roughness={0.34}
            transparent={x === 0}
          />
        </T.Mesh>
      </T.Group>
    {/each}
  </T.Group>

  {#each [-1, 1] as side}
    <T.Group
      position={[side * 9.54, 2.78, -4.65]}
      rotation={[0, (-side * Math.PI) / 2, 0]}
    >
      <FoundryGearSet
        {animationNow}
        paired={false}
        scale={0.58}
        speed={side}
        trimColor="#9b6938"
      />
    </T.Group>
  {/each}

  {#each [-1, 1] as side}
    <T.Group position={[side * 6.4, 0.46, -4.95]}>
      <T.Mesh castShadow receiveShadow>
        <T.CylinderGeometry args={[0.46, 0.62, 0.38, 6]} />
        <T.MeshStandardMaterial
          color="#22160f"
          metalness={0.5}
          roughness={0.62}
        />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[0, 0.62, 0]}>
        <T.BoxGeometry args={[0.72, 0.9, 0.72]} />
        <T.MeshStandardMaterial
          color="#382516"
          metalness={0.42}
          roughness={0.58}
        />
      </T.Mesh>
      <T.Mesh castShadow receiveShadow position={[0, 1.18, 0]}>
        <T.ConeGeometry args={[0.38, 0.58, 6]} />
        <T.MeshStandardMaterial
          color="#af6b32"
          emissive="#5d190c"
          emissiveIntensity={0.16}
          metalness={0.54}
          roughness={0.42}
        />
      </T.Mesh>
    </T.Group>
  {/each}
{/if}
