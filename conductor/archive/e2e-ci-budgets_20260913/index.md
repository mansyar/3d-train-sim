# Track — E2E CI Time Budgets: Crossing Gate & Wagon Workshop (`e2e-ci-budgets_20260913`)

- Type: Bug
- Status: new
- Branch: `track/e2e-ci-budgets_20260913`

Post-merge `main` CI runs on 2026-09-13 flaked red on two tablet-profile e2e
tests that pass on the same trees locally and in PR runs: the crossing-gate
ride choreography (Playwright's default 30 s test budget cannot outlive its
~80 s of allowed witnessed waits plus the post-pass reload) and the
wagon-workshop cargo-delivery poll (45 s can expire before the first station
delivery on a busy runner). This track gives both specs explicit,
house-convention time budgets — no assertion weakened, no app code touched.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
