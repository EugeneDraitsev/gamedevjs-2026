<script lang="ts">
  import type { ListOptions } from "svelte-tweakpane-ui";
  import {
    Button,
    Checkbox,
    Color,
    Folder,
    List,
    Pane,
    Separator,
    Slider,
  } from "svelte-tweakpane-ui";
  import type {
    CameraMode,
    FloorTheme,
    SceneSettings,
    WallTheme,
  } from "$lib/config/scene-settings";
  import { createSceneSettings } from "$lib/config/scene-settings";
  import { cheats } from "$lib/stores/cheats.svelte";

  interface DebugPaneProps {
    onResetDefaults: () => void;
    onResetLevel: () => void;
    onResetScene: () => void;
    settings: SceneSettings;
  }

  const cameraModeOptions: ListOptions<CameraMode> = {
    Follow: "follow",
    Orbit: "orbit",
  };
  const floorThemeOptions: ListOptions<FloorTheme> = {
    Check: "check",
    Ember: "ember",
    Steel: "steel",
  };
  const wallThemeOptions: ListOptions<WallTheme> = {
    Aqua: "aqua",
    Brass: "brass",
    Foundry: "foundry",
  };

  const formatAngle = (value: number) => `${value.toFixed(0)}°`;
  const formatFloat = (value: number) => value.toFixed(2);
  const formatShadowBias = (value: number) => value.toFixed(5);

  const resetCameraDefaults = () => {
    const defaults = createSceneSettings();

    settings.cameraFov = defaults.cameraFov;
    settings.cameraMode = defaults.cameraMode;
    settings.cameraOrthographic = defaults.cameraOrthographic;
    settings.cameraSmoothing = defaults.cameraSmoothing;
    settings.followDistance = defaults.followDistance;
    settings.followPitch = defaults.followPitch;
    settings.followYaw = defaults.followYaw;
    settings.lookHeight = defaults.lookHeight;
  };

  const resetPhysicsDefaults = () => {
    const defaults = createSceneSettings();

    settings.gravityY = defaults.gravityY;
    settings.jumpSpeed = defaults.jumpSpeed;
    settings.moveResponsiveness = defaults.moveResponsiveness;
    settings.moveSpeed = defaults.moveSpeed;
    settings.playerLinearDamping = defaults.playerLinearDamping;
  };

  const resetLightingDefaults = () => {
    const defaults = createSceneSettings();

    settings.ambientLightIntensity = defaults.ambientLightIntensity;
    settings.fogFar = defaults.fogFar;
    settings.fogNear = defaults.fogNear;
    settings.hemisphereLightIntensity = defaults.hemisphereLightIntensity;
    settings.shadowBias = defaults.shadowBias;
    settings.shadowFar = defaults.shadowFar;
    settings.shadowFrustum = defaults.shadowFrustum;
    settings.shadowMapSize = defaults.shadowMapSize;
    settings.shadowNormalBias = defaults.shadowNormalBias;
    settings.sunIntensity = defaults.sunIntensity;
    settings.sunPositionX = defaults.sunPositionX;
    settings.sunPositionY = defaults.sunPositionY;
    settings.sunPositionZ = defaults.sunPositionZ;
    settings.toneMappingExposure = defaults.toneMappingExposure;
    settings.vignetteIntensity = defaults.vignetteIntensity;
  };

  const resetMeleeDefaults = () => {
    const defaults = createSceneSettings();

    settings.meleeArcSpan = defaults.meleeArcSpan;
    settings.meleeBand1Alpha = defaults.meleeBand1Alpha;
    settings.meleeBand1Center = defaults.meleeBand1Center;
    settings.meleeBand1Width = defaults.meleeBand1Width;
    settings.meleeBand2Alpha = defaults.meleeBand2Alpha;
    settings.meleeBand2Center = defaults.meleeBand2Center;
    settings.meleeBand2Width = defaults.meleeBand2Width;
    settings.meleeBand3Alpha = defaults.meleeBand3Alpha;
    settings.meleeBand3Center = defaults.meleeBand3Center;
    settings.meleeBand3Width = defaults.meleeBand3Width;
    settings.meleeCooldownMs = defaults.meleeCooldownMs;
    settings.meleeCoreColor = defaults.meleeCoreColor;
    settings.meleeDurationMs = defaults.meleeDurationMs;
    settings.meleeEdgeColor = defaults.meleeEdgeColor;
    settings.meleeHitboxPadding = defaults.meleeHitboxPadding;
    settings.meleeReach = defaults.meleeReach;
    settings.meleeShowSword = defaults.meleeShowSword;
    settings.meleeSwordOpacity = defaults.meleeSwordOpacity;
    settings.meleeTailLength = defaults.meleeTailLength;
  };

  const resetMaterialDefaults = () => {
    const defaults = createSceneSettings();

    settings.floorTheme = defaults.floorTheme;
    settings.wallTheme = defaults.wallTheme;
  };

  const resetDebugDefaults = () => {
    const defaults = createSceneSettings();

    settings.showDebugGeometry = defaults.showDebugGeometry;
    settings.showEnvironmentMap = defaults.showEnvironmentMap;
    settings.showPhysicsDebug = defaults.showPhysicsDebug;
  };

  let {
    onResetDefaults,
    onResetLevel,
    onResetScene,
    settings = $bindable(),
  }: DebugPaneProps = $props();

  const resetAllDefaults = () => {
    cheats.reset();
    onResetDefaults();
    onResetLevel();
  };
</script>

<div class="debug-anchor">
  <Pane position="inline" title="Debug Controls" width={320}>
    <Folder title="Camera">
      <List
        bind:value={settings.cameraMode}
        label="Mode"
        options={cameraModeOptions}
      />
      <Checkbox bind:value={settings.cameraOrthographic} label="Orthographic" />
      <Slider
        bind:value={settings.cameraFov}
        label={settings.cameraOrthographic ? "Zoom" : "FOV"}
        min={20}
        max={80}
        step={1}
      />
      <Slider
        bind:value={settings.followPitch}
        format={formatAngle}
        label="Pitch"
        min={20}
        max={80}
        step={1}
      />
      <Slider
        bind:value={settings.followYaw}
        format={formatAngle}
        label="Yaw"
        min={-180}
        max={180}
        step={1}
      />
      <Slider
        bind:value={settings.followDistance}
        format={formatFloat}
        label="Distance"
        min={4}
        max={16}
        step={0.1}
      />
      <Slider
        bind:value={settings.lookHeight}
        format={formatFloat}
        label="Look height"
        min={0}
        max={2}
        step={0.01}
      />
      <Slider
        bind:value={settings.cameraSmoothing}
        format={formatFloat}
        label="Smoothing"
        min={1}
        max={20}
        step={0.1}
      />
      <Button on:click={resetCameraDefaults} title="Reset camera defaults" />
    </Folder>

    <Folder title="Physics" expanded={false}>
      <Slider
        bind:value={settings.gravityY}
        format={formatFloat}
        label="Gravity Y"
        min={-30}
        max={-1}
        step={0.1}
      />
      <Slider
        bind:value={settings.moveSpeed}
        format={formatFloat}
        label="Move speed"
        min={0}
        max={14}
        step={0.1}
      />
      <Slider
        bind:value={settings.moveResponsiveness}
        format={formatFloat}
        label="Response"
        min={1}
        max={24}
        step={0.1}
      />
      <Slider
        bind:value={settings.jumpSpeed}
        format={formatFloat}
        label="Jump speed"
        min={0}
        max={14}
        step={0.1}
      />
      <Slider
        bind:value={settings.playerLinearDamping}
        format={formatFloat}
        label="Damping"
        min={0}
        max={8}
        step={0.05}
      />
      <Button on:click={resetPhysicsDefaults} title="Reset physics defaults" />
    </Folder>

    <Folder title="Lighting + Vibes" expanded={false}>
      <Slider
        bind:value={settings.sunIntensity}
        format={formatFloat}
        label="Sun"
        min={0}
        max={6}
        step={0.05}
      />
      <Slider
        bind:value={settings.hemisphereLightIntensity}
        format={formatFloat}
        label="Fill"
        min={0}
        max={2}
        step={0.05}
      />
      <Slider
        bind:value={settings.ambientLightIntensity}
        format={formatFloat}
        label="Ambient"
        min={0}
        max={2}
        step={0.05}
      />
      <Slider
        bind:value={settings.toneMappingExposure}
        format={formatFloat}
        label="Exposure"
        min={0.4}
        max={1.4}
        step={0.02}
      />
      <Slider
        bind:value={settings.fogNear}
        format={formatFloat}
        label="Fog near"
        min={3}
        max={18}
        step={0.1}
      />
      <Slider
        bind:value={settings.fogFar}
        format={formatFloat}
        label="Fog far"
        min={12}
        max={36}
        step={0.1}
      />
      <Slider
        bind:value={settings.vignetteIntensity}
        format={formatFloat}
        label="Vignette"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.sunPositionX}
        format={formatFloat}
        label="Sun X"
        min={-16}
        max={16}
        step={0.1}
      />
      <Slider
        bind:value={settings.sunPositionY}
        format={formatFloat}
        label="Sun Y"
        min={4}
        max={24}
        step={0.1}
      />
      <Slider
        bind:value={settings.sunPositionZ}
        format={formatFloat}
        label="Sun Z"
        min={-16}
        max={16}
        step={0.1}
      />
      <Slider
        bind:value={settings.shadowFrustum}
        format={formatFloat}
        label="Shadow size"
        min={6}
        max={24}
        step={0.5}
      />
      <Slider
        bind:value={settings.shadowFar}
        format={formatFloat}
        label="Shadow far"
        min={10}
        max={48}
        step={0.5}
      />
      <Slider
        bind:value={settings.shadowMapSize}
        label="Shadow map"
        min={512}
        max={4096}
        step={256}
      />
      <Slider
        bind:value={settings.shadowBias}
        format={formatShadowBias}
        label="Shadow bias"
        min={-0.01}
        max={0.01}
        step={0.000_05}
      />
      <Slider
        bind:value={settings.shadowNormalBias}
        format={formatFloat}
        label="Normal bias"
        min={0}
        max={0.2}
        step={0.001}
      />
      <Button
        on:click={resetLightingDefaults}
        title="Reset lighting defaults"
      />
    </Folder>

    <Folder title="Melee" expanded={false}>
      <Checkbox bind:value={settings.meleeShowSword} label="Show sword" />
      <Slider
        bind:value={settings.meleeSwordOpacity}
        format={formatFloat}
        label="Sword opacity"
        min={0}
        max={1}
        step={0.05}
      />
      <Slider
        bind:value={settings.meleeDurationMs}
        format={formatFloat}
        label="Duration ms"
        min={60}
        max={600}
        step={5}
      />
      <Slider
        bind:value={settings.meleeCooldownMs}
        format={formatFloat}
        label="Cooldown ms"
        min={100}
        max={1200}
        step={10}
      />
      <Slider
        bind:value={settings.meleeArcSpan}
        format={formatFloat}
        label="Arc span (rad)"
        min={0.6}
        max={4}
        step={0.05}
      />
      <Slider
        bind:value={settings.meleeReach}
        format={formatFloat}
        label="Reach"
        min={1}
        max={4}
        step={0.05}
      />
      <Slider
        bind:value={settings.meleeHitboxPadding}
        format={formatFloat}
        label="Hitbox padding"
        min={0}
        max={1.5}
        step={0.01}
      />
      <Separator />
      <Slider
        bind:value={settings.meleeTailLength}
        format={formatFloat}
        label="Tail length"
        min={0.1}
        max={1}
        step={0.01}
      />
      <Color bind:value={settings.meleeEdgeColor} label="Edge color" />
      <Color bind:value={settings.meleeCoreColor} label="Core color" />
      <Separator />
      <Slider
        bind:value={settings.meleeBand1Alpha}
        format={formatFloat}
        label="Band 1 alpha"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand1Center}
        format={formatFloat}
        label="Band 1 pos"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand1Width}
        format={formatFloat}
        label="Band 1 width"
        min={0.005}
        max={0.5}
        step={0.005}
      />
      <Slider
        bind:value={settings.meleeBand2Alpha}
        format={formatFloat}
        label="Band 2 alpha"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand2Center}
        format={formatFloat}
        label="Band 2 pos"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand2Width}
        format={formatFloat}
        label="Band 2 width"
        min={0.005}
        max={0.5}
        step={0.005}
      />
      <Slider
        bind:value={settings.meleeBand3Alpha}
        format={formatFloat}
        label="Band 3 alpha"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand3Center}
        format={formatFloat}
        label="Band 3 pos"
        min={0}
        max={1}
        step={0.01}
      />
      <Slider
        bind:value={settings.meleeBand3Width}
        format={formatFloat}
        label="Band 3 width"
        min={0.005}
        max={0.5}
        step={0.005}
      />
      <Button on:click={resetMeleeDefaults} title="Reset melee defaults" />
    </Folder>

    <Folder title="Materials" expanded={false}>
      <List
        bind:value={settings.floorTheme}
        label="Floor"
        options={floorThemeOptions}
      />
      <List
        bind:value={settings.wallTheme}
        label="Walls"
        options={wallThemeOptions}
      />
      <Button
        on:click={resetMaterialDefaults}
        title="Reset material defaults"
      />
    </Folder>

    <Folder title="Cheats" expanded={false}>
      <Checkbox bind:value={cheats.oneHitKill} label="One-Hit Kill" />
      <Checkbox bind:value={cheats.infiniteHealth} label="Infinite Health" />
      <Button
        on:click={() => cheats.requestRevealMap()}
        title="Reveal Entire Map"
      />
      <Button on:click={() => cheats.reset()} title="Reset cheat defaults" />
    </Folder>

    <Folder title="Debug" expanded={false}>
      <Checkbox
        bind:value={settings.showDebugGeometry}
        label="Camera helpers"
      />
      <Checkbox
        bind:value={settings.showPhysicsDebug}
        label="Physics wireframe"
      />
      <Checkbox bind:value={settings.showEnvironmentMap} label="Show HDRI" />
      <Button on:click={resetDebugDefaults} title="Reset debug defaults" />
      <Separator />
      <Button on:click={onResetLevel} title="Reset level" />
      <Button on:click={onResetScene} title="Reset scene" />
      <Button on:click={resetAllDefaults} title="Reset all defaults" />
    </Folder>
  </Pane>
</div>

<style>
  .debug-anchor {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 12;
  }
</style>
