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
   - DOM HUD owns presentation and browser lifecycle; no React runtime is used.
   - `AstronautMesh` owns helmet geometry: concentric shell, rim, and visor caps oriented toward character-local +Z, attached to the animated body with a neck seal.

4. `apps/api`: Backend service.
   - Shared Node HTTP handler used by the local server and Vercel Serverless endpoints for anonymous sessions and save commands.
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

## M1–M6 Hardening

- `packages/engine/src/physics/field-systems.ts` implements security escalation, normalized visor dust accumulation, airlock proximity, and camera-relative navigation mathematics without rendering imports. Shared Zod schemas validate persisted security state and the `airlock` command. ESLint parses TypeScript, rejects explicit `any`, and prevents engine imports from React/Three.js/the web package.
- Illegal salvage pickup sets the server-owned alert to 1; 30 elapsed seconds promote it to 2, including offline time. Generic interactions cannot deliver illegal cargo: an `airlock` command within the shared airlock radius completes delivery and clears security. Mission failure does not erase security. Respawn fails active contracts, drops cargo, and resets security at home. Existing version-1 saves remain readable, including migration for active salvage cargo.
- `apps/api/src/cloud.ts` contains the sole command validation/reward path for both deployment targets. Mission catch-up is constant-time and capped at the contract deadline; a months-old save does not replay millions of simulation ticks. GET projects current mission deadlines and security without mutating the stored revision.
- `SaveRepository` separates persistence from commands. The local file adapter writes via atomic rename for a single development process. The production Redis REST adapter uses Lua compare-and-set against the exact prior record; conflicts re-read and recompute before retrying, preventing duplicate rewards across function instances. No in-memory or `/tmp` production fallback exists.
- Vercel uses `apps/web` as its project root. Its `api/session.ts` and `api/save.ts` are thin server-only adapters importing the API workspace; TypeScript project references cover these files. The browser bundle imports no API code or credentials. Functions read server environment variables at runtime; database configuration is a deployment prerequisite.
- HTTP handling validates bearer tokens, limits POST bodies to 4096 bytes (both parsed Vercel bodies and streamed local requests), and sends no-store JSON responses with 400/401/405/409/413/503 statuses. Storage errors do not expose database credentials.
- Browser save requests are serialized and time out after eight seconds. Sync runs every two seconds; disconnected clients retry every ten seconds. Failed respawns remain pending, and airlock retries only run while near the airlock. Client mission/security timers are visual predictions reconciled from server replies. Local airlock saves preserve offline survival fallback; economy is not simulated offline.
- Airlock entry detection is edge-triggered to avoid repeating sounds and network commands each simulation tick. It automatically cleans dust, restores suit vitals, equalizes pressure, and requests server cargo clearance; dead characters must respawn. Visor dust is a bounded session-local visual state, while mission/security state is durable in the cloud.
- Rover spotlights remain attached to the rotating vehicle body; `L` toggles both light sources and lamp materials, with keyboard repeat suppressed. Navigation arrows use the actual camera yaw and active player position. Mount/dismount preserve camera state and blend distance/target height; respawn resets using the current yaw/profile beneath a short fade.

The live deployment must still be verified against a configured Redis database. Local tests cover the storage contract and concurrent instances with an atomic test repository; they do not certify a remote database or Vercel project configuration. The existing client-telemetry trust model remains: spatial budgets and server-owned rewards are enforced, but this is not a full server-authoritative movement or survival simulation.
