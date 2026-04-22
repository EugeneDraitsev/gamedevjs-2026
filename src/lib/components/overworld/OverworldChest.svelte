<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { onMount } from "svelte";
  import { type Group, MathUtils } from "three";
  import type { OverworldChest } from "$lib/config/overworld-layout";
  import { isEditableTarget } from "$lib/game/dom";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  interface Props {
    data: OverworldChest;
    onOpened: () => void;
    opened: boolean;
  }

  let { data, opened, onOpened }: Props = $props();

  const scene = getGameSceneContext();

  const interactRadius = 1.8;
  const interactRadiusSq = interactRadius * interactRadius;

  let isNear = $state(false);
  let lidGroup = $state.raw<Group>();
  let lidOpenT = 0;

  useTask((delta) => {
    const pos = scene.player.lastPosition;
    const dx = pos[0] - data.position[0];
    const dz = pos[2] - data.position[2];
    const near = dx * dx + dz * dz < interactRadiusSq;
    if (near !== isNear) {
      isNear = near;
    }

    const targetT = opened ? 1 : 0;
    lidOpenT = MathUtils.lerp(lidOpenT, targetT, Math.min(1, delta * 6));
    if (lidGroup) {
      lidGroup.rotation.x = -lidOpenT * (Math.PI / 2.2);
    }
  });

  onMount(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      if (!isNear || opened) {
        return;
      }
      if (event.code === "KeyE" || event.code === "Enter") {
        event.preventDefault();
        onOpened();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });
</script>

<T.Group position={data.position}>
  <!-- chest body -->
  <T.Mesh position={[0, 0.35, 0]} castShadow receiveShadow>
    <T.BoxGeometry args={[1.1, 0.7, 0.8]} />
    <T.MeshStandardMaterial
      color={opened ? "#7f5b2e" : "#5a3e1f"}
      roughness={0.75}
      metalness={0.15}
    />
  </T.Mesh>
  <!-- iron bands -->
  <T.Mesh position={[0, 0.35, 0.41]}>
    <T.BoxGeometry args={[1.14, 0.12, 0.04]} />
    <T.MeshStandardMaterial color="#2a2220" roughness={0.6} metalness={0.6} />
  </T.Mesh>
  <T.Mesh position={[0, 0.35, -0.41]}>
    <T.BoxGeometry args={[1.14, 0.12, 0.04]} />
    <T.MeshStandardMaterial color="#2a2220" roughness={0.6} metalness={0.6} />
  </T.Mesh>
  <!-- lock -->
  <T.Mesh position={[0, 0.35, 0.42]}>
    <T.BoxGeometry args={[0.18, 0.22, 0.06]} />
    <T.MeshStandardMaterial
      color={opened ? "#4d4033" : "#f0c16a"}
      emissive={opened ? "#000" : "#b07a1a"}
      emissiveIntensity={opened ? 0 : 0.6}
      metalness={0.8}
      roughness={0.35}
    />
  </T.Mesh>
  <!-- lid pivots on the back edge -->
  <T.Group bind:ref={lidGroup} position={[0, 0.7, -0.4]}>
    <T.Mesh position={[0, 0.12, 0.4]} castShadow>
      <T.BoxGeometry args={[1.1, 0.24, 0.8]} />
      <T.MeshStandardMaterial
        color={opened ? "#8a6637" : "#6b4722"}
        roughness={0.72}
        metalness={0.15}
      />
    </T.Mesh>
  </T.Group>
  {#if isNear}
    <T.PointLight
      position={[0, 1.2, 0]}
      color="#f4d47a"
      intensity={1.6}
      distance={3.5}
    />
  {/if}
</T.Group>
