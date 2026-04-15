<script lang="ts">
  import type { ListOptions } from "svelte-tweakpane-ui";
  import {
    Button,
    Checkbox,
    Folder,
    List,
    Pane,
    Separator,
    Slider,
  } from "svelte-tweakpane-ui";
  import type { CameraMode, SceneSettings } from "$lib/config/scene-settings";

  interface DebugPaneProps {
    onResetDefaults: () => void;
    onResetScene: () => void;
    settings: SceneSettings;
  }

  const cameraModeOptions: ListOptions<CameraMode> = {
    Follow: "follow",
    Orbit: "orbit",
  };

  const formatAngle = (value: number) => `${value.toFixed(0)}°`;
  const formatFloat = (value: number) => value.toFixed(2);
  const formatShadowBias = (value: number) => value.toFixed(5);

  let {
    onResetDefaults,
    onResetScene,
    settings = $bindable(),
  }: DebugPaneProps = $props();
</script>

<Pane position="fixed" title="Debug Controls" width={320} x={16} y={16}>
  <Folder title="Camera">
    <List
      bind:value={settings.cameraMode}
      label="Mode"
      options={cameraModeOptions}
    />
    <Slider
      bind:value={settings.cameraFov}
      label="FOV"
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
  </Folder>

  <Folder title="Lighting" expanded={false}>
    <Slider
      bind:value={settings.sunIntensity}
      format={formatFloat}
      label="Sun"
      min={0}
      max={4}
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
  </Folder>

  <Folder title="Debug" expanded={false}>
    <Checkbox bind:value={settings.showDebugGeometry} label="Camera helpers" />
    <Checkbox
      bind:value={settings.showPhysicsDebug}
      label="Physics wireframe"
    />
    <Separator />
    <Button on:click={onResetScene} title="Reset scene" />
    <Button on:click={onResetDefaults} title="Reset defaults" />
  </Folder>
</Pane>
