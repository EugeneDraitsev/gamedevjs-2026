import type { EnemyTemplate } from "$lib/config/room-templates";
import type { ActiveEnemy, Vec3 } from "$lib/types/game";

export const enemyFromTemplate = (
  template: EnemyTemplate,
  position: Vec3,
  id: string
): ActiveEnemy => ({
  behavior: template.behavior,
  color: template.color,
  hp: template.hp,
  id,
  knockbackVelocity: [0, 0, 0],
  lastHitAt: 0,
  lastShotAt: 0,
  maxHp: template.hp,
  moveSpeed: template.moveSpeed,
  position,
  preferredRange: template.preferredRange,
  radius: template.radius,
  shotColor: template.shotColor,
  shotDamage: template.shotDamage,
  shotIntervalMs: template.shotIntervalMs,
  shotSpeed: template.shotSpeed,
  touchDamage: template.touchDamage,
  touchIntervalMs: template.touchIntervalMs,
});
