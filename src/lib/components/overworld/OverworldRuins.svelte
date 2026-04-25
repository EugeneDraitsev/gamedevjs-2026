<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { Color, MeshStandardMaterial } from "three";

  interface Props {
    avoid?: [number, number, number][];
    avoidRadius?: number;
    count?: number;
    playableRadius?: number;
    seed?: number;
  }

  let {
    seed = 7,
    count = 14,
    playableRadius = 58,
    avoid = [],
    avoidRadius = 4,
  }: Props = $props();

  const createRng = (s: number) => {
    let state = s;
    return () => {
      // biome-ignore lint/suspicious/noBitwiseOperators: deterministic unsigned seed hashing.
      state = (state * 1_103_515_245 + 12_345) >>> 0;
      return state / 0x1_00_00_00_00;
    };
  };

  type RuinKind = "pipe" | "cog" | "slab" | "tank";
  interface Ruin {
    id: string;
    kind: RuinKind;
    material: MeshStandardMaterial;
    rotY: number;
    rust: number;
    scale: number;
    tilt: number;
    x: number;
    y: number;
    z: number;
  }

  // Pre-build a few material variants shared across ruins
  const mkRustMat = (rustAmount: number) => {
    const m = new MeshStandardMaterial({
      color: new Color().setHSL(0.07, 0.62, 0.22 + rustAmount * 0.12),
      roughness: 0.85,
      metalness: 0.45,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRust = { value: rustAmount };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vLocalPos;"
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvLocalPos = position;"
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uRust;\nvarying vec3 vLocalPos;"
        )
        .replace(
          "#include <color_fragment>",
          /* glsl */ `
                                #include <color_fragment>
                                vec3 rustA = vec3(0.42, 0.22, 0.12);
                                vec3 rustB = vec3(0.25, 0.13, 0.07);
                                vec3 mossC = vec3(0.22, 0.36, 0.14);
                                float stripe = abs(sin(vLocalPos.y * 6.0 + vLocalPos.x * 1.5));
                                float rustMask = mix(0.4, 1.0, stripe) * uRust;
                                float moss = smoothstep(-0.4, -1.0, vLocalPos.y) * 0.8;
                                vec3 col = mix(diffuseColor.rgb, rustA, rustMask * 0.85);
                                col = mix(col, rustB, rustMask * 0.35);
                                col = mix(col, mossC, moss * 0.7);
                                diffuseColor.rgb = col;
                                `
        )
        .replace(
          "#include <roughnessmap_fragment>",
          "float roughnessFactor = mix(roughness, 0.95, uRust * 0.6);"
        )
        .replace(
          "#include <metalnessmap_fragment>",
          "float metalnessFactor = mix(metalness, 0.15, uRust * 0.8);"
        );
    };
    m.customProgramCacheKey = () => `overworld-rust-${rustAmount.toFixed(2)}`;
    return m;
  };

  const sharedMats = [
    mkRustMat(0.45),
    mkRustMat(0.65),
    mkRustMat(0.85),
    mkRustMat(1.0),
  ];

  const ruins = $derived.by<Ruin[]>(() => {
    const rng = createRng(seed);
    const out: Ruin[] = [];
    const kinds: RuinKind[] = ["pipe", "cog", "slab", "tank"];
    const avoidR2 = avoidRadius * avoidRadius;
    let attempts = 0;
    while (out.length < count && attempts < count * 6) {
      attempts++;
      const a = rng() * Math.PI * 2;
      const r = 6 + Math.sqrt(rng()) * (playableRadius - 6);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let skip = false;
      for (const av of avoid) {
        const dx = x - av[0];
        const dz = z - av[2];
        if (dx * dx + dz * dz < avoidR2) {
          skip = true;
          break;
        }
      }
      if (skip) {
        continue;
      }
      const material = sharedMats[Math.floor(rng() * sharedMats.length)];
      out.push({
        id: `ruin-${out.length}`,
        kind: kinds[Math.floor(rng() * kinds.length)],
        x,
        z,
        y: -0.15 + rng() * 0.2,
        rotY: rng() * Math.PI * 2,
        scale: 0.8 + rng() * 1.3,
        tilt: (rng() - 0.5) * 0.6,
        rust: 0.35 + rng() * 0.45,
        material,
      });
    }
    return out;
  });
</script>

{#each ruins as ruin (ruin.id)}
  <T.Group
    position={[ruin.x, ruin.y, ruin.z]}
    rotation={[ruin.tilt, ruin.rotY, ruin.tilt * 0.3]}
  >
    {#if ruin.kind === "pipe"}
      <T.Mesh
        castShadow
        receiveShadow
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.CylinderGeometry args={[0.55, 0.6, 3.2, 14, 1, true]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <T.Mesh
        position={[0, 1.35, 0]}
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.TorusGeometry args={[0.6, 0.12, 8, 20]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <RigidBody type="fixed">
        <Collider shape="cylinder" args={[1.6, 0.6 * ruin.scale]} />
      </RigidBody>
    {:else if ruin.kind === "cog"}
      <T.Mesh
        castShadow
        receiveShadow
        scale={[ruin.scale, ruin.scale, ruin.scale]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <T.TorusGeometry args={[1.3, 0.45, 6, 14]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <T.Mesh
        castShadow
        rotation={[Math.PI / 2, 0, 0]}
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.TorusGeometry args={[0.4, 0.15, 4, 8]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <RigidBody type="fixed">
        <Collider
          shape="cylinder"
          args={[0.5 * ruin.scale, 1.7 * ruin.scale]}
        />
      </RigidBody>
    {:else if ruin.kind === "slab"}
      <T.Mesh
        castShadow
        receiveShadow
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.BoxGeometry args={[2.6, 0.5, 1.5]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      {#each Array.from({ length: 3 }) as _, j (j)}
        <T.Mesh position={[-1 + j * 1, 0.8, 0.1]}>
          <T.CylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
          <T is={sharedMats[3]} attach="material" />
        </T.Mesh>
      {/each}
      <RigidBody type="fixed">
        <Collider
          shape="cuboid"
          args={[1.3 * ruin.scale, 0.25 * ruin.scale, 0.75 * ruin.scale]}
        />
      </RigidBody>
    {:else}
      <T.Mesh
        castShadow
        receiveShadow
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.CylinderGeometry args={[0.7, 0.75, 1.5, 18]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <T.Mesh
        position={[0, 0.78, 0]}
        scale={[ruin.scale, ruin.scale, ruin.scale]}
      >
        <T.TorusGeometry args={[0.72, 0.06, 6, 20]} />
        <T is={ruin.material} attach="material" />
      </T.Mesh>
      <RigidBody type="fixed">
        <Collider
          shape="cylinder"
          args={[0.75 * ruin.scale, 0.78 * ruin.scale]}
        />
      </RigidBody>
    {/if}
  </T.Group>
{/each}
