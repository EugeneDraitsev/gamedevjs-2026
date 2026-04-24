# AGENTS.md

## Project Shape
- This is a browser-only SvelteKit game: `src/routes/+layout.ts` sets `ssr = false`, so gameplay code can rely on `window`, `localStorage`, `performance`, and `requestAnimationFrame`.
- Route flow is simple but stateful: `/` mounts `MainMenu`, `/settings` edits persisted scene settings, and `/game/[seed]` renders the actual run. `GameApp.svelte` also uses `?continue=1` and preserves `?debug=true` across navigation.
- `src/lib/components/app/GameApp.svelte` owns long-lived run state: floor index, collected artifacts, gear, loose weapon modules, weapon graph state, and persisted settings. Treat it as the gameplay session shell.
- `src/lib/components/game/GameScene.svelte` is the main runtime orchestrator. It creates `GameSceneStore`, starts the frame loop, syncs dungeon/settings inputs, steps AI/combat, and mounts the Threlte + Rapier scene.
- `src/lib/stores/game-scene.svelte.ts` is the state hub. It fans the scene into focused stores (`combat`, `player`, `room`, `pickups`, `textures`, `timing`) and exposes derived view data for HUD/overlays/environment.
- Scene subcomponents usually read from `getGameSceneContext()` instead of taking deep prop chains. Follow examples in `GameHud.svelte`, `GameSceneEnvironment.svelte`, and `GameSceneActors.svelte`.

## Repo Conventions
- Svelte 5 runes mode is forced project-wide in `svelte.config.js`. Prefer `$state`, `$derived`, and `$effect`; shared state here lives in class-based `.svelte.ts` modules, not Svelte `writable` stores.
- Keep gameplay math and deterministic rules in plain TypeScript under `src/lib/game` or `src/lib/combat`; keep rendering wrappers in `.svelte` files. Existing tests follow that split: `melee-swing.test.ts`, `pickups.test.ts`, `scene-layout.test.ts`.
- Config is JSON-first and validated on import with Zod in `src/lib/config/room-templates.ts`. If you add rooms or enemies, update the JSON files and let the schema catch bad combinations.
- Weapon customization is a graph pipeline, not free-form node wiring. `WeaponLabModal.svelte` normalizes nodes through `buildPipeline(...)`, and `computeWeaponBuild(...)` in `src/lib/config/weapon-graph.ts` turns the ordered modifiers into projectile/beam stats.
- Component filenames under `src/lib/components/**/*.svelte` and `src/stories/**/*.svelte` must stay PascalCase; `biome.jsonc` enforces that.

## Workflows
- Use Bun for installs and scripts. The repo has `bun.lock`, and `.npmrc` sets `engine-strict=true`.
- Main commands: `bun run dev`, `bun run check`, `bun run test`, `bun run storybook`, `bun run build`.
- `bun run vercel-build` is the production build path: it outputs Storybook to `static/storybook` before the app build, and `src/routes/storybook/+server.ts` redirects `/storybook` to that static bundle.
- Storybook is the fastest sandbox for gameplay and visual work. Start with `src/stories/playgrounds/Combat.stories.svelte`, `Rooms.stories.svelte`, or `Player.stories.svelte` before changing the full route.
- Debug controls are runtime-only and lazy-loaded from `src/lib/components/debug/DebugPane.svelte`; enable them with `?debug=true` instead of hard-coding debug UI.

## Important Integration Points
- Scene settings persist to `warden-trial-scene-settings` in `src/lib/config/scene-settings.ts`; run progress persists to `warden-run:<seed>` in `src/lib/game/run-save.ts`. Do not rename these keys without a migration plan.
- Dungeon generation is seed + floor based in `src/lib/config/dungeon-layout.ts`; progressing from floor 1 to floor 2 currently happens in `GameApp.svelte` when the boss artifact is collected.
- Player input is centralized in `src/lib/components/game/player/input.ts`; keyboard, mouse, orbit-camera controls, and mobile controls all funnel through `PlayerController.svelte` and `mobile-input.svelte.ts`.
- Environment art is assembled from code plus textures, not imported level meshes. Read `GameSceneEnvironment.svelte`, `src/lib/game/scene-layout.ts`, and `references/visual/README.md` before changing room geometry or wall kits.
- For texture optimization, use `bun run optimize:png -- --dry-run` first. `scripts/optimize-pngs.mjs` preserves normal/height-map style PNGs by disabling palette mode for map-like filenames.
