export class CrosshairStore {
  x = $state(0);
  y = $state(0);

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
