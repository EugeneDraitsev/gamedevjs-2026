export type CameraMode = "follow" | "orbit";
export type FloorTheme = "check" | "ember" | "steel";
export type WallTheme = "aqua" | "brass" | "foundry";

export const sceneSettingsStorageKey = "warden-trial-scene-settings";

export interface SceneSettings {
  ambientLightIntensity: number;
  cameraFov: number;
  cameraMode: CameraMode;
  cameraOrthographic: boolean;
  cameraSmoothing: number;
  floorTheme: FloorTheme;
  fogFar: number;
  fogNear: number;
  followDistance: number;
  followPitch: number;
  followYaw: number;
  gravityY: number;
  hemisphereLightIntensity: number;
  jumpSpeed: number;
  lookHeight: number;
  masterSoundEnabled: boolean;
  masterVolume: number;
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
  meleeSwordOpacity: number;
  meleeTailLength: number;
  minimapOpacity: number;
  moveResponsiveness: number;
  moveSpeed: number;
  musicSoundEnabled: boolean;
  musicVolume: number;
  playerLinearDamping: number;
  sfxSoundEnabled: boolean;
  sfxVolume: number;
  shadowBias: number;
  shadowFar: number;
  shadowFrustum: number;
  shadowMapSize: number;
  shadowNormalBias: number;
  showDebugGeometry: boolean;
  showEnvironmentMap: boolean;
  showPhysicsDebug: boolean;
  sunIntensity: number;
  sunPositionX: number;
  sunPositionY: number;
  sunPositionZ: number;
  toneMappingExposure: number;
  vignetteIntensity: number;
  wallTheme: WallTheme;
}

export const createSceneSettings = (): SceneSettings => ({
  ambientLightIntensity: 2,
  cameraFov: 63,
  cameraMode: "follow",
  cameraOrthographic: false,
  cameraSmoothing: 8,
  floorTheme: "ember",
  fogFar: 27,
  fogNear: 13.3,
  followDistance: 12.3,
  followPitch: 52,
  followYaw: 0,
  gravityY: -16,
  hemisphereLightIntensity: 1.48,
  jumpSpeed: 7.6,
  lookHeight: 0.4,
  meleeArcSpan: 2.7,
  meleeBand1Alpha: 1,
  meleeBand1Center: 0.92,
  meleeBand1Width: 0.07,
  meleeBand2Alpha: 0.55,
  meleeBand2Center: 0.74,
  meleeBand2Width: 0.18,
  meleeBand3Alpha: 0,
  meleeBand3Center: 0.38,
  meleeBand3Width: 0.15,
  meleeCooldownMs: 340,
  meleeCoreColor: "#3aa7ff",
  meleeDurationMs: 130,
  meleeEdgeColor: "#9be6ff",
  meleeHitboxPadding: 0.7,
  meleeReach: 1.65,
  meleeShowSword: true,
  meleeSwordOpacity: 0.5,
  meleeTailLength: 0.59,
  minimapOpacity: 0.75,
  masterSoundEnabled: true,
  masterVolume: 1,
  musicSoundEnabled: true,
  musicVolume: 0.7,
  moveResponsiveness: 12,
  moveSpeed: 7,
  playerLinearDamping: 1.6,
  shadowBias: -0.0002,
  shadowFar: 30,
  shadowFrustum: 14,
  shadowMapSize: 2048,
  shadowNormalBias: 0.06,
  showDebugGeometry: false,
  showEnvironmentMap: false,
  showPhysicsDebug: false,
  sfxSoundEnabled: true,
  sfxVolume: 1,
  sunIntensity: 4.05,
  sunPositionX: -5.4,
  sunPositionY: 13.2,
  sunPositionZ: 4.4,
  toneMappingExposure: 1.3,
  vignetteIntensity: 0.24,
  wallTheme: "foundry",
});

export const loadSceneSettings = (): SceneSettings => {
  const defaults = createSceneSettings();

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(sceneSettingsStorageKey);

    if (!raw) {
      return defaults;
    }

    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

export const saveSceneSettings = (settings: SceneSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    sceneSettingsStorageKey,
    JSON.stringify(settings)
  );
};
