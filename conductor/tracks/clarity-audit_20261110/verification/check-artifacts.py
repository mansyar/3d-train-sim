#!/usr/bin/env python3
"""Deterministic completeness gate for the clarity-audit artifacts.

Asserts required headings, table columns, pending (no-invented-number) values,
and AC-to-FR traceability across protocol.md, report.md and comparison.md, plus
the Shipped roadmap row in product.md. Artifact-only: no app code is read.
Source is ASCII-only (non-ASCII characters use \\u escapes) for shell portability.
"""

from pathlib import Path
import sys

# verification/ -> clarity-audit_20261110 -> tracks -> conductor -> repo root
ROOT = Path(__file__).resolve().parents[4]
TRACK = ROOT / "conductor" / "tracks" / "clarity-audit_20261110"

FILES = {
    "protocol.md": TRACK / "protocol.md",
    "report.md": TRACK / "report.md",
    "comparison.md": TRACK / "comparison.md",
    "product.md": ROOT / "conductor" / "product.md",
}

failures = []
checks = 0


def read(label):
    path = FILES[label]
    if not path.is_file():
        failures.append(f"{label}: file not found at {path}")
        return ""
    return path.read_text(encoding="utf-8")


def has(needle, text, label):
    global checks
    checks += 1
    if needle not in text:
        failures.append(f"{label}: missing {needle!r}")


def has_all(needles, text, label):
    for needle in needles:
        has(needle, text, label)


def require(condition, label, message):
    global checks
    checks += 1
    if not condition:
        failures.append(f"{label}: {message}")


protocol = read("protocol.md")
report = read("report.md")
comparison = read("comparison.md")
product = read("product.md")

# --- protocol.md: headings, clock rules, privacy, AC-1 -> FR-1/FR-2 trace ---
has_all([
    "# Observation Protocol",
    "## 1. Cohort and consent",
    "## 3. Session flow",
    "## 4. Clock definitions",
    "## 5. Interruptions, disengagement, and disagreement",
    "## 7. Traceability (NFR-3)",
], protocol, "protocol.md")
has_all([
    "2\u20134",                       # three children aged 2-4 (en dash)
    "consent",
    "not measured",
    "app open/wake",
    "first successful ride",
    "first self-directed placement",
    "disengages",
    "20-minute cap",
    "Recordings are forbidden",
    "No recordings",
], protocol, "protocol.md")
has_all(["time-to-first-ride", "unassisted session length"], protocol, "protocol.md")
# AC-to-FR traceability table in this artifact.
has_all(["| AC-1 |", "| FR-1 |", "| FR-2 |"], protocol, "protocol.md")

# --- report.md: per-child and friction columns, pending cells, traceability ---
has_all([
    "# Session Report Template",
    "## Scope and privacy (FR-6)",
    "## Per-child session records (FR-3, FR-6)",
    "## Ranked friction points (FR-4)",
    "## Traceability (NFR-3)",
], report, "report.md")
has_all([
    "| Child |",
    "Setup (device / browser / PWA / starting state)",
    "time-to-first-ride",
    "unassisted session length",
    "Observer notes",
    "Affected-child count",
    "Severity",
    "| Rank |",
    "affected-child count first, then",
    "not measured",
], report, "report.md")
# Exact per-child rows: both result cells are the pending placeholder only.
for child in ("child 1", "child 2", "child 3"):
    has(f"| {child} | not yet observed | not measured | not measured | \u2014 |",
        report, "report.md")
# Exact ranked friction rows 1-5: count and severity stay pending.
for rank in ("1", "2", "3", "4", "5"):
    has(f"| {rank} | \u2014 | not measured | not measured | \u2014 |",
        report, "report.md")
# AC-to-FR traceability table in this artifact.
has_all(["| AC-2 |", "| AC-3 |", "| FR-3 |", "| FR-4 |", "| FR-6 |"],
        report, "report.md")

# --- comparison.md: baseline columns, pending values, source, traceability ---
has_all([
    "# Comparison Artifact",
    "## Current-state baseline: v0.12.0 (FR-5, AC-4)",
    "## Why no numbers exist (FR-5, AC-4)",
    "## Imported field definitions (FR-5)",
    "## Privacy (FR-6)",
    "## Traceability (NFR-3)",
], comparison, "comparison.md")
has_all([
    "v0.12.0 current-state baseline",
    "v1.0 gate reference (from",
    "awaiting observation",
    "v0.12.0",
    "progressive-disclosure_20261110",
    "audit-comparison notes",
    "numbers exist, and none are invented",
], comparison, "comparison.md")
# Exact baseline rows: the current-state cell is pending only.
has("| time-to-first-ride | awaiting observation | three of three children unassisted within 60 seconds |",
    comparison, "comparison.md")
has("| unassisted session length | awaiting observation | one 10+ minute unassisted session |",
    comparison, "comparison.md")
# AC-to-FR traceability table in this artifact.
has_all(["| AC-4 |", "| FR-5 |", "| FR-6 |"], comparison, "comparison.md")

# --- product.md: Shipped roadmap row linking to the track artifacts ---
roadmap_rows = [
    line for line in product.splitlines() if "`clarity-audit_20261110`" in line
]
require(bool(roadmap_rows), "product.md", "missing clarity-audit_20261110 roadmap row")
if roadmap_rows:
    row = roadmap_rows[0]
    has("**Shipped 2026-11-17**", row, "product.md roadmap row")
    has("conductor/tracks/clarity-audit_20261110/", row, "product.md roadmap row")
    has("protocol.md", row, "product.md roadmap row")
    has("report.md", row, "product.md roadmap row")
    has("comparison.md", row, "product.md roadmap row")

if failures:
    print(f"FAIL: {len(failures)} of {checks} checks failed")
    for failure in failures:
        print(f"  - {failure}")
    sys.exit(1)

print(f"OK: {checks} artifact checks passed across 4 files")
