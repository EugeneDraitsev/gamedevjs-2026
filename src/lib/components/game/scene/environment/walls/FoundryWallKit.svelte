<script lang="ts">
  import { T } from "@threlte/core";
  import type { Texture } from "three";
  import type { StaticWall, Vec3 } from "$lib/types/game";
  import FoundryWallModule, {
    type FoundryWallVariant,
  } from "./FoundryWallModule.svelte";

  let {
    animationNow = 0,
    wall,
    wallDecalTexture = null,
    wallTexture = null,
  }: {
    animationNow?: number;
    wall: StaticWall;
    wallDecalTexture?: Texture | null;
    wallTexture?: Texture | null;
  } = $props();

  const isHorizontal = (wall: StaticWall) => wall.args[0] > wall.args[2];
  const wallSpan = (wall: StaticWall) =>
    (isHorizontal(wall) ? wall.args[0] : wall.args[2]) * 2;
  const faceSign = (wall: StaticWall) =>
    wall.facing === "south" || wall.facing === "east" ? 1 : -1;
  const facePosition = (wall: StaticWall): Vec3 =>
    isHorizontal(wall)
      ? [0, -0.08, faceSign(wall) * (wall.args[2] + 0.18)]
      : [faceSign(wall) * (wall.args[0] + 0.18), -0.08, 0];
  const faceRotation = (wall: StaticWall): Vec3 => {
    if (wall.facing === "north") {
      return [0, Math.PI, 0];
    }

    if (wall.facing === "east") {
      return [0, Math.PI / 2, 0];
    }

    if (wall.facing === "west") {
      return [0, -Math.PI / 2, 0];
    }

    return [0, 0, 0];
  };
  const span = $derived(wallSpan(wall));
  const moduleCount = $derived(Math.max(1, Math.round(span / 3.2)));
  const moduleWidth = $derived(span / moduleCount);
  const modules = $derived(
    Array.from({ length: moduleCount }, (_, index) => index)
  );
  const wallSeed = $derived(
    wall.id.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0)
  );
  const moduleVariant = (index: number): FoundryWallVariant => {
    if (moduleCount === 3 && index === 1) {
      return "gear";
    }

    if (moduleCount === 3 && index === 0) {
      return "valve";
    }

    if (moduleCount === 3 && index === 2) {
      return "pipe";
    }

    if (moduleCount === 4 && index === 1) {
      return "gear";
    }

    if (moduleCount === 4 && index === 2) {
      return "valve";
    }

    if (moduleCount > 4 && index === 1) {
      return "gear";
    }

    if (moduleCount > 4 && index === moduleCount - 2) {
      return "valve";
    }

    if (moduleCount > 3 && index === Math.floor(moduleCount / 2)) {
      return "pipe";
    }

    return "plain";
  };
</script>

<T.Group position={facePosition(wall)} rotation={faceRotation(wall)}>
  {#each modules as index}
    <T.Group
      position={[
        (index - (moduleCount - 1) / 2) * moduleWidth,
        0,
        0,
      ]}
    >
      <FoundryWallModule
        {animationNow}
        baseColor={wall.color}
        decalSeed={wallSeed + index * 19}
        light={Boolean(wall.lamp && index === Math.floor(moduleCount / 2))}
        showLamp
        trimColor={wall.trimColor ?? "#7b4b22"}
        variant={moduleVariant(index)}
        {wallDecalTexture}
        {wallTexture}
        width={moduleWidth}
      />
    </T.Group>
  {/each}
</T.Group>
