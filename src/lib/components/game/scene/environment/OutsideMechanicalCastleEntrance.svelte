<script module lang="ts">
  import {
    BoxGeometry,
    InstancedMesh,
    MeshStandardMaterial,
    Object3D,
  } from "three";

  type Vec3 = [number, number, number];
  type CastleMaterialId = "brass" | "glow" | "shadow" | "steel" | "trim";

  interface CastleVoxel {
    id: string;
    material: CastleMaterialId;
    position: Vec3;
    rotationY?: number;
    scale: Vec3;
  }
  type CastleInstancedMesh = InstancedMesh<BoxGeometry, MeshStandardMaterial>;

  const voxelGeometry = new BoxGeometry(1, 1, 1);
  const dummy = new Object3D();
  const castleMaterials: Record<CastleMaterialId, MeshStandardMaterial> = {
    steel: new MeshStandardMaterial({
      color: "#535d55",
      emissive: "#08110d",
      emissiveIntensity: 0.04,
      flatShading: true,
      metalness: 0.5,
      roughness: 0.64,
    }),
    shadow: new MeshStandardMaterial({
      color: "#28312b",
      emissive: "#06100c",
      emissiveIntensity: 0.08,
      flatShading: true,
      metalness: 0.58,
      roughness: 0.74,
    }),
    trim: new MeshStandardMaterial({
      color: "#765a34",
      flatShading: true,
      metalness: 0.78,
      roughness: 0.38,
    }),
    brass: new MeshStandardMaterial({
      color: "#b4894b",
      emissive: "#281203",
      emissiveIntensity: 0.16,
      flatShading: true,
      metalness: 0.86,
      roughness: 0.3,
    }),
    glow: new MeshStandardMaterial({
      color: "#ffc66c",
      emissive: "#ff8a24",
      emissiveIntensity: 1.5,
      flatShading: true,
      metalness: 0.62,
      roughness: 0.25,
    }),
  };

  const addVoxel = (
    voxels: CastleVoxel[],
    id: string,
    material: CastleMaterialId,
    position: Vec3,
    scale: Vec3,
    rotationY = 0
  ) => {
    voxels.push({ id, material, position, rotationY, scale });
  };

  const gateOpeningHalfWidth = (y: number) => {
    if (y < 8.2) {
      return 7.6;
    }

    if (y > 14.2) {
      return 0;
    }

    const t = (y - 8.2) / 6;
    return Math.sqrt(Math.max(0, 1 - t * t)) * 7.6;
  };

  const insideGateOpening = (x: number, y: number) =>
    y < 14.2 && Math.abs(x) < gateOpeningHalfWidth(y);

  const seededWave = (a: number, b: number) =>
    Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;

  const fractional = (value: number) => value - Math.floor(value);
  const castleSides = [-1, 1] as const;

  const addFacadeWall = (voxels: CastleVoxel[]) => {
    const rowHeight = 1.24;
    const blockWidth = 3.32;

    for (let row = 0; row < 18; row += 1) {
      const y = 0.95 + row * rowHeight;
      const width = row > 14 ? 82 - (row - 14) * 5.2 : 84;
      const columns = Math.floor(width / blockWidth);

      for (let col = 0; col < columns; col += 1) {
        const centered = col - (columns - 1) / 2;
        const x =
          centered * blockWidth + (row % 2 === 0 ? 0 : blockWidth * 0.18);
        const edge = Math.abs(x) / (width * 0.5);

        if (Math.abs(x) > width * 0.5 - 0.8 || insideGateOpening(x, y)) {
          continue;
        }

        const n = fractional(seededWave(row, col));
        const material: CastleMaterialId =
          edge > 0.8 || n > 0.82 ? "shadow" : "steel";
        addVoxel(
          voxels,
          `facade-${row}-${col}`,
          material,
          [x, y, n * 0.18],
          [blockWidth * (0.82 + n * 0.2), rowHeight * 0.86, 1.15 + n * 0.45]
        );
      }
    }
  };

  const addTowers = (voxels: CastleVoxel[]) => {
    for (const side of castleSides) {
      const towerX = side * 31.4;

      for (let row = 0; row < 22; row += 1) {
        const y = 0.9 + row * 1.28;
        const cap = row > 17 ? 2 : 3;

        for (let col = -cap; col <= cap; col += 1) {
          const x = towerX + col * 2.15;
          const n = fractional(seededWave(row + 32, col * side));
          addVoxel(
            voxels,
            `tower-${side}-${row}-${col}`,
            col === -cap || col === cap || row % 5 === 0 ? "shadow" : "steel",
            [x, y, -0.55 + n * 0.16],
            [1.9, 1.08, 2.8 + n * 0.55]
          );
        }
      }

      addVoxel(
        voxels,
        `tower-rib-inner-${side}`,
        "trim",
        [side * 24.2, 13.8, 0.62],
        [0.78, 25.2, 1.1]
      );
      addVoxel(
        voxels,
        `tower-rib-outer-${side}`,
        "trim",
        [side * 38.6, 12.8, 0.58],
        [0.9, 23.4, 1.05]
      );
      addVoxel(
        voxels,
        `tower-window-top-${side}`,
        "glow",
        [side * 31.4, 21.2, 1.12],
        [1.4, 1.2, 0.32]
      );
      addVoxel(
        voxels,
        `tower-window-low-${side}`,
        "glow",
        [side * 31.4, 12.9, 1.12],
        [1.18, 0.9, 0.32]
      );
    }
  };

  const addBattlements = (voxels: CastleVoxel[]) => {
    for (let col = -6; col <= 6; col += 1) {
      const x = col * 4.9;
      addVoxel(
        voxels,
        `battlement-${col}`,
        Math.abs(col) % 2 === 0 ? "trim" : "shadow",
        [x, 24.35 + (Math.abs(col) % 3) * 0.28, 0.74],
        [2.9, 2.2, 1.45]
      );
    }
  };

  const addKeep = (voxels: CastleVoxel[]) => {
    addVoxel(voxels, "keep-back", "shadow", [0, 28.5, -1.8], [18, 18, 3.8]);
    addVoxel(voxels, "keep-face", "steel", [0, 25.8, 0.06], [13.5, 12.8, 1.25]);
    addVoxel(
      voxels,
      "keep-rib-left",
      "trim",
      [-7.4, 25.2, 0.8],
      [0.76, 12.8, 1.1]
    );
    addVoxel(
      voxels,
      "keep-rib-right",
      "trim",
      [7.4, 25.2, 0.8],
      [0.76, 12.8, 1.1]
    );
    addVoxel(voxels, "keep-eye", "glow", [0, 25.2, 1.1], [3.8, 1.05, 0.34]);
  };

  const addArch = (voxels: CastleVoxel[]) => {
    for (let index = 0; index <= 12; index += 1) {
      const t = index / 12;
      const angle = Math.PI * (1 - t);
      const x = Math.cos(angle) * 7.8;
      const y = 8.35 + Math.sin(angle) * 6.1;
      addVoxel(
        voxels,
        `arch-${index}`,
        index === 6 ? "brass" : "trim",
        [x, y, 1.05],
        [1.35, 1.28, 1.4],
        -Math.cos(angle) * 0.12
      );
    }

    addVoxel(
      voxels,
      "arch-left-jamb",
      "trim",
      [-8.3, 5.1, 1],
      [1.4, 9.5, 1.45]
    );
    addVoxel(
      voxels,
      "arch-right-jamb",
      "trim",
      [8.3, 5.1, 1],
      [1.4, 9.5, 1.45]
    );
    addVoxel(
      voxels,
      "arch-keystone",
      "brass",
      [0, 14.2, 1.24],
      [2.2, 2.4, 1.55]
    );
  };

  const addApproach = (voxels: CastleVoxel[]) => {
    addVoxel(
      voxels,
      "threshold-front",
      "brass",
      [0, 0.26, 3.2],
      [17.6, 0.42, 2.1]
    );
    addVoxel(
      voxels,
      "threshold-mid",
      "trim",
      [0, 0.18, 6.1],
      [14.5, 0.32, 3.6]
    );
    addVoxel(
      voxels,
      "threshold-run",
      "steel",
      [0, 0.13, 10.2],
      [11.5, 0.26, 4.1]
    );

    for (const side of castleSides) {
      for (let index = 0; index < 5; index += 1) {
        addVoxel(
          voxels,
          `approach-post-${side}-${index}`,
          index % 2 === 0 ? "brass" : "trim",
          [side * 8.6, 0.78, 3.8 + index * 2.2],
          [0.56, 1.2, 0.56]
        );
      }
    }
  };

  const makeFacadeVoxels = (): CastleVoxel[] => {
    const voxels: CastleVoxel[] = [];

    addFacadeWall(voxels);
    addTowers(voxels);
    addBattlements(voxels);
    addKeep(voxels);
    addArch(voxels);
    addApproach(voxels);

    return voxels;
  };

  const voxels = makeFacadeVoxels();

  const makeMesh = (material: CastleMaterialId): CastleInstancedMesh | null => {
    const materialVoxels = voxels.filter(
      (voxel) => voxel.material === material
    );
    if (!materialVoxels.length) {
      return null;
    }

    const mesh = new InstancedMesh(
      voxelGeometry,
      castleMaterials[material],
      materialVoxels.length
    ) as CastleInstancedMesh;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = materialVoxels.length;

    materialVoxels.forEach((voxel, index) => {
      dummy.position.set(...voxel.position);
      dummy.rotation.set(0, voxel.rotationY ?? 0, 0);
      dummy.scale.set(...voxel.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  };

  const castleMeshes = (
    ["shadow", "steel", "trim", "brass", "glow"] satisfies CastleMaterialId[]
  ).reduce<CastleInstancedMesh[]>((meshes, material) => {
    const mesh = makeMesh(material);

    if (mesh) {
      meshes.push(mesh);
    }

    return meshes;
  }, []);

  const ventStacks = [
    { x: -18, h: 9.2, r: 0.44 },
    { x: -13.2, h: 6.8, r: 0.34 },
    { x: 12.8, h: 7.4, r: 0.38 },
    { x: 18.4, h: 10.4, r: 0.48 },
  ];
  const signalLights = [-18.2, -11.4, 11.4, 18.2];
  const gateGlowVertex = `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
  const gateGlowFragment = `
          varying vec2 vUv;
          uniform vec3 uLockedColor;
          uniform vec3 uOpenColor;
          uniform float uTime;
          uniform float uUnlocked;

          float line(float value, float width) {
            return smoothstep(width, 0.0, abs(value));
          }

          void main() {
            vec2 uv = vUv;
            vec3 color = mix(uLockedColor, uOpenColor, uUnlocked);
            float pulse = 0.62 + 0.38 * sin(uTime * 3.2);
            float sideRail = line(abs(uv.x - 0.5) - 0.43, 0.018);
            float topRail = line(uv.y - 0.84, 0.02);
            float bottomRail = line(uv.y - 0.13, 0.016);
            float vertical = line(fract(uv.x * 7.0 + uTime * 0.08) - 0.5, 0.032);
            float horizontal = line(fract(uv.y * 9.0 - uTime * 0.11) - 0.5, 0.026);
            float diagonal = line(fract((uv.x + uv.y) * 5.0 + uTime * 0.12) - 0.5, 0.022);
            float coreMask = smoothstep(0.02, 0.2, uv.x) *
              smoothstep(0.02, 0.2, 1.0 - uv.x) *
              smoothstep(0.02, 0.18, uv.y) *
              smoothstep(0.02, 0.18, 1.0 - uv.y);
            float circuit = max(max(vertical * 0.72, horizontal * 0.56), diagonal * 0.44);
            circuit = max(circuit, max(sideRail, max(topRail, bottomRail)));
            float centerGlow = smoothstep(0.52, 0.0, distance(uv, vec2(0.5, 0.55)));
            float alpha = coreMask * min(
              0.88,
              circuit * (0.58 + pulse * 0.7) + centerGlow * (0.34 + uUnlocked * 0.18)
            );

            gl_FragColor = vec4(color * (2.9 + pulse * 1.65 + uUnlocked * 0.9), alpha);
          }
        `;
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { AdditiveBlending, Color, DoubleSide } from "three";
  import FoundryGearSet from "$lib/components/game/scene/environment/walls/FoundryGearSet.svelte";
  import { outsideGroundY } from "$lib/game/outside-chunk-context";

  let {
    animationNow = 0,
    unlocked = false,
  }: {
    animationNow?: number;
    unlocked?: boolean;
  } = $props();

  const baseY = outsideGroundY(0, -78.4);
  const pulse = $derived(0.72 + Math.sin(animationNow * 0.0052) * 0.28);
  const gateLeafOffset = $derived(unlocked ? 6.35 : 1.18);
  const gateGlowUniforms = {
    uLockedColor: { value: new Color("#ffb24d") },
    uOpenColor: { value: new Color("#73ffe4") },
    uTime: { value: 0 },
    uUnlocked: { value: 0 },
  };

  $effect(() => {
    gateGlowUniforms.uTime.value = animationNow / 1000;
    gateGlowUniforms.uUnlocked.value = unlocked ? 1 : 0;
  });
</script>

<T.Group position={[0, baseY, -80.6]}>
  <T.Group position={[0, 18.2, 0]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[41.5, 5.2, 1.25]} />
    </RigidBody>
  </T.Group>
  <T.Group position={[-15.8, 6.4, 0.4]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[7.6, 6.5, 1.6]} />
    </RigidBody>
  </T.Group>
  <T.Group position={[15.8, 6.4, 0.4]}>
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[7.6, 6.5, 1.6]} />
    </RigidBody>
  </T.Group>
  {#if !unlocked}
    <T.Group position={[0, 5.5, 1.35]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[3.2, 5.2, 0.7]} />
      </RigidBody>
    </T.Group>
  {/if}

  {#each castleMeshes as mesh (mesh.uuid)}
    <T is={mesh} />
  {/each}

  {#if !unlocked}
    <T.Mesh position={[0, 7.15, 1.34]} renderOrder={2}>
      <T.PlaneGeometry args={[13.5, 13.7]} />
      <T.MeshBasicMaterial
        color="#04110e"
        opacity={0.94}
        side={DoubleSide}
        transparent
      />
    </T.Mesh>
  {/if}

  <T.Mesh position={[0, 7.1, 1.38]} renderOrder={3}>
    <T.RingGeometry args={[4.65, 6.25, 48, 1, 0, Math.PI]} />
    <T.MeshStandardMaterial
      color="#af8345"
      emissive="#2e1505"
      emissiveIntensity={0.22}
      metalness={0.86}
      roughness={0.28}
      side={DoubleSide}
    />
  </T.Mesh>

  {#each [-1, 1] as side}
    <T.Group position={[side * 4.7, 5.05, 1.58]} rotation={[0, side * 0.08, 0]}>
      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[3.3, 9.35, 0.5]} />
        <T.MeshStandardMaterial
          color="#151d19"
          emissive="#06120f"
          emissiveIntensity={0.1}
          metalness={0.76}
          roughness={0.48}
        />
      </T.Mesh>
      {#each [-3.2, -1.55, 0.15, 1.85, 3.55] as y}
        <T.Mesh position={[0, y, 0.32]} castShadow>
          <T.BoxGeometry args={[3.55, 0.16, 0.24]} />
          <T.MeshStandardMaterial
            color="#9b713a"
            metalness={0.84}
            roughness={0.3}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  {#if !unlocked}
    <T.Mesh position={[0, 5.8, 1.74]} renderOrder={4}>
      <T.PlaneGeometry args={[4.2, 9.2]} />
      <T.MeshBasicMaterial
        color="#020504"
        opacity={0.84}
        side={DoubleSide}
        transparent
      />
    </T.Mesh>
  {/if}

  {#if !unlocked}
    <T.Mesh position={[0, 6.1, 2]} renderOrder={11}>
      <T.PlaneGeometry args={[7.2, 10.2]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color="#ff9f3f"
        depthWrite={false}
        opacity={0.18}
        side={DoubleSide}
        transparent
      />
    </T.Mesh>

    <T.Mesh position={[0, 6.1, 2.04]} renderOrder={12}>
      <T.PlaneGeometry args={[6.8, 9.8]} />
      <T.ShaderMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={gateGlowFragment}
        side={DoubleSide}
        transparent
        uniforms={gateGlowUniforms}
        vertexShader={gateGlowVertex}
      />
    </T.Mesh>
  {/if}

  {#each [-1, 1] as side}
    <T.Group
      position={[side * gateLeafOffset, 5.55, 2.02]}
      rotation={[0, side * (unlocked ? 0.32 : 0), 0]}
    >
      <T.Mesh castShadow receiveShadow>
        <T.BoxGeometry args={[2.2, 8.8, 0.34]} />
        <T.MeshStandardMaterial
          color={unlocked ? "#1a2522" : "#101615"}
          emissive={unlocked ? "#07352d" : "#1e0e03"}
          emissiveIntensity={unlocked ? 0.34 : 0.18}
          metalness={0.8}
          roughness={0.38}
        />
      </T.Mesh>
      {#each [-3.3, -2.05, -0.8, 0.45, 1.7, 2.95] as y}
        <T.Mesh position={[0, y, 0.22]} castShadow>
          <T.BoxGeometry args={[2.46, 0.11, 0.18]} />
          <T.MeshStandardMaterial
            color={unlocked ? "#55d6be" : "#b27029"}
            emissive={unlocked ? "#1d7f6e" : "#5c2105"}
            emissiveIntensity={unlocked ? 0.42 : 0.22}
            metalness={0.76}
            roughness={0.28}
          />
        </T.Mesh>
      {/each}
      {#each [-0.66, 0, 0.66] as x}
        <T.Mesh position={[x, 0, 0.24]} castShadow>
          <T.BoxGeometry args={[0.1, 8.4, 0.16]} />
          <T.MeshStandardMaterial
            color={unlocked ? "#83ffe7" : "#d49a3f"}
            emissive={unlocked ? "#37c6ad" : "#713308"}
            emissiveIntensity={unlocked ? 0.5 : 0.28}
            metalness={0.72}
            roughness={0.25}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/each}

  {#if unlocked}
    <T.Group position={[0, 0.06, -5.8]}>
      <T.Mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <T.PlaneGeometry args={[7.4, 16.5]} />
        <T.MeshStandardMaterial
          color="#24261b"
          emissive="#080a06"
          emissiveIntensity={0.12}
          metalness={0.18}
          roughness={0.9}
        />
      </T.Mesh>

      {#each [-1, 1] as side}
        <T.Mesh castShadow receiveShadow position={[side * 4.25, 3.2, -1.2]}>
          <T.BoxGeometry args={[0.46, 6.4, 13.5]} />
          <T.MeshStandardMaterial
            color="#141915"
            emissive="#040806"
            emissiveIntensity={0.08}
            metalness={0.48}
            roughness={0.72}
          />
        </T.Mesh>
      {/each}

      {#each [-6.2, -2.6, 1] as z}
        <T.Mesh castShadow receiveShadow position={[0, 6.55, z]}>
          <T.BoxGeometry args={[8.8, 0.34, 0.52]} />
          <T.MeshStandardMaterial
            color="#65461f"
            emissive="#1d0e03"
            emissiveIntensity={0.12}
            metalness={0.78}
            roughness={0.32}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {/if}

  <FoundryGearSet
    {animationNow}
    paired
    scale={3.2}
    speed={1.45}
    trimColor="#9b713a"
    x={-18.7}
    y={14.1}
  />
  <FoundryGearSet
    {animationNow}
    paired
    scale={2.85}
    speed={-1.2}
    trimColor="#b4894b"
    x={17.2}
    y={15.4}
  />
  <FoundryGearSet
    {animationNow}
    paired={false}
    scale={3.7}
    speed={0.72}
    trimColor="#8c6738"
    x={0}
    y={23.2}
  />

  {#each ventStacks as stack}
    <T.Group position={[stack.x, 29.4 + stack.h * 0.5, -0.45]}>
      <T.Mesh castShadow receiveShadow>
        <T.CylinderGeometry args={[stack.r, stack.r * 1.16, stack.h, 10]} />
        <T.MeshStandardMaterial
          color="#2b312f"
          metalness={0.72}
          roughness={0.44}
        />
      </T.Mesh>
      <T.Mesh position={[0, stack.h * 0.5 + 0.2, 0]}>
        <T.CylinderGeometry args={[stack.r * 1.34, stack.r * 1.1, 0.36, 10]} />
        <T.MeshStandardMaterial
          color="#7b5b31"
          emissive="#241105"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.3}
        />
      </T.Mesh>
    </T.Group>
  {/each}

  {#each signalLights as x}
    <T.PointLight
      color="#ffb45d"
      distance={9}
      intensity={pulse * 0.9}
      position={[x, 13.1, 2.8]}
    />
  {/each}
  <T.PointLight
    color="#71f3d4"
    distance={13}
    intensity={pulse * (unlocked ? 2.6 : 1.6)}
    position={[0, 6.2, 4.1]}
  />
  <T.PointLight
    color={unlocked ? "#79ffe8" : "#ffb45d"}
    distance={22}
    intensity={unlocked ? 3.6 : 3.2}
    position={[0, 7.2, 5.4]}
  />
  <T.PointLight
    color="#ffe2a8"
    distance={78}
    intensity={2.6}
    position={[0, 17.5, 20]}
  />
</T.Group>
