<script module lang="ts">
  import {
    DoubleSide,
    ExtrudeGeometry,
    Path,
    RingGeometry,
    Shape,
  } from "three";

  const gearDepth = 0.16;
  const makeGearShape = () => {
    const shape = new Shape();
    const teeth = 14;

    for (let index = 0; index < teeth; index += 1) {
      const pitch = (Math.PI * 2) / teeth;
      const angle = index * pitch;
      const points = [
        [angle - pitch * 0.5, 0.72],
        [angle - pitch * 0.23, 0.72],
        [angle - pitch * 0.14, 1],
        [angle + pitch * 0.14, 1],
        [angle + pitch * 0.23, 0.72],
        [angle + pitch * 0.5, 0.72],
      ];

      for (const [pointAngle, radius] of points) {
        const x = Math.cos(pointAngle) * radius;
        const y = Math.sin(pointAngle) * radius;

        if (index === 0 && pointAngle === points[0][0]) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
    }

    const hole = new Path();

    hole.absellipse(0, 0, 0.24, 0.24, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    shape.closePath();

    return shape;
  };

  const gearBodyGeometry = new ExtrudeGeometry(makeGearShape(), {
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.02,
    bevelThickness: 0.025,
    depth: gearDepth,
    steps: 1,
  });
  gearBodyGeometry.computeVertexNormals();

  const outerRingGeometry = new RingGeometry(0.45, 0.64, 48);
  const innerRingGeometry = new RingGeometry(0.25, 0.38, 48);
</script>

<script lang="ts">
  import { T } from "@threlte/core";

  let {
    animationNow = 0,
    paired = true,
    scale = 1,
    speed = 1,
    trimColor = "#7b4b22",
    x = 0,
    y = 0,
  }: {
    animationNow?: number;
    paired?: boolean;
    scale?: number;
    speed?: number;
    trimColor?: string;
    x?: number;
    y?: number;
  } = $props();

  const angle = $derived(animationNow * 0.000_18 * speed);
</script>

<T.Group position={[x, y, 0.54]} scale={[scale, scale, scale]}>
  <T.Group rotation={[0, 0, angle]}>
    <T.Mesh castShadow geometry={gearBodyGeometry}>
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.78}
        roughness={0.32}
      />
    </T.Mesh>
    <T.Mesh geometry={outerRingGeometry} position={[0, 0, gearDepth + 0.01]}>
      <T.MeshStandardMaterial
        color="#20160d"
        metalness={0.5}
        roughness={0.4}
        side={DoubleSide}
      />
    </T.Mesh>
    <T.Mesh geometry={innerRingGeometry} position={[0, 0, gearDepth + 0.02]}>
      <T.MeshStandardMaterial
        color={trimColor}
        metalness={0.72}
        roughness={0.3}
        side={DoubleSide}
      />
    </T.Mesh>
  </T.Group>

  {#if paired}
    <T.Group
      position={[0.56, -0.42, 0]}
      rotation={[0, 0, -angle * 1.35]}
      scale={[0.56, 0.56, 0.56]}
    >
      <T.Mesh castShadow geometry={gearBodyGeometry}>
        <T.MeshStandardMaterial
          color={trimColor}
          metalness={0.78}
          roughness={0.32}
        />
      </T.Mesh>
      <T.Mesh geometry={outerRingGeometry} position={[0, 0, gearDepth + 0.01]}>
        <T.MeshStandardMaterial
          color="#20160d"
          metalness={0.5}
          roughness={0.4}
          side={DoubleSide}
        />
      </T.Mesh>
      <T.Mesh geometry={innerRingGeometry} position={[0, 0, gearDepth + 0.02]}>
        <T.MeshStandardMaterial
          color={trimColor}
          metalness={0.72}
          roughness={0.3}
          side={DoubleSide}
        />
      </T.Mesh>
    </T.Group>
  {/if}
</T.Group>
