# Architectural & Technical Decisions — Adventure MNC

## M0 Pinned Dependencies & Justifications

| Package | Version | Justification |
|---|---|---|
| `typescript` | `5.7.3` | Pinned stable release supporting strict type checking and project references. |
| `vitest` | `3.0.6` | Fast native ESM unit test runner matching Vite toolchain with zero config overhead. |
| `eslint` | `9.20.1` | Flat config standard for enforcing strict boundary restrictions and lint rules. |
| `prettier` | `3.5.1` | Deterministic code formatting across monorepo. |
| `zod` | `3.24.2` | Runtime validation for shared schemas between client and API without code duplication. |
| `vite` | `6.2.0` | High-performance client bundler with fast HMR and optimized production asset hashing. |

## Core Architectural Decisions

### 1. Day-Night Cycle Compression
- Real lunar day: 29.53 Earth days (2,551,443 seconds).
- Gameplay compression: 1 lunar day = 90 minutes real-time (`DAY_CYCLE_COMPRESSION = LUNAR_DAY_SECONDS / 5400`).
- Rationale: A 1:1 real-time cycle would make shadow boundaries effectively static during a player's play session. A 90-minute cycle ensures dynamic thermal hazards and shadow movement within realistic play intervals while preserving the sense of slow, deliberate orbital transit.

### 2. Deployment Architecture (Path A: Vercel)
- Rationale: For v1.0 single-player milestone, Vercel static edge distribution provides zero-cost global CDN caching for immutable asset bundles and sub-second cold starts for stateless save synchronization. Transport layer in `net/` is isolated to allow migration to stateful WebSockets if multiplayer (M9) is scoped later.

## Known Gaps (M0)
- Gameplay loop is uninstantiated (by design for M0 foundation).
- Terrain heightmap data pipeline not yet connected (scheduled for M1).
- Rapier physics engine not yet wired into worker (scheduled for M2).
