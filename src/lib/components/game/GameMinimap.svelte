<script lang="ts">
  import { outsidePlan } from "$lib/game/outside-chunk-context";
  import { BIOME_COLORS, BIOME_ORDER } from "$lib/game/outside-chunk/types";
  import { getRevealedDoors } from "$lib/game/scene-layout";
  import { getGameSceneContext } from "$lib/stores/scene-context";

  interface GameMinimapProps {
    onOpenSettings?: () => void;
  }

  let { onOpenSettings }: GameMinimapProps = $props();

  const scene = getGameSceneContext();

  let expanded = $state(false);
  const outside = $derived(scene.currentRoomTemplate.layout === "outside-yard");
  const mapX = (x: number) =>
    ((x / scene.roomBounds.wallHalfWidth + 1) / 2) * 100;
  const mapY = (z: number) =>
    ((z / scene.roomBounds.wallHalfDepth + 1) / 2) * 100;

  // --- Outside chunk map ---
  // Render the plan's biome grid to an ImageBitmap-backed canvas,
  // then overlay roads / rivers / POIs on top in SVG for crisp lines.
  const plan = outsidePlan();
  let outsideCanvas: HTMLCanvasElement | null = $state(null);
  const renderBiomeCanvas = (cv: HTMLCanvasElement) => {
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const cols = plan.size.cols + 1;
    const rows = plan.size.rows + 1;
    cv.width = cols;
    cv.height = rows;
    const img = ctx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      const b = plan.grids.biome[i];
      const hex = BIOME_COLORS[BIOME_ORDER[b]];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const bl = parseInt(hex.slice(5, 7), 16);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = bl;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  $effect(() => {
    if (outsideCanvas) renderBiomeCanvas(outsideCanvas);
  });

  // Convert world (x, z) → minimap percent [0..100] using chunk bounds
  const chunkX = (x: number) =>
    ((x + plan.size.width * 0.5) / plan.size.width) * 100;
  const chunkY = (z: number) =>
    ((z + plan.size.depth * 0.5) / plan.size.depth) * 100;

  const toPolyline = (points: Array<[number, number]>) =>
    points.map(([x, z]) => `${chunkX(x).toFixed(1)},${chunkY(z).toFixed(1)}`).join(" ");

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
    {#if outside}
      <div class="outside-map" aria-hidden="true">
        <canvas bind:this={outsideCanvas} class="outside-biome"></canvas>
        <svg
          class="outside-overlay"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {#each plan.rivers as river, i (i)}
            <polyline
              class="mm-river"
              points={toPolyline(river.points)}
              stroke-width={Math.max(0.7, river.widthHalf * 0.6)}
            />
          {/each}
          {#each plan.roads as road, i (i)}
            <polyline
              class="mm-road"
              points={toPolyline(road.points)}
              stroke-width={Math.max(0.5, road.widthHalf * 0.7)}
            />
          {/each}
          {#each plan.pois as poi (poi.id)}
            <circle
              class="mm-poi"
              class:shrine={poi.kind === "shrine"}
              class:camp={poi.kind === "camp"}
              class:landmark={poi.kind === "landmark" || poi.kind === "lookout"}
              cx={chunkX(poi.x)}
              cy={chunkY(poi.z)}
              r={1.6}
            />
          {/each}
        </svg>
        <span
          class="outside-player"
          style:left={`${chunkX(scene.player.lastPosition[0])}%`}
          style:top={`${chunkY(scene.player.lastPosition[2])}%`}
          style:transform={`translate(-50%, -50%) rotate(${Math.PI - scene.player.facingYaw}rad)`}
        ></span>
        {#each scene.combat.enemies as enemy (enemy.id)}
          <span
            class="outside-enemy"
            style:left={`${chunkX(enemy.position[0])}%`}
            style:top={`${chunkY(enemy.position[2])}%`}
          ></span>
        {/each}
      </div>
    {:else}
      <div
        class="minimap-grid"
        style:grid-template-columns={`repeat(${scene.minimapBounds.columns}, var(--cell-size))`}
        style:grid-template-rows={`repeat(${scene.minimapBounds.rows}, var(--cell-size))`}
      >
        {#each scene.visibleMinimapRooms as room (room.id)}
          <div
            class="minimap-room"
            class:boss={room.kind === "boss"}
            class:outside={room.templateId === "outside-start"}
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
            {#if scene.pickups.countsByRoomId[room.id]?.gear}
              <span
                class="pickup-icon gear"
                aria-label="Gear pickup in room"
              ></span>
            {/if}
            {#if scene.pickups.countsByRoomId[room.id]?.heal}
              <span
                class="pickup-icon heal"
                aria-label="Heal pickup in room"
              ></span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
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
    gap: 0.65rem;
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

  .outside-map {
    position: relative;
    inline-size: 6.8rem;
    block-size: 13.8rem;
    overflow: hidden;
    background:
      linear-gradient(rgba(230, 236, 220, 0.09), rgba(230, 236, 220, 0.03)),
      rgba(52, 65, 54, 0.5);
    border: 1px solid rgba(236, 224, 196, 0.22);
    border-radius: 0.32rem;
  }

  .minimap.expanded .outside-map {
    inline-size: 9.1rem;
    block-size: 18.4rem;
  }

  .outside-biome {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    image-rendering: pixelated;
    opacity: 0.85;
  }

  .outside-overlay {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    fill: none;
    pointer-events: none;
  }

  .outside-overlay .mm-river {
    fill: none;
    stroke: rgba(118, 184, 200, 0.95);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .outside-overlay .mm-road {
    fill: none;
    stroke: rgba(227, 194, 130, 0.95);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1.3 0.9;
  }

  .outside-overlay .mm-poi {
    fill: rgba(236, 224, 168, 0.92);
    stroke: rgba(18, 22, 14, 0.6);
    stroke-width: 0.4;
  }

  .outside-overlay .mm-poi.shrine {
    fill: rgba(159, 214, 255, 0.95);
  }

  .outside-overlay .mm-poi.camp {
    fill: rgba(230, 172, 96, 0.95);
  }

  .outside-overlay .mm-poi.landmark {
    fill: rgba(217, 179, 255, 0.95);
  }

  .outside-player,
  .outside-enemy {
    position: absolute;
    display: block;
  }

  .outside-player {
    inline-size: 0.44rem;
    block-size: 0.44rem;
    background: rgba(255, 255, 255, 0.96);
    clip-path: polygon(50% 0, 100% 100%, 50% 78%, 0 100%);
  }

  .outside-enemy {
    inline-size: 0.32rem;
    block-size: 0.32rem;
    background: rgba(211, 92, 74, 0.9);
    border-radius: 999px;
    box-shadow: 0 0 0.28rem rgba(211, 92, 74, 0.58);
    transform: translate(-50%, -50%);
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

  .minimap-room.outside {
    background: rgba(112, 145, 111, 0.62);
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

  .pickup-icon {
    position: absolute;
    z-index: 2;
    inline-size: 0.42rem;
    block-size: 0.42rem;
    border-radius: 999px;
    box-shadow: 0 0 0.24rem currentColor;
  }

  .pickup-icon.gear {
    right: 0.05rem;
    bottom: 0.04rem;
    color: rgba(255, 206, 101, 0.92);
    background: currentColor;
    border: 1px solid rgba(64, 38, 12, 0.9);
  }

  .pickup-icon.heal {
    bottom: 0.04rem;
    left: 0.05rem;
    color: rgba(112, 226, 164, 0.92);
    background: currentColor;
  }

  .pickup-icon.heal::before,
  .pickup-icon.heal::after {
    position: absolute;
    inset: 50% auto auto 50%;
    content: "";
    background: rgba(10, 28, 18, 0.88);
    transform: translate(-50%, -50%);
  }

  .pickup-icon.heal::before {
    inline-size: 0.24rem;
    block-size: 0.06rem;
  }

  .pickup-icon.heal::after {
    inline-size: 0.06rem;
    block-size: 0.24rem;
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
