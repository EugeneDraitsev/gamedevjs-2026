<script lang="ts">
  import { T } from "@threlte/core";
  import {
    BufferAttribute,
    BufferGeometry,
    Color,
    MeshStandardMaterial,
  } from "three";
  import { outsidePlan } from "$lib/game/outside-chunk-context";

  // Build a ribbon per A*-computed road polyline. Each segment is a
  // pair of triangles between consecutive points on the path, slightly
  // lifted off the terrain so the road reads as a worn dirt strip.
  const plan = outsidePlan();

  const material = new MeshStandardMaterial({
    color: new Color("#8c6f46"),
    roughness: 0.98,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vUvRoad;\nvarying vec3 vRoadWorld;"
      )
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvUvRoad = uv;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRoadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        varying vec2 vUvRoad;
        varying vec3 vRoadWorld;

        float rHash21(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        float rValueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = rHash21(i);
          float b = rHash21(i + vec2(1.0, 0.0));
          float c = rHash21(i + vec2(0.0, 1.0));
          float d = rHash21(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float rFbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * rValueNoise(p); p *= 2.07; a *= 0.5; }
          return v;
        }
        `
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>

        // UV: v runs along the road, u is 0..1 across the width (0.5 = centre).
        float acrossT = vUvRoad.x - 0.5;           // -0.5..0.5
        float acrossAbs = abs(acrossT);
        float edge = 1.0 - smoothstep(0.36, 0.5, acrossAbs);

        // World-space noise keyed off road ribbon so the texture stays
        // put when the path bends, rather than smearing along UVs.
        vec2 wp = vRoadWorld.xz;
        float gravel = rFbm(wp * 2.4);
        float fineGravel = rFbm(wp * 8.6);
        float dirt = rFbm(wp * 0.6);

        // Two parallel wheel ruts running along the ribbon. The ruts
        // are darker and slightly packed (lower roughness).
        float rutA = smoothstep(0.16, 0.10, abs(acrossT - 0.17));
        float rutB = smoothstep(0.16, 0.10, abs(acrossT + 0.17));
        float ruts = clamp(rutA + rutB, 0.0, 1.0);
        float centreCrown = 1.0 - smoothstep(0.0, 0.05, acrossAbs);

        // Scatter pebbles: sparse high-contrast specks.
        float pebbleN = rHash21(floor(wp * 3.2));
        float pebble = step(0.93, pebbleN);
        vec3 pebbleCol = mix(vec3(0.46, 0.43, 0.38), vec3(0.68, 0.63, 0.55), rHash21(floor(wp * 3.2) + 17.0));

        // Tyre-track dust staining outside of the ruts.
        float dust = smoothstep(0.38, 0.5, acrossAbs) * (0.4 + 0.6 * dirt);

        vec3 base = diffuseColor.rgb;
        vec3 warm = vec3(0.62, 0.50, 0.32);
        vec3 cool = vec3(0.42, 0.36, 0.28);

        vec3 col = mix(cool, warm, gravel);
        col = mix(col, col * 0.78, ruts * 0.65);
        col = mix(col, col * 1.08, centreCrown * 0.25);
        col = mix(col, pebbleCol, pebble * 0.75);
        col = mix(col, col * 0.9, fineGravel * 0.35);
        col = mix(col, base * 0.75, dust * 0.45);

        diffuseColor.rgb = col;
        diffuseColor.a = edge;
        `
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness;
        // Slight smoothing on ruts, rougher on shoulder gravel.
        roughnessFactor *= mix(1.0, 0.85, ruts);
        roughnessFactor = clamp(roughnessFactor, 0.55, 1.0);
        `
      );
  };
  material.customProgramCacheKey = () => "outside-road-v3";

  const buildRibbonGeometry = (
    points: Array<[number, number]>,
    widthHalf: number
  ): BufferGeometry => {
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const [x, z] = points[i];
      let nx: number, nz: number;
      if (i === 0) {
        const [x2, z2] = points[i + 1];
        const dx = x2 - x;
        const dz = z2 - z;
        const len = Math.hypot(dx, dz) || 1;
        nx = -dz / len;
        nz = dx / len;
      } else if (i === n - 1) {
        const [x0, z0] = points[i - 1];
        const dx = x - x0;
        const dz = z - z0;
        const len = Math.hypot(dx, dz) || 1;
        nx = -dz / len;
        nz = dx / len;
      } else {
        const [x0, z0] = points[i - 1];
        const [x2, z2] = points[i + 1];
        const dx = x2 - x0;
        const dz = z2 - z0;
        const len = Math.hypot(dx, dz) || 1;
        nx = -dz / len;
        nz = dx / len;
      }
      const y = plan.sampleHeight(x, z) + 0.12;
      verts.push(x + nx * widthHalf, y, z + nz * widthHalf);
      verts.push(x - nx * widthHalf, y, z - nz * widthHalf);
      uvs.push(0, i);
      uvs.push(1, i);
      if (i < n - 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new BufferGeometry();
    g.setIndex(indices);
    g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    g.computeVertexNormals();
    return g;
  };

  const geometries = plan.roads.map((r) => ({
    id: `${r.points.length}-${r.points[0]?.[0].toFixed(2)}`,
    geometry: buildRibbonGeometry(r.points, r.widthHalf),
  }));
</script>

{#each geometries as road (road.id)}
  <T.Mesh
    geometry={road.geometry}
    {material}
    receiveShadow
    renderOrder={1}
  />
{/each}
