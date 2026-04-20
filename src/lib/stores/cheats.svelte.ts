export class CheatsStore {
  infiniteHealth = $state(false);
  oneHitKill = $state(false);
  revealMapNonce = $state(0);

  requestRevealMap() {
    this.revealMapNonce += 1;
  }

  reset() {
    this.infiniteHealth = false;
    this.oneHitKill = false;
    this.revealMapNonce = 0;
  }
}

export const cheats = new CheatsStore();
