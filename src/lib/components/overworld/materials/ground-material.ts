import { Color, type IUniform, MeshStandardMaterial } from "three";
import { glslHash, glslSimplex2D, glslValueNoise } from "./shader-noise";

export interface GroundMaterialUniforms {
  uBloom: IUniform<Color>;
  uConcrete: IUniform<Color>;
  uDirt: IUniform<Color>;
  uGrassHigh: IUniform<Color>;
  uGrassLow: IUniform<Color>;
  uPlayableRadius: IUniform<number>;
  uPlayerPos: IUniform<[number, number, number]>;
  uRust: IUniform<Color>;
  uTime: IUniform<number>;
}

export const createGroundMaterial = (): {
  material: MeshStandardMaterial;
  uniforms: GroundMaterialUniforms;
} => {
  const uniforms: GroundMaterialUniforms = {
    uTime: { value: 0 },
    uGrassLow: { value: new Color("#2e4520") },
    uGrassHigh: { value: new Color("#6d8a3a") },
    uDirt: { value: new Color("#4a3a25") },
    uRust: { value: new Color("#6e3a1f") },
    uConcrete: { value: new Color("#5a5650") },
    uBloom: { value: new Color("#d5c96b") },
    uPlayerPos: { value: [0, 0, 0] },
    uPlayableRadius: { value: 58 },
  };

  const material = new MeshStandardMaterial({
    color: 0xff_ff_ff,
    roughness: 0.94,
    metalness: 0.04,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        ${glslHash}
        ${glslValueNoise}
        ${glslSimplex2D}
        varying vec3 vWorldPosGround;
        varying float vSlope;
        varying float vRidge;
        `
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = vec3(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec2 wp = worldPos.xz;

        float big = simplex2D(wp * 0.018) * 1.8;
        float mid = simplex2D(wp * 0.065 + 12.3) * 0.8;
        float small = simplex2D(wp * 0.24 + 41.7) * 0.28;
        float rid = abs(simplex2D(wp * 0.11 + 3.1));
        vRidge = rid;
        float h = big + mid + small + (1.0 - rid) * 0.35;

        float edgeFade = smoothstep(0.55, 1.0, length(wp) / 62.0);
        h *= (1.0 - edgeFade * 0.6);

        transformed.z += h;
        vSlope = clamp(abs(big) + abs(mid), 0.0, 1.0);
        vWorldPosGround = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        ${glslHash}
        ${glslValueNoise}
        ${glslSimplex2D}
        uniform float uTime;
        uniform vec3 uGrassLow;
        uniform vec3 uGrassHigh;
        uniform vec3 uDirt;
        uniform vec3 uRust;
        uniform vec3 uConcrete;
        uniform vec3 uBloom;
        uniform vec3 uPlayerPos;
        uniform float uPlayableRadius;
        varying vec3 vWorldPosGround;
        varying float vSlope;
        varying float vRidge;
        `
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        vec2 wp = vWorldPosGround.xz;

        float grassPattern = fbm2(wp * 0.6);
        float grassBladeDetail = fbm2(wp * 4.2) * 0.5 + 0.5;
        vec3 grass = mix(uGrassLow, uGrassHigh, grassBladeDetail);
        grass = mix(grass, uGrassHigh * 0.82, smoothstep(0.3, 0.7, grassPattern));

        // procedural dirt paths (low-lying noise + radial)
        float pathBand = 1.0 - smoothstep(2.8, 8.5, length(wp));
        float pathNoise = fbm2(wp * 0.22 + 13.7);
        float dirtMask = smoothstep(0.48, 0.62, pathNoise) * (1.0 - vRidge * 0.6);
        dirtMask = max(dirtMask, pathBand * 0.55);

        // rust patches - oil stain decals
        float rustNoise = fbm2(wp * 0.12 + vec2(81.3, 9.4));
        float rustMask = smoothstep(0.58, 0.72, rustNoise) * (0.6 + 0.4 * fbm2(wp * 1.8));
        rustMask *= smoothstep(0.0, 0.18, vSlope);

        // broken concrete slabs - hard-edged grid-ish mask
        vec2 slabCoord = wp * 0.35 + 5.1;
        vec2 slabCell = floor(slabCoord);
        vec2 slabFract = fract(slabCoord) - 0.5;
        float slabJitter = hash21(slabCell);
        float slabPresence = step(0.72, hash21(slabCell + 77.7));
        float slabShape = smoothstep(0.42, 0.38, max(abs(slabFract.x), abs(slabFract.y)));
        float slabMask = slabShape * slabPresence;
        float slabCrack = 1.0 - smoothstep(0.01, 0.03, abs(simplex2D(wp * 1.6 + slabJitter * 30.0)));
        slabMask *= (1.0 - slabCrack * 0.75);

        // bloom tufts (yellow wildflowers sparsely sprinkled)
        float bloomN = fbm2(wp * 0.9 + 42.1);
        float bloomSpot = smoothstep(0.73, 0.78, bloomN) * (0.5 + 0.5 * fbm2(wp * 3.2));

        // radial wear ring near player (bright footstep trodden look) — very subtle
        float playerDist = length(wp - uPlayerPos.xz);
        float tread = smoothstep(4.5, 0.3, playerDist) * 0.35;

        vec3 col = grass;
        col = mix(col, uDirt, clamp(dirtMask, 0.0, 0.92));
        col = mix(col, uConcrete, clamp(slabMask, 0.0, 0.85));
        col = mix(col, uRust, clamp(rustMask * 0.85, 0.0, 0.82));
        col = mix(col, uBloom, bloomSpot * 0.55);
        col *= 1.0 - tread * 0.08;

        // subtle warm rim from sunset near canyon walls
        float edgeGlow = smoothstep(0.78, 1.0, length(wp) / uPlayableRadius);
        col += vec3(0.18, 0.10, 0.05) * edgeGlow * 0.45;

        diffuseColor.rgb = col;
        `
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness;
        roughnessFactor *= 1.0 - rustMask * 0.35;
        roughnessFactor = mix(roughnessFactor, 0.52, slabMask);
        `
      );
  };

  material.customProgramCacheKey = () => "overworld-ground-v1";

  return { material, uniforms };
};
