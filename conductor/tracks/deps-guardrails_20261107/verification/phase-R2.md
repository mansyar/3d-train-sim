# Phase R2 — Second-round review fixes — Verification

**Track:** `deps-guardrails_20261107`
**Phase goal:** Make the two witnesses added in Phase R1 actually witness: a shape check that skipped a major it should examine, and a `platformAutomerge` assertion that read an absent key whose documented default is `true`.
**Performed by:** primary agent (round-2 fixes are test and config only; the phase subagent is denied writes under `conductor/`).

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm exec biome check . --write` | 0 | checked 175 files, no fixes needed |
| `pnpm exec vitest run src/core/dependency-overrides.test.ts src/core/renovate-config.test.ts` | 0 | 2 files, 10 tests |
| `npx --yes --package renovate@latest renovate-config-validator renovate.json` | 0 | `Config validated successfully against 1 file(s)` |
| `pnpm check` | 0 | Biome 175 files, `tsc --noEmit` clean, 48 files / 867 tests |
| `pnpm audit --audit-level=high` | 0 | 6 findings (2 low, 4 moderate), 0 high |
| `pnpm build` | 0 | `generateSW`, 178 precache entries |
| `pnpm exec playwright test` | — | see "Full suite" below |
| `pnpm why --depth 99 brace-expansion` | 0 | `minimatch@5.1.9 → brace-expansion@2.1.7`; `minimatch@10.2.6 → brace-expansion@5.0.12` |

## R2-F1 — the shape table replaces the skip

`SHAPE_BY_MAJOR` states what each minimatch major calls: 5 and 9 load the
callable 2.x module, 10 loads the namespace. An installed major that is not in
the table fails with "teach this test which brace-expansion shape it calls"
instead of being skipped, and `checked.length` must equal the number of copies
found, so an empty loop cannot pass.

Why 9 matters: minimatch@9 still `require`s brace-expansion ^2, so the old
`major >= 6` skip would have silently waved through a broken 9 — the exact
class of bug Phase R1 fixed, reintroduced by the guard meant to catch it.

### R2.T1.3 — a selector that binds to nothing

The same question applies to the override keys themselves: `minimatch@7>brace-expansion`
would close no advisory and guard nothing, and nothing would notice. The test now
parses the `overrides` block out of `pnpm-workspace.yaml`, resolves each key's
target and (when present) its consumer major against the pnpm virtual store, and
fails on a selector with no installed match. Demonstrated by adding
`ghost-package: ">=1.0.0"`: the suite failed with
`a selector that matches nothing is a silent no-op … expected [ 'ghost-package' ] to deeply equal []`,
then passed again once removed. Store directory names are decoded (`@scope+name`
→ `@scope/name`) so scoped packages resolve.

The binding itself, from `pnpm why --depth 99`:

```
brace-expansion@2.1.7  ← minimatch@5.1.9 ← filelist ← jake ← ejs ← … ← vite-plugin-pwa
brace-expansion@5.0.12 ← minimatch@10.2.6 ← glob@11 ← workbox-build
```

## R2-F2 — `platformAutomerge: false` is now shipped, not assumed

Renovate's `platformAutomerge` defaults to **true**; comparing an absent key
against a literal `true` proves nothing about what Renovate will do. The config
now sets it to `false` and the guard requires exactly `false`. A rule-level
`platformAutomerge: true` is an offender, because a package rule overrides the
top-level setting.

## R2-F3 / R2-F4 — one predicate, tested from the outside

`automergeOffenders(policy)` is the guard. Both automerge tests call it: the
shipped config must produce `[]`, and a fixture carrying `automerge: 'patch'`,
`platformAutomerge: true` and rule-level `automerge: 'minor'` / `platformAutomerge:
true` / `automerge: false` must produce exactly the four offenders it names. A
predicate that only rejected literal `true` now fails the fixture; an explicit
per-rule `false` is not an offender, and the fixture proves it did not become one.

## R2-F5 / R2-F6 — the record

The review now cites `b99999a..b3193d0` (round 1) and `b3193d0..HEAD` (round 2);
the earlier `e8f6a1c` never existed. The full-suite row records the first run as
192 passed and 1 failed tablet `cargo.spec.ts:36`, green 4/4 on the isolated
rerun the project's `e2e/README.md` prescribes, and the run after these fixes is
recorded separately.

## Notes

- No product code changed in this phase: `src/core/renovate-config.test.ts`,
  `src/core/dependency-overrides.test.ts` and `renovate.json` only.
- `pnpm audit` is unchanged at 6 findings; the four overrides still bind as
  before, which the guard now proves per consumer.
- The validator was re-run because `platformAutomerge` is a policy key Renovate
  rejects when misspelled.
