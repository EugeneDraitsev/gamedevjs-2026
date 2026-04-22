<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import type { Group } from "three";
  import type { OverworldHealthPickup } from "$lib/config/overworld-layout";
  import { playerMaxHealth } from "$lib/game/scene-layout";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  interface Props {
    data: OverworldHealthPickup;
    onCollected: () => void;
  }

  let { data, onCollected }: Props = $props();

  const scene = getGameSceneContext();

  const pickupRadius = 1.1;
  const pickupRadiusSq = pickupRadius * pickupRadius;

  let bob = $state.raw<Group>();
  let time = 0;

  useTask((delta) => {
    time += delta;
    if (bob) {
      bob.position.y = 0.6 + Math.sin(time * 2.4) * 0.16;
      bob.rotation.y += delta * 1.8;
    }
    const pos = scene.player.lastPosition;
    const dx = pos[0] - data.position[0];
    const dz = pos[2] - data.position[2];
    if (
      dx * dx + dz * dz < pickupRadiusSq &&
      scene.player.health < playerMaxHealth
    ) {
      scene.player.health = Math.min(
        playerMaxHealth,
        scene.player.health + data.amount
      );
      onCollected();
    }
  });
</script>

<T.Group position={data.position}>
  <T.PointLight color="#ff9fb0" intensity={1.1} distance={3} />
  <T.Group bind:ref={bob}>
    <!-- glowing red cross -->
    <T.Mesh castShadow>
      <T.BoxGeometry args={[0.56, 0.2, 0.2]} />
      <T.MeshStandardMaterial
        color="#ff4a68"
        emissive="#ff4a68"
        emissiveIntensity={1.6}
      />
    </T.Mesh>
    <T.Mesh castShadow>
      <T.BoxGeometry args={[0.2, 0.2, 0.56]} />
      <T.MeshStandardMaterial
        color="#ff4a68"
        emissive="#ff4a68"
        emissiveIntensity={1.6}
      />
    </T.Mesh>
  </T.Group>
</T.Group>
