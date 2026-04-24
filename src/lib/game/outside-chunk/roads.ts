// Stage 4 — road network
//
// A* on a weighted grid. Cost per cell is derived from slope and
// biome so paths prefer flat grass/forest ground and avoid water /
// cliffs. We pathfind between waypoints and mark the resulting cells
// as road (paints the biome grid).

import { cellToWorld } from "./heightmap";
import { makeNoise2D } from "./rng";
import { biomeIndex, type ChunkSize, type PolyPath } from "./types";

export interface RoadsParams {
  biome: Uint8Array; // mutated — road cells get tagged
  branchWidthHalf?: number; // optional narrower branches
  height: Float32Array;
  playable: Uint8Array; // A* only walks inside playable cells
  // Each route is a list of (x, z) world anchors; A* connects them
  // in sequence. Multiple routes = a network of branches.
  routes: [number, number][][];
  seedHash?: number;
  size: ChunkSize;
  slope: Float32Array;
  water: Uint8Array;
  widthHalf: number;
}

export interface RoadsResult {
  cost: Float32Array;
  paths: PolyPath[];
}

const cellIndex = (size: ChunkSize, col: number, row: number) =>
  row * (size.cols + 1) + col;

const worldToCell = (size: ChunkSize, x: number, z: number) => {
  const col = Math.max(
    0,
    Math.min(
      size.cols,
      Math.round(((x + size.width * 0.5) / size.width) * size.cols)
    )
  );
  const row = Math.max(
    0,
    Math.min(
      size.rows,
      Math.round(((z + size.depth * 0.5) / size.depth) * size.rows)
    )
  );
  return { col, row };
};

const smoothPath = (points: [number, number][]) => {
  if (points.length <= 1) {
    return points;
  }
  let out = points;
  for (let pass = 0; pass < 2; pass++) {
    const next: [number, number][] = [out[0]];
    for (let i = 0; i + 1 < out.length; i++) {
      const [ax, az] = out[i];
      const [bx, bz] = out[i + 1];
      next.push(
        [ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25],
        [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]
      );
    }
    const last = out.at(-1);
    if (last) {
      next.push(last);
    }
    out = next;
  }
  return out;
};

// Min-heap for A* open set
class Heap<T> {
  private readonly arr: T[] = [];
  private readonly less: (a: T, b: T) => boolean;
  constructor(less: (a: T, b: T) => boolean) {
    this.less = less;
  }
  get size() {
    return this.arr.length;
  }
  push(v: T) {
    this.arr.push(v);
    let i = this.arr.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.less(this.arr[i], this.arr[p])) {
        [this.arr[i], this.arr[p]] = [this.arr[p], this.arr[i]];
        i = p;
      } else {
        break;
      }
    }
  }
  pop(): T | undefined {
    if (!this.arr.length) {
      return undefined;
    }
    const top = this.arr[0];
    const last = this.arr.pop();
    if (last === undefined) {
      return top;
    }
    if (this.arr.length) {
      this.arr[0] = last;
      let i = 0;
      const n = this.arr.length;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < n && this.less(this.arr[l], this.arr[best])) {
          best = l;
        }
        if (r < n && this.less(this.arr[r], this.arr[best])) {
          best = r;
        }
        if (best === i) {
          break;
        }
        [this.arr[best], this.arr[i]] = [this.arr[i], this.arr[best]];
        i = best;
      }
    }
    return top;
  }
}

const stampRoadCells = (
  path: number[],
  size: ChunkSize,
  cols: number,
  biome: Uint8Array,
  reuseDiscount: Float32Array,
  roadIdx: number,
  waterIdx: number,
  widthHalf: number
) => {
  const stampR = Math.ceil((widthHalf / size.width) * size.cols) + 1;
  for (const idx of path) {
    const col = idx % cols;
    const row = (idx - col) / cols;
    for (let dr = -stampR; dr <= stampR; dr++) {
      for (let dc = -stampR; dc <= stampR; dc++) {
        const cc = col + dc;
        const rr = row + dr;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= size.rows + 1) {
          continue;
        }
        if (dc * dc + dr * dr > stampR * stampR) {
          continue;
        }
        const ci = rr * cols + cc;
        if (biome[ci] !== waterIdx) {
          biome[ci] = roadIdx;
        }
        reuseDiscount[ci] = 0.28;
      }
    }
  }
};

export const buildRoads = (p: RoadsParams): RoadsResult => {
  const { size, slope, water, biome } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const total = cols * rows;
  const roadIdx = biomeIndex("road");
  const waterIdx = biomeIndex("water");
  const roadNoise = makeNoise2D((p.seedHash ?? 1) + 0x4f_1b_bc_dc);

  // 1) Cost grid — inside playable zone only. Mountain cells get
  //    an astronomical cost so A* never climbs them.
  const cost = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    if (!p.playable[i]) {
      cost[i] = 1e6;
      continue;
    }
    const s = slope[i];
    const col = i % cols;
    const row = (i - col) / cols;
    const { x, z } = cellToWorld(size, col, row);
    let c = 1 + s * 4.2 + (roadNoise(x * 0.045, z * 0.045) + 1) * 2.2;
    if (water[i]) {
      c += 80;
    }
    const b = biome[i];
    if (b === biomeIndex("cliff") || b === biomeIndex("snow")) {
      c += 25;
    }
    if (b === biomeIndex("scree")) {
      c += 6;
    }
    cost[i] = c;
  }

  const paths: PolyPath[] = [];

  // Expose the discount map so later routes prefer reusing already
  // built roads (creates natural branching / shared trunk road).
  const reuseDiscount = new Float32Array(total);
  reuseDiscount.fill(1);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: A* loop is localized to keep heap, scores, and reconstruction together.
  const runAStar = (startIdx: number, goalIdx: number): number[] | null => {
    const gScore = new Float32Array(total);
    gScore.fill(Number.POSITIVE_INFINITY);
    gScore[startIdx] = 0;
    const cameFrom = new Int32Array(total);
    cameFrom.fill(-1);
    const open = new Heap<{ i: number; f: number }>((a, b) => a.f < b.f);
    const goalCol = goalIdx % cols;
    const goalRow = (goalIdx - goalCol) / cols;
    const heur = (i: number) => {
      const c = i % cols;
      const r = (i - c) / cols;
      return Math.hypot(c - goalCol, r - goalRow);
    };
    open.push({ i: startIdx, f: heur(startIdx) });
    const neighbours = [
      [-1, 0, 1],
      [1, 0, 1],
      [0, -1, 1],
      [0, 1, 1],
      [-1, -1, 1.41],
      [1, -1, 1.41],
      [-1, 1, 1.41],
      [1, 1, 1.41],
    ];
    while (open.size) {
      const next = open.pop();
      if (!next) {
        break;
      }
      const { i } = next;
      if (i === goalIdx) {
        const out: number[] = [];
        let cur = goalIdx;
        while (cur !== -1) {
          out.push(cur);
          cur = cameFrom[cur];
        }
        out.reverse();
        return out;
      }
      const col = i % cols;
      const row = (i - col) / cols;
      for (const [dx, dz, mul] of neighbours) {
        const nc = col + dx;
        const nr = row + dz;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
          continue;
        }
        const ni = nr * cols + nc;
        const step = cost[ni] * mul * reuseDiscount[ni];
        const tentative = gScore[i] + step;
        if (tentative < gScore[ni]) {
          gScore[ni] = tentative;
          cameFrom[ni] = i;
          open.push({ i: ni, f: tentative + heur(ni) });
        }
      }
    }
    return null;
  };

  const buildPathBetween = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    widthHalf: number
  ): Int32Array | null => {
    const s = worldToCell(size, ax, az);
    const g = worldToCell(size, bx, bz);
    const path = runAStar(
      cellIndex(size, s.col, s.row),
      cellIndex(size, g.col, g.row)
    );
    if (!path) {
      return null;
    }

    const stride = Math.max(1, Math.floor(path.length / 80));
    const points: [number, number][] = [];
    for (let i = 0; i < path.length; i += stride) {
      const idx = path[i];
      const col = idx % cols;
      const row = (idx - col) / cols;
      const { x, z } = cellToWorld(size, col, row);
      points.push([x, z]);
    }
    const lastIdx = path.at(-1);
    if (lastIdx === undefined) {
      return null;
    }
    const lastCol = lastIdx % cols;
    const lastRow = (lastIdx - lastCol) / cols;
    const { x: lx, z: lz } = cellToWorld(size, lastCol, lastRow);
    points.push([lx, lz]);

    paths.push({ points: smoothPath(points), widthHalf });

    stampRoadCells(
      path,
      size,
      cols,
      biome,
      reuseDiscount,
      roadIdx,
      waterIdx,
      widthHalf
    );
    return Int32Array.from(path);
  };

  // Pathfind each route (main spine + branches). Later routes see the
  // discount on earlier-road cells, so branches naturally fuse into
  // the main spine.
  for (const route of p.routes) {
    const width =
      route === p.routes[0]
        ? p.widthHalf
        : (p.branchWidthHalf ?? p.widthHalf * 0.75);
    for (let k = 0; k + 1 < route.length; k++) {
      const [ax, az] = route[k];
      const [bx, bz] = route[k + 1];
      buildPathBetween(ax, az, bx, bz, width);
    }
  }

  return { paths, cost };
};
