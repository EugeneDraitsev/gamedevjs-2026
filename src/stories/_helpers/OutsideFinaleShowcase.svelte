<script lang="ts">
  import { Canvas, T } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { onMount } from "svelte";
  import { PCFSoftShadowMap } from "three";
  import SceneRendererConfig from "$lib/components/game/SceneRendererConfig.svelte";
  import EnemyActor from "$lib/components/game/scene/EnemyActor.svelte";
  import OutsideMechanicalCastleEntrance from "$lib/components/game/scene/environment/OutsideMechanicalCastleEntrance.svelte";
  import OutsideRoad from "$lib/components/game/scene/environment/OutsideRoad.svelte";
  import OutsideTerrain from "$lib/components/game/scene/environment/OutsideTerrain.svelte";
  import GateKeeperArcLaser from "$lib/components/game/scene/GateKeeperArcLaser.svelte";
  import { enemyTemplateById } from "$lib/config/room-templates";
  import {
    outsideGroundY,
    setOutsideChunkSeed,
  } from "$lib/game/outside-chunk-context";
  import type { ActiveEnemy, ActiveGateLaser } from "$lib/types/game";

  interface Props {
    unlocked?: boolean;
  }

  let { unlocked = false }: Props = $props();

  setOutsideChunkSeed("outside-finale-showcase");

  let animationNow = $state(0);
  const gateKeeperTemplate = enemyTemplateById["gate-keeper"];
  const gateKeeperPosition = $derived([
    0,
    outsideGroundY(0, -68.5) + 0.62,
    -68.5,
  ] as [number, number, number]);
  const gateKeeper = $derived<ActiveEnemy>({
    behavior: gateKeeperTemplate.behavior,
    color: gateKeeperTemplate.color,
    hp: gateKeeperTemplate.hp,
    id: "outside-finale-gate-keeper",
    knockbackVelocity: [0, 0, 0],
    lastHitAt: 0,
    lastShotAt: 0,
    maxHp: gateKeeperTemplate.hp,
    moveSpeed: gateKeeperTemplate.moveSpeed,
    position: gateKeeperPosition,
    preferredRange: gateKeeperTemplate.preferredRange,
    radius: gateKeeperTemplate.radius,
    shotColor: gateKeeperTemplate.shotColor,
    shotDamage: gateKeeperTemplate.shotDamage,
    shotIntervalMs: gateKeeperTemplate.shotIntervalMs,
    shotSpeed: gateKeeperTemplate.shotSpeed,
    templateId: gateKeeperTemplate.id,
    touchDamage: gateKeeperTemplate.touchDamage,
    touchIntervalMs: gateKeeperTemplate.touchIntervalMs,
  });
  const gateLaser = $derived<ActiveGateLaser>({
    arcSpan: 1.96,
    center: [0, outsideGroundY(0, -68.5) + 0.1, -68.5],
    color: "#ff8f38",
    core: "#ffe0a0",
    createdAt: animationNow - ((animationNow + 280) % 2460),
    damage: 2,
    fadeMs: 420,
    id: "outside-finale-gate-laser",
    originId: gateKeeper.id,
    radius: 11.5,
    startAngle: -0.98,
    sweepMs: 1320,
    telegraphMs: 720,
    width: 0.46,
  });

  onMount(() => {
    let frameId = 0;
    const frame = (time: number) => {
      animationNow = time;
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(frameId);
  });
</script>

<main class="showcase">
  <Canvas shadows={PCFSoftShadowMap} dpr={1}>
    <SceneRendererConfig backgroundColor="#c7d0c0" exposure={0.9} />
    <T.Fog attach="fog" args={["#b8c3ad", 42, 170]} />
    <T.PerspectiveCamera
      makeDefault
      fov={56}
      position={[0, 21, -18]}
      rotation={[-0.14, 0, 0]}
    />

    <T.HemisphereLight args={["#ead7a4", "#435d4c", 0.95]} />
    <T.AmbientLight intensity={0.42} />
    <T.DirectionalLight
      castShadow
      color="#ffd18a"
      intensity={3.25}
      position={[-12, 13, -42]}
    />

    <World gravity={[0, -16, 0]}>
      <OutsideTerrain />
      <OutsideRoad />
      <OutsideMechanicalCastleEntrance {animationNow} {unlocked} />
      {#if !unlocked}
        <EnemyActor enemy={gateKeeper} {animationNow} />
        <GateKeeperArcLaser laser={gateLaser} {animationNow} />
      {/if}
    </World>
  </Canvas>
</main>

<style>
  .showcase {
    position: relative;
    inline-size: 100%;
    block-size: 100vh;
    background: #c7d0c0;
  }

  .showcase > :global(:first-child) {
    position: absolute;
    inset: 0;
  }
</style>
