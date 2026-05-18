# External Playtest Release Candidate Gate

This gate decides whether a build can leave internal testing and go to external playtesters.

## Candidate Rules

- No new features enter the candidate after the gate starts.
- Only P0/P1 fixes, regression fixes, copy clarifications, and test/documentation updates are allowed.
- Every tester build needs a visible build label, date, and rollback target.
- Known issues must be written in player-facing language, not implementation terms.
- Any save/load, input, inventory, combat, magic, gathering, map, audio, or window-management regression blocks external playtest.

## Required Checks

- No known movement lock.
- No common portal stuck bug.
- Stable save/load.
- UI reset works after windows have been dragged, resized, and scrolled.
- Spellbook is usable.
- Inventory and equipment state are visible.
- Hotbar assignment works.
- First-hour route is playable.
- No dev buttons are visible in normal mode.
- A 60-minute session is crash-free.
- Known issues are triaged in `KNOWN_ISSUES.md`.
- Feedback collection is ready through `PLAYTEST_FEEDBACK.md`.
- Rollback instructions are ready before testers receive the build.

## Severity Gate

- P0: crashes, broken loading, broken save/load, stuck input, invisible world, or impossible first objective. Blocks release.
- P1: core loop failure in movement, combat, magic, gathering, inventory, map, or UI windows. Blocks release.
- P2: confusing but recoverable UX, copy issue, missing noncritical feedback, or performance risk without confirmed breakage. Can ship only if listed.
- P3: polish, minor visual mismatch, or low-impact content issue. Can ship if listed.

## External Playtest Script

1. Start a new character and move for at least 60 seconds.
2. Open, drag, scroll, and close multiple UI windows.
3. Equip a tool, gather a resource, and put the result in inventory.
4. Equip a weapon or spell, enter combat, and confirm readable hit/miss/block feedback.
5. Cast a spell with enough mana and then try one invalid cast to confirm actionable error text.
6. Open the map, set or clear a waypoint, and follow a landmark back to a known service.
7. Save, reload, and continue the same session.
8. Complete one work order or quest.
9. Export or record the playtest summary.

## Feedback Collection

- Use `PLAYTEST_FEEDBACK.md` for survey questions, bug report fields, and debug info requirements.
- If a tester build has Dev Overlay enabled, export telemetry/debug JSON after a bug.
- If no form link is configured, collect reports with the bug report template.

## Scope Freeze

- No new major systems before the external playtest.
- Blocker and high-friction fixes are allowed.
- Content tuning, UI copy fixes, and low-risk visual polish are allowed.
- Any change that touches movement, portal transitions, save/load, UI reset, spellbook, hotbar, inventory, equipment, or first-hour routing must rerun the gate.

## Exit Criteria

- All blocker gates in `ReleaseCandidateGate` pass.
- No P0/P1 issues are open.
- P2/P3 issues have clear notes and do not hide critical game state.
- The team can reproduce the tester build and roll back to the previous stable build.
