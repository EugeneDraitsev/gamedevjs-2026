<script lang="ts">
  import { getRevealedDoors } from "$lib/game/scene-layout";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  interface GameMinimapProps {
    onOpenSettings?: () => void;
  }

  let { onOpenSettings }: GameMinimapProps = $props();

  const scene = getGameSceneContext();

  let expanded = $state(false);

  const toggleExpanded = () => {
    expanded = !expanded;
  };
</script>

<div class="minimap-wrap" style:opacity={scene.settings.minimapOpacity}>
  <div
    class="minimap"
    class:expanded
    role="button"
    tabindex="0"
    aria-label="Toggle minimap size"
    onclick={toggleExpanded}
    onkeydown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleExpanded();
      }
    }}
  >
    <div
      class="minimap-grid"
      style:grid-template-columns={`repeat(${scene.minimapBounds.columns}, var(--cell-size))`}
      style:grid-template-rows={`repeat(${scene.minimapBounds.rows}, var(--cell-size))`}
    >
      {#each scene.visibleMinimapRooms as room (room.id)}
        <div
          class="minimap-room"
          class:boss={room.kind === "boss"}
          class:polygon={room.kind === "polygon"}
          class:current={room.id === scene.currentRoom.id}
          class:sealed={!scene.isRoomUnlocked(room)}
          class:treasure={room.kind === "treasure"}
          style:grid-column={room.grid[0] - scene.minimapBounds.minX + 1}
          style:grid-row={room.grid[1] - scene.minimapBounds.minY + 1}
        >
          {#each getRevealedDoors(room) as direction}
            <span
              class={`door ${direction}`}
              class:locked={!scene.isRoomUnlocked(room)}
            ></span>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <button
    type="button"
    class="settings-button"
    aria-label="Open settings"
    onclick={onOpenSettings}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.14 12.94a7.49 7.49 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.48 7.48 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.48 7.48 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.49.38 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.48 7.48 0 0 0 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"
        fill="currentColor"
      />
    </svg>
    <span class="settings-hint" aria-hidden="true">Esc</span>
  </button>
</div>

<style>
  .minimap-wrap {
    position: fixed;
    top: 1.5rem;
    right: 1.35rem;
    z-index: 8;
    display: flex;
    gap: 0.45rem;
    align-items: flex-start;
  }

  .minimap {
    --map-fg: rgba(204, 212, 220, 0.34);
    --map-fg-strong: rgba(236, 224, 196, 0.72);
    --cell-size: 1.09rem;
    --cell-gap: 0.54rem;
    padding: 0.55rem 0.1rem 0.1rem;
    cursor: pointer;
    background: transparent;
    border: 0;
    filter: drop-shadow(0 0.18rem 0.4rem rgba(0, 0, 0, 0.55));
  }

  .minimap:focus-visible {
    outline: 2px solid rgba(255, 220, 170, 0.8);
    outline-offset: 2px;
  }

  .minimap-grid {
    position: relative;
    display: grid;
    gap: var(--cell-gap);
  }

  .minimap-room {
    position: relative;
    box-sizing: border-box;
    inline-size: var(--cell-size);
    block-size: var(--cell-size);
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

  .settings-button {
    position: relative;
    display: grid;
    place-items: center;
    padding: 0.42rem;
    color: rgba(236, 224, 196, 0.82);
    cursor: pointer;
    background: rgba(3, 5, 8, 0.28);
    border: 1px solid rgba(236, 224, 196, 0.14);
    border-radius: 0.5rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0.28rem 0.7rem rgba(0, 0, 0, 0.24);
    transition:
      color 0.16s ease-out,
      border-color 0.16s ease-out,
      transform 0.12s ease-out;
  }

  .settings-button:hover {
    color: rgba(255, 236, 196, 1);
    border-color: rgba(255, 220, 170, 0.44);
  }

  .settings-button:active {
    transform: scale(0.92);
  }

  .settings-button:focus-visible {
    outline: 2px solid rgba(255, 220, 170, 0.8);
    outline-offset: 2px;
  }

  .settings-button svg {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    pointer-events: none;
  }

  .settings-hint {
    position: absolute;
    inset-block-end: -0.5rem;
    inset-inline-end: -0.55rem;
    display: grid;
    place-items: center;
    min-inline-size: 1.15rem;
    block-size: 0.85rem;
    padding: 0 0.26rem;
    font-size: 0.5rem;
    font-weight: 800;
    color: rgba(255, 236, 204, 0.95);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    pointer-events: none;
    background: rgba(10, 8, 12, 0.98);
    border: 1px solid rgba(236, 224, 196, 0.5);
    border-radius: 0.28rem;
    box-shadow:
      0 0 0 1.5px rgba(10, 8, 12, 0.65),
      0 0.16rem 0.35rem rgba(0, 0, 0, 0.55);
  }

  @media (max-width: 700px) {
    .minimap-wrap {
      top: 0.85rem;
      right: 0.85rem;
      gap: 0;
    }

    .minimap {
      --cell-size: 0.7rem;
      --cell-gap: 0.32rem;
    }

    .minimap.expanded {
      --cell-size: 1.09rem;
      --cell-gap: 0.54rem;
    }

    .settings-button {
      display: none;
    }
  }

  @media (pointer: coarse) {
    .settings-hint {
      display: none;
    }
  }
</style>
