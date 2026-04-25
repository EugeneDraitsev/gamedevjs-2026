<script module lang="ts">
  import {
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    GreaterDepth,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
    SphereGeometry,
  } from "three";

  export const enemyRingGeometry = new RingGeometry(1.15, 1.45, 36);
  export const enemyBodyGeometry = new SphereGeometry(1, 24, 24);
  export const enemyLampShellGeometry = new SphereGeometry(1, 10, 8);
  export const enemyLampBandGeometry = new CylinderGeometry(1, 1, 1, 10);
  export const enemyEyeGeometry = new SphereGeometry(1, 16, 16);
  export const enemyGunGeometry = new BoxGeometry(1, 1, 1);
  export const enemyConeGeometry = new ConeGeometry(1, 1, 18);
  export const stealthWingGeometry = new BoxGeometry(1, 1, 1);
  export const stealthNoseGeometry = new ConeGeometry(1, 1, 4);
  export const enemyHealthBarGeometry = new BoxGeometry(1.1, 0.11, 0.06);
  export const enemyEyeMaterial = new MeshStandardMaterial({
    color: "#f5fbff",
    metalness: 0.04,
    roughness: 0.22,
  });
  export const enemyHealthBackMaterial = new MeshBasicMaterial({
    color: "#09131f",
    opacity: 0.88,
    transparent: true,
  });
  export const enemyHealthFillMaterial = new MeshBasicMaterial({
    color: "#57d6a5",
  });
</script>

<script lang="ts">
  import { T } from "@threlte/core";
  import type { ActiveEnemy } from "$lib/types/game";

  let {
    animationNow,
    enemy,
  }: {
    animationNow: number;
    enemy: ActiveEnemy;
  } = $props();

  const isMineHerald = $derived(enemy.templateId === "mine-herald");
  const isGateKeeper = $derived(enemy.templateId === "gate-keeper");
  const isStealther = $derived(typeof enemy.stealthRevealMs === "number");
  const hitFlash = $derived(animationNow - enemy.lastHitAt < 130);
  const stealthReveal = $derived.by(() => {
    if (!isStealther) {
      return 1;
    }

    if (enemy.stealthMode === "aiming") {
      return 1;
    }

    const revealMs = enemy.stealthRevealMs ?? 760;
    const hitReveal = 1 - (animationNow - enemy.lastHitAt) / (revealMs * 0.7);

    return Math.max(0, Math.min(1, hitReveal));
  });
  const stealthMoving = $derived(enemy.stealthMode === "relocating");
  const stealthRevealCurve = $derived(stealthReveal * stealthReveal);
  const stealthBodyOpacity = $derived(
    isStealther ? Math.min(0.92, stealthRevealCurve * 1.15) : 1
  );
  const stealthShimmerOpacity = $derived(
    isStealther
      ? 0.0015 + (stealthMoving ? 0.009 : 0) + stealthRevealCurve * 0.08
      : 0
  );
  const stealthShowHealth = $derived(!isStealther || stealthReveal > 0.22);
  const stealthShowBody = $derived(!isStealther || stealthReveal > 0.16);
  const bodyEmissiveIntensity = $derived.by(() => {
    if (isStealther) {
      return 0.08 + stealthReveal * 0.9;
    }

    return hitFlash ? 0.52 : 0.18;
  });
  const stealthDistortionVisible = $derived(
    isStealther && (stealthMoving || stealthReveal > 0.02)
  );
  const stealthDroneYaw = $derived(
    typeof enemy.stealthAimYaw === "number"
      ? enemy.stealthAimYaw
      : Math.sin(animationNow * 0.0008 + enemy.position[0]) * 0.2
  );
  const lampBob = $derived(
    Math.sin(animationNow * 0.0022 + enemy.radius) * enemy.radius * 0.05
  );
  const lampPulse = $derived(0.9 + Math.sin(animationNow * 0.0052) * 0.1);
  const lampYaw = $derived(Math.sin(animationNow * 0.000_45) * 0.14);
  const gateKeeperCorePulse = $derived(
    0.9 + Math.sin(animationNow * 0.0064) * 0.1
  );
  const healthBarY = $derived(
    isGateKeeper ? enemy.radius * 3 : enemy.radius + 0.38
  );

  const heraldBands = [
    { color: "#ff7348", height: 0.14, index: 0, radius: 0.28, y: -0.58 },
    { color: "#ff6a42", height: 0.18, index: 1, radius: 0.42, y: -0.34 },
    { color: "#ff5d3a", height: 0.22, index: 2, radius: 0.6, y: -0.08 },
    { color: "#ff4f35", height: 0.24, index: 3, radius: 0.76, y: 0.18 },
    { color: "#ff5b39", height: 0.22, index: 4, radius: 0.62, y: 0.42 },
    { color: "#ff6942", height: 0.16, index: 5, radius: 0.42, y: 0.64 },
  ] as const;
  const gateKeeperBars = [-0.44, -0.18, 0.08, 0.34] as const;
  const gateKeeperArmSides = [-1, 1] as const;
  const gateKeeperPipes = [
    { height: 0.78, side: -0.46, y: 1.42 },
    { height: 0.94, side: 0.46, y: 1.5 },
  ] as const;

  const bomberSatellites = $derived.by(() => {
    if (enemy.behavior !== "bomber") {
      return [];
    }

    const orbit = enemy.radius * (isMineHerald ? 1.46 : 1.18);
    const spin = animationNow * (isMineHerald ? 0.000_55 : 0.0018);

    return [0, 1, 2].map((index) => {
      const yaw = spin + (index / 3) * Math.PI * 2;

      return {
        index,
        position: [
          Math.sin(yaw) * orbit,
          enemy.radius * (isMineHerald ? 0.08 : 0.18) +
            Math.sin(spin * 3 + index) *
              enemy.radius *
              (isMineHerald ? 0.03 : 0.08),
          Math.cos(yaw) * orbit,
        ] as [number, number, number],
      };
    });
  });
</script>

<T.Group position={enemy.position}>
  {#if !isStealther}
    <T.Mesh
      geometry={enemyBodyGeometry}
      renderOrder={29}
      scale={[enemy.radius * 1.12, enemy.radius * 1.12, enemy.radius * 1.12]}
    >
      <T.MeshBasicMaterial
        color="#ff5353"
        depthFunc={GreaterDepth}
        opacity={0.22}
        transparent
        depthWrite={false}
      />
    </T.Mesh>
  {/if}

  {#if enemy.radius > 1}
    <T.Mesh
      geometry={enemyRingGeometry}
      position={[0, -enemy.radius + 0.1, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[enemy.radius, enemy.radius, 1]}
    >
      <T.MeshBasicMaterial color={enemy.color} opacity={0.4} transparent />
    </T.Mesh>
  {/if}

  {#if isMineHerald}
    <T.Group position={[0, lampBob, 0]} rotation={[0, lampYaw, 0]}>
      <T.Mesh
        geometry={enemyLampShellGeometry}
        castShadow
        receiveShadow
        scale={[enemy.radius * 0.98, enemy.radius * 1.08, enemy.radius * 0.98]}
      >
        <T.MeshStandardMaterial
          color="#2d1c1a"
          emissive="#5a2b22"
          emissiveIntensity={0.24}
          flatShading
          metalness={0.26}
          opacity={0.42}
          roughness={0.18}
          transparent
        />
      </T.Mesh>

      <T.Mesh
        geometry={enemyLampShellGeometry}
        scale={[enemy.radius * 1.01, enemy.radius * 1.11, enemy.radius * 1.01]}
      >
        <T.MeshBasicMaterial
          color="#f7c4a8"
          opacity={0.22}
          transparent
          wireframe
        />
      </T.Mesh>

      <T.Mesh
        geometry={enemyLampShellGeometry}
        castShadow
        scale={[
          enemy.radius * 0.56 * lampPulse,
          enemy.radius * 0.8 * lampPulse,
          enemy.radius * 0.56 * lampPulse,
        ]}
      >
        <T.MeshStandardMaterial
          color={enemy.color}
          emissive={enemy.color}
          emissiveIntensity={1}
          flatShading
          metalness={0.08}
          roughness={0.12}
        />
      </T.Mesh>

      {#each heraldBands as band (band.index)}
        <T.Mesh
          geometry={enemyLampBandGeometry}
          castShadow
          receiveShadow
          position={[0, band.y * enemy.radius, 0]}
          scale={[
            enemy.radius * band.radius,
            enemy.radius * band.height,
            enemy.radius * band.radius,
          ]}
        >
          <T.MeshStandardMaterial
            color={band.color}
            emissive={band.color}
            emissiveIntensity={band.index === 3 ? 0.72 : 0.48}
            flatShading
            metalness={0.16}
            roughness={0.14}
          />
        </T.Mesh>

        <T.Mesh
          geometry={enemyLampBandGeometry}
          position={[0, band.y * enemy.radius, 0]}
          scale={[
            enemy.radius * band.radius * 1.02,
            enemy.radius * band.height * 1.02,
            enemy.radius * band.radius * 1.02,
          ]}
        >
          <T.MeshBasicMaterial
            color="#ffcfb5"
            opacity={0.2}
            transparent
            wireframe
          />
        </T.Mesh>
      {/each}

      <T.Mesh
        geometry={enemyLampBandGeometry}
        castShadow
        position={[0, enemy.radius * 0.92, 0]}
        scale={[enemy.radius * 0.28, enemy.radius * 0.12, enemy.radius * 0.28]}
      >
        <T.MeshStandardMaterial
          color="#4a2e28"
          flatShading
          metalness={0.28}
          roughness={0.16}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, enemy.radius * 1.36, 0]}>
        <T.CylinderGeometry
          args={[enemy.radius * 0.08, enemy.radius * 0.08, enemy.radius * 0.68, 10]}
        />
        <T.MeshStandardMaterial
          color="#45322d"
          flatShading
          metalness={0.32}
          roughness={0.14}
        />
      </T.Mesh>

      <T.Mesh castShadow position={[0, enemy.radius * 1.76, 0]}>
        <T.CylinderGeometry
          args={[enemy.radius * 0.26, enemy.radius * 0.18, enemy.radius * 0.32, 10]}
        />
        <T.MeshStandardMaterial
          color="#3a2c29"
          flatShading
          metalness={0.3}
          roughness={0.16}
        />
      </T.Mesh>

      <T.Mesh
        geometry={enemyConeGeometry}
        castShadow
        position={[0, -enemy.radius * 0.96, 0]}
        rotation={[Math.PI, 0, 0]}
        scale={[
          enemy.radius * 0.14,
          enemy.radius * 0.28,
          enemy.radius * 0.14,
        ]}
      >
        <T.MeshStandardMaterial
          color={enemy.shotColor ?? enemy.color}
          emissive={enemy.shotColor ?? enemy.color}
          emissiveIntensity={0.64}
          metalness={0.12}
          roughness={0.14}
        />
      </T.Mesh>
    </T.Group>
  {:else if isGateKeeper}
    <T.Group
      position={[0, enemy.radius * 0.8 + lampBob * 0.35, 0]}
      scale={[1.16, 1.16, 1.16]}
    >
      <T.Mesh
        geometry={enemyGunGeometry}
        castShadow
        receiveShadow
        position={[0, enemy.radius * 0.16, 0]}
        scale={[enemy.radius * 1.08, enemy.radius * 1.42, enemy.radius * 0.52]}
      >
        <T.MeshStandardMaterial
          color={hitFlash ? "#fff0c2" : "#2c2d28"}
          emissive={hitFlash ? "#f7a64d" : "#1c0d05"}
          emissiveIntensity={hitFlash ? 0.58 : 0.22}
          flatShading
          metalness={0.74}
          roughness={0.36}
        />
      </T.Mesh>

      <T.Mesh
        geometry={enemyGunGeometry}
        castShadow
        position={[0, enemy.radius * 0.18, enemy.radius * 0.34]}
        scale={[enemy.radius * 0.84, enemy.radius * 1.14, enemy.radius * 0.12]}
      >
        <T.MeshStandardMaterial
          color="#151613"
          emissive="#090704"
          emissiveIntensity={0.18}
          flatShading
          metalness={0.66}
          roughness={0.46}
        />
      </T.Mesh>

      {#each gateKeeperBars as x}
        <T.Mesh
          geometry={enemyGunGeometry}
          castShadow
          position={[x * enemy.radius, enemy.radius * 0.18, enemy.radius * 0.48]}
          scale={[enemy.radius * 0.08, enemy.radius * 1.08, enemy.radius * 0.12]}
        >
          <T.MeshStandardMaterial
            color="#8e6935"
            emissive="#351905"
            emissiveIntensity={0.18}
            flatShading
            metalness={0.86}
            roughness={0.3}
          />
        </T.Mesh>
      {/each}

      <T.Mesh
        geometry={enemyLampBandGeometry}
        castShadow
        position={[0, enemy.radius * 0.1, enemy.radius * 0.62]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[enemy.radius * 0.36, enemy.radius * 0.1, enemy.radius * 0.36]}
      >
        <T.MeshStandardMaterial
          color="#a97537"
          emissive="#4f2105"
          emissiveIntensity={0.34}
          flatShading
          metalness={0.88}
          roughness={0.24}
        />
      </T.Mesh>

      <T.Mesh
        geometry={enemyEyeGeometry}
        castShadow
        position={[0, enemy.radius * 0.82, enemy.radius * 0.64]}
        scale={[
          enemy.radius * 0.26 * gateKeeperCorePulse,
          enemy.radius * 0.26 * gateKeeperCorePulse,
          enemy.radius * 0.26 * gateKeeperCorePulse,
        ]}
      >
        <T.MeshStandardMaterial
          color="#ffd56d"
          emissive="#ff8c24"
          emissiveIntensity={1.35}
          metalness={0.18}
          roughness={0.16}
        />
      </T.Mesh>

      <T.PointLight
        color="#ff9c38"
        distance={5.4}
        intensity={gateKeeperCorePulse * 1.4}
        position={[0, enemy.radius * 0.86, enemy.radius * 0.82]}
      />

      {#each gateKeeperArmSides as side}
        <T.Mesh
          geometry={enemyGunGeometry}
          castShadow
          receiveShadow
          position={[side * enemy.radius * 0.98, enemy.radius * 0.68, 0]}
          rotation={[0, 0, side * 0.16]}
          scale={[enemy.radius * 0.42, enemy.radius * 0.36, enemy.radius * 0.46]}
        >
          <T.MeshStandardMaterial
            color="#3a332b"
            emissive="#180b04"
            emissiveIntensity={0.2}
            flatShading
            metalness={0.78}
            roughness={0.34}
          />
        </T.Mesh>

        <T.Mesh
          geometry={enemyGunGeometry}
          castShadow
          receiveShadow
          position={[side * enemy.radius * 1.28, enemy.radius * 0.02, 0.08]}
          rotation={[0, 0, side * -0.18]}
          scale={[enemy.radius * 0.32, enemy.radius * 0.78, enemy.radius * 0.34]}
        >
          <T.MeshStandardMaterial
            color="#5a4630"
            emissive="#1f0e04"
            emissiveIntensity={0.16}
            flatShading
            metalness={0.78}
            roughness={0.32}
          />
        </T.Mesh>

        <T.Mesh
          geometry={enemyGunGeometry}
          castShadow
          receiveShadow
          position={[side * enemy.radius * 1.24, -enemy.radius * 0.76, 0.18]}
          scale={[enemy.radius * 0.42, enemy.radius * 0.24, enemy.radius * 0.36]}
        >
          <T.MeshStandardMaterial
            color="#28241f"
            flatShading
            metalness={0.78}
            roughness={0.38}
          />
        </T.Mesh>

        <T.Mesh
          geometry={enemyGunGeometry}
          castShadow
          receiveShadow
          position={[side * enemy.radius * 0.42, -enemy.radius * 1, 0.08]}
          scale={[enemy.radius * 0.38, enemy.radius * 0.3, enemy.radius * 0.48]}
        >
          <T.MeshStandardMaterial
            color="#34312c"
            flatShading
            metalness={0.72}
            roughness={0.38}
          />
        </T.Mesh>
      {/each}

      {#each gateKeeperPipes as pipe}
        <T.Mesh
          castShadow
          position={[pipe.side * enemy.radius, pipe.y * enemy.radius, -enemy.radius * 0.08]}
        >
          <T.CylinderGeometry
            args={[
              enemy.radius * 0.06,
              enemy.radius * 0.07,
              enemy.radius * pipe.height,
              10,
            ]}
          />
          <T.MeshStandardMaterial
            color="#6f512d"
            emissive="#241105"
            emissiveIntensity={0.14}
            metalness={0.86}
            roughness={0.28}
          />
        </T.Mesh>
      {/each}
    </T.Group>
  {:else}
    {#if stealthDistortionVisible}
      <T.Mesh
        geometry={enemyRingGeometry}
        position={[0, -enemy.radius + 0.08, 0]}
        renderOrder={13}
        rotation={[-Math.PI / 2, 0, animationNow * 0.0031]}
        scale={[
          enemy.radius * (0.42 + stealthReveal * 0.34),
          enemy.radius * (0.42 + stealthReveal * 0.34),
          1,
        ]}
      >
        <T.MeshBasicMaterial
          color={enemy.color}
          depthWrite={false}
          opacity={stealthShimmerOpacity}
          transparent
        />
      </T.Mesh>

      <T.Mesh
        geometry={stealthWingGeometry}
        renderOrder={14}
        scale={[
          enemy.radius * (0.58 + Math.sin(animationNow * 0.009) * 0.012),
          enemy.radius * (0.04 + Math.sin(animationNow * 0.007) * 0.006),
          enemy.radius * (0.72 + Math.cos(animationNow * 0.009) * 0.012),
        ]}
      >
        <T.MeshBasicMaterial
          color="#dffbff"
          depthWrite={false}
          opacity={0.003 + (stealthMoving ? 0.01 : 0) + stealthRevealCurve * 0.06}
          transparent
          wireframe
        />
      </T.Mesh>
    {/if}

    {#if stealthShowBody && isStealther}
      <T.Group
        rotation={[0, stealthDroneYaw, 0]}
        scale={[1, 0.92 + stealthReveal * 0.08, 1]}
      >
        <T.Mesh
          geometry={stealthWingGeometry}
          castShadow
          receiveShadow
          position={[0, enemy.radius * 0.02, -enemy.radius * 0.08]}
          scale={[enemy.radius * 1.5, enemy.radius * 0.1, enemy.radius * 0.52]}
        >
          <T.MeshStandardMaterial
            color={hitFlash ? "#fff4da" : "#17202d"}
            emissive={enemy.color}
            emissiveIntensity={0.08 + stealthReveal * 0.5}
            flatShading
            metalness={0.84}
            opacity={stealthBodyOpacity}
            roughness={0.12}
            transparent
          />
        </T.Mesh>

        <T.Mesh
          geometry={stealthWingGeometry}
          castShadow
          receiveShadow
          position={[0, enemy.radius * 0.13, enemy.radius * 0.02]}
          rotation={[0.08, Math.PI / 4, 0]}
          scale={[enemy.radius * 0.62, enemy.radius * 0.2, enemy.radius * 0.62]}
        >
          <T.MeshStandardMaterial
            color="#d7d8d2"
            emissive={enemy.color}
            emissiveIntensity={0.04 + stealthReveal * 0.28}
            flatShading
            metalness={0.5}
            opacity={stealthBodyOpacity}
            roughness={0.28}
            transparent
          />
        </T.Mesh>

        <T.Mesh
          geometry={stealthWingGeometry}
          castShadow
          receiveShadow
          position={[0, enemy.radius * 0.1, enemy.radius * 0.14]}
          scale={[enemy.radius * 0.42, enemy.radius * 0.16, enemy.radius * 1.3]}
        >
          <T.MeshStandardMaterial
            color="#1b2634"
            emissive={enemy.color}
            emissiveIntensity={0.08 + stealthReveal * 0.48}
            flatShading
            metalness={0.76}
            opacity={stealthBodyOpacity}
            roughness={0.14}
            transparent
          />
        </T.Mesh>

        {#each [-1, 1] as side}
          <T.Mesh
            geometry={stealthWingGeometry}
            castShadow
            receiveShadow
            position={[side * enemy.radius * 0.78, enemy.radius * 0.05, enemy.radius * 0.06]}
            rotation={[0, side * -0.55, side * 0.05]}
            scale={[
              enemy.radius * 1.02,
              enemy.radius * 0.08,
              enemy.radius * 0.36,
            ]}
          >
            <T.MeshStandardMaterial
              color="#2a3446"
              emissive={enemy.color}
              emissiveIntensity={0.05 + stealthReveal * 0.28}
              flatShading
              metalness={0.82}
              opacity={stealthBodyOpacity}
              roughness={0.16}
              transparent
            />
          </T.Mesh>

          <T.Mesh
            geometry={stealthWingGeometry}
            castShadow
            receiveShadow
            position={[side * enemy.radius * 0.7, 0, -enemy.radius * 0.34]}
            rotation={[0, side * -0.22, side * -0.12]}
            scale={[
              enemy.radius * 0.82,
              enemy.radius * 0.07,
              enemy.radius * 0.48,
            ]}
          >
            <T.MeshStandardMaterial
              color="#111a26"
              emissive={enemy.color}
              emissiveIntensity={0.06 + stealthReveal * 0.34}
              flatShading
              metalness={0.9}
              opacity={stealthBodyOpacity}
              roughness={0.1}
              transparent
            />
          </T.Mesh>

          <T.Mesh
            geometry={stealthWingGeometry}
            castShadow
            position={[side * enemy.radius * 1.18, enemy.radius * 0.02, -enemy.radius * 0.1]}
            rotation={[0, side * -0.08, side * -0.02]}
            scale={[
              enemy.radius * 0.18,
              enemy.radius * 0.12,
              enemy.radius * 1.18,
            ]}
          >
            <T.MeshStandardMaterial
              color="#221915"
              emissive={enemy.color}
              emissiveIntensity={0.04 + stealthReveal * 0.18}
              flatShading
              metalness={0.72}
              opacity={stealthBodyOpacity}
              roughness={0.2}
              transparent
            />
          </T.Mesh>

          <T.Mesh
            castShadow
            position={[side * enemy.radius * 1.18, enemy.radius * 0.03, enemy.radius * 0.58]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[enemy.radius * 0.22, enemy.radius * 0.34, enemy.radius * 0.22]}
          >
            <T.CylinderGeometry args={[1, 0.78, 1, 6]} />
            <T.MeshStandardMaterial
              color="#5c4c41"
              emissive={enemy.color}
              emissiveIntensity={0.04 + stealthReveal * 0.2}
              flatShading
              metalness={0.62}
              opacity={stealthBodyOpacity}
              roughness={0.22}
              transparent
            />
          </T.Mesh>

          <T.Mesh
            castShadow
            position={[side * enemy.radius * 1.18, enemy.radius * 0.03, -enemy.radius * 0.72]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[enemy.radius * 0.24, enemy.radius * 0.4, enemy.radius * 0.24]}
          >
            <T.CylinderGeometry args={[0.78, 1, 1, 6]} />
            <T.MeshStandardMaterial
              color="#2f3748"
              emissive={enemy.color}
              emissiveIntensity={0.04 + stealthReveal * 0.24}
              flatShading
              metalness={0.78}
              opacity={stealthBodyOpacity}
              roughness={0.18}
              transparent
            />
          </T.Mesh>

          <T.Mesh
            geometry={stealthWingGeometry}
            castShadow
            position={[side * enemy.radius * 0.62, enemy.radius * 0.3, -enemy.radius * 0.54]}
            rotation={[0.4, side * 0.26, side * 0.4]}
            scale={[
              enemy.radius * 0.14,
              enemy.radius * 0.36,
              enemy.radius * 0.28,
            ]}
          >
            <T.MeshStandardMaterial
              color="#121b24"
              emissive={enemy.color}
              emissiveIntensity={0.04 + stealthReveal * 0.24}
              flatShading
              metalness={0.86}
              opacity={stealthBodyOpacity}
              roughness={0.14}
              transparent
            />
          </T.Mesh>
        {/each}

        <T.Mesh
          geometry={stealthNoseGeometry}
          castShadow
          position={[0, enemy.radius * 0.1, enemy.radius * 0.94]}
          rotation={[Math.PI / 2, 0, Math.PI / 4]}
          scale={[
            enemy.radius * 0.22,
            enemy.radius * 0.58,
            enemy.radius * 0.22,
          ]}
        >
          <T.MeshStandardMaterial
            color={enemy.shotColor ?? enemy.color}
            emissive={enemy.shotColor ?? enemy.color}
            emissiveIntensity={0.28 + stealthReveal * 1.1}
            flatShading
            metalness={0.42}
            opacity={stealthBodyOpacity}
            roughness={0.1}
            transparent
          />
        </T.Mesh>
      </T.Group>
    {:else if stealthShowBody}
      <T.Mesh
        geometry={enemyBodyGeometry}
        castShadow
        receiveShadow
        scale={[enemy.radius, enemy.radius, enemy.radius]}
      >
        <T.MeshStandardMaterial
          color={hitFlash ? "#fff4da" : enemy.color}
          emissive={enemy.color}
          emissiveIntensity={bodyEmissiveIntensity}
          metalness={isStealther ? 0.72 : 0.16}
          opacity={stealthBodyOpacity}
          roughness={isStealther ? 0.08 : 0.36}
          transparent={isStealther}
        />
      </T.Mesh>
    {/if}

    {#if !isStealther}
      <T.Mesh
        geometry={enemyEyeGeometry}
        material={enemyEyeMaterial}
        castShadow
        position={[0, enemy.radius * 0.92, 0]}
        scale={[
          enemy.radius * 0.38,
          enemy.radius * 0.38,
          enemy.radius * 0.38,
        ]}
      />
    {/if}

    {#if enemy.behavior === "shooter" && !isStealther}
      <T.Mesh
        geometry={enemyGunGeometry}
        castShadow
        position={[0, enemy.radius * 0.34, enemy.radius * 0.8]}
        scale={[
          enemy.radius * 0.52,
          enemy.radius * 0.28,
          enemy.radius * 0.92,
        ]}
      >
        <T.MeshStandardMaterial
          color={enemy.shotColor ?? enemy.color}
          emissive={enemy.shotColor ?? enemy.color}
          emissiveIntensity={isStealther ? 0.18 + stealthReveal * 1.2 : 0.12}
          metalness={0.28}
          opacity={stealthBodyOpacity}
          roughness={0.26}
          transparent={isStealther}
        />
      </T.Mesh>
    {/if}
  {/if}

  {#each bomberSatellites as satellite (satellite.index)}
    <T.Mesh
      castShadow
      position={satellite.position}
      scale={[
        enemy.radius * (isMineHerald ? 0.14 : 0.24),
        enemy.radius * (isMineHerald ? 0.14 : 0.24),
        enemy.radius * (isMineHerald ? 0.14 : 0.24),
      ]}
      rotation={[0, animationNow * 0.0012, 0]}
    >
      {#if isMineHerald}
        <T.BoxGeometry args={[1, 1, 1]} />
      {:else}
        <T.SphereGeometry args={[1, 12, 12]} />
      {/if}
      <T.MeshStandardMaterial
        color={enemy.bombColor ?? enemy.color}
        emissive={enemy.bombColor ?? enemy.color}
        emissiveIntensity={0.6}
        metalness={0.22}
        roughness={0.32}
      />
    </T.Mesh>
  {/each}

  {#if stealthShowHealth}
    <T.Group position={[0, healthBarY, 0]}>
      <T.Mesh
        geometry={enemyHealthBarGeometry}
        material={enemyHealthBackMaterial}
        position={[0, 0, -0.02]}
      />

      <T.Mesh
        geometry={enemyHealthBarGeometry}
        material={enemyHealthFillMaterial}
        position={[-0.55 * (1 - enemy.hp / enemy.maxHp) * 0.5, 0, 0]}
        scale={[enemy.hp / enemy.maxHp, 1, 1]}
      />
    </T.Group>
  {/if}
</T.Group>
