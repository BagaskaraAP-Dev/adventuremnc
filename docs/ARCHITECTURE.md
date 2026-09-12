# Architecture Specification — Adventure MNC

## Monorepo Boundaries

1. `packages/engine`: Pure headless simulation logic.
   - Must execute in Node.js for unit testing.
   - Zero imports from React or Three.js.
   - Boundary enforced by architecture and linter.

2. `packages/shared`: Universal domain models.
   - Physical constants (`lunar.ts`).
   - Zod validation schemas shared between client and server.
   - Zero native or DOM dependencies.

3. `apps/web`: Browser runtime and presentation.
   - Three.js WebGL2 renderer.
   - Decoupled render loop with transform interpolation.
   - React used exclusively for DOM HUD overlay and lifecycle management.

4. `apps/api`: Backend service.
   - Fastify / Vercel Serverless endpoints for authentication and save state.
   - Server-authoritative validation on mission progression and state.

## Simulation Loop

Fixed timestep model with accumulator and transform interpolation:

```
accumulator += min(deltaTime, 0.25)
while (accumulator >= FIXED_DT) {
  stepSimulation(FIXED_DT)
  accumulator -= FIXED_DT
}
alpha = accumulator / FIXED_DT
render(alpha)
```

- Simulation rate: 60 Hz (`FIXED_DT = 1 / 60`).
- Accumulator clamp: 0.25 s to prevent spiral of death during frame drops.
- Render state: linearly interpolated between previous and current physics state using `alpha`.

## Backend Save Service & Mission Runner Architecture (M5 & M6)

1. **Client-Server Save Synchronization:**
   - Anonymous session creation via `POST /api/session` returning a player bearer token stored in localStorage.
   - Periodic telemetry synchronization (`POST /api/save`) sending serialized player command unions validated by Zod schemas in `packages/shared`.
   - Server-authoritative economy: Credits and contract completion cannot be submitted arbitrarily by the client. The server computes rewards upon verified objective completion.

2. **Mission Progression & Validation:**
   - Server validates contract availability, sequential objective order, spatial proximity to mission targets, travel distance budget, and deadline expiration.
   - Respawns fail active contracts; failed contracts can be re-attempted. Completed contracts are awarded once and cannot be repeatedly farmed.

3. **Offline Fallback:**
   - Local M4 saves persist when the API service is unreachable.
   - When API is reachable, telemetry is synchronized seamlessly with the cloud save store.
