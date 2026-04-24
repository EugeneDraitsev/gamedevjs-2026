<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { onDestroy } from "svelte";
  import {
    AdditiveBlending,
    DoubleSide,
    type IUniform,
    ShaderMaterial,
  } from "three";
  import {
    glslHash,
    glslValueNoise,
  } from "$lib/components/overworld/materials/shader-noise";
  import { outsidePlan } from "$lib/game/outside-chunk-context";
  import type { Vec3 } from "$lib/types/game";

  let {
    active,
    opacity = 0.36,
    position,
    radius,
  }: {
    active?: boolean;
    opacity?: number;
    position: Vec3;
    radius: number;
  } = $props();

  interface WakeSegment {
    id: number;
    length: number;
    material: ShaderMaterial;
    strength: number;
    width: number;
    x: number;
    yaw: number;
    z: number;
  }

  const maxAge = 2.6;
  const maxSegments = 30;
  const vertexShader = /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `;
  const fragmentShader = /* glsl */ `
            ${glslHash}
            ${glslValueNoise}
            uniform float uAge;
            uniform float uOpacity;
            uniform float uTime;
            varying vec2 vUv;

            void main() {
              vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
              float life = 1.0 - smoothstep(0.5, 1.0, uAge);
              float grow = smoothstep(0.02, 0.22, uAge);
              float yMask = 1.0 - smoothstep(grow * 0.86, max(grow, 0.02), p.y);
              float y = p.y / max(grow, 0.08);
              float fade = smoothstep(0.0, 0.08, p.y) * (1.0 - smoothstep(0.82, 1.0, y));
              float noise = fbm2(vec2(p.x * 8.0, p.y * 12.0 - uTime * 1.8));
              float bendNoise = fbm2(vec2(p.y * 5.0 + uTime * 0.35, p.x * 4.0 + uAge * 2.0));
              float bend = sin(p.y * 9.0 + uAge * 6.0 + noise * 3.0) * (0.025 + y * 0.075);
              float curvedX = p.x + (bend + (bendNoise - 0.5) * 0.1 * y) * smoothstep(0.03, 0.5, p.y);
              float spread = 0.06 + y * 0.28 + uAge * 0.38 + (noise - 0.5) * 0.08 + sin(y * 6.0 + uAge * 4.0) * 0.035 * y;
              float waveBand = 0.55 + 0.45 * sin(y * 18.0 + curvedX * 7.0 + uTime * 1.2);
              float arm = 1.0 - smoothstep(0.025, 0.145, abs(abs(curvedX) - spread));
              float inside = 1.0 - smoothstep(spread * 0.72, spread * 1.06, abs(curvedX));
              float wash = inside * smoothstep(0.05, 0.34, p.y) * (1.0 - smoothstep(0.72, 1.0, p.y));
              float center = (1.0 - smoothstep(0.03, 0.15, abs(curvedX))) * exp(-p.y * 1.2);
              float foam = smoothstep(0.45, 0.9, fbm2(vec2(curvedX * 18.0 + sin(y * 7.0) * 0.8, p.y * 24.0 - uTime * 3.0)));
              float wake = fade * yMask * life * (arm * (0.32 + noise * 0.26) * waveBand + wash * foam * 0.24 + center * 0.1);
              vec3 col = vec3(wake * 0.68, wake * 0.9, wake);
              float alpha = wake * uOpacity;
              if (alpha < 0.008) discard;
              gl_FragColor = vec4(col, alpha);
            }
          `;

  const makeMaterial = () =>
    new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader,
      side: DoubleSide,
      transparent: true,
      uniforms: {
        uAge: { value: 0 },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
      } as Record<string, IUniform>,
      vertexShader,
    });

  const sampledInWater = $derived.by(() => {
    const plan = outsidePlan();
    return (
      plan.isUnderwater(position[0], position[2]) ||
      plan.isUnderwater(position[0] + radius, position[2]) ||
      plan.isUnderwater(position[0] - radius, position[2]) ||
      plan.isUnderwater(position[0], position[2] + radius) ||
      plan.isUnderwater(position[0], position[2] - radius)
    );
  });
  const inWater = $derived(active ?? sampledInWater);

  let lastX = $state<number | null>(null);
  let lastZ = $state<number | null>(null);
  let distanceSinceLastEmit = 0;
  let wakeTime = 0;
  let nextId = 0;
  let segments = $state<WakeSegment[]>([]);

  const emit = (x: number, z: number, yaw: number, strength: number) => {
    const material = makeMaterial();
    material.uniforms.uOpacity.value = opacity * strength;
    segments = [
      ...segments.slice(-(maxSegments - 1)),
      {
        id: nextId++,
        length: radius * (2.4 + strength * 2.2),
        material,
        strength,
        width: radius * (2.0 + strength * 3.0),
        x,
        yaw,
        z,
      },
    ];
  };

  useTask((delta) => {
    wakeTime += delta;
    const previousX = lastX;
    const previousZ = lastZ;
    const dx = previousX === null ? 0 : position[0] - previousX;
    const dz = previousZ === null ? 0 : position[2] - previousZ;
    const moved = previousX !== null && previousZ !== null;
    const distance = moved ? Math.hypot(dx, dz) : 0;
    const speed = distance / Math.max(delta, 0.001);

    const live: WakeSegment[] = [];
    for (const segment of segments) {
      const age =
        (segment.material.uniforms.uAge.value as number) + delta / maxAge;
      segment.material.uniforms.uAge.value = age;
      segment.material.uniforms.uTime.value = wakeTime;
      segment.material.uniforms.uOpacity.value =
        opacity * segment.strength * (1 - Math.min(1, age) * 0.45);
      if (age < 1) {
        live.push(segment);
      } else {
        segment.material.dispose();
      }
    }
    if (live.length !== segments.length) {
      segments = live;
    }

    if (inWater && previousX !== null && previousZ !== null && speed > 0.45) {
      const emitSpacing = radius * 0.32;
      const yaw = Math.atan2(-dx, -dz);
      const strength = Math.min(1, speed / 3.8);

      if (distance > 0.0001) {
        distanceSinceLastEmit += distance;
      }

      if (distanceSinceLastEmit >= emitSpacing) {
        distanceSinceLastEmit %= emitSpacing;
        emit(position[0], position[2], yaw, strength);
      }
    } else {
      distanceSinceLastEmit = 0;
    }

    lastX = position[0];
    lastZ = position[2];
  });

  onDestroy(() => {
    for (const segment of segments) {
      segment.material.dispose();
    }
  });
</script>

{#each segments as segment (segment.id)}
  <T.Group
    position={[
      segment.x + Math.sin(segment.yaw) * segment.length * 0.5,
      0.08,
      segment.z + Math.cos(segment.yaw) * segment.length * 0.5,
    ]}
    rotation={[0, segment.yaw, 0]}
  >
    <T.Mesh
      material={segment.material}
      rotation={[Math.PI / 2, 0, 0]}
      scale={[segment.width, segment.length, 1]}
      renderOrder={4}
    >
      <T.PlaneGeometry args={[1, 1, 1, 1]} />
    </T.Mesh>
  </T.Group>
{/each}
