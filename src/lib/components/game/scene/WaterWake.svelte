<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { onDestroy } from "svelte";
  import {
    AdditiveBlending,
    DoubleSide,
    ShaderMaterial,
    type IUniform,
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

  type WakeSegment = {
    id: number;
    length: number;
    material: ShaderMaterial;
    strength: number;
    width: number;
    x: number;
    yaw: number;
    z: number;
  };

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
      float spread = 0.06 + y * 0.28 + uAge * 0.38 + (noise - 0.5) * 0.08;
      float arm = 1.0 - smoothstep(0.02, 0.105, abs(abs(p.x) - spread));
      float inside = 1.0 - smoothstep(spread * 0.72, spread * 1.06, abs(p.x));
      float wash = inside * smoothstep(0.05, 0.34, p.y) * (1.0 - smoothstep(0.72, 1.0, p.y));
      float center = (1.0 - smoothstep(0.03, 0.15, abs(p.x))) * exp(-p.y * 1.2);
      float foam = smoothstep(0.45, 0.9, fbm2(vec2(p.x * 18.0, p.y * 24.0 - uTime * 3.0)));
      float wake = fade * yMask * life * (arm * (0.46 + noise * 0.38) + wash * foam * 0.2 + center * 0.1);
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
      Math.min(
        plan.sampleHeight(position[0], position[2]),
        plan.sampleHeight(position[0] + radius, position[2]),
        plan.sampleHeight(position[0] - radius, position[2]),
        plan.sampleHeight(position[0], position[2] + radius),
        plan.sampleHeight(position[0], position[2] - radius)
      ) < -0.04
    );
  });
  const inWater = $derived(active ?? sampledInWater);

  let lastX = $state<number | null>(null);
  let lastZ = $state<number | null>(null);
  let emitDistance = 0;
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
    const dx = lastX === null ? 0 : position[0] - lastX;
    const dz = lastZ === null ? 0 : position[2] - lastZ;
    const moved = lastX !== null && lastZ !== null;
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

    if (inWater && distance > 0.015 && speed > 0.45) {
      emitDistance += distance;
      if (emitDistance > radius * 0.32) {
        emitDistance = 0;
        emit(
          position[0],
          position[2],
          Math.atan2(-dx, -dz),
          Math.min(1, speed / 3.8)
        );
      }
    } else {
      emitDistance = 0;
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
