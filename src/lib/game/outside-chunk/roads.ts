// Stage 4 — road network
//
// A* on a weighted grid. Cost per cell is derived from slope and
// biome so paths prefer flat grass/forest ground and avoid water /
// cliffs. We pathfind between waypoints and mark the resulting cells
// as road (paints the biome grid).

import { cellToWorld } from "./heightmap";
import { biomeIndex, type ChunkSize, type PolyPath } from "./types";

export interface RoadsParams {
  size: ChunkSize;
  height: Float32Array;
  slope: Float32Array;
  biome: Uint8Array; // mutated — road cells get tagged
  water: Uint8Array;
  waypoints: Array<[number, number]>; // world-space (x, z) anchors in order
  widthHalf: number; // world units
}

export interface RoadsResult {
  paths: PolyPath[];
  cost: Float32Array;
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

// Min-heap for A* open set
class Heap<T> {
  private arr: T[] = [];
  constructor(private less: (a: T, b: T) => boolean) {}
  get size() {
    return this.arr.length;
  }
  push(v: T) {
    this.arr.push(v);
    let i = this.arr.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.less(this.arr[i], this.arr[p])) {
        [this.arr[i], this.arr[p]] = [this.arr[p], this.arr[i]];
        i = p;
      } else break;
    }
  }
  pop(): T | undefined {
    if (!this.arr.length) return undefined;
    const top = this.arr[0];
    const last = this.arr.pop()!;
    if (this.arr.length) {
      this.arr[0] = last;
      let i = 0;
      const n = this.arr.length;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < n && this.less(this.arr[l], this.arr[best])) best = l;
        if (r < n && this.less(this.arr[r], this.arr[best])) best = r;
        if (best !== i) {
          [this.arr[best], this.arr[i]] = [this.arr[i], this.arr[best]];
          i = best;
        } else break;
      }
    }
    return top;
  }
}

export const buildRoads = (p: RoadsParams): RoadsResult => {
  const { size, slope, water, biome } = p;
  const cols = size.cols + 1;
  const rows = size.rows + 1;
  const total = cols * rows;
  const roadIdx = biomeIndex("road");

  // 1) Cost grid — penalise steep terrain, water and cliffs.
  const cost = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const s = slope[i];
    let c = 1 + s * 4.2;
    if (water[i]) c += 20;
    const b = biome[i];
    if (b === biomeIndex("cliff") || b === biomeIndex("snow")) c += 25;
    if (b === biomeIndex("scree")) c += 6;
    cost[i] = c;
  }

  const paths: PolyPath[] = [];
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
      const { i } = open.pop()!;
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
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const ni = nr * cols + nc;
        const step = cost[ni] * mul;
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

  // 2) Pathfind between consecutive waypoints, paint road cells.
  for (let k = 0; k + 1 < p.waypoints.length; k++) {
    const [ax, az] = p.waypoints[k];
    const [bx, bz] = p.waypoints[k + 1];
    const s = worldToCell(size, ax, az);
    const g = worldToCell(size, bx, bz);
    const path = runAStar(cellIndex(size, s.col, s.row), cellIndex(size, g.col, g.row));
    if (!path) continue;

    // simplify: keep every Nth point for a smoother polyline
    const stride = Math.max(1, Math.floor(path.length / 80));
    const points: Array<[number, number]> = [];
    for (let i = 0; i < path.length; i += stride) {
      const idx = path[i];
      const col = idx % cols;
      const row = (idx - col) / cols;
      const { x, z } = cellToWorld(size, col, row);
      points.push([x, z]);
    }
    // always include the endpoint
    const lastIdx = path[path.length - 1];
    const lastCol = lastIdx % cols;
    const lastRow = (lastIdx - lastCol) / cols;
    const { x: lx, z: lz } = cellToWorld(size, lastCol, lastRow);
    points.push([lx, lz]);

    paths.push({ points, widthHalf: p.widthHalf });

    // stamp road cells (widen the footprint a bit)
    const stampR = Math.ceil((p.widthHalf / size.width) * size.cols) + 1;
    for (const idx of path) {
      const col = idx % cols;
      const row = (idx - col) / cols;
      for (let dr = -stampR; dr <= stampR; dr++) {
        for (let dc = -stampR; dc <= stampR; dc++) {
          const cc = col + dc;
          const rr = row + dr;
          if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
          if (dc * dc + dr * dr > stampR * stampR) continue;
          const ci = rr * cols + cc;
          // Don't overwrite water biome — roads cross water via implied bridges.
          if (biome[ci] !== biomeIndex("water")) biome[ci] = roadIdx;
        }
      }
    }
  }

  return { paths, cost };
};
