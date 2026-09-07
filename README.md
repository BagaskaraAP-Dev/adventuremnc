# Adventure MNC

Open-world action-adventure set on the lunar south pole in 2091.

## Status

Milestone 0 (Foundation) complete.
- Monorepo scaffolded.
- Tooling, linting, typechecking, and tests active.
- Target domain placeholder deployed at `https://adventuremnc.mooncrust.my.id`.
- Zero gameplay implemented in M0 per specification.

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
