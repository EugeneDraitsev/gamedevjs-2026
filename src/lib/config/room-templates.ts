import { z } from "zod";
import enemyTemplateData from "$lib/config/enemy-templates.json";
import roomTemplateData from "$lib/config/room-templates.json";

const roomKindSchema = z.enum([
  "boss",
  "challenge",
  "normal",
  "polygon",
  "secret",
  "shop",
  "treasure",
]);

const roomLayoutSchema = z.enum([
  "blocks",
  "boss-crucible",
  "boss-foundry",
  "catwalk",
  "floor",
  "gear-floor",
  "hexes",
  "lava-gauntlet",
  "lava-bridge",
  "lava-cross",
  "lava-lane",
  "lava-ring",
  "zigzag",
]);

const enemyTemplateSchema = z
  .object({
    behavior: z.enum(["rush", "shooter"]),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    hp: z.number().positive(),
    id: z.string().min(1),
    label: z.string().min(1),
    moveSpeed: z.number().positive(),
    preferredRange: z.number().positive().optional(),
    radius: z.number().positive(),
    shotColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    shotDamage: z.number().positive().optional(),
    shotIntervalMs: z.number().int().positive().optional(),
    shotSpeed: z.number().positive().optional(),
    touchDamage: z.number().positive(),
    touchIntervalMs: z.number().int().positive(),
  })
  .superRefine((template, context) => {
    const hasShotStats = Boolean(
      template.preferredRange &&
        template.shotColor &&
        template.shotDamage &&
        template.shotIntervalMs &&
        template.shotSpeed
    );

    if (template.behavior === "shooter" && !hasShotStats) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shooter enemies need shot stats.",
      });
    }
  });

const enemyTemplates = z.array(enemyTemplateSchema).parse(enemyTemplateData);

export type EnemyTemplate = z.infer<typeof enemyTemplateSchema>;
export type DungeonRoomKind = z.infer<typeof roomKindSchema>;

const enemyTemplateIds = new Set(enemyTemplates.map((template) => template.id));

const roomTemplateSchema = z
  .object({
    enemyCount: z.number().int().nonnegative(),
    enemyTemplateId: z.string().min(1).optional(),
    id: z.string().min(1),
    kind: roomKindSchema,
    label: z.string().min(1),
    layout: roomLayoutSchema,
    spawnPattern: z.enum([
      "arc",
      "boss",
      "crossfire",
      "line",
      "none",
      "pincer",
    ]),
  })
  .superRefine((template, context) => {
    if (template.spawnPattern !== "none" && !template.enemyTemplateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Combat rooms need an enemyTemplateId.",
        path: ["enemyTemplateId"],
      });
    }

    if (
      template.enemyTemplateId &&
      !enemyTemplateIds.has(template.enemyTemplateId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unknown enemy template.",
        path: ["enemyTemplateId"],
      });
    }
  });

export type RoomTemplate = z.infer<typeof roomTemplateSchema>;

export const roomTemplates = z
  .array(roomTemplateSchema)
  .parse(roomTemplateData);
export const roomTemplateById = Object.fromEntries(
  roomTemplates.map((template) => [template.id, template])
) as Record<string, RoomTemplate>;
export const enemyTemplateById = Object.fromEntries(
  enemyTemplates.map((template) => [template.id, template])
) as Record<string, EnemyTemplate>;
export const normalRoomTemplates = roomTemplates.filter(
  (template) => template.kind === "normal" && template.spawnPattern !== "none"
);
