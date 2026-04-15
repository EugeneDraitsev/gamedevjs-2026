# gamedevjs-2026

SvelteKit + TypeScript starter using:

- `bun` for package management and scripts
- `@threlte/core` and `@threlte/extras` for the 3D scene
- `@threlte/rapier` with Rapier for simple rigid-body physics

## Run locally

```sh
bun run dev
```

Open the app and you should see a minimal third-person prototype with:

- a player-controlled ball
- a `svelte-tweakpane-ui` debug pane with Camera, Physics, Lighting, and Debug sections
- a fixed follow camera with live angle/FOV tuning
- a free orbit debug camera mode
- physics wireframe and camera helper toggles
- jump on `Space`
- a compact arena with a ramp and a couple of obstacles
- shadow and gravity tuning controls for quick scene iteration

## Useful commands

```sh
bun run check
bun run lint
bun run typecheck
bun run fix
bun run build
```
