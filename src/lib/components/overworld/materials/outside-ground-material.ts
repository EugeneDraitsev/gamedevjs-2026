import { Color, MeshStandardMaterial, type IUniform, type Texture } from "three";
import { glslHash, glslSimplex2D, glslValueNoise } from "./shader-noise";

// Ground material that builds on Codex's PNG texture atlas and layers
// procedural detail on top (moss patches, rust stain, wildflower bloom,
// subtle overgrowth tint) without losing the original painted look.
export interface OutsideGroundUniforms {
  uTime: IUniform<number>;
  uMossColor: IUniform<Color>;
  uRustColor: IUniform<Color>;
  uBloomColor: IUniform<Color>;
  uMossStrength: IUniform<number>;
  uRockColor: IUniform<Color>;
  uSnowColor: IUniform<Color>;
  uSnowLine: IUniform<number>;
  uRockLine: IUniform<number>;
}

export const createOutsideGroundMaterial = (opts?: {
  map?: Texture | null;
  color?: string;
  snowLine?: number;
  rockLine?: number;
}): { material: MeshStandardMaterial; uniforms: OutsideGroundUniforms } => {
  const material = new MeshStandardMaterial({
    color: new Color(opts?.color ?? "#beb58f"),
    map: opts?.map ?? null,
    flatShading: true,
    roughness: 1,
    metalness: 0.02,
  });

  const uniforms: OutsideGroundUniforms = {
    uTime: { value: 0 },
    uMossColor: { value: new Color("#3d5a2a") },
    uRustColor: { value: new Color("#6a3518") },
    uBloomColor: { value: new Color("#d5c96b") },
    uMossStrength: { value: 0.85 },
    uRockColor: { value: new Color("#4e4c48") },
    uSnowColor: { value: new Color("#f7f8fa") },
    uSnowLine: { value: opts?.snowLine ?? 14 },
    uRockLine: { value: opts?.rockLine ?? 2.2 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        varying vec3 vOutsideWorld;
        `
      )
      .replace(
        "#include <worldpos_vertex>",
        /* glsl */ `
        #include <worldpos_vertex>
        vOutsideWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
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
        uniform vec3 uMossColor;
        uniform vec3 uRustColor;
        uniform vec3 uBloomColor;
        uniform float uMossStrength;
        uniform vec3 uRockColor;
        uniform vec3 uSnowColor;
        uniform float uSnowLine;
        uniform float uRockLine;
        varying vec3 vOutsideWorld;
        `
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #include <map_fragment>
        // All ground-tint work happens AFTER the PNG map has been
        // multiplied in, so rock/snow actually overwrite the brown
        // earth texture on the cliffs instead of being washed out.
        vec2 wp = vOutsideWorld.xz;

        // Moss / overgrowth patches near water and shaded corners
        float mossPattern = fbm2(wp * 0.11 + 3.7);
        float mossDetail = fbm2(wp * 0.55 + 12.1);
        float mossMask = smoothstep(0.55, 0.72, mossPattern) * (0.55 + 0.45 * mossDetail);

        // Rust / oil-stain decals scattered sparsely
        float rustNoise = fbm2(wp * 0.16 + vec2(81.3, 9.4));
        float rustMask = smoothstep(0.63, 0.78, rustNoise) * (0.4 + 0.6 * fbm2(wp * 1.6));

        // Hopeful wildflower bloom dots — rare, saturated
        float bloomN = fbm2(wp * 0.95 + 42.1);
        float bloomSpot = smoothstep(0.78, 0.83, bloomN);

        vec3 col = diffuseColor.rgb;
        col = mix(col, col * 0.7 + uMossColor * 0.55, mossMask * uMossStrength);
        col = mix(col, col * 0.8 + uRustColor * 0.4, rustMask * 0.55);
        col = mix(col, uBloomColor, bloomSpot * 0.5);

        // Rock + snow bands on the mountain ring.
        float rockT = smoothstep(uRockLine - 1.2, uRockLine + 2.0, vOutsideWorld.y);
        float snowT = smoothstep(uSnowLine - 3.0, uSnowLine + 4.0, vOutsideWorld.y);
        // Jagged snow line via noise, but gated by the base smoothstep
        // so we don't paint snow onto low valleys.
        float snowEdge = fbm2(wp * 0.22 + 71.3);
        float snowBase = smoothstep(uSnowLine - 5.0, uSnowLine + 6.0, vOutsideWorld.y);
        snowT = clamp(snowT + (snowEdge - 0.5) * 0.5 * snowBase, 0.0, 1.0);
        // Horizontal strata on exposed rock for natural sedimentary look
        float strata = sin(vOutsideWorld.y * 1.6 + fbm2(wp * 0.7) * 2.0) * 0.5 + 0.5;
        vec3 rockShade = uRockColor * (0.75 + 0.5 * strata);
        col = mix(col, rockShade, rockT * 0.92);
        col = mix(col, uSnowColor, snowT);

        diffuseColor.rgb = col;
        `
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness;
        roughnessFactor *= 1.0 - rustMask * 0.25;
        roughnessFactor = mix(roughnessFactor, 0.8, snowT);
        `
      );
  };
  material.customProgramCacheKey = () => "outside-ground-v7";

  return { material, uniforms };
};
