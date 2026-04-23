import { Color, DoubleSide, ShaderMaterial, type IUniform } from "three";
import { glslHash, glslSimplex2D, glslValueNoise } from "./shader-noise";

export interface WaterMaterialUniforms {
  uTime: IUniform<number>;
  uDeepColor: IUniform<Color>;
  uShallowColor: IUniform<Color>;
  uFoamColor: IUniform<Color>;
  uAlgaeColor: IUniform<Color>;
  uShoreRadius: IUniform<number>;
  uFoamEdge: IUniform<number>;
  uUseShoreMask: IUniform<number>;
  uSunDir: IUniform<[number, number, number]>;
}

const vertexShader = /* glsl */ `
  ${glslHash}
  ${glslValueNoise}
  ${glslSimplex2D}

  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float wave(vec2 p, vec2 dir, float freq, float amp, float speed) {
    return sin(dot(p, dir) * freq + uTime * speed) * amp;
  }

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec2 wp = worldPos.xz;

    // gentle ripples — small amplitude, higher frequency so the surface
    // reads as calm pond water from a top-down camera, not ocean swell
    float h = 0.0;
    h += wave(wp, normalize(vec2(1.0, 0.35)), 1.6, 0.022, 0.7);
    h += wave(wp, normalize(vec2(-0.7, 0.9)), 2.4, 0.014, 0.95);
    h += wave(wp, normalize(vec2(0.2, -0.95)), 3.4, 0.008, 1.3);
    h += simplex2D(wp * 0.9 + uTime * 0.2) * 0.012;

    // compute analytic normal via gradient estimation
    float eps = 0.25;
    float h2x = 0.0;
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(1.0, 0.35)), 1.6, 0.022, 0.7);
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(-0.7, 0.9)), 2.4, 0.014, 0.95);
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(0.2, -0.95)), 3.4, 0.008, 1.3);
    float h2z = 0.0;
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(1.0, 0.35)), 1.6, 0.022, 0.7);
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(-0.7, 0.9)), 2.4, 0.014, 0.95);
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(0.2, -0.95)), 3.4, 0.008, 1.3);
    vec3 n = normalize(vec3(-(h2x - h) / eps, 1.0, -(h2z - h) / eps));

    // displace along local +Z (which becomes world +Y after mesh rotation by -PI/2 on X)
    vec3 displaced = position + vec3(0.0, 0.0, h);
    vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPos;
    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
    // remap normal from (x, y, z) where y was up to local-space (x, z=up, -y)
    vec3 localN = vec3(n.x, n.z, -n.y);
    vNormalW = normalize(mat3(modelMatrix) * localN);
    vViewDir = normalize(cameraPosition - vWorldPos);
  }
`;

const fragmentShader = /* glsl */ `
  ${glslHash}
  ${glslValueNoise}
  ${glslSimplex2D}

  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uAlgaeColor;
  uniform float uShoreRadius;
  uniform float uFoamEdge;
  uniform float uUseShoreMask;
  uniform vec3 uSunDir;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec2 wp = vWorldPos.xz;

    // Scrolling ripples that look like caustics refracted by the waves
    vec2 uv1 = wp * 0.9 + vec2(uTime * 0.12, uTime * 0.05);
    vec2 uv2 = wp * 1.6 + vec2(-uTime * 0.08, uTime * 0.14);
    float ripple = fbm2(uv1) * 0.55 + fbm2(uv2) * 0.45;
    float caustic = pow(ripple, 2.2);

    // Algae/plant decals — restricted to shallow edges, not mid-pond
    float algaePatch = smoothstep(0.72, 0.86, fbm2(wp * 0.32 + 14.0));
    float algae = algaePatch * 0.75;

    // No floating debris — kept pond clean
    float debris = 0.0;

    // Shore foam — only near shore edge
    float radialDist = length(wp);
    float shoreT = 0.0;
    if (uUseShoreMask > 0.5) {
      // 0 far from shore, 1 at shore edge (inner boundary of sea)
      shoreT = 1.0 - smoothstep(uShoreRadius - uFoamEdge, uShoreRadius, radialDist);
      shoreT = max(shoreT, smoothstep(uShoreRadius, uShoreRadius + uFoamEdge * 0.6, radialDist));
    }
    float foamNoise = fbm2(wp * 2.5 + uTime * 0.15);
    float foam = shoreT * (0.55 + 0.45 * foamNoise);
    foam = smoothstep(0.35, 0.9, foam);

    // Fresnel for sheen
    float fres = pow(1.0 - max(dot(vNormalW, vViewDir), 0.0), 3.0);

    // Sun specular (soft Phong — kept tight and subtle)
    vec3 halfV = normalize(normalize(uSunDir) + vViewDir);
    float specRaw = pow(max(dot(vNormalW, halfV), 0.0), 180.0);
    float spec = specRaw * smoothstep(0.55, 0.9, specRaw);

    vec3 base = mix(uDeepColor, uShallowColor, clamp(caustic * 0.35 + 0.25, 0.0, 1.0));
    base += uShallowColor * caustic * caustic * 0.35;
    base = mix(base, uAlgaeColor, algae * 0.55);
    base += vec3(0.24, 0.34, 0.44) * fres * 0.38;
    base += vec3(1.0, 0.95, 0.78) * spec * 0.5;
    base = mix(base, uFoamColor, clamp(foam, 0.0, 0.9));

    // Subtle shimmer highlights (kept subtle)
    float shimmer = smoothstep(0.88, 0.97, fbm2(wp * 3.5 + uTime * 0.4));
    base += vec3(0.14, 0.18, 0.2) * shimmer * 0.3;

    gl_FragColor = vec4(base, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const createWaterMaterial = (opts?: {
  deepColor?: string;
  shallowColor?: string;
  foamColor?: string;
  algaeColor?: string;
  shoreRadius?: number;
  foamEdge?: number;
  useShoreMask?: boolean;
}): {
  material: ShaderMaterial;
  uniforms: WaterMaterialUniforms;
} => {
  const uniforms: WaterMaterialUniforms = {
    uTime: { value: 0 },
    uDeepColor: { value: new Color(opts?.deepColor ?? "#0a2235") },
    uShallowColor: { value: new Color(opts?.shallowColor ?? "#2a6a7c") },
    uFoamColor: { value: new Color(opts?.foamColor ?? "#e8f2ec") },
    uAlgaeColor: { value: new Color(opts?.algaeColor ?? "#2e5a3c") },
    uShoreRadius: { value: opts?.shoreRadius ?? 60 },
    uFoamEdge: { value: opts?.foamEdge ?? 3.5 },
    uUseShoreMask: { value: opts?.useShoreMask === false ? 0 : 1 },
    uSunDir: { value: [0.6, 0.8, 0.35] },
  };

  const material = new ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, IUniform>,
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: false,
  });

  return { material, uniforms };
};
