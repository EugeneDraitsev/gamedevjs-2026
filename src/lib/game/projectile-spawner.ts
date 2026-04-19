import { spawnWeaponAttack } from "$lib/components/game/scene/projectile-spawn";
import type { WeaponBuild } from "$lib/config/weapon-graph";
import type { CombatStore } from "$lib/stores/combat.svelte";
import type { PlayerStore } from "$lib/stores/player.svelte";
import type { Vec3 } from "$lib/types/game";

interface SpawnArgs {
  combat: CombatStore;
  player: PlayerStore;
  position: Vec3;
  velocity: Vec3;
  weaponBuild: WeaponBuild;
}

export const spawnPlayerProjectile = ({
  combat,
  player,
  position,
  velocity,
  weaponBuild,
}: SpawnArgs) => {
  const attack = spawnWeaponAttack({
    activeEnemies: combat.enemies,
    activeProjectiles: combat.projectiles,
    attackCount: player.shotCount + 1,
    position,
    velocity,
    weaponBuild,
  });

  player.shotCount = attack.attackCount;
  combat.enemies = attack.activeEnemies;
  combat.addBeams(attack.beams);

  for (const popup of attack.damagePopups) {
    combat.popDamage(popup.amount, popup.position, "enemy");
  }

  combat.addProjectiles(attack.projectiles);
};
