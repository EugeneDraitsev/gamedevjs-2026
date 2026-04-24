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
    h += wave(wp, normalize(vec2(1.0, 0.35)), 1.25, 0.045, 0.9);
    h += wave(wp, normalize(vec2(-0.7, 0.9)), 2.15, 0.03, 1.2);
    h += wave(wp, normalize(vec2(0.2, -0.95)), 3.6, 0.012, 1.7);
    h += simplex2D(wp * 1.1 + uTime * 0.24) * 0.024;

    // compute analytic normal via gradient estimation
    float eps = 0.25;
    float h2x = 0.0;
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(1.0, 0.35)), 1.25, 0.045, 0.9);
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(-0.7, 0.9)), 2.15, 0.03, 1.2);
    h2x += wave(wp + vec2(eps, 0.0), normalize(vec2(0.2, -0.95)), 3.6, 0.012, 1.7);
    float h2z = 0.0;
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(1.0, 0.35)), 1.25, 0.045, 0.9);
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(-0.7, 0.9)), 2.15, 0.03, 1.2);
    h2z += wave(wp + vec2(0.0, eps), normalize(vec2(0.2, -0.95)), 3.6, 0.012, 1.7);
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
    vec2 flow = normalize(vec2(0.32, 1.0));
    vec2 uv1 = wp * 0.9 + flow * uTime * 0.46;
    vec2 uv2 = wp * 1.6 + vec2(-flow.y, flow.x) * uTime * 0.28;
    float ripple = fbm2(uv1) * 0.55 + fbm2(uv2) * 0.45;
    float caustic = pow(ripple, 2.2);
    float streak = smoothstep(0.5, 0.82, fbm2(vec2(dot(wp, vec2(0.22, 0.07)), dot(wp, flow) * 1.6 - uTime * 0.75)));

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
    foam = max(foam, streak * smoothstep(0.58, 0.82, ripple) * 0.18);
    foam = smoothstep(0.35, 0.9, foam);

    // Fresnel for sheen
    float fres = pow(1.0 - max(dot(vNormalW, vViewDir), 0.0), 3.0);

    // Sun specular (soft Phong — kept tight and subtle)
    vec3 halfV = normalize(normalize(uSunDir) + vViewDir);
    float specRaw = pow(max(dot(vNormalW, halfV), 0.0), 180.0);
    float spec = specRaw * smoothstep(0.55, 0.9, specRaw);

    float silt = smoothstep(0.38, 0.84, fbm2(wp * 0.16 + 7.0));
    vec3 base = mix(uDeepColor, uShallowColor, clamp(caustic * 0.34 + 0.2, 0.0, 1.0));
    base = mix(base, vec3(0.17, 0.3, 0.34), silt * 0.24);
    base += uShallowColor * caustic * caustic * 0.34;
    base = mix(base, uAlgaeColor, algae * 0.28);
    base += vec3(0.12, 0.28, 0.32) * streak * 0.3;
    base += vec3(0.2, 0.28, 0.32) * fres * 0.32;
    base += vec3(1.0, 0.88, 0.62) * spec * 0.32;
    base = mix(base, uFoamColor, clamp(foam * 0.65, 0.0, 0.55));

    // Subtle shimmer highlights (kept subtle)
    float shimmer = smoothstep(0.84, 0.96, fbm2(wp * 3.5 + uTime * 0.52));
    base += vec3(0.1, 0.13, 0.14) * shimmer * 0.26;

    gl_FragColor = vec4(base, 0.72 + fres * 0.12);
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
    transparent: true,
    depthWrite: false,
  });

  return { material, uniforms };
};
