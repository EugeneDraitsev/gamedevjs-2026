import { Color, DoubleSide, type IUniform, MeshStandardMaterial } from "three";
import { glslHash, glslSimplex2D } from "./shader-noise";

export interface GrassMaterialUniforms {
  uBaseColor: IUniform<Color>;
  uTime: IUniform<number>;
  uTipColor: IUniform<Color>;
  uWindDir: IUniform<[number, number]>;
  uWindStrength: IUniform<number>;
}

export const createGrassMaterial = (opts?: {
  tipColor?: string;
  baseColor?: string;
  windStrength?: number;
}): {
  material: MeshStandardMaterial;
  uniforms: GrassMaterialUniforms;
} => {
  const uniforms: GrassMaterialUniforms = {
    uTime: { value: 0 },
    uWindDir: { value: [0.7, 0.7] },
    uWindStrength: { value: opts?.windStrength ?? 0.35 },
    uTipColor: { value: new Color(opts?.tipColor ?? "#8aaa3c") },
    uBaseColor: { value: new Color(opts?.baseColor ?? "#243818") },
  };

  const material = new MeshStandardMaterial({
    color: 0xff_ff_ff,
    roughness: 0.92,
    metalness: 0.0,
    side: DoubleSide,
    transparent: false,
    alphaTest: 0.35,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        ${glslHash}
        ${glslSimplex2D}
        uniform float uTime;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        varying float vHeightT;
        varying vec3 vGrassWorldPos;
        varying float vInstanceSeed;
        `
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = vec3(position);

        // Height blending - tip of blade is at position.y ~= 1
        float heightT = clamp(position.y, 0.0, 1.0);
        vHeightT = heightT;

        // Use world position as per-instance seed for wind phase
        vec4 instanceWorld = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float seed = hash21(instanceWorld.xz * 0.37);
        vInstanceSeed = seed;

        // Wind sway (bend from root)
        float windT = uTime * 1.2 + seed * 6.28;
        vec2 wdir = normalize(uWindDir);
        float bigWave = simplex2D(instanceWorld.xz * 0.15 + uTime * 0.25);
        float gust = simplex2D(instanceWorld.xz * 0.4 + windT * 0.15);
        float sway = (sin(windT) * 0.35 + bigWave * 0.55 + gust * 0.25) * uWindStrength;

        float bendAmount = sway * pow(heightT, 1.6);
        transformed.x += wdir.x * bendAmount;
        transformed.z += wdir.y * bendAmount;
        // slight bobbing
        transformed.y -= pow(heightT, 2.2) * abs(bendAmount) * 0.5;

        vGrassWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `
        #include <common>
        ${glslHash}
        uniform vec3 uTipColor;
        uniform vec3 uBaseColor;
        varying float vHeightT;
        varying vec3 vGrassWorldPos;
        varying float vInstanceSeed;
        `
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        vec3 bladeCol = mix(uBaseColor, uTipColor, pow(vHeightT, 0.75));
        // Slight per-blade color variation
        float variation = (vInstanceSeed - 0.5) * 0.25;
        bladeCol += vec3(variation * 0.5, variation * 0.3, variation * 0.1);
        // Slight dark center line
        diffuseColor.rgb = bladeCol;
        `
      );
  };

  material.customProgramCacheKey = () => "overworld-grass-v1";

  return { material, uniforms };
};
