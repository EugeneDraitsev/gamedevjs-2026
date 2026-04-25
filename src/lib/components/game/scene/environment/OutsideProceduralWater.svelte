<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import {
    BufferAttribute,
    BufferGeometry,
    Color,
    DoubleSide,
    type IUniform,
    PlaneGeometry,
    ShaderMaterial,
  } from "three";
  import {
    glslHash,
    glslValueNoise,
  } from "$lib/components/overworld/materials/shader-noise";
  import { createWaterMaterial } from "$lib/components/overworld/materials/water-material";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  // One big water plane at waterLevel; terrain geometry occludes it
  // everywhere the ground sits above zero, so the shoreline follows
  // the plan's heightmap exactly.
  const plan = outsidePlan();
  const geometry = new PlaneGeometry(plan.size.width, plan.size.depth, 64, 120);
  const buildRiverbedGeometry = (
    points: [number, number][],
    widthHalf: number
  ) => {
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, z0] = points[i];
      const [x1, z1] = points[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const a = verts.length / 3;
      for (const [x, z] of [
        [x0 + nx * widthHalf, z0 + nz * widthHalf],
        [x0 - nx * widthHalf, z0 - nz * widthHalf],
        [x1 + nx * widthHalf, z1 + nz * widthHalf],
        [x1 - nx * widthHalf, z1 - nz * widthHalf],
      ] as [number, number][]) {
        verts.push(x, plan.sampleHeight(x, z) + 0.035, z);
      }
      uvs.push(0, i, 1, i, 0, i + 1, 1, i + 1);
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    g.computeVertexNormals();
    return g;
  };
  const riverbeds = plan.rivers.map((river, index) => ({
    id: `riverbed-${index}`,
    geometry: buildRiverbedGeometry(river.points, river.widthHalf + 2.2),
  }));
  const riverbedMaterial = new ShaderMaterial({
    uniforms: {
      uSandA: { value: new Color("#9d8758") },
      uSandB: { value: new Color("#d1bd84") },
    } as Record<string, IUniform>,
    vertexShader: /* glsl */ `
                                    varying vec2 vRiverbedUv;
                                    varying vec3 vWorldPos;
                                    void main() {
                                      vRiverbedUv = uv;
                                      vec4 worldPos = modelMatrix * vec4(position, 1.0);
                                      vWorldPos = worldPos.xyz;
                                      gl_Position = projectionMatrix * viewMatrix * worldPos;
                                    }
                                  `,
    fragmentShader: /* glsl */ `
                                    ${glslHash}
                                    ${glslValueNoise}
                                    uniform vec3 uSandA;
                                    uniform vec3 uSandB;
                                    varying vec2 vRiverbedUv;
                                    varying vec3 vWorldPos;
                                    void main() {
                                      vec2 wp = vWorldPos.xz;
                                      float grain = fbm2(wp * 1.4) * 0.7 + hash21(floor(wp * 7.0)) * 0.3;
                                      float edge = 1.0 - smoothstep(0.42, 0.5, abs(vRiverbedUv.x - 0.5));
                                      vec3 col = mix(uSandA, uSandB, grain);
                                      gl_FragColor = vec4(col, edge * 0.78);
                                    }
                                  `,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -6,
    side: DoubleSide,
    transparent: true,
  });

  const { material, uniforms } = createWaterMaterial({
    deepColor: "#123f58",
    shallowColor: "#5aa8ba",
    foamColor: "#d8f6f2",
    algaeColor: "#3f746b",
    useShoreMask: false,
  });

  useTask((delta) => {
    uniforms.uTime.value += delta;
  });
</script>

{#each riverbeds as riverbed (riverbed.id)}
  <T.Mesh
    geometry={riverbed.geometry}
    material={riverbedMaterial}
    receiveShadow
    renderOrder={1}
  />
{/each}

<T.Mesh
  {geometry}
  {material}
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, 0, 0]}
  receiveShadow
  renderOrder={2}
/>
