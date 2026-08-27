# Project Workflow — Tiny Tracks

## Guiding Principles

1.  **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2.  **The Tech Stack is Deliberate:** Changes to the tech stack must be
    documented in `tech-stack.md` *before* implementation
3.  **Test-Driven Development — for logic-bearing code only:** Write unit tests
    before implementing functionality that contains logic (algorithms, state,
    computation, data transformation). Visual wiring, scene setup, and glue code
    are verified via smoke tests and manual verification instead.
4.  **Coverage where it counts:** Aim for >80% coverage on logic-bearing
    modules. Do not chase coverage on render wiring or UI glue.
5.  **User Experience First:** Every decision should prioritize the toddler
    experience (see `product-guidelines.md`)
6.  **Privacy First:** Nothing leaves the device. No analytics, no network calls
    at runtime.
7.  **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use
    `CI=true` for watch-mode tools (tests, linters) to ensure single execution.

## Definitions

- **Logic-bearing code:** Code whose correctness can be captured in assertions —
  pure functions, algorithms, state machines, serialization, path resolution.
  In this project: everything in `src/core/` and `src/state/`.
- **Non-logic code:** Renderers, scene graph setup, DOM wiring, audio triggers,
  model loading. Verified by Playwright smoke tests + explicit manual
  verification steps, not unit tests.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1.  **Select Task:** Choose the next available task from `plan.md` in sequential
    order

2.  **Mark In Progress:** Before beginning work, edit `plan.md` and change the
    task from `[ ]` to `[~]`

3.  **Define Expected Behavior:**
    -   **Logic-bearing task:** Write failing unit tests first (Red phase).
        Run the suite and confirm they fail as expected. Do not proceed until
        you have failing tests.
    -   **Non-logic task:** Write down the observable acceptance criteria
        (what you will see/hear/feel) in `plan.md` under the task, to be
        verified manually or by a smoke test after implementation.

4.  **Implement to Pass (Green Phase):**
    -   Logic-bearing: write the minimum code to make the failing tests pass,
        rerun, confirm green.
    -   Non-logic: implement to the acceptance criteria.

5.  **Refactor (Optional but Recommended):**
    -   With the safety of passing tests, improve clarity, remove duplication,
        and enhance performance without changing external behavior.
    -   Rerun tests after refactoring.

6.  **Verify Coverage (logic-bearing code only):** Run `CI=true pnpm test -- --coverage`.
    Target >80% for new code in `src/core/` and `src/state/`. Skip for scene/UI.

7.  **Document Deviations:** If implementation differs from tech stack:

    -   **STOP** implementation
    -   Update `tech-stack.md` with new design
    -   Add dated note explaining the change
    -   Resume implementation

8.  **Commit Code Changes:**

    -   Stage all code changes related to the task.
    -   Propose a clear, concise commit message e.g. `feat(ui): Create basic toybox structure`.
    -   Perform the commit.

9.  **Append Task Summary to plan.md (NOT git notes):**

    -   **Step 9.1: Draft Note Content:** Create a detailed summary for the
        completed task: task name, summary of changes, list of
        created/modified files, and the core "why" for the change.
    -   **Step 9.2: Write to plan.md:** Append the summary as a nested
        "Notes:" block directly under the completed task's checklist entry.

10. **Record Task Commit SHA:**

    -   **Step 10.1: Update Plan:** In `plan.md`, find the completed task,
        change its status from `[~]` to `[x]`, and append the first 7 characters
        of the just-completed commit's hash.
    -   **Step 10.2: Write Plan:** Write the updated content back to `plan.md`.

11. **Commit Plan Update:**

    -   **Action:** Stage the modified `plan.md` file.
    -   **Action:** Commit with a descriptive message (e.g.,
        `conductor(plan): Mark task 'Create track graph' as complete`).

### Task Correction & Plan Amendment Workflows

When an implemented task or phase requires corrections, amendments, or additions:

1.  **In-Flight Refinements:** Minor gaps found while a task is `[~]` are fixed
    directly in the active implementation stream, with passing tests (logic)
    / met criteria (non-logic) before committing.
2.  **Code Review Corrections (`conductor-review`):** Issues found during
    review automatically append a `Review Fixes` phase to `plan.md` so
    corrections are formally tracked and checkpointed.
3.  **Logical State Reversions (`conductor-revert`):** A fundamentally flawed
    task is reverted (commits rolled back, task reset to `[ ]` in `plan.md`)
    for a clean restart.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** Executed immediately after a task completes a phase in `plan.md`.

1.  **Announce Protocol Start.**

2.  **Ensure Test Coverage for Phase Changes (logic-bearing files only):**

    -   **Step 2.1: Determine Phase Scope:** Read `plan.md` to find the previous
        phase's checkpoint SHA. If none exists, scope is all changes since the
        first commit.
    -   **Step 2.2: List Changed Files:** `git diff --name-only <prev_sha> HEAD`.
    -   **Step 2.3: Verify Tests:** Exclude non-code files (`.json`, `.md`, `.glb`, …).
        For remaining files, check whether the file is **logic-bearing**:
        -   If yes and a test file is missing, **create one** — first analyze
            existing test files for naming/style conventions; tests must
            validate this phase's described functionality.
        -   If no (scene/UI/glue), unit tests are **not required**; ensure the
            acceptance criteria were recorded and are verifiable.

3.  **Execute Automated Tests with Proactive Debugging:**

    -   Announce the exact command, e.g. **Command:** `CI=true pnpm test`.
    -   Execute. If tests fail, propose a fix a **maximum of two times**; if
        still failing, **stop** and ask the user for guidance.

4.  **Propose a Detailed, Actionable Manual Verification Plan:**

    -   First analyze `product.md`, `product-guidelines.md`, and `plan.md` to
        determine user-facing goals of the completed phase.
    -   Present step-by-step manual verification with commands and expected
        outcomes, e.g.:

        ```text
        The automated tests have passed. For manual verification, please follow these steps:

        Manual Verification Steps:
        1. Start the dev server: `pnpm dev`
        2. Open on a tablet (or browser touch emulation) at the shown URL
        3. Confirm that you see: the toybox grid and a draggable track piece
        4. Confirm that dragging snaps the piece to grid positions with a bounce
        ```

5.  **Await Explicit User Feedback:**

    -   Ask: "**Does this meet your expectations? Please confirm with yes or provide feedback.**"
    -   **PAUSE**. Do not proceed without an explicit yes.

6.  **Record the Phase Verification Report in plan.md (NOT git notes):**

    -   Draft a verification report: automated test command + result, the
        manual verification steps, and the user's confirmation (date).
    -   Append it to `plan.md` as a "Verification Report" block under the
        completed phase heading.

7.  **Record Phase Checkpoint SHA:**

    -   **Step 7.1:** Get the hash of the last functional commit
        (`git log -1 --format="%H"`). Do NOT create empty checkpoint commits.
    -   **Step 7.2: Update Plan:** Append to the phase heading in `plan.md`:
        `[checkpoint: <sha>]`.
    -   **Step 7.3: Write Plan.**

8.  **Commit Plan Update:**

    -   Stage `plan.md`, commit as `conductor(plan): Mark phase '<PHASE NAME>' as complete`.

9.  **Announce Completion.**

### Quality Gates

Before marking any task complete, verify:

-   [ ] All tests pass
-   [ ] Coverage >80% for new **logic-bearing** code (not applicable to scene/UI)
-   [ ] Code follows project's code style guidelines (see `conductor/code_styleguides/`)
-   [ ] Type safety enforced (`tsc --noEmit` clean)
-   [ ] No Biome errors (`pnpm biome check .`)
-   [ ] Works correctly on tablets (touch, no hover dependencies)
-   [ ] `product-guidelines.md` respected (no fail states, instant feedback, privacy)
-   [ ] Documentation updated if needed
-   [ ] No security or privacy regressions (no network calls, no identifiers)

## Development Commands

### Setup

```bash
pnpm install
```

### Daily Development

```bash
pnpm dev                          # Vite dev server
CI=true pnpm test                 # Vitest, single run (POSIX shells)
$env:CI='true'; pnpm test         # Vitest, single run (Windows pwsh)
pnpm test                         # identical — scripts use `vitest run` (single-run by design)
CI=true pnpm test -- --coverage   # with coverage
pnpm exec tsc --noEmit            # typecheck gate
pnpm exec biome check .           # lint + format check
pnpm exec biome check . --write   # lint + format fix
pnpm exec playwright test         # E2E smoke
```

> **Windows note:** bash-style `VAR=value cmd` prefixes fail under pnpm's Windows
> shell. The `check` script therefore omits `CI=true` — the suite is `vitest run`,
> which is single-run regardless of environment.

### Before Committing

```bash
pnpm exec biome check . && pnpm exec tsc --noEmit && CI=true pnpm test
```

## Testing Requirements

### Unit Testing (logic-bearing code only)

-   Modules in `src/core/` and `src/state/` must have corresponding tests.
-   Use appropriate setup/teardown (fixtures, beforeEach/afterEach).
-   Mock external dependencies (IndexedDB access via fakes).
-   Test both success and failure cases.
-   **Do not write unit tests for** render wiring, scene setup, DOM glue, or
    audio trigger code — cover those with smoke tests and manual verification.

### E2E Smoke Testing (Playwright)

-   Boots the app, places pieces, starts the train, asserts no console errors.
-   Runs in a touch-emulated tablet viewport by default.

### Tablet Testing

-   Test on actual iPad (Safari) and Android tablet (Chrome) when possible.
-   Use Safari developer tools / Chrome device emulation.
-   Verify touch interactions, responsive layout, and 60 FPS performance.

## Code Review Process

### Self-Review Checklist

1.  **Functionality** — works as specified; edge cases handled; no fail states introduced
2.  **Code Quality** — style guide followed; DRY; clear names
3.  **Testing** — logic-bearing code unit-tested; smoke tests pass
4.  **Privacy & Security** — nothing leaves the device; no hardcoded secrets
5.  **Performance** — 60 FPS target respected; no per-frame allocations in render loop
6.  **Tablet Experience** — targets ≥64px; readable at arm's length; feels native

## Commit Guidelines

### Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

-   `feat`: New feature
-   `fix`: Bug fix
-   `docs`: Documentation only
-   `style`: Formatting
-   `refactor`: Neither fixes a bug nor adds a feature
-   `test`: Adding missing tests
-   `chore`: Maintenance tasks

### Examples

```bash
git commit -m "feat(core): Add grid snap resolution for track pieces"
git commit -m "fix(scene): Correct camera follow lag on turn transitions"
git commit -m "test(core): Add pathing loop coverage for broken tracks"
git commit -m "chore(deps): Bump three to 0.185.1"
```

## Branching

-   Trunk-based: short-lived `track/<track-id>` branches off `main`, merged back when complete.
-   Keep branches small; one track (or one review-fix batch) per branch.

## Definition of Done

A task is complete when:

1.  All code implemented to specification
2.  Unit tests written and passing (logic-bearing code only)
3.  Coverage meets requirements for logic-bearing modules
4.  Documentation complete (if applicable)
5.  Code passes Biome and typecheck gates
6.  Works beautifully on tablets (if applicable)
7.  Implementation notes added to `plan.md`
8.  Changes committed with proper message

## Emergency Procedures

### Critical Bug on the Family Devices

1.  Create hotfix branch from main
2.  Reproduce + fix (unit test first if logic-bearing)
3.  Verify on tablet
4.  Tag patch release → pipeline deploys
5.  Document in plan.md

### Kid World Data Loss (IndexedDB incident)

1.  Stop all write operations immediately
2.  Attempt recovery: export/inspect IndexedDB on affected device
3.  Rebuild the world with the kid (it's a toy — rebuilding together is gameplay)
4.  Fix the persistence bug; add regression test if logic-bearing
5.  Document in plan.md

### Privacy Breach (network call detected)

1.  Identify and remove the offending dependency/code immediately
2.  Audit all runtime network usage
3.  Add a Playwright check asserting zero external requests
4.  Document in plan.md

## Deployment Workflow

Per `tech-stack.md` pipeline: tag → gates → Docker → GHCR (public) → Coolify. Production only.

### Pre-Deployment Checklist

-   [ ] Biome + typecheck + Vitest gates passing
-   [ ] Playwright smoke passing
-   [ ] Manual tablet check complete
-   [ ] Version bumped, changelog note in plan.md
-   [ ] Bundle size reasonable (<2 MB gzipped code, assets excluded)

### Deployment Steps

1.  Merge `track/<id>` branch to main
2.  Tag release (e.g. `v1.2.3`) and push
3.  Pipeline builds, pushes image, deploys via Coolify
4.  Verify deployment: load domain on a family device
5.  Test critical paths: build a loop, press play, hear the whistle

### Post-Deployment

1.  Watch the kids play (the only "analytics" we need)
2.  Note friction points in plan.md
3.  Plan next iteration

## Continuous Improvement

-   Review workflow after each track
-   Update based on pain points
-   Document lessons learned
-   Optimize for kid happiness
-   Keep things simple and maintainable
