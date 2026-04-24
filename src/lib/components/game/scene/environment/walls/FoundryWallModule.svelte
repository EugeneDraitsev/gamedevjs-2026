<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";
  import FoundryGearSet from "./FoundryGearSet.svelte";
  import FoundryLamp from "./FoundryLamp.svelte";
  import FoundryPipeCluster from "./FoundryPipeCluster.svelte";
  import FoundryValveSet from "./FoundryValveSet.svelte";
  import FoundryVent from "./FoundryVent.svelte";
  import WallModuleFrame from "./WallModuleFrame.svelte";

  export type FoundryWallVariant = "gear" | "pipe" | "plain" | "valve";

  let {
    animationNow = 0,
    baseColor = "#2f332f",
    decalSeed = 0,
    light = false,
    showDecor = true,
    showLamp = true,
    trimColor = "#7b4b22",
    variant = "plain",
    wallDecalTexture = null,
    wallTexture = null,
    width = 2.1,
  }: {
    animationNow?: number;
    baseColor?: string;
    decalSeed?: number;
    light?: boolean;
    showDecor?: boolean;
    showLamp?: boolean;
    trimColor?: string;
    variant?: FoundryWallVariant;
    wallDecalTexture?: Texture | null;
    wallTexture?: Texture | null;
    width?: number;
  } = $props();
</script>

<T.Group>
  <WallModuleFrame
    {baseColor}
    {decalSeed}
    {trimColor}
    {wallDecalTexture}
    {wallTexture}
    {width}
  />

  {#if showDecor}
    {#if variant === "gear"}
      <FoundryGearSet
        {animationNow}
        paired={false}
        scale={0.68}
        speed={1.35}
        {trimColor}
        x={-width * 0.16}
        y={0.66}
      />
      {#if showLamp}
        <FoundryLamp {light} {trimColor} y={-0.78} />
      {/if}
      <FoundryVent {trimColor} width={width * 0.28} x={width * 0.23} y={0.2} />
    {:else if variant === "valve"}
      <FoundryValveSet scale={0.82} {trimColor} x={-width * 0.18} y={0.45} />
      {#if showLamp}
        <FoundryLamp {light} {trimColor} y={-0.78} />
      {/if}
      <FoundryVent {trimColor} width={width * 0.28} x={width * 0.25} y={0.0} />
    {:else if variant === "pipe"}
      <FoundryPipeCluster {trimColor} x={-width * 0.22} y={0.12} />
      {#if showLamp}
        <FoundryLamp {light} {trimColor} y={-0.78} />
      {/if}
      <FoundryVent {trimColor} width={width * 0.3} x={width * 0.25} y={0.54} />
    {:else}
      {#if showLamp}
        <FoundryLamp {light} {trimColor} y={-0.78} />
      {/if}
      <FoundryVent {trimColor} width={width * 0.34} x={width * 0.24} y={-0.8} />
    {/if}
  {/if}
</T.Group>
