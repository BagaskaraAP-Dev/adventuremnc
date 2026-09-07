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

| `three` | `0.185.1` | Stable WebGL2 renderer standard for modern 3D browser games with tight memory control. |
| `@types/three` | `0.185.0` | Exact TypeScript type definitions matching Three.js WebGL2 interface. |
| `@dimforge/rapier3d-compat` | `0.20.0` | High-performance WASM 3D physics engine for deterministic rigid bodies and character simulation. |

## Core Architectural Decisions

### 1. Day-Night Cycle Compression
- Real lunar day: 29.53 Earth days (2,551,443 seconds).
- Gameplay compression: 1 lunar day = 90 minutes real-time (`DAY_CYCLE_COMPRESSION = LUNAR_DAY_SECONDS / 5400`).
- Rationale: A 1:1 real-time cycle would make shadow boundaries effectively static during a player's play session. A 90-minute cycle ensures dynamic thermal hazards and shadow movement within realistic play intervals while preserving the sense of slow, deliberate orbital transit.

### 2. Deployment Architecture (Path A: Vercel)
- Rationale: For v1.0 single-player milestone, Vercel static edge distribution provides zero-cost global CDN caching for immutable asset bundles and sub-second cold starts for stateless save synchronization. Transport layer in `net/` is isolated to allow migration to stateful WebSockets if multiplayer (M9) is scoped later.

### 3. Off-Thread Terrain Meshing (Web Worker)
- Rationale: Evaluating morphological elevation equations (crater cavity, central peaks, exponential ejecta profiles) for 32x32 vertex grids per chunk on the main thread induces noticeable micro-hitches (> 10ms) during rapid camera movements. Shifting meshing and normal computation to a dedicated Web Worker using zero-copy Transferable ArrayBuffers maintains a silky main-thread frametime (<= 6 ms).

### 4. Lunar Photometry & Opposition Effect
- Rationale: Apollo photographs reveal that regolith lacks diffuse Lambertian behavior and displays a dramatic brightness surge (Heiligenschein) at the anti-solar point. We injected an opposition surge term directly into the PBR fragment shader (`onBeforeCompile`) evaluating phase angle $g = \arccos(-\mathbf{v} \cdot \mathbf{l})$, replicating authentic Hasselblad camera exposure with dark charcoal albedo (~0.12) and zero atmospheric scattering/fog.

### 5. Kinematic EVA Locomotion & Bounding Gait
- Rationale: Apollo EVA documentation emphasizes that terrestrial walking mechanics fail in 1/6 gravity because normal force is insufficient for rapid friction cycles. Our character controller integrates an authentic loping gait (bounding oscillation with vertical amplitude proportional to forward momentum) and low regolith traction (`EVA_TRACTION_ACCEL = 4.5` m/s²).

### 6. Vacuum Air Control & Impact Velocity Damage
- Rationale: In space vacuum, an astronaut in ballistic flight cannot alter their trajectory without external propulsive thrust. Air control is enforced strictly at 0.0. Furthermore, without atmospheric drag to cap falling speed at a terminal velocity, fall damage is calculated directly from the square of impact velocity exceeding the suit's kinetic threshold (`EVA_SAFE_IMPACT_VELOCITY = 8.5` m/s).

### 7. Raycast Vehicle Suspension & Regolith Traction Dynamics
- Rationale: Due to the 1/6 gravity field, the normal contact force on a 650 kg rover is only ~1,056 N (compared to 6,375 N on Earth). This drastically reduces maximum tire traction. Our rover dynamics model implements decoupled 4-wheel raycasting with bicycle-kinematic steering, spring-damper suspension, and capped braking deceleration (`ROVER_BRAKE_DECEL = 2.8` m/s²). Stopping from top speed (8.5 m/s) requires ~12.9 meters, forcing deliberate vehicle handling rather than arcade-style instant stops.

### 8. GPU Ballistic Regolith Particles (Zero-Atmosphere Physics)
- Rationale: In atmospheric environments, tire dust creates billowing turbulent smoke clouds with air drag. On the Moon, vacuum dictates that every single ejected dust grain follows a purely ballistic parabolic trajectory $\mathbf{P}(t) = \mathbf{p}_0 + \mathbf{v}_0 t + \frac{1}{2}\mathbf{g} t^2$ without drag or turbulence. This is evaluated entirely in the GPU vertex shader with lifetime $T_{flight} = 2 v_{0y} / g$, guaranteeing that 100% of particles land back onto the ground.

## Known Gaps (M3)
- Life support survival systems (O2 depletion & PSR cryogenic freezing) (scheduled for M4).
- Hab airlock interior zones as refill/save stations (scheduled for M4).
- Mission runner and contract board (scheduled for M6).
