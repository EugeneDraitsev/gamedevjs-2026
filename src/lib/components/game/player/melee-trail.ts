import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  buildSwingRibbonGeometryData,
  type SwingParams,
} from "$lib/combat/melee-swing";
import type { MeleeTrailSettings } from "$lib/types/game";

export const DEFAULT_TRAIL_SETTINGS: MeleeTrailSettings = {
  bandAlphas: [1, 0.55, 0],
  bandCenters: [0.92, 0.74, 0.5],
  bandWidths: [0.055, 0.025, 0.035],
  coreColor: "#ffffff",
  edgeColor: "#7fd8ff",
  tailLength: 0.55,
};

export const meleeHeightOffset = 0.18;
export const trailFadeMs = 180;
export const lerpAngleShortest = (from: number, to: number, alpha: number) => {
  const TAU = Math.PI * 2;
  const diff = ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
  return from + diff * alpha;
};

const trailVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform float uIntensity;
  uniform float uTailLength;
  uniform vec3 uEdgeColor;
  uniform vec3 uCoreColor;
  uniform vec3 uBandCenters;
  uniform vec3 uBandWidths;
  uniform vec3 uBandAlphas;
  varying vec2 vUv;

  float bandFalloff(float y, float center, float width) {
    float d = (y - center) / max(width, 0.001);
    return exp(-d * d);
  }

  void main() {
    float edgeSoftness = mix(0.09, 0.03, clamp(uTailLength, 0.0, 1.0));

    float tailFalloff =
      smoothstep(0.0, edgeSoftness, vUv.x);
    float leadFalloff =
      1.0 -
      smoothstep(uProgress - edgeSoftness, uProgress + edgeSoftness * 0.2, vUv.x);
    float longitudinal = tailFalloff * leadFalloff;

    if (longitudinal <= 0.0015) discard;

    float widthScale = 1.0;

    float primary =
      bandFalloff(vUv.y, uBandCenters.x, uBandWidths.x * widthScale) *
      uBandAlphas.x;
    float secondary =
      bandFalloff(vUv.y, uBandCenters.y, uBandWidths.y * widthScale) *
      uBandAlphas.y;
    float tertiary =
      bandFalloff(vUv.y, uBandCenters.z, uBandWidths.z * widthScale) *
      uBandAlphas.z;
    float bandMask = max(max(primary, secondary), tertiary);

    float leadingGlow =
      smoothstep(uProgress - 0.18, uProgress - 0.03, vUv.x);
    float brightness = 0.85 + 0.6 * leadingGlow;
    float alpha = longitudinal * bandMask * brightness * uIntensity;

    vec3 color = mix(uEdgeColor, uCoreColor, leadingGlow * primary);
    gl_FragColor = vec4(color * brightness, alpha);
  }
`;
const trailProgramCacheKey = () => "player-melee-trail-v1";

export const createMeleeTrail = (meleeParams: SwingParams) => {
  const data = buildSwingRibbonGeometryData(meleeParams, 56);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(data.positions, 3)
  );
  geometry.setAttribute("uv", new Float32BufferAttribute(data.uvs, 2));
  geometry.setIndex(Array.from(data.indices));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    uniforms: {
      uBandAlphas: {
        value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandAlphas),
      },
      uBandCenters: {
        value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandCenters),
      },
      uBandWidths: {
        value: new Vector3(...DEFAULT_TRAIL_SETTINGS.bandWidths),
      },
      uCoreColor: { value: new Color(DEFAULT_TRAIL_SETTINGS.coreColor) },
      uEdgeColor: { value: new Color(DEFAULT_TRAIL_SETTINGS.edgeColor) },
      uIntensity: { value: 0 },
      uProgress: { value: 0 },
      uTailLength: { value: DEFAULT_TRAIL_SETTINGS.tailLength },
    },
    vertexShader: trailVertexShader,
    fragmentShader: trailFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  material.customProgramCacheKey = trailProgramCacheKey;

  return { geometry, material };
};

export const applyMeleeTrailSettings = (
  material: ShaderMaterial,
  settings: MeleeTrailSettings
) => {
  const centers = material.uniforms.uBandCenters.value as Vector3;
  const widths = material.uniforms.uBandWidths.value as Vector3;
  const alphas = material.uniforms.uBandAlphas.value as Vector3;
  const edge = material.uniforms.uEdgeColor.value as Color;
  const core = material.uniforms.uCoreColor.value as Color;

  centers.set(...settings.bandCenters);
  widths.set(...settings.bandWidths);
  alphas.set(...settings.bandAlphas);
  edge.set(settings.edgeColor);
  core.set(settings.coreColor);
  material.uniforms.uTailLength.value = settings.tailLength;
};
