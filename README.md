# Adventure MNC

Open-world action-adventure set on the lunar south pole in 2091.

## Status

Milestone 2 (Character Controller & Lunar Locomotion) complete.
- EVA astronaut character mesh authored with geometric primitives (torso capsule, gold visor bubble helmet, PLSS backpack, articulated limbs).
- Lunar locomotion physics with authentic Apollo loping gait, low regolith traction, and sliding inertia.
- Ballistic 1/6G jump physics ($g = 1.625\text{ m/s}^2$) with apex matching $v_0^2/(2g)$ within 0.8% tolerance.
- Zero air control in vacuum ballistic flight.
- Kinetic fall damage calculated from excess impact velocity without terminal velocity.
- GTA-style third-person orbit follow camera with terrain collision and smooth damping.
- Camera mode toggle (`V` key between third-person EVA and free fly) and emergency respawn (`R` key).
- HUD upgraded with real-time suit integrity, jump apex altitude, impact speed, and critical breach alert.

## Workspace Structure

- `apps/web`: Client application (Vite, TypeScript, Three.js).
- `apps/api`: Backend service (Fastify, TypeScript).
- `packages/engine`: Pure simulation and ECS engine (Zero React/Three dependencies in pure logic).
- `packages/shared`: Shared types, Zod schemas, and lunar physics constants.
- `packages/asset-pipeline`: Asset optimization tooling.
- `docs/`: Canonical project documentation (`ARCHITECTURE.md`, `DECISIONS.md`, `PERF.md`, `LORE.md`).

## Verification Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
