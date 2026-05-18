# Release Candidate Decision

Decision: hold the external playtest build until the 60-minute crash-free session gate is recorded on the final candidate build.

## Required Before Release

- Focused regression tests pass.
- Production build passes.
- Browser smoke confirms load, HUD visibility, UI reset, spellbook opening, and inventory opening.
- A 60-minute session is crash-free or an approved soak equivalent is recorded.
- `KNOWN_ISSUES.md` has no open P0/P1 blockers.
- `PLAYTEST_FEEDBACK.md` is ready for testers.
- Scope remains frozen except for blocker or high-friction fixes, content tuning, UI copy fixes, and low-risk visual polish.

## Release Rule

If any P0/P1 blocker remains open, the build is not released to external testers.
