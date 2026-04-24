import { BackSide, Color, type IUniform, ShaderMaterial } from "three";
import { glslHash, glslSimplex2D, glslValueNoise } from "./shader-noise";

export interface SkyMaterialUniforms {
  uCloudTint: IUniform<Color>;
  uHorizon: IUniform<Color>;
  uMid: IUniform<Color>;
  uSunColor: IUniform<Color>;
  uSunDir: IUniform<[number, number, number]>;
  uTime: IUniform<number>;
  uZenith: IUniform<Color>;
}

const vertexShader = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  ${glslHash}
  ${glslValueNoise}
  ${glslSimplex2D}

  uniform float uTime;
  uniform vec3 uHorizon;
  uniform vec3 uMid;
  uniform vec3 uZenith;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform vec3 uCloudTint;
  varying vec3 vWorldDir;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = clamp(dir.y, -0.1, 1.0);

    // Vertical gradient: horizon haze -> mid -> zenith
    float t1 = smoothstep(0.0, 0.35, y);
    float t2 = smoothstep(0.25, 0.9, y);
    vec3 col = mix(uHorizon, uMid, t1);
    col = mix(col, uZenith, t2);

    // Sun disk with soft halo
    vec3 sun = normalize(uSunDir);
    float sunAmount = dot(dir, sun);
    float sunCore = pow(max(sunAmount, 0.0), 320.0);
    float sunHalo = pow(max(sunAmount, 0.0), 22.0);
    float sunRim  = pow(max(sunAmount, 0.0), 4.0) * (1.0 - y) * 0.7;
    col += uSunColor * sunCore * 2.6;
    col += uSunColor * sunHalo * 0.65;
    col += uSunColor * sunRim * 0.25;

    // Drifting clouds (2 layers)
    vec2 cloudUV = vec2(atan(dir.z, dir.x), dir.y) * vec2(0.7, 2.5);
    float cloudA = fbm2(cloudUV * 2.4 + vec2(uTime * 0.006, 0.0));
    float cloudB = fbm2(cloudUV * 5.0 + vec2(-uTime * 0.008, 2.1));
    float cloud = smoothstep(0.52, 0.75, cloudA) * 0.85;
    cloud += smoothstep(0.6, 0.82, cloudB) * 0.45;
    cloud *= smoothstep(0.02, 0.35, y);
    cloud *= 1.0 - smoothstep(0.75, 0.95, y) * 0.6;

    vec3 cloudCol = mix(uCloudTint, uCloudTint * 1.25, cloud);
    col = mix(col, cloudCol, cloud * 0.72);

    // dust-glow band along horizon for hope-light vibe
    float dust = exp(-pow((y - 0.06) * 14.0, 2.0));
    col += mix(uHorizon, uSunColor, 0.4) * dust * 0.25;

    // Distant haze above land, darken below horizon (below ground plane)
    if (y < 0.0) {
      col = mix(col, uHorizon * 0.35, smoothstep(0.0, -0.08, y));
    }

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const createSkyMaterial = (): {
  material: ShaderMaterial;
  uniforms: SkyMaterialUniforms;
} => {
  const uniforms: SkyMaterialUniforms = {
    uTime: { value: 0 },
    uHorizon: { value: new Color("#d88a5a") },
    uMid: { value: new Color("#4c5870") },
    uZenith: { value: new Color("#12192b") },
    uSunColor: { value: new Color("#ffd8a6") },
    uSunDir: { value: [0.55, 0.45, 0.3] },
    uCloudTint: { value: new Color("#21283a") },
  };

  const material = new ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, IUniform>,
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
  });

  return { material, uniforms };
};
