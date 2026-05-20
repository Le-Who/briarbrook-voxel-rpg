# Known Issues

This file is the release-candidate issue ledger for the small external playtest.

| Issue | Severity | Owner | Reproduction / evidence note | Workaround | Blocks Playtest |
| --- | --- | --- | --- | --- | --- |
| 60-minute crash-free session has not yet been recorded for the final candidate build. | P0 | Release director / QA operator | No final-candidate 60-minute wall-clock log is attached as of 2026-05-20. | Run the soak gate or an approved equivalent before sending the build to external testers. | Yes |

## Severity Policy

- P0: crash, load failure, broken save/load, movement lock, portal stuck, impossible first objective, or normal-mode debug controls. Blocks playtest.
- P1: first-hour route failure, unusable spellbook, invisible equipment state, broken hotbar assignment, or repeated UI reset failure. Blocks playtest.
- P2: recoverable UX issue, confusing copy, noncritical feedback gap, or performance risk. Can ship only if listed with a workaround.
- P3: polish issue or minor content mismatch. Can ship if listed.

## Update Rule

Every issue needs an owner, reproduction note, workaround, and explicit playtest blocker decision before the build is shared externally.
