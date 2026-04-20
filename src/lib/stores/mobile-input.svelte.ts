export interface MoveVector {
  x: number;
  y: number;
}

export class MobileInputStore {
  active = $state(false);
  moveVector = $state<MoveVector>({ x: 0, y: 0 });
  aimVector = $state<MoveVector | null>(null);
  shootHeld = $state(false);
  jumpPulse = $state(0);
  meleePulse = $state(0);

  setMove(x: number, y: number) {
    this.moveVector = { x, y };
  }

  clearMove() {
    this.moveVector = { x: 0, y: 0 };
  }

  setAim(x: number, y: number) {
    this.aimVector = { x, y };
    this.shootHeld = true;
  }

  clearAim() {
    this.aimVector = null;
    this.shootHeld = false;
  }

  requestJump() {
    this.jumpPulse += 1;
  }

  requestMelee() {
    this.meleePulse += 1;
  }

  reset() {
    this.moveVector = { x: 0, y: 0 };
    this.aimVector = null;
    this.shootHeld = false;
  }
}

export const mobileInput = new MobileInputStore();
