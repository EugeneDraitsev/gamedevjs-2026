<script lang="ts">
  import { T } from "@threlte/core";
  import { AdditiveBlending, GreaterDepth } from "three";
  import type { ActiveGateLaser } from "$lib/types/game";

  let {
    animationNow,
    laser,
  }: {
    animationNow: number;
    laser: ActiveGateLaser;
  } = $props();

  const segmentCount = 38;
  const age = $derived(animationNow - laser.createdAt);
  const active = $derived(
    age >= laser.telegraphMs && age <= laser.telegraphMs + laser.sweepMs
  );
  const sweepT = $derived(
    Math.max(0, Math.min(1, (age - laser.telegraphMs) / laser.sweepMs))
  );
  const sweepAngle = $derived(laser.startAngle + laser.arcSpan * sweepT);
  const fade = $derived(
    age > laser.telegraphMs + laser.sweepMs
      ? Math.max(
          0,
          1 - (age - laser.telegraphMs - laser.sweepMs) / laser.fadeMs
        )
      : 1
  );
  const radialBeamOpacity = $derived.by(() => {
    if (age < 0) {
      return 0;
    }

    if (active) {
      return 0.82 * fade;
    }

    if (age < laser.telegraphMs) {
      return 0.16 + Math.sin(animationNow * 0.018) * 0.04;
    }

    if (age <= laser.telegraphMs + laser.sweepMs + laser.fadeMs) {
      return 0.48 * fade;
    }

    return 0;
  });
  const segments = $derived.by(() => {
    const segmentLength =
      (Math.abs(laser.arcSpan) * laser.radius) / (segmentCount - 1);

    return Array.from({ length: segmentCount }, (_, index) => {
      const t = index / (segmentCount - 1);
      const angle = laser.startAngle + laser.arcSpan * t;
      const head = active ? Math.max(0, 1 - Math.abs(t - sweepT) / 0.12) : 0;
      const trail = active ? Math.max(0, 1 - Math.abs(t - sweepT) / 0.3) : 0;
      const telegraph =
        age < laser.telegraphMs
          ? 0.18 + Math.sin(animationNow * 0.012 + index * 0.6) * 0.05
          : 0.1;

      return {
        head,
        id: index,
        length: segmentLength,
        opacity: Math.min(0.92, telegraph + head * 0.72 + trail * 0.32) * fade,
        position: [
          Math.sin(angle) * laser.radius,
          0.18,
          Math.cos(angle) * laser.radius,
        ] as [number, number, number],
        rotationY: Math.PI * 0.5 + angle,
      };
    });
  });
</script>

<T.Group position={laser.center}>
  {#if radialBeamOpacity > 0.01}
    <T.Group rotation={[0, sweepAngle, 0]}>
      <T.Mesh position={[0, 0.42, laser.radius * 0.5]} renderOrder={34}>
        <T.BoxGeometry args={[laser.width * 2.6, 0.18, laser.radius]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color="#c90000"
          depthTest={false}
          depthWrite={false}
          opacity={radialBeamOpacity * 0.56}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh position={[0, 0.52, laser.radius * 0.5]} renderOrder={35}>
        <T.BoxGeometry args={[laser.width * 0.92, 0.2, laser.radius]} />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color={active ? "#ff3028" : "#ff3a28"}
          depthTest={false}
          depthWrite={false}
          opacity={radialBeamOpacity}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
    </T.Group>
  {/if}

  {#each segments as segment (segment.id)}
    <T.Group position={segment.position} rotation={[0, segment.rotationY, 0]}>
      <T.Mesh renderOrder={31}>
        <T.BoxGeometry
          args={[
            laser.width * (2.2 + segment.head * 1.2),
            0.09 + segment.head * 0.08,
            segment.length * 1.18,
          ]}
        />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color={laser.core}
          depthFunc={GreaterDepth}
          depthWrite={false}
          opacity={segment.opacity * 0.34}
          toneMapped={false}
          transparent
        />
      </T.Mesh>

      <T.Mesh renderOrder={32}>
        <T.BoxGeometry
          args={[
            laser.width * (0.72 + segment.head * 0.45),
            0.08 + segment.head * 0.06,
            segment.length * 0.98,
          ]}
        />
        <T.MeshBasicMaterial
          blending={AdditiveBlending}
          color={segment.head > 0.4 ? laser.core : laser.color}
          depthWrite={false}
          opacity={segment.opacity}
          toneMapped={false}
          transparent
        />
      </T.Mesh>
    </T.Group>
  {/each}

  {#if active}
    <T.Mesh
      position={[
        Math.sin(sweepAngle) * laser.radius,
        0.26,
        Math.cos(sweepAngle) * laser.radius,
      ]}
      renderOrder={33}
    >
      <T.SphereGeometry args={[laser.width * 1.55, 16, 16]} />
      <T.MeshBasicMaterial
        blending={AdditiveBlending}
        color={laser.core}
        depthWrite={false}
        opacity={0.78 * fade}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  {/if}
</T.Group>
