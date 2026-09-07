# Adventure MNC

Open-world action-adventure set on the lunar south pole in 2091.

## Status

Milestone 1 (Terrain & Lighting) complete.
- WebGL2 Three.js renderer initialized with ACES Filmic tone mapping and hard shadow cascades.
- 8x8 km lunar digital elevation model (Shackleton crater rim sector 04) with morphological crater cavities, ejecta blankets, and central peaks.
- Off-thread terrain meshing worker using zero-copy Transferable ArrayBuffers for quadtree LOD streaming.
- Opposition effect (Heiligenschein) retroreflective backscatter surge shader hook.
- Low-angle polar sun (1.8° elevation), fixed Earth in sky (1.9° angular diameter), and subtle Earthshine secondary fill light.
- 6DOF Fly camera with pointer lock and WASD/Space/C/Shift keyboard navigation.
- Real-time Apollo telemetry HUD displaying coordinates, altitude, horizon distance, and performance metrics.

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
