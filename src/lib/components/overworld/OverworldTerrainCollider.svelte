<script lang="ts">
  import { T } from "@threlte/core";
  import { Collider, RigidBody } from "@threlte/rapier";

  interface Props {
    playableRadius: number;
  }

  let { playableRadius }: Props = $props();
</script>

<T.Group position={[0, -0.05, 0]}>
  <RigidBody type="fixed">
    <Collider
      shape="cuboid"
      args={[playableRadius + 6, 0.05, playableRadius + 6]}
    />
  </RigidBody>
</T.Group>
