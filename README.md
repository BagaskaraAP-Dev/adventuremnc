# Adventure MNC

> Open-world 3D lunar action-adventure set on the Shackleton Crater rim at the Moon's South Pole in 2091.  
> **Lead Developer:** Bagaskara Amukti Palapa ([@BagaskaraAP-Dev](https://github.com/BagaskaraAP-Dev))  
> **Live Production:** [https://adventuremnc.mooncrust.my.id](https://adventuremnc.mooncrust.my.id)

---

## Overview

**Adventure MNC** is a web-first 3D open-world game built from the ground up to capture the unforgiving reality of lunar spaceflight and regolith surface mechanics. Unlike stylized science fiction titles, the simulation directly enforces real-world lunar physics:

- **1/6 Gravity Dynamics:** Gravitational acceleration $g = 1.625\text{ m/s}^2$ governing player movement, jumping trajectories, and vehicle inertia.
- **Vacuum Mechanics:** Total absence of atmospheric drag means zero terminal velocity when falling from crater rims, accompanied by strictly zero air-control once airborne.
- **Extreme Contrast Photometry:** Accurate lunar optical behavior featuring low-angle polar solar illumination (1.8° elevation), hard un-scattered shadows, tidal-locked Earthrise with secondary Earthshine, and an authentic **opposition effect** (Heiligenschein retroreflective surge).
- **Apollo-Accurate Locomotion:** Kinetic character simulation replicating the loping bounding gait used by Apollo astronauts to traverse loose lunar regolith.

---

## Development Milestones

| Milestone | Scope | Status |
|---|---|---|
| **M0: Foundation** | Monorepo scaffolding, strict TypeScript tooling, CI, and deployment pipeline | Complete |
| **M1: Terrain & Lighting** | WebGL2 Three.js renderer, 8×8 km Shackleton DEM quadtree LOD, opposition shader, and Earthrise | Complete |
| **M2: Character Controller** | EVA astronaut model, loping gait physics, vacuum ballistics, and GTA-style third-person camera | Complete |
| **M3: Mining Rover** | Raycast vehicle suspension, low-traction drifting, and GPU ballistic dust particle system | Complete |
| **M4: Survival Systems** | O₂ life support depletion, cryogenic PSR thermal hazards, and hab airlocks | Complete |
| **M5: Backend & Saves** | Vercel Functions, durable Redis saves, Zod validation, and server-authoritative progression | Implemented; production Redis configuration required |
| **M6: Mission Runner** | Contract board, sequential objectives, and Corporate Security alert escalation | Complete |

---

## Architecture & Monorepo Structure

```
adventuremnc/
├── apps/
│   ├── web/                  # Vite + Three.js client application & HUD
│   └── api/                  # Shared HTTP handlers, save validation & persistence
├── packages/
│   ├── engine/               # Pure simulation engine (Zero React, Zero Three.js in logic)
│   ├── shared/               # Shared types, Zod schemas, and lunar physics constants
│   └── asset-pipeline/       # Meshopt & KTX2 asset processing pipeline
├── docs/                     # Canonical engineering documentation
│   ├── ARCHITECTURE.md       # Monorepo boundary rules & game loop design
│   ├── DECISIONS.md          # Architectural decision records & dependency justifications
│   ├── PERF.md               # Measured frame budgets & benchmark logs
│   └── LORE.md               # Worldbuilding lore & corporate fiction
└── assets-src/               # Raw source assets
```

---

## Controls

### On Foot (EVA Astronaut)
- **Mouse:** Orbit camera (Click canvas to enable Pointer Lock)
- **W / A / S / D:** Loping movement on regolith with inertia sliding
- **Space:** 1/6G high ballistic jump (~4 meters apex)
- **Left Shift:** Sprint loping
- **E:** Enter Lunar Mining Rover (when nearby, $\le 3.2$ m)
- **V:** Toggle between third-person EVA astronaut and free fly camera
- **R:** Emergency medical respawn

### Driving (Lunar Mining Rover)
- **W / S:** Throttle / Low-traction brake & reverse
- **A / D:** Steer left / right with bicycle kinematics
- **Space:** Handbrake slide
- **E:** Exit vehicle
- **L:** Toggle both rover headlights (status shown in HUD)

---

## Field Systems

Illegal Salvage triggers **Alert 1: Investigasi** when cargo is collected. After 30 seconds it escalates to **Alert 2: Hostile**. Return to the habitat airlock to secure cargo, receive the reward once, and clear the alarm. Failed contracts retain their alarm until airlock clearance; emergency respawn loses the cargo and fails active contracts. Reloading does not clear a cloud alarm. Hostile currently represents the security state and warning; drone pursuit is future work.

The HUD shows camera-relative arrows and distances to the active objective and habitat airlock. Dust accumulates on the visor while sprinting or driving outside; entering airlock interaction range automatically equalizes pressure, services the suit, and cleans the visor. Vehicle entry/exit blends camera position and framing; respawn uses a short fade with the current viewing direction preserved.

## Production Cloud Save (Vercel)

1. Set the Vercel project's **Root Directory to `apps/web`** and enable access to source files outside the root directory for workspace packages. Keep the committed `apps/web/vercel.json` build/output settings. Use Node.js 22 and the repository's pinned pnpm version.
2. Connect a durable Upstash Redis database and set **server-only** environment variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production. The Vercel integration aliases `KV_REST_API_URL` and `KV_REST_API_TOKEN` are also supported. Never prefix these secrets with `VITE_`. Use a separate database for Preview deployments.
3. Deploy the project with `adventuremnc.mooncrust.my.id` assigned to it. `apps/web/api/session.ts` serves `POST /api/session`; `apps/web/api/save.ts` serves authenticated `GET /api/save` and `POST /api/save`. No separate API host, browser API URL, or local server is required in production.
4. Smoke-test the deployed domain: create a session (201), use its bearer token to accept a contract and read the save (200), reload the game, and confirm progress persists. Missing storage configuration returns JSON 503 instead of silently saving to an ephemeral filesystem.

The browser syncs every two seconds and retries initial/reconnection failures every ten seconds. Temporary outages preserve the session token; an explicit 401 allows a new anonymous session. The token is kept in browser storage: cross-device account recovery is not implemented. Offline play retains the existing local airlock save; contract progress and rewards require the API. On reconnect, the authoritative cloud position is restored.

For local development, run `pnpm --filter @adventuremnc/api dev` and `pnpm --filter @adventuremnc/web dev` in separate terminals. Vite proxies `/api` to port 3001; `SAVE_DIRECTORY` selects the local save directory. The filesystem adapter supports a single local server process only.

Deployment references: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel monorepos](https://vercel.com/docs/monorepos), and [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi).

## Development & Verification

Ensure Node.js >= 20 and pnpm >= 10 are installed:

```bash
# Install all dependencies
pnpm install

# Typecheck workspace packages
pnpm typecheck

# Run linter
pnpm lint

# Run Vitest test suite
pnpm test

# Build production bundles
pnpm build
```

---

## License

Copyright (c) 2026 Bagaskara Amukti Palapa. All rights reserved.
