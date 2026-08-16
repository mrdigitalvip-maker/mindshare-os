# LookSpace — Orbital Frontier

LookSpace is a continuous, browser-based space game runtime built with React, TypeScript and Vite. The app is no longer a collection of product pages: `/` boots directly into the game, initializes a pilot profile, enters Aurora Gate StarBase and hands control to the player.

## Runtime

```bash
npm install
npm run dev
```

Use **WASD/arrow keys** to fly and **Shift** to engage boost after entering the ship. Progress is checkpointed every ten seconds and restored on the next session.

## Engine architecture

- `engine`: deterministic frame loop and typed event bus
- `game`: runtime composition and lifecycle
- `world`: continuous starfield, StarBase and hangar renderer
- `physics`, `controls`, `camera`: movement simulation and input
- `missions`, `save`, `audio`, `ui`: gameplay services and presentation
- `spaceships`, `players`, `effects`, `network`, `supabase`, `assets`, `shaders`, `materials`, `textures`, `animations`: isolated extension boundaries for production systems

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

The production build emits the Vercel-compatible output configured by the existing Vite/TanStack runtime.
