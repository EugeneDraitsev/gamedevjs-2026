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
    color: new Color("#5b5143"),
    roughness: 0.98,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
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
                                          float edge = 1.0 - smoothstep(0.44, 0.5, acrossAbs);

                                          // World-space noise keyed off road ribbon so the texture stays
                                          // put when the path bends, rather than smearing along UVs.
                                          vec2 wp = vRoadWorld.xz;
                                          float gravel = rFbm(wp * 2.4);
                                          float fineGravel = rFbm(wp * 8.6);
                                          float dirt = rFbm(wp * 0.6);
                                          float breakup = rFbm(wp * 0.32);
                                          float crackN = rFbm(wp * 5.8 + vec2(11.0, 4.0));

                                          // Two parallel wheel ruts running along the ribbon. The ruts
                                          // are darker and slightly packed (lower roughness).
                                          float rutA = smoothstep(0.16, 0.10, abs(acrossT - 0.17));
                                          float rutB = smoothstep(0.16, 0.10, abs(acrossT + 0.17));
                                          float ruts = clamp(rutA + rutB, 0.0, 1.0);
                                          float centreCrown = 1.0 - smoothstep(0.0, 0.05, acrossAbs);

                                          // Scatter pebbles: sparse high-contrast specks.
                                          float pebbleN = rHash21(floor(wp * 3.2));
                                          float pebble = step(0.9, pebbleN);
                                          float crack = smoothstep(0.76, 0.88, crackN) * (1.0 - smoothstep(0.46, 0.5, acrossAbs));
                                          vec3 pebbleCol = mix(vec3(0.46, 0.43, 0.38), vec3(0.68, 0.63, 0.55), rHash21(floor(wp * 3.2) + 17.0));

                                          // Tyre-track dust staining outside of the ruts.
                                          float dust = smoothstep(0.38, 0.5, acrossAbs) * (0.4 + 0.6 * dirt);

                                          vec3 base = diffuseColor.rgb;
                                          vec3 asphalt = vec3(0.20, 0.19, 0.17);
                                          vec3 dirtRoad = vec3(0.56, 0.43, 0.28);
                                          vec3 dustRoad = vec3(0.67, 0.58, 0.43);

                                          vec3 col = mix(asphalt, dirtRoad, smoothstep(0.34, 0.72, breakup));
                                          col = mix(col, dustRoad, dust * 0.55);
                                          col = mix(col, col * 0.54, ruts * 0.72);
                                          col = mix(col, col * 1.12, centreCrown * 0.22);
                                          col = mix(col, pebbleCol, pebble * 0.62);
                                          col = mix(col, col * 0.72, crack * 0.86);
                                          col = mix(col, col * 0.88, fineGravel * 0.3);
                                          col = mix(col, base * 0.5, smoothstep(0.47, 0.5, acrossAbs) * 0.65);

                                          diffuseColor.rgb = col;
                                          diffuseColor.a = mix(0.4, 0.98, edge);
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
  material.customProgramCacheKey = () => "outside-road-v4";

  const buildRibbonGeometry = (
    points: [number, number][],
    widthHalf: number
  ): BufferGeometry => {
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
      const y0 = plan.sampleHeight(x0, z0) + 0.12;
      const y1 = plan.sampleHeight(x1, z1) + 0.12;
      const a = verts.length / 3;

      verts.push(
        x0 + nx * widthHalf,
        y0,
        z0 + nz * widthHalf,
        x0 - nx * widthHalf,
        y0,
        z0 - nz * widthHalf,
        x1 + nx * widthHalf,
        y1,
        z1 + nz * widthHalf,
        x1 - nx * widthHalf,
        y1,
        z1 - nz * widthHalf
      );
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

  const geometries = plan.roads.map((r, index) => ({
    id: `road-${index}`,
    geometry: buildRibbonGeometry(r.points, r.widthHalf),
  }));
</script>

{#each geometries as road (road.id)}
  <T.Mesh geometry={road.geometry} {material} renderOrder={1} />
{/each}
