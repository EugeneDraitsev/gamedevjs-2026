import { Color, DoubleSide, MeshStandardMaterial, type IUniform } from "three";
import { glslHash, glslSimplex2D, glslValueNoise } from "./shader-noise";

export interface CanyonMaterialUniforms {
  uRockLow: IUniform<Color>;
  uRockHigh: IUniform<Color>;
  uRust: IUniform<Color>;
  uMoss: IUniform<Color>;
  uWallHeight: IUniform<number>;
  uInnerRadius: IUniform<number>;
}

export const createCanyonMaterial = (): {
  material: MeshStandardMaterial;
  uniforms: CanyonMaterialUniforms;
} => {
  const uniforms: CanyonMaterialUniforms = {
    uRockLow: { value: new Color("#1c1a1d") },
    uRockHigh: { value: new Color("#4a3d38") },
    uRust: { value: new Color("#7a3818") },
    uMoss: { value: new Color("#3a5a28") },
    uWallHeight: { value: 22 },
    uInnerRadius: { value: 60 },
  };

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0.08,
    side: DoubleSide,
    flatShading: true,
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
        uniform float uWallHeight;
        uniform float uInnerRadius;
        varying vec3 vCanyonWorldPos;
        varying float vHeightT;
        varying float vRadial;
        `
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = vec3(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 wp = worldPos.xyz;

        // Parameterize by angle around Y and height
        float angle = atan(wp.z, wp.x);
        float heightT = clamp(wp.y / uWallHeight, 0.0, 1.0);

        // Big silhouette variation - every wall piece gets a different height/taper
        float silhouetteA = simplex2D(vec2(angle * 6.0, 0.0)) * 0.5 + 0.5;
        float silhouetteB = simplex2D(vec2(angle * 13.0, 7.0)) * 0.5 + 0.5;
        float silhouette = mix(silhouetteA, silhouetteB, 0.5);

        // Detail noise for rocky surface
        float detail = simplex2D(vec2(angle * 40.0, wp.y * 0.6)) * 0.7;
        detail += simplex2D(vec2(angle * 110.0, wp.y * 1.9)) * 0.25;

        // Push outward (creating bulges + craggy surface)
        vec2 outDir = normalize(vec2(wp.x, wp.z));
        float bulge = (silhouette * 3.5 + detail * 1.4) * (0.4 + heightT * 0.8);

        // Taper upward and add jagged top
        float taper = smoothstep(0.92, 1.0, heightT);
        bulge -= taper * 3.0 * (0.4 + 0.6 * silhouetteB);

        transformed.x += outDir.x * bulge;
        transformed.z += outDir.y * bulge;

        // Add subtle upward jitter at the top for jagged ridge
        if (heightT > 0.85) {
          transformed.y += silhouetteA * 2.4 * (heightT - 0.85) * 6.0;
        }

        vCanyonWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vHeightT = heightT;
        vRadial = length(vec2(wp.x, wp.z)) / uInnerRadius;
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
        uniform vec3 uRockLow;
        uniform vec3 uRockHigh;
        uniform vec3 uRust;
        uniform vec3 uMoss;
        uniform float uWallHeight;
        varying vec3 vCanyonWorldPos;
        varying float vHeightT;
        varying float vRadial;
        `
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `
        #include <color_fragment>
        vec3 wp = vCanyonWorldPos;
        float angle = atan(wp.z, wp.x);

        // Strata - horizontal rock bands
        float strata = fract(wp.y * 0.35 + simplex2D(vec2(angle * 3.0, 0.0)) * 0.3);
        strata = abs(strata - 0.5);

        // Vertical cracks
        float crack = abs(simplex2D(vec2(angle * 80.0, wp.y * 0.35)));
        float crackMask = 1.0 - smoothstep(0.015, 0.05, crack);

        // Rock base color with strata darkening
        vec3 rockCol = mix(uRockLow, uRockHigh, strata * 2.0);
        rockCol *= 1.0 - crackMask * 0.55;

        // Rusted metal bands (industrial remnants embedded in rock)
        float metalBand = smoothstep(0.46, 0.48, fract(wp.y * 0.07 + simplex2D(vec2(angle * 1.5, 0.0)) * 0.2));
        metalBand *= 1.0 - smoothstep(0.52, 0.56, fract(wp.y * 0.07 + simplex2D(vec2(angle * 1.5, 0.0)) * 0.2));
        float rustDirt = fbm2(vec2(angle * 14.0, wp.y * 0.7));
        rockCol = mix(rockCol, uRust * (0.7 + rustDirt * 0.6), metalBand * 0.7);

        // Moss/lichen growing in lower/wetter zones
        float mossBase = smoothstep(0.4, 0.0, vHeightT);
        float mossPattern = fbm2(vec2(angle * 20.0, wp.y * 1.4));
        float mossMask = smoothstep(0.45, 0.62, mossPattern) * mossBase;
        rockCol = mix(rockCol, uMoss, mossMask * 0.78);

        // Dusty highlights toward top for sunlit rim
        float rim = smoothstep(0.55, 0.96, vHeightT) * (0.6 + 0.4 * fbm2(vec2(angle * 8.0, wp.y * 0.5)));
        rockCol += vec3(0.35, 0.22, 0.12) * rim * 0.55;

        diffuseColor.rgb = rockCol;
        `
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `
        float roughnessFactor = roughness;
        roughnessFactor *= mix(1.0, 0.55, metalBand);
        `
      )
      .replace(
        "#include <metalnessmap_fragment>",
        /* glsl */ `
        float metalnessFactor = metalness;
        metalnessFactor = mix(metalnessFactor, 0.85, metalBand * 0.6);
        `
      );
  };

  material.customProgramCacheKey = () => "overworld-canyon-v1";

  return { material, uniforms };
};
