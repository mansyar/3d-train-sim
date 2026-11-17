# Observation Protocol — Clarity Audit

> This is the single source of truth for running a Tiny Tracks observation
> session and clocking both measures. A parent should be able to reproduce a
> session and time both measures using this document alone. It is an
> artifact-only instrument: it does not change player-facing code, add
> telemetry, or change the app's privacy posture.

## 1. Cohort and consent (P1.T1.1)

- Observe **three children aged 2–4**. The cohort definition is fixed here so a
  later comparison reuses it rather than redefining it.
- The observer is the parent/caregiver of each child. Parent consent covers
  observing the observer's own children. Confirm consent before the first
  session and reconfirm if anything about the session changes.
- Notes are **anonymous and stay on the device / in this track**. Refer to
  children only as child 1, child 2, and child 3.
- No photos, video, audio, names, birthdates, or other identifying details.
  Recordings are forbidden (product guideline: nothing leaves the device).
- If consent is withdrawn at any point: stop observing immediately, delete the
  notes from that session, and mark that child's row **not measured**. Do not
  reconstruct or estimate the missing timings.

## 2. Environment and device setup (P1.T1.2)

- Let each child use the device and physical setup they normally use; the
  protocol records the setup rather than fixing it. Note the device (e.g. iPad,
  Android tablet, phone), browser, and whether the app is installed as a PWA.
- Use a fresh, representative starting state per child (the child's own
  autosaved world, or a consistent documented starting world). Note which was
  used so sessions are comparable.
- Confirm before starting: the app is fully offline-capable (airplane mode is
  fine), sound is set to the child's usual preference, and nothing else on the
  device will intrude (notifications silenced).
- The observer watches and times unobtrusively. The child is never prompted to
  read, and no instructions are given beyond what the app itself shows — the
  kid UI is icon-only and the train is always autonomous.

## 3. Session flow (P1.T1.2)

1. Note device, browser, and starting state (§2).
2. Start the session clock at app **open/wake** (§4.1).
3. Let the child interact unassisted. Time the first ride (§4.1).
4. Continue observing from the child's first self-directed placement (§4.2).
5. Stop the unassisted clock at disengagement, adult help, or the 20-minute cap
   (§4.2), whichever comes first.
6. Record both measures, the observer notes, and any friction points in the
   companion report template. If a measure cannot be taken, mark it
   **not measured** and note why — never invent a number.

## 4. Clock definitions (P1.T1.3)

The two measures are defined exactly as follows; reuse them unchanged.

### 4.1 time-to-first-ride

- **Start:** the moment the app is opened or woken (app open/wake) for the
  session.
- **Stop:** the first successful ride — the train visibly chugging around the
  child's track.
- Record the elapsed time to the first ride. This is the measure compared
  against the v1.0 gate figure of three of three children reaching a first ride
  unassisted within 60 seconds.

### 4.2 unassisted session length

- **Start:** the child's first self-directed placement (the first piece the
  child places of their own accord).
- **Stop:** the moment the child disengages or an adult helps — i.e. the child
  stops interacting on their own, or an adult intervenes in any way.
- **Cap:** stop at **20 minutes** even if the child is still playing. Record the
  cap value (20:00) and note that the cap was reached; do not extrapolate.
- This is the measure compared against the v1.0 gate figure of one 10+ minute
  unassisted session.

## 5. Interruptions, disengagement, and disagreement (P1.T1.2)

- **Adult intervenes during a session:** stop the unassisted clock at that
  moment and tag the interruption as friction. Do not continue the unassisted
  measure past the intervention.
- **Child disengages:** stop the unassisted clock at the last self-directed
  interaction. A brief pause that resolves on its own is not disengagement;
  sustained loss of interest is.
- **A sibling or another device interrupts:** discard that timing, note the
  reason, and repeat once with the same protocol if possible.
- **Device or app failure:** record it as friction, not as a child failure —
  the app has no fail states, so a fault is never attributed to the child.
- **No ride within 20 minutes:** record the cap value (20:00) for
  time-to-first-ride's window and note the blocker; do not extrapolate a
  first-ride time.
- **Disagreement between observers about an event:** resolve by the rule that
  "adult help ends the unassisted clock" takes precedence; note the
  disagreement and its resolution in observer notes so the record is
  reproducible.

## 6. Notes and privacy (FR-6)

- All notes are anonymous (child 1/2/3 only), descriptive, and non-identifying.
- No recordings and no identifying details are made or retained.
- Notes remain on the device / in this track only; nothing is transmitted.
- For a withdrawn-consent session, delete the session's notes and mark the row
  **not measured** (§1).

## 7. Traceability (NFR-3)

| Criterion | Requirement | Satisfied by |
| --- | --- | --- |
| AC-1 | 3-child 2–4 cohort, consent rules, session steps, both clock definitions, 20-minute cap, interruption handling | §1, §3, §4, §5 |
| FR-1 | Cohort of three children aged 2–4, parent consent, repeatable session flow, interruption/disagreement handling | §1, §3, §5 |
| FR-2 | time-to-first-ride (open/wake → first ride); unassisted session length (first placement → disengage/help, 20-minute cap) | §4.1, §4.2 |
