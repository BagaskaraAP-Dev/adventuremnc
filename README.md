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
| **M5: Backend & Saves** | HTTP save service, Zod state validation, and server-authoritative progression | Complete (Local Store) |
| **M6: Mission Runner** | Contract board, mission scripting engine, and sequential objective runners | Complete |

---

## Architecture & Monorepo Structure

```
adventuremnc/
├── apps/
│   ├── web/                  # Vite + Three.js client application & HUD
│   └── api/                  # Fastify backend API & session services
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

---

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
