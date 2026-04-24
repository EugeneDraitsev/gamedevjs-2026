<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { onMount } from "svelte";
  import {
    CanvasTexture,
    DoubleSide,
    LinearFilter,
    SRGBColorSpace,
    type Texture,
    TextureLoader,
  } from "three";
  import crackHeavyUrl from "$lib/assets/generated/core-prison-dome-crack-heavy.png?url";
  import crackLightUrl from "$lib/assets/generated/core-prison-dome-crack-light.png?url";
  import type { Vec3 } from "$lib/types/game";

  interface Props {
    animationAge?: number;
    breakAge?: number;
    locked?: boolean;
    sealHits?: number;
    sealHitsRequired?: number;
  }

  interface DomeColliderSegment {
    position: Vec3;
    rotationY: number;
  }

  let {
    animationAge = 0,
    breakAge = 999,
    locked = true,
    sealHits = 0,
    sealHitsRequired = 3,
  }: Props = $props();

  const domeColliderSegments: DomeColliderSegment[] = [
    { position: [0, 1.08, 1.52], rotationY: 0 },
    { position: [1.08, 1.08, 1.08], rotationY: Math.PI / 4 },
    { position: [1.52, 1.08, 0], rotationY: Math.PI / 2 },
    { position: [1.08, 1.08, -1.08], rotationY: (Math.PI * 3) / 4 },
    { position: [0, 1.08, -1.52], rotationY: Math.PI },
    { position: [-1.08, 1.08, -1.08], rotationY: (-Math.PI * 3) / 4 },
    { position: [-1.52, 1.08, 0], rotationY: -Math.PI / 2 },
    { position: [-1.08, 1.08, 1.08], rotationY: -Math.PI / 4 },
  ];
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const breakFadeSeconds = 2.1;
  const glow = $derived(
    0.22 + Math.max(0, 1 - clamp01((animationAge - 0.1) / 1.45)) * 0.78
  );
  const ringProgress = $derived(clamp01((animationAge - 0.18) / 0.78));
  const ringOpacity = $derived(
    ringProgress > 0 && ringProgress < 1 ? 1 - ringProgress : 0
  );
  const ringScale = $derived(0.36 + ringProgress * 3.4);
  const sealRatio = $derived(Math.min(1, sealHits / sealHitsRequired));
  const sealPulse = $derived(
    Math.max(0, 1 - clamp01((animationAge - 0.2) / 1.4))
  );
  const breakProgress = $derived(clamp01(breakAge / breakFadeSeconds));
  const brokenShardOpacity = $derived(
    locked ? 0 : Math.max(0, 1 - breakAge / 2)
  );
  const restraintOpacity = $derived(
    locked ? 1 : Math.max(0, 1 - breakProgress)
  );
  const domeOpacity = $derived(
    locked
      ? 0.28 + sealPulse * 0.08 - sealRatio * 0.04
      : Math.max(0, 0.26 * (1 - breakProgress))
  );
  let instructionTexture = $state<CanvasTexture | null>(null);
  let crackTextureLight = $state<Texture | null>(null);
  let crackTextureHeavy = $state<Texture | null>(null);

  onMount(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = 3072;
    canvas.height = 1108;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const ink = "#211817";
    const dimInk = "rgba(33, 24, 23, 0.68)";
    const panel = "rgba(126, 74, 52, 0.5)";
    const keyFill = "rgba(115, 69, 52, 0.46)";
    const fontFamily =
      '"Comic Sans MS", "Segoe UI Black", "Arial Black", sans-serif';
    const drawText = (
      text: string,
      x: number,
      y: number,
      size: number,
      align: CanvasTextAlign = "center"
    ) => {
      context.font = `900 ${size}px ${fontFamily}`;
      context.textAlign = align;
      context.lineJoin = "round";
      context.lineWidth = Math.max(4, size * 0.08);
      context.strokeStyle = "rgba(7, 5, 5, 0.12)";
      context.strokeText(text, x + 4, y + 4);
      context.fillStyle = ink;
      context.fillText(text, x, y);
    };
    const sketchLine = (points: [number, number][], width = 10) => {
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);

      for (const point of points.slice(1)) {
        context.lineTo(point[0], point[1]);
      }

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = width;
      context.strokeStyle = ink;
      context.stroke();
    };
    const sketchBox = (x: number, y: number, width: number, height: number) => {
      sketchLine(
        [
          [x + 6, y + 3],
          [x + width - 4, y + 1],
          [x + width - 1, y + height - 5],
          [x + 3, y + height - 1],
          [x + 6, y + 3],
        ],
        10
      );
      sketchLine(
        [
          [x + 12, y + 10],
          [x + width - 10, y + 9],
          [x + width - 13, y + height - 12],
          [x + 11, y + height - 10],
        ],
        3
      );
    };
    const drawKey = (
      label: string,
      x: number,
      y: number,
      width = 132,
      size = 48
    ) => {
      context.fillStyle = keyFill;
      context.fillRect(x - width / 2, y - 46, width, 86);
      sketchBox(x - width / 2, y - 46, width, 86);
      drawText(label, x, y + 22, size);
    };
    const drawArrow = (from: [number, number], to: [number, number]) => {
      sketchLine([from, to], 8);
      const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
      const left = angle + Math.PI * 0.78;
      const right = angle - Math.PI * 0.78;

      sketchLine(
        [to, [to[0] + Math.cos(left) * 42, to[1] + Math.sin(left) * 42]],
        8
      );
      sketchLine(
        [to, [to[0] + Math.cos(right) * 42, to[1] + Math.sin(right) * 42]],
        8
      );
    };
    const drawOrbFigure = (x: number, y: number) => {
      context.beginPath();
      context.arc(x, y, 66, 0, Math.PI * 2);
      context.lineWidth = 12;
      context.strokeStyle = ink;
      context.stroke();
      context.fillStyle = "rgba(255, 210, 186, 0.34)";
      context.fill();
      context.beginPath();
      context.arc(x - 22, y - 12, 7, 0, Math.PI * 2);
      context.arc(x + 22, y - 12, 7, 0, Math.PI * 2);
      context.fillStyle = ink;
      context.fill();
      sketchLine(
        [
          [x - 25, y + 22],
          [x, y + 34],
          [x + 25, y + 22],
        ],
        7
      );
      sketchLine(
        [
          [x - 50, y + 78],
          [x - 74, y + 122],
        ],
        8
      );
      sketchLine(
        [
          [x + 50, y + 78],
          [x + 74, y + 122],
        ],
        8
      );
    };
    const drawMouse = (x: number, y: number, button: "left" | "right") => {
      context.beginPath();
      context.roundRect(x - 62, y - 86, 124, 172, 54);
      context.lineWidth = 12;
      context.strokeStyle = ink;
      context.stroke();
      sketchLine(
        [
          [x, y - 78],
          [x, y - 12],
        ],
        7
      );
      context.fillStyle = dimInk;
      context.fillRect(button === "left" ? x - 46 : x + 4, y - 70, 42, 58);
    };
    const drawSword = (x: number, y: number) => {
      sketchLine(
        [
          [x - 92, y + 86],
          [x + 86, y - 92],
        ],
        13
      );
      sketchLine(
        [
          [x - 108, y + 44],
          [x - 49, y + 105],
        ],
        12
      );
      context.beginPath();
      context.arc(x, y, 118, -0.84, 0.64);
      context.lineWidth = 12;
      context.strokeStyle = dimInk;
      context.stroke();
    };
    const drawGearPack = (x: number, y: number) => {
      sketchBox(x - 72, y - 78, 144, 136);
      sketchLine(
        [
          [x - 38, y - 78],
          [x - 24, y - 116],
          [x + 24, y - 116],
          [x + 38, y - 78],
        ],
        10
      );
      sketchLine(
        [
          [x - 42, y + 6],
          [x + 42, y + 6],
        ],
        7
      );
      sketchLine(
        [
          [x - 26, y - 30],
          [x - 26, y + 36],
        ],
        7
      );
      sketchLine(
        [
          [x + 26, y - 30],
          [x + 26, y + 36],
        ],
        7
      );
    };
    context.fillStyle = panel;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 56; index += 1) {
      const x = 90 + ((index * 157) % (canvas.width - 180));
      const y = 90 + ((index * 91) % (canvas.height - 180));

      context.beginPath();
      context.arc(x, y, 7 + (index % 5) * 3, 0, Math.PI * 2);
      context.fillStyle = "rgba(47, 25, 20, 0.07)";
      context.fill();
    }

    context.strokeStyle = "rgba(35, 25, 23, 0.42)";
    context.lineWidth = 22;
    context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);
    context.strokeStyle = "rgba(231, 142, 89, 0.22)";
    context.lineWidth = 8;
    context.strokeRect(82, 82, canvas.width - 164, canvas.height - 164);

    const columns = [390, 960, 1536, 2112, 2682];

    drawText("MOVE", columns[0], 210, 92);
    drawOrbFigure(columns[0], 405);
    drawArrow([columns[0], 290], [columns[0], 250]);
    drawArrow([columns[0], 525], [columns[0], 580]);
    drawArrow([columns[0] - 88, 405], [columns[0] - 164, 405]);
    drawArrow([columns[0] + 88, 405], [columns[0] + 164, 405]);
    drawKey("W", columns[0], 720);
    drawKey("A", columns[0] - 152, 855);
    drawKey("S", columns[0], 855);
    drawKey("D", columns[0] + 152, 855);

    drawText("SHOOT", columns[1], 210, 88);
    drawMouse(columns[1], 395, "left");
    sketchLine(
      [
        [columns[1] + 92, 390],
        [columns[1] + 170, 372],
        [columns[1] + 248, 390],
      ],
      8
    );
    context.beginPath();
    context.arc(columns[1] + 292, 390, 28, 0, Math.PI * 2);
    context.lineWidth = 9;
    context.strokeStyle = ink;
    context.stroke();
    drawKey("LMB", columns[1], 815, 184, 44);

    drawText("SWORD", columns[2], 210, 86);
    drawSword(columns[2], 405);
    drawKey("F / RMB", columns[2], 815, 258, 42);
    drawText("HIT x3", columns[2], 940, 42);

    drawText("JUMP", columns[3], 210, 90);
    drawOrbFigure(columns[3], 430);
    context.beginPath();
    context.arc(columns[3], 560, 132, Math.PI * 1.08, Math.PI * 1.92);
    context.lineWidth = 12;
    context.strokeStyle = dimInk;
    context.stroke();
    drawArrow([columns[3] - 120, 505], [columns[3] - 76, 430]);
    drawArrow([columns[3] + 76, 430], [columns[3] + 120, 505]);
    drawKey("SPACE", columns[3], 815, 232, 42);

    drawText("GEAR", columns[4], 210, 92);
    drawGearPack(columns[4], 405);
    drawOrbFigure(columns[4] + 155, 455);
    sketchLine(
      [
        [columns[4] + 62, 366],
        [columns[4] + 105, 338],
      ],
      7
    );
    sketchLine(
      [
        [columns[4] + 62, 430],
        [columns[4] + 108, 452],
      ],
      7
    );
    drawKey("E", columns[4], 815, 132, 48);
    drawText("INVENTORY", columns[4], 940, 42);

    const texture = new CanvasTexture(canvas);

    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    instructionTexture = texture;

    const crackLoader = new TextureLoader();
    const lightTexture = crackLoader.load(crackLightUrl);
    const heavyTexture = crackLoader.load(crackHeavyUrl);

    for (const crackTexture of [lightTexture, heavyTexture]) {
      crackTexture.colorSpace = SRGBColorSpace;
      crackTexture.minFilter = LinearFilter;
      crackTexture.magFilter = LinearFilter;
    }

    crackTextureLight = lightTexture;
    crackTextureHeavy = heavyTexture;

    return () => {
      texture.dispose();
      crackTextureLight?.dispose();
      crackTextureHeavy?.dispose();
    };
  });
</script>

{#if instructionTexture}
  <T.Mesh position={[0, 0.082, -3.45]} rotation={[-Math.PI / 2, 0, 0]}>
    <T.PlaneGeometry args={[10.4, 3.68]} />
    <T.MeshBasicMaterial
      map={instructionTexture}
      opacity={0.9}
      transparent
      toneMapped={false}
    />
  </T.Mesh>
{/if}

<T.Group position={[0, 0, 0.48]}>
  {#if locked}
    {#each domeColliderSegments as segment}
      <T.Group position={segment.position} rotation={[0, segment.rotationY, 0]}>
        <RigidBody type="fixed">
          <Collider shape="cuboid" args={[0.78, 1.34, 0.12]} />
        </RigidBody>
      </T.Group>
    {/each}
    <T.Group position={[0, 1.74, 0]}>
      <RigidBody type="fixed">
        <Collider shape="cuboid" args={[1.14, 0.16, 1.14]} />
      </RigidBody>
    </T.Group>
  {/if}

  <T.PointLight
    color="#8ff7ff"
    distance={5.4}
    intensity={0.95 + glow * 1.2}
    position={[0, 1.05, 0.24]}
  />

  <T.Mesh
    receiveShadow
    position={[0, 0.086, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.CircleGeometry args={[1.56, 64]} />
    <T.MeshBasicMaterial
      color="#0a43a8"
      opacity={0.075 + sealPulse * 0.04}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    receiveShadow
    position={[0, 0.095, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.RingGeometry args={[1.18, 1.33, 64]} />
    <T.MeshBasicMaterial
      color="#42dfff"
      opacity={(0.42 + sealPulse * 0.22) * restraintOpacity}
      transparent
    />
  </T.Mesh>

  <T.Mesh
    receiveShadow
    position={[0, 0.105, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
    <T.RingGeometry args={[1.47, 1.53, 64]} />
    <T.MeshBasicMaterial
      color="#ffd166"
      opacity={(0.22 + sealPulse * 0.1) * restraintOpacity}
      transparent
    />
  </T.Mesh>

  <T.Mesh position={[0, 0.08, 0]}>
    <T.SphereGeometry args={[1.54, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
    <T.MeshStandardMaterial
      color="#06194f"
      depthWrite={false}
      emissive="#148bff"
      emissiveIntensity={0.58 + sealPulse * 0.34}
      metalness={0.12}
      opacity={domeOpacity + 0.04}
      roughness={0.1}
      side={DoubleSide}
      transparent
    />
  </T.Mesh>

  {#if crackTextureLight && sealHits > 0}
    <T.Mesh position={[0, 1.34, 1.0]} rotation={[-0.58, 0, 0]} renderOrder={12}>
      <T.PlaneGeometry args={[2.56, 1.92]} />
      <T.MeshBasicMaterial
        map={crackTextureLight}
        depthTest={false}
        depthWrite={false}
        opacity={(sealHits > 1 ? 0.96 : 0.84) * restraintOpacity}
        side={DoubleSide}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  {/if}

  {#if crackTextureHeavy && sealHits > 1}
    <T.Mesh
      position={[0, 1.35, 1.02]}
      rotation={[-0.58, 0, -0.08]}
      renderOrder={13}
    >
      <T.PlaneGeometry args={[2.96, 2.22]} />
      <T.MeshBasicMaterial
        map={crackTextureHeavy}
        depthTest={false}
        depthWrite={false}
        opacity={(sealHits > 2 ? 0.96 : 0.78) * restraintOpacity}
        side={DoubleSide}
        toneMapped={false}
        transparent
      />
    </T.Mesh>
  {/if}

  <T.Mesh position={[0, 0.081, 0]}>
    <T.SphereGeometry args={[1.56, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
    <T.MeshBasicMaterial
      color="#8ff7ff"
      opacity={0.035 * restraintOpacity}
      transparent
      wireframe
    />
  </T.Mesh>

  {#each [0, 1, 2] as hitIndex}
    <T.Mesh position={[(hitIndex - 1) * 0.32, 0.16, 1.34]}>
      <T.SphereGeometry args={[0.095, 14, 10]} />
      <T.MeshStandardMaterial
        color={sealHits > hitIndex ? "#2a1811" : "#8ff7ff"}
        emissive={sealHits > hitIndex ? "#ff8f42" : "#8ff7ff"}
        emissiveIntensity={sealHits > hitIndex ? 0.18 : 0.72 + sealPulse}
        metalness={0.36}
        roughness={0.18}
      />
    </T.Mesh>
  {/each}

  <T.Mesh position={[0, 0.78, 1.18]}>
    <T.SphereGeometry args={[0.18, 18, 12]} />
    <T.MeshStandardMaterial
      color={locked ? "#8ff7ff" : "#ffd166"}
      emissive={locked ? "#8ff7ff" : "#ffd166"}
      emissiveIntensity={locked ? 0.72 + sealPulse : 1.4}
      metalness={0.36}
      opacity={locked ? 0.8 - sealRatio * 0.32 : brokenShardOpacity}
      roughness={0.18}
      transparent
    />
  </T.Mesh>
</T.Group>

<T.Mesh
  position={[0, 0.075, 0.48]}
  rotation={[-Math.PI / 2, 0, 0]}
  scale={[ringScale, ringScale, ringScale]}
>
  <T.RingGeometry args={[0.72, 0.96, 64]} />
  <T.MeshBasicMaterial
    color="#ffd166"
    opacity={ringOpacity * 0.52}
    transparent
  />
</T.Mesh>
