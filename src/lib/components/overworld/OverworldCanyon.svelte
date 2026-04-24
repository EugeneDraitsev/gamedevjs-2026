<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";
  import { CylinderGeometry } from "three";
  import { createCanyonMaterial } from "./materials/canyon-material";

  interface Props {
    barrierSegments?: number;
    innerRadius?: number;
    thickness?: number;
    wallHeight?: number;
  }

  let {
    innerRadius = 60,
    wallHeight = 24,
    thickness = 12,
    barrierSegments = 48,
  }: Props = $props();

  const createMaterial = () => {
    const result = createCanyonMaterial();
    result.uniforms.uWallHeight.value = wallHeight;
    result.uniforms.uInnerRadius.value = innerRadius;
    return result.material;
  };

  const material = createMaterial();

  const createWallGeometry = () => {
    // Inner canyon wall: high-segment cylinder, open-ended (no caps), heavily displaced in shader
    const innerRadiusTop = innerRadius + thickness * 0.2;
    const innerWallGeo = new CylinderGeometry(
      innerRadiusTop,
      innerRadius,
      wallHeight,
      180,
      40,
      true
    );
    innerWallGeo.translate(0, wallHeight / 2, 0);

    // Outer canyon back — lower-res cylinder further out, provides depth behind silhouette
    const outerWallGeo = new CylinderGeometry(
      innerRadius + thickness * 1.8,
      innerRadius + thickness,
      wallHeight * 0.85,
      90,
      20,
      true
    );
    outerWallGeo.translate(0, (wallHeight * 0.85) / 2 - 0.5, 0);

    return { innerWallGeo, outerWallGeo };
  };

  const createBarrierPieces = () => {
    const arcLen = (2 * Math.PI * innerRadius) / barrierSegments;
    const barrierPieces = Array.from(
      { length: barrierSegments },
      (_, index) => {
        const angle = (index / barrierSegments) * Math.PI * 2;
        return {
          angle,
          id: `canyon-barrier-${index}`,
          x: Math.cos(angle) * (innerRadius + 0.3),
          z: Math.sin(angle) * (innerRadius + 0.3),
        };
      }
    );
    return { arcLen, barrierPieces };
  };

  const { innerWallGeo, outerWallGeo } = createWallGeometry();
  const { arcLen, barrierPieces } = createBarrierPieces();
</script>

<!-- main inner canyon wall with shader displacement -->
<T.Mesh geometry={innerWallGeo} {material} castShadow receiveShadow />

<!-- back layer for extra silhouette depth -->
<T.Mesh geometry={outerWallGeo} {material} receiveShadow />

<!-- Colliders form an inescapable ring -->
{#each barrierPieces as piece (piece.id)}
  <T.Group
    position={[piece.x, wallHeight / 2, piece.z]}
    rotation={[0, -piece.angle + Math.PI / 2, 0]}
  >
    <RigidBody type="fixed">
      <Collider shape="cuboid" args={[arcLen * 0.6, wallHeight / 2, 0.6]} />
    </RigidBody>
  </T.Group>
{/each}
