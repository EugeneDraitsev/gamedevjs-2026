export class CheatsStore {
  infiniteHealth = $state(false);
  giveAllModulesNonce = $state(0);
  oneHitKill = $state(false);
  revealMapNonce = $state(0);

  requestGiveAllModules() {
    this.giveAllModulesNonce += 1;
  }

  requestRevealMap() {
    this.revealMapNonce += 1;
  }

  reset() {
    this.giveAllModulesNonce = 0;
    this.infiniteHealth = false;
    this.oneHitKill = false;
    this.revealMapNonce = 0;
  }
}

export const cheats = new CheatsStore();
