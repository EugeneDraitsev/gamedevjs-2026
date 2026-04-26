import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";

const round = (n: number): number => Math.round(n * 1000) / 1000;

const boxCache = new Map<string, BoxGeometry>();
const coneCache = new Map<string, ConeGeometry>();
const cylinderCache = new Map<string, CylinderGeometry>();
const planeCache = new Map<string, PlaneGeometry>();
const ringCache = new Map<string, RingGeometry>();
const sphereCache = new Map<string, SphereGeometry>();
const torusCache = new Map<string, TorusGeometry>();

export const cachedBox = (
  width: number,
  height: number,
  depth: number
): BoxGeometry => {
  const key = `${round(width)}|${round(height)}|${round(depth)}`;
  const cached = boxCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new BoxGeometry(width, height, depth);

  boxCache.set(key, geo);

  return geo;
};

export const cachedCylinder = (
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments = 8
): CylinderGeometry => {
  const key = `${round(radiusTop)}|${round(radiusBottom)}|${round(height)}|${radialSegments}`;
  const cached = cylinderCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments
  );

  cylinderCache.set(key, geo);

  return geo;
};

export const cachedPlane = (width: number, height: number): PlaneGeometry => {
  const key = `${round(width)}|${round(height)}`;
  const cached = planeCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new PlaneGeometry(width, height);

  planeCache.set(key, geo);

  return geo;
};

export const cachedTorus = (
  radius: number,
  tube: number,
  radialSegments = 8,
  tubularSegments = 24
): TorusGeometry => {
  const key = `${round(radius)}|${round(tube)}|${radialSegments}|${tubularSegments}`;
  const cached = torusCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new TorusGeometry(radius, tube, radialSegments, tubularSegments);

  torusCache.set(key, geo);

  return geo;
};

export const cachedCone = (
  radius: number,
  height: number,
  radialSegments = 8
): ConeGeometry => {
  const key = `${round(radius)}|${round(height)}|${radialSegments}`;
  const cached = coneCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new ConeGeometry(radius, height, radialSegments);

  coneCache.set(key, geo);

  return geo;
};

export const cachedRing = (
  innerRadius: number,
  outerRadius: number,
  thetaSegments = 32
): RingGeometry => {
  const key = `${round(innerRadius)}|${round(outerRadius)}|${thetaSegments}`;
  const cached = ringCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new RingGeometry(innerRadius, outerRadius, thetaSegments);

  ringCache.set(key, geo);

  return geo;
};

export const cachedSphere = (
  radius: number,
  widthSegments = 16,
  heightSegments = 12
): SphereGeometry => {
  const key = `${round(radius)}|${widthSegments}|${heightSegments}`;
  const cached = sphereCache.get(key);

  if (cached) {
    return cached;
  }

  const geo = new SphereGeometry(radius, widthSegments, heightSegments);

  sphereCache.set(key, geo);

  return geo;
};

export const cachedGeometryStats = () => ({
  box: boxCache.size,
  cone: coneCache.size,
  cylinder: cylinderCache.size,
  plane: planeCache.size,
  ring: ringCache.size,
  sphere: sphereCache.size,
  torus: torusCache.size,
});
