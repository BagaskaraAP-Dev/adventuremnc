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

### 9. Vehicle Chase Camera & Apollo LRV Wheel Kinematics
- Rationale: Free-orbit cameras during vehicle control lead to inverted movement perception when the camera faces the front bumper (pressing W drives the rover toward the player screen). We implemented an active third-person chase camera that dynamically springs behind the rover's heading angle (`camera.yaw -> rover.yaw`). Additionally, lunar wire-mesh wheels must rotate in the YZ plane around the transverse X axle with radial spokes and titanium chevron cleats to provide unambiguous visual rotation feedback in high-contrast vacuum lighting.

### 10. High-Definition Lunar Road Network & Multi-Scale Regolith PBR Textures
- Rationale: Natural regolith across 8x8 km appears repetitive if mapped with a single repeating tile, and stretches on steep crater walls. We implemented a 3-tier texture system: (1) 64m macro geological variation map breaking up repeating tiling, (2) 1.5m micro-detail normal map giving crisp sub-millimeter granular dust at 0.5-2m eye height, and (3) tri-planar slope projection for crater walls > 25°. Furthermore, we engineered deterministic lunar transit corridors (Route 01 to Shackleton Mining Sector and Route 02 to Radio Relay): the terrain shader dynamically splats compacted dual-rut rover tracks with chevron tire treads and pulverized anorthosite shoulder berms, and instanced solar navigation beacon posts provide 60 FPS visual wayfinding.

### 11. Sub-Grid Road Elevation Alignment & Tangent-Space Normal Mapping
- Rationale: A 6-meter road corridor cannot analytically suppress 65m rolling swells by 85% when terrain mesh chunks have a 15.625m vertex resolution. The quadtree mesh vertices fall outside the 4.2m damping radius, causing the rendered road polygons to stay at full swell height while vehicles sampling the analytical equation at their exact position sank 3-5 meters underneath the lunar surface. We removed sub-grid swell damping so analytical physics elevation and rendered polygon surfaces match within millimeters everywhere. Furthermore, road rut normal perturbations were transformed through road tangent (`dir`) and perpendicular (`perp`) vectors into world space and view space, preventing unprojected tangent vectors from skewing normals towards the camera.

### 12. Data-Driven Mission Scripting & Server-Authoritative Economy (M5/M6)
- Rationale: To allow rapid creation and tuning of contracts without modifying engine core logic, mission contracts (Cold Courier, Ridge Surveyor, Illegal Salvage) are specified declaratively as immutable data definitions in `packages/engine/src/missions`. The simulation tracks objective sequences, timers, and proximity headless in Node.js. To enforce anti-tamper security in line with GTA-style contract progression, credits and mission completion rewards are strictly server-authoritative (`apps/api`): clients submit interaction events and telemetry via Zod schemas, and the server validates deadline constraints and proximity before disbursing rewards.

### 13. Durable Vercel Saves with Optimistic Concurrency
- The Vite project owns its `/api` functions so the public domain and browser use the same origin. A shared HTTP adapter invokes the same `CloudStore` command validation as local development.
- Production persistence uses Upstash-compatible Redis REST, authenticated only with server environment variables. Filesystem saves remain a development option; Vercel instances must never use ephemeral disk as a durable save store.
- A Lua compare-and-set checks the previous serialized record before storing the new state. A concurrent request retries from the winner's state, so repeated completion events cannot award credits twice across instances. Redis REST calls time out after five seconds; missing configuration and storage failures return 503.
- Anonymous bearer sessions preserve the existing contract. Cross-device recovery, account authentication, and abuse-rate limiting remain separate work; the current telemetry travel budget is not a complete movement anti-cheat system.

### 14. Security Alert and Cargo Clearance
- Pickup starts a 30-second investigation before Hostile escalation. Security is a persistent state separate from mission status: contract expiration cannot wash the alarm. A habitat airlock command validates proximity, secures active salvage, awards its reward once, and clears the status. Respawn clears security by forfeiting the contract and cargo.
- Mission and security clocks share constant-time server catch-up; browser fixed-step updates predict the HUD until the next authoritative response. Version-1 schema defaults retain compatibility with earlier saves.

### 15. Visor, Navigation, and Camera Feedback
- Dust exposure and navigation bearings are pure engine functions; DOM overlays and Three.js spotlights remain in the web application. Dust is capped to preserve visibility and cleaned on airlock entry. It is a session visual, not a punitive persistent suit-damage mechanic.
- Airlock service triggers on entry into interaction range and does not resurrect dead characters. Pressure equalization is immediate gameplay feedback, with the existing airlock sound; no new timed chamber simulation is introduced.
- Vehicle camera changes interpolate framing without resets or yaw snaps. Respawn relocates directly using the current camera profile beneath a brief fade, avoiding a camera flight across kilometers of terrain. Both headlights toggle together and keyboard repeat does not retrigger actions.

### 16. EVA Helmet Surface Alignment
- Replace the offset, sideways visor hemisphere with a forward-facing spherical cap. Concentric, increasing radii keep the shell and sealing rim behind the visor, avoiding asymmetric clipping. Higher sphere segmentation smooths the silhouette; the neck seal connects the helmet to the suit.
- Geometry raycast regression tests check front visibility and shell coverage from the sides, crown, and back; pose checks retain helmet attachment during walking and rover seating.

## Remaining Release Dependencies
- Configure production Redis variables and deploy the Vercel project with root `apps/web`; verify authenticated save/reload on the public domain. Repository verification alone does not establish live deployment health.
- Corporate Security drone pursuit is not implemented; Level 2 currently drives the Hostile warning and return-to-habitat requirement.
- Cross-device account recovery and stronger movement/survival authority remain future backend work.
