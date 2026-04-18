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
  meleeArcSpan: number;
  meleeBand1Alpha: number;
  meleeBand1Center: number;
  meleeBand1Width: number;
  meleeBand2Alpha: number;
  meleeBand2Center: number;
  meleeBand2Width: number;
  meleeBand3Alpha: number;
  meleeBand3Center: number;
  meleeBand3Width: number;
  meleeCooldownMs: number;
  meleeCoreColor: string;
  meleeDurationMs: number;
  meleeEdgeColor: string;
  meleeHitboxPadding: number;
  meleeReach: number;
  meleeShowSword: boolean;
  meleeTailLength: number;
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
  meleeArcSpan: 2.7,
  meleeBand1Alpha: 1,
  meleeBand1Center: 0.92,
  meleeBand1Width: 0.06,
  meleeBand2Alpha: 0.55,
  meleeBand2Center: 0.74,
  meleeBand2Width: 0.15,
  meleeBand3Alpha: 0,
  meleeBand3Center: 0.38,
  meleeBand3Width: 0.15,
  meleeCooldownMs: 340,
  meleeCoreColor: "#48b7bc",
  meleeDurationMs: 130,
  meleeEdgeColor: "#7fd8ff",
  meleeHitboxPadding: 0.7,
  meleeReach: 1.65,
  meleeShowSword: false,
  meleeTailLength: 0.59,
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
