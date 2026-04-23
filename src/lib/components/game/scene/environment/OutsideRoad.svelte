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
      .replace("#include <common>", "#include <common>\nvarying vec2 vUvRoad;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvUvRoad = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vUvRoad;")
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        float edge = 1.0 - smoothstep(0.35, 0.5, abs(vUvRoad.x - 0.5));
        float stones = step(
          0.9,
          fract(
            sin(dot(vUvRoad * vec2(380.0, 11.0), vec2(12.9898, 78.233))) * 43758.5453
          )
        );
        vec3 c = diffuseColor.rgb;
        c = mix(c * 0.62, c, edge);
        c = mix(c, vec3(0.44, 0.42, 0.38), stones * 0.55);
        diffuseColor.rgb = c;
        diffuseColor.a = edge;
        `
      );
  };
  material.customProgramCacheKey = () => "outside-road-v2";

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
