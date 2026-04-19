<script lang="ts">
  import type { DungeonLayout, DungeonRoom } from "$lib/config/dungeon-layout";
  import { getRevealedDoors } from "$lib/game/scene-layout";
  import type { MinimapBounds } from "$lib/game/types";

  interface GameMinimapProps {
    currentRoom: DungeonRoom;
    dungeon: DungeonLayout;
    exploredRoomSet: Set<string>;
    isRoomUnlocked: (room: DungeonRoom) => boolean;
    minimapBounds: MinimapBounds;
    roomList: DungeonRoom[];
  }

  let {
    currentRoom,
    dungeon,
    exploredRoomSet,
    isRoomUnlocked,
    minimapBounds,
    roomList,
  }: GameMinimapProps = $props();
</script>

<div class="minimap">
  <div
    class="minimap-grid"
    style:grid-template-columns={`repeat(${minimapBounds.columns}, 1.09rem)`}
    style:grid-template-rows={`repeat(${minimapBounds.rows}, 1.09rem)`}
  >
    {#each roomList as room (room.id)}
      {#if exploredRoomSet.has(room.id)}
        <div
          class="minimap-room"
          class:boss={room.kind === "boss"}
          class:polygon={room.kind === "polygon"}
          class:current={room.id === currentRoom.id}
          class:sealed={!isRoomUnlocked(room)}
          class:treasure={room.kind === "treasure"}
          style:grid-column={room.grid[0] - minimapBounds.minX + 1}
          style:grid-row={room.grid[1] - minimapBounds.minY + 1}
        >
          {#each getRevealedDoors(room) as direction}
            <span
              class={`door ${direction}`}
              class:locked={!isRoomUnlocked(room)}
            ></span>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .minimap {
    --map-fg: rgba(204, 212, 220, 0.34);
    --map-fg-strong: rgba(236, 224, 196, 0.72);
    position: fixed;
    top: 1.45rem;
    right: 1.1rem;
    z-index: 8;
    padding: 0.32rem;
    background: rgba(3, 5, 8, 0.14);
    border: 1px solid rgba(236, 224, 196, 0.1);
    border-radius: 0.5rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0.32rem 0.8rem rgba(0, 0, 0, 0.18);
    opacity: 0.78;
  }

  .minimap-grid {
    position: relative;
    display: grid;
    gap: 0.54rem;
  }

  .minimap-room {
    position: relative;
    box-sizing: border-box;
    inline-size: 1.09rem;
    block-size: 1.09rem;
    background: var(--map-fg);
    border: 1px solid rgba(236, 224, 196, 0.14);
    border-radius: 0.28rem;
  }

  .minimap-room.current {
    z-index: 1;
    outline: 2px solid rgba(255, 255, 255, 0.96);
    outline-offset: 0;
    border-color: rgba(255, 255, 255, 0.92);
    box-shadow: 0 0 0.7rem rgba(255, 255, 255, 0.14);
  }

  .minimap-room.boss {
    background: rgba(183, 66, 58, 0.62);
    border-color: rgba(255, 170, 160, 0.3);
  }

  .minimap-room.treasure {
    background: rgba(205, 168, 82, 0.72);
    border-color: rgba(255, 229, 154, 0.32);
  }

  .minimap-room.polygon {
    background: rgba(204, 212, 220, 0.4);
  }

  .minimap-room.sealed {
    box-shadow: inset 0 0 0 1px rgba(185, 102, 83, 0.34);
  }

  .door {
    position: absolute;
    background: var(--map-fg-strong);
  }

  .door.locked {
    background: rgba(185, 102, 83, 0.72);
  }

  .door.north,
  .door.south {
    left: 50%;
    inline-size: 0.12rem;
    block-size: 0.34rem;
    transform: translateX(-50%);
  }

  .door.east,
  .door.west {
    top: 50%;
    inline-size: 0.34rem;
    block-size: 0.12rem;
    transform: translateY(-50%);
  }

  .door.north {
    top: calc(-0.34rem - 0.08rem);
  }

  .door.south {
    bottom: calc(-0.34rem - 0.08rem);
  }

  .door.east {
    right: calc(-0.34rem - 0.08rem);
  }

  .door.west {
    left: calc(-0.34rem - 0.08rem);
  }

  @media (max-width: 700px) {
    .minimap {
      top: 0.95rem;
      right: 0.9rem;
      opacity: 0.62;
      transform: scale(0.92);
      transform-origin: top right;
    }
  }
</style>
