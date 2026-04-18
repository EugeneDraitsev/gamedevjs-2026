export type Vec3 = readonly [number, number, number];

export interface SwingParams {
  activeEnd: number;
  activeStart: number;
  damage: number;
  durationMs: number;
  endAngle: number;
  impulse: number;
  innerRadius: number;
  lift: number;
  reach: number;
  startAngle: number;
  thickness: number;
}

export const DEFAULT_SWING: SwingParams = {
  durationMs: 130,
  startAngle: -1.35,
  endAngle: 1.35,
  innerRadius: 0.55,
  reach: 2.35,
  thickness: 0.4,
  activeStart: 0.12,
  activeEnd: 0.88,
  impulse: 5.2,
  lift: 0.32,
  damage: 3,
};

export const DEFAULT_MELEE_COOLDOWN_MS = 340;

export const swingProgress = (
  elapsedMs: number,
  params: SwingParams = DEFAULT_SWING
): number => {
  if (elapsedMs <= 0) {
    return 0;
  }

  if (elapsedMs >= params.durationMs) {
    return 1;
  }

  return elapsedMs / params.durationMs;
};

export const easeSwing = (t: number): number => {
  if (t <= 0) {
    return 0;
  }

  if (t >= 1) {
    return 1;
  }

  return t * t * (3 - 2 * t);
};

export const swingAngleAt = (
  t: number,
  params: SwingParams = DEFAULT_SWING
): number => {
  const eased = easeSwing(t);

  return params.startAngle + (params.endAngle - params.startAngle) * eased;
};

export const isSwingActive = (
  t: number,
  params: SwingParams = DEFAULT_SWING
): boolean => t >= params.activeStart && t <= params.activeEnd;

export interface SwingPose {
  active: boolean;
  bladeYaw: number;
  innerRadius: number;
  pivot: Vec3;
  reach: number;
  thickness: number;
}

export const sampleSwingPose = (
  t: number,
  swingCenter: Vec3,
  facingYaw: number,
  params: SwingParams = DEFAULT_SWING
): SwingPose => ({
  pivot: [swingCenter[0], swingCenter[1], swingCenter[2]],
  bladeYaw: facingYaw + swingAngleAt(t, params),
  reach: params.reach,
  thickness: params.thickness,
  innerRadius: params.innerRadius,
  active: isSwingActive(t, params),
});

export const swingTipPosition = (
  t: number,
  swingCenter: Vec3,
  facingYaw: number,
  tipY: number = swingCenter[1],
  params: SwingParams = DEFAULT_SWING
): [number, number, number] => {
  const yaw = facingYaw + swingAngleAt(t, params);

  return [
    swingCenter[0] + Math.sin(yaw) * params.reach,
    tipY,
    swingCenter[2] + Math.cos(yaw) * params.reach,
  ];
};

export const swingGroupRotationY = (
  t: number,
  facingYaw: number,
  params: SwingParams = DEFAULT_SWING
): number => facingYaw + swingAngleAt(t, params);

export const applyYRotationToLocalPoint = (
  localPoint: Vec3,
  rotationY: number,
  pivot: Vec3
): [number, number, number] => {
  const cosTheta = Math.cos(rotationY);
  const sinTheta = Math.sin(rotationY);

  return [
    pivot[0] + cosTheta * localPoint[0] + sinTheta * localPoint[2],
    pivot[1] + localPoint[1],
    pivot[2] - sinTheta * localPoint[0] + cosTheta * localPoint[2],
  ];
};

const wrapToPi = (angle: number): number => {
  let wrapped = angle;

  while (wrapped > Math.PI) {
    wrapped -= Math.PI * 2;
  }

  while (wrapped < -Math.PI) {
    wrapped += Math.PI * 2;
  }

  return wrapped;
};

export const isPointInSwing = (
  point: Vec3,
  t: number,
  swingCenter: Vec3,
  facingYaw: number,
  params: SwingParams = DEFAULT_SWING
): boolean => {
  if (!isSwingActive(t, params)) {
    return false;
  }

  const dx = point[0] - swingCenter[0];
  const dz = point[2] - swingCenter[2];
  const distance = Math.hypot(dx, dz);

  if (distance < params.innerRadius || distance > params.reach) {
    return false;
  }

  const pointYaw = Math.atan2(dx, dz);
  const bladeYaw = facingYaw + swingAngleAt(t, params);
  const delta = wrapToPi(pointYaw - bladeYaw);

  return Math.abs(delta) <= params.thickness;
};

export const swingKnockbackDirection = (
  point: Vec3,
  swingCenter: Vec3,
  params: SwingParams = DEFAULT_SWING
): [number, number] => {
  const dx = point[0] - swingCenter[0];
  const dz = point[2] - swingCenter[2];
  const distance = Math.hypot(dx, dz) || 1;
  const sign = Math.sign(params.endAngle - params.startAngle) || 1;

  return [(sign * dz) / distance, (-sign * dx) / distance];
};

export interface ExpandedHitbox {
  bladeYaw: number;
  point: Vec3;
  t: number;
}

export interface RibbonGeometryData {
  indices: Uint16Array;
  positions: Float32Array;
  uvs: Float32Array;
}

export const buildSwingRibbonGeometryData = (
  params: SwingParams = DEFAULT_SWING,
  segments = 48
): RibbonGeometryData => {
  if (segments < 2) {
    throw new Error("segments must be >= 2");
  }

  const vertexCount = (segments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(segments * 6);
  const arc = params.endAngle - params.startAngle;

  for (let segmentIndex = 0; segmentIndex <= segments; segmentIndex += 1) {
    const u = segmentIndex / segments;
    const angle = params.startAngle + arc * u;
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    const innerIndex = segmentIndex * 2;
    const outerIndex = innerIndex + 1;

    positions[innerIndex * 3] = sinAngle * params.innerRadius;
    positions[innerIndex * 3 + 1] = 0;
    positions[innerIndex * 3 + 2] = cosAngle * params.innerRadius;

    positions[outerIndex * 3] = sinAngle * params.reach;
    positions[outerIndex * 3 + 1] = 0;
    positions[outerIndex * 3 + 2] = cosAngle * params.reach;

    uvs[innerIndex * 2] = u;
    uvs[innerIndex * 2 + 1] = 0;
    uvs[outerIndex * 2] = u;
    uvs[outerIndex * 2 + 1] = 1;
  }

  for (let segmentIndex = 0; segmentIndex < segments; segmentIndex += 1) {
    const base = segmentIndex * 2;
    const offset = segmentIndex * 6;

    indices[offset] = base;
    indices[offset + 1] = base + 1;
    indices[offset + 2] = base + 2;
    indices[offset + 3] = base + 1;
    indices[offset + 4] = base + 3;
    indices[offset + 5] = base + 2;
  }

  return { positions, uvs, indices };
};

export const swingRibbonProgress = (
  t: number,
  params: SwingParams = DEFAULT_SWING
): number => {
  const arc = params.endAngle - params.startAngle;

  if (arc === 0) {
    return 0;
  }

  return (swingAngleAt(t, params) - params.startAngle) / arc;
};

export const sampleSwingArc = (
  t: number,
  swingCenter: Vec3,
  facingYaw: number,
  samples: number,
  params: SwingParams = DEFAULT_SWING
): ExpandedHitbox[] => {
  if (samples < 2) {
    throw new Error("samples must be >= 2");
  }

  const bladeYaw = facingYaw + swingAngleAt(t, params);
  const result: ExpandedHitbox[] = [];

  for (let index = 0; index < samples; index += 1) {
    const radial =
      params.innerRadius +
      (params.reach - params.innerRadius) * (index / (samples - 1));

    result.push({
      point: [
        swingCenter[0] + Math.sin(bladeYaw) * radial,
        swingCenter[1],
        swingCenter[2] + Math.cos(bladeYaw) * radial,
      ],
      t,
      bladeYaw,
    });
  }

  return result;
};
