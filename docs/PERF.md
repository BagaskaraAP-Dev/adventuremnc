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
