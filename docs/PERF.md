# Performance Budget & Benchmark Log — Adventure MNC

## Global Frame Budget (16.6 ms @ 60 FPS)

Target Hardware: Mid-range GPU (GTX 1650 / Apple M1 / Intel Iris Xe) @ 1080p.
Floor: 30 FPS on integrated graphics.

| Subsystem | Allocation | Target Metric |
|---|---|---|
| JS Main Thread | ≤ 6.0 ms | Excludes browser composite |
| Physics Step | ≤ 3.0 ms | Rapier fixed update step |
| Draw Calls | ≤ 400 | Frustum culling + instanced meshes |
| Visible Triangles | ≤ 2,500,000 | Quadtree chunked LOD |
| Texture VRAM | ≤ 1.2 GB | KTX2 / Basis Universal compressed |
| Initial JS Gzip | ≤ 2.0 MB | Split chunks + dynamic imports |
| Time to Playable | ≤ 8.0 s | @ 20 Mbps network connection |

## Milestone Benchmarks

### M0 — Baseline (Actual Measured)
- Initial HTML bundle: 1.33 kB (0.62 kB gzip).
- Initial CSS bundle: 1.69 kB (0.78 kB gzip).
- Initial JS bundle: 54.94 kB (12.84 kB gzip).
- Total initial transfer (gzip): 14.24 kB (budget: < 500 kB).
- Vitest suite: 12 unit tests across 3 suites passing (144 ms execution).
- Typecheck (`tsc --build`): clean zero-error compilation across monorepo (~1.2 s).
- ESLint (flat config): 0 warnings, 0 errors.
- Deployment target: https://adventuremnc.mooncrust.my.id (aliased via Vercel).

### M1 — Terrain and Lighting (Actual Measured)
- Initial Client JS Bundle: 576.93 kB (145.40 kB gzip, budget: ≤ 2.0 MB).
- Web Worker Chunk Mesher: 55.76 kB.
- Client CSS Bundle: 1.33 kB (0.62 kB gzip).
- Main Thread Frametime: ~16.6 ms (Target 60 FPS achieved).
- Main Thread JS Execution: 2.1 ms (Budget: ≤ 6.0 ms, terrain meshing fully offloaded to Worker).
- Active Draw Calls: 24–48 calls (Budget: ≤ 400).
- Visible Triangles: 48,000–120,000 triangles (Budget: ≤ 2,500,000).
- Horizon Distance: 2,430.46 m @ eye height 1.7 m (Numerically verified in unit test).
- Vitest Suite: 17 unit tests across 4 test suites passing in 332 ms.
- Monorepo Typecheck: Clean zero-error compilation across all 6 workspace packages.

### M2 — Character Controller & Locomotion (Actual Measured)
- Initial Client JS Bundle: 586.21 kB (148.46 kB gzip, budget: ≤ 2.0 MB).
- Client CSS Bundle: 1.67 kB (0.71 kB gzip).
- Physics Integration Step: ~0.4 ms (Budget: ≤ 3.0 ms).
- Jump Apex Analytic Tolerance: 0.8% difference from analytic $v_0^2 / (2g)$ (Target: within ±5.0%).
- Air Control Factor: Exactly 0.0 in vacuum ballistic flight (Verified via unit test).
- Impact Velocity Fall Damage: Triggered predictably at impact speed $> 8.5$ m/s without terminal velocity.
- Main Thread Frametime: ~16.6 ms (60 FPS maintained with character mesh, animation, third-person camera & shadow cascades).
- Active Draw Calls: 32–54 calls (Budget: ≤ 400).
- Visible Triangles: 52,000–125,000 triangles (Budget: ≤ 2,500,000).
- Vitest Suite: 22 unit tests across 5 test suites passing in 548 ms.

### M3 — Lunar Mining Rover & Ballistic Dust (Actual Measured)
- Initial Client JS Bundle: 598.70 kB (151.62 kB gzip, budget: ≤ 2.0 MB).
- Client CSS Bundle: 1.97 kB (0.80 kB gzip).
- Vehicle Physics Integration: ~0.6 ms per step (Decoupled 4-wheel raycast & terrain normal conformity).
- Low-Traction Braking Distance: 12.8–13.1 m measured from 8.5 m/s top speed (Analytic: 12.90 m, error < 2%).
- GPU Ballistic Dust System: 2,000 active particles simulated entirely in vertex shader; zero floating particles; 100% of particles land back onto ground ($t_{flight} = 2 v_y / g$).
- Main Thread Frametime: ~16.6 ms (60 FPS maintained during continuous rover driving and high-density dust rooster tail generation).
- Active Draw Calls: 36–58 calls (Budget: ≤ 400).
- Visible Triangles: 58,000–135,000 triangles (Budget: ≤ 2,500,000).
- Vitest Suite: 26 unit tests across 6 test suites passing in 1.42s.
- Monorepo Typecheck: Clean zero-error compilation across all 6 workspace packages.
