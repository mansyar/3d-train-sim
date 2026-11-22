# Phase 2 Evidence — First release dry run

- **Track:** `release-v0.15.1_20261123` — Release v0.15.1
- **Phase:** 2 — First release dry run
- **Date:** 2026-11-23
- **Branch:** `chore/release-v0.15.1_20261123`
- **Phase base:** `0a6e0c749ccc4ec925412e6be5de1ef095fca8ed`
- **Result:** verified

## Dispatch and watch

| Item | Value |
| --- | --- |
| Command | `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` |
| Dispatch exit | 0 |
| Run ID | `45068023992` |
| Run URL | https://github.com/mansyar/3d-train-sim/actions/runs/45068023992 |
| Event | `workflow_dispatch` |
| Head branch | `chore/release-v0.15.1_20261123` |
| Head SHA | `0a6e0c749ccc4ec925412e6be5de1ef095fca8ed` (matches the phase base) |
| Created | `2026-11-22T20:43:16Z` |
| Updated | `2026-11-22T20:58:50Z` |
| Watch exit | 0 |
| Conclusion | `success` |

## Gate conclusions

| Job | Conclusion |
| --- | --- |
| Gate · biome + typecheck | success |
| Gate · vitest | success |
| Gate · e2e (tablet · phone · prod) | success |
| publish | success |
| Build and push image (push only on real tags) | success |
| Deploy via Coolify webhook | skipped |

The publish job's deploy step is guarded by `github.event_name == 'push'` in
`.github/workflows/release.yml`; a `workflow_dispatch` dry run builds the image
but never deploys. No GHCR push is claimed for this dry run.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-6 | A distinct dry run passes all gates with deploy skipped. | Run `45068023992`: every gate success, image build success, deploy skipped. | verified |

## Notes

- A second consecutive dry run is required by FR-6/AC-6 and is recorded in
  `verification/phase-3.md`; no tag is created before that pair is proven.
- The earlier failed `v0.15.0` tag workflow (`44730179589`) and perf-floor dry
  run (`44712469297`) remain unchanged historical failures; nothing was retagged.
- No clarity number, v1.0 child-gate claim, manual-device claim, GHCR claim or
  deploy claim is made.
