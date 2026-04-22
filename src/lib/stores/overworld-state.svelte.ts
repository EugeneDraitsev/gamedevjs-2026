class OverworldStateStore {
  activePoiId = $state<string | null>(null);
  enterNonce = $state(0);

  requestEnter() {
    this.enterNonce += 1;
  }
}

export const overworldState = new OverworldStateStore();
