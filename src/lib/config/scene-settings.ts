export type CameraMode = "follow" | "orbit";
export type FloorTheme = "check" | "ember" | "steel";
export type WallTheme = "aqua" | "brass" | "foundry";

export interface SceneSettings {
  ambientLightIntensity: number;
  cameraFov: number;
  cameraMode: CameraMode;
  cameraSmoothing: number;
  floorTheme: FloorTheme;
  followDistance: number;
  followPitch: number;
  followYaw: number;
  gravityY: number;
  jumpSpeed: number;
  lookHeight: number;
  moveResponsiveness: number;
  moveSpeed: number;
  playerLinearDamping: number;
  shadowBias: number;
  shadowFar: number;
  shadowFrustum: number;
  shadowMapSize: number;
  shadowNormalBias: number;
  showDebugGeometry: boolean;
  showPhysicsDebug: boolean;
  sunIntensity: number;
  sunPositionX: number;
  sunPositionY: number;
  sunPositionZ: number;
  wallTheme: WallTheme;
}

export const createSceneSettings = (): SceneSettings => ({
  ambientLightIntensity: 0.52,
  cameraFov: 63,
  cameraMode: "follow",
  cameraSmoothing: 8,
  floorTheme: "check",
  followDistance: 12.3,
  followPitch: 52,
  followYaw: 0,
  gravityY: -16,
  jumpSpeed: 7.6,
  lookHeight: 0.4,
  moveResponsiveness: 12,
  moveSpeed: 7,
  playerLinearDamping: 1.6,
  shadowBias: -0.000_35,
  shadowFar: 32,
  shadowFrustum: 16,
  shadowMapSize: 2048,
  shadowNormalBias: 0.035,
  showDebugGeometry: false,
  showPhysicsDebug: false,
  sunIntensity: 2.35,
  sunPositionX: 9,
  sunPositionY: 14,
  sunPositionZ: 7,
  wallTheme: "aqua",
});
