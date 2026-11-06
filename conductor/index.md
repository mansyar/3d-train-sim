# Conductor Index — Tiny Tracks

<!-- conductor-version: 2 -->

Source-of-truth index for the Tiny Tracks project (web-based 3D toy train
simulator for toddlers). All project management documents live in `conductor/`.
New to the repo? Start with the top-level [README](../README.md) and the
[contributing guide](../CONTRIBUTING.md); this folder is the deep source of truth.

## Core Documents

- **Product Definition:** [product.md](product.md) — vision, target users, success criteria
- **Tech Stack:** [tech-stack.md](tech-stack.md) — pinned toolchain, commands, deployment pipeline
- **Product Guidelines:** [product-guidelines.md](product-guidelines.md) — the quality bar for a toddler product
- **Workflow:** [workflow.md](workflow.md) — implementation protocol (TDD for logic-bearing code, notes in plan.md)
- **Tracks Registry:** [tracks.md](tracks.md) — all tracks and their status

## Tracks

- **Tracks Registry:** [tracks.md](tracks.md) — every track and its status
- **Tracks Directory:** [tracks/](tracks/) — one folder per active track,
  containing `spec.md`, `plan.md`, `metadata.json`, and `verification/`
- **Archive:** [archive/](archive/) — completed tracks, kept as history

## Code Styleguides

- [code_styleguides/typescript.md](code_styleguides/typescript.md)
- [code_styleguides/html-css.md](code_styleguides/html-css.md)
- [code_styleguides/general.md](code_styleguides/general.md)

## Capabilities

- [Phase Executor](../.opencode/agents/conductor-phase.md)
- [Reviewer](../.opencode/agents/conductor-reviewer.md)
