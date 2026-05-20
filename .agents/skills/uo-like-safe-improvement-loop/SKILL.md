---
name: uo-like-safe-improvement-loop
description: Use when improving the UO-like project through bounded or indefinite evidence-first loops across performance, UX, gameplay depth, content quality, visual budget, save/load health, release-candidate stability, docs, or internal-alpha polish, including Yellow-risk targets with extra proof, without weakening tests, budgets, player-facing semantics, or current validation gates.
---

# UO-like Safe Improvement Loop

## Overview

Use this skill to improve `E:\Projects\UO-like` continuously without turning "improvement" into speculative churn. Pick one measurable target at a time, protect player-facing meaning, run the tightest useful proof, and keep only changes that make the project demonstrably stronger.

Default to a bounded one-target loop. Use indefinite mode only when the user explicitly asks for an ongoing, repeated, or "keep improving" loop.

## Required Companion Skills

- Use `superpowers:systematic-debugging` for failed tests, broken builds, browser/runtime errors, noisy measurements, or unexplained regressions.
- Use `superpowers:test-driven-development` when adding behavior, fixing a bug, or creating regression coverage.
- Use `superpowers:verification-before-completion` before claiming the project is improved, stable, passing, or ready.
- Use frontend/game UI skills only when a rendered UI, HUD, panel, browser game flow, or visual surface changes.

## Current UO-like Gate Map

Use `package.json` and current docs as source of truth before each run. As of this skill creation, the main local gates are:

- Static quality: `npm run lint`.
- Full tests: `npm test`.
- Focused UI/performance regression gate: `npm run test:perf-ui`.
- Content registry validation: `npm run content:validate`.
- Production build: `npm run build`.
- Combined health shortcut: `npm run build:health` is `npm test && npm run build`, not a full publish gate.

Important living docs to read when relevant:

- `PERFORMANCE_BUDGET.md`, `PERFORMANCE_AUDIT.md`, and `VISUAL_BUDGET.md` for runtime, render, DOM, visual, and screenshot-parity budgets.
- `STABILITY_GATE.md`, `SAVE_LOAD_HEALTH_NOTES.md`, and `GOLDEN_PATH_QA.md` for input, window, save/load, and first-hour route contracts.
- `NEXT_PILLAR_MATRIX.md`, `INTERNAL_ALPHA_NOTES.md`, `RELEASE_CANDIDATE_DECISION.md`, and `KNOWN_ISSUES.md` for product direction and release risk.
- Feature-specific `*_QA.md` files for the surface being changed.

Known accepted non-blockers must not be misreported as new failures unless they change: the Vite large chunk warning and the currently documented `content:validate` warning set.

## Core Loop

1. Check `git status --short --branch`; never overwrite user changes or stage unrelated artifacts.
2. Read `package.json`, the relevant docs, and the tests around the target surface before editing.
3. Read `.agents/uo-like-safe-improvement-loop.md`; create it only if a loop needs reusable project-specific learnings.
4. Choose one target from objective evidence: failing gate, known issue, budget pressure, release blocker, Golden Path gap, QA checklist gap, user-facing friction, or the current pillar matrix. Prefer Green when it is valuable, but do not skip Yellow solely because it is Yellow.
5. State the hypothesis, touched files, expected improvement, risk class, objective gates, browser smoke plan if needed, and rollback plan.
6. Make one small change.
7. Run the smallest correctness check first.
8. Run the narrowest relevant regression gate, then broaden only as risk requires.
9. Keep the change only if the Objective Decision Matrix says it is a confirmed improvement.
10. Revert or split neutral, noisy, mixed, risky, or below-proof changes.
11. After every kept change, refresh the target map before choosing the next target.

## Objective Decision Matrix

### Confirmed Improvement: keep

Keep the change only when all relevant checks are true:

- The specific bug, gap, budget pressure, UX issue, or release risk is reduced by observable evidence.
- Focused tests or content validation cover the changed behavior where practical.
- No test, assertion, budget, fixture, or validation command was weakened.
- Gameplay rules, rewards, economy pacing, skill meaning, save/load schema, input contracts, and content semantics are preserved unless the user explicitly scoped that change.
- Relevant gates pass:
  - logic/system change: focused Vitest test, then `npm test` when shared behavior is touched;
  - UI/performance/render change: focused test plus `npm run test:perf-ui`;
  - content/data change: focused test if present plus `npm run content:validate`;
  - release-significant change: `npm run lint`, `npm test`, `npm run test:perf-ui`, `npm run content:validate`, and `npm run build`;
  - rendered UX change: browser smoke at desktop and mobile-sized viewports when the affected flow is visible.
- Docs are updated if the change alters a documented gate, budget, release status, QA state, or known issue.
- The diff is small enough to review and has a clear rollback path.

### Clear Reject: revert

Revert the attempt when any are true:

- A correctness test, content validation, perf/UI gate, build, or browser smoke fails because of the change.
- The change only sounds better but has no objective evidence.
- It loosens budgets, removes assertions, narrows coverage, hides warnings, or changes fixtures to create a pass.
- It changes economy output, rewards, RNG, timers, first-hour routing, save/load meaning, input priority, or release criteria without explicit scope and targeted proof.
- It introduces broad architecture churn, a new dependency, or a package/build setting change only to avoid a local issue.
- It creates visible UI overlap, hidden controls, unreadable text, stale HUD state, lost hotbar/window state, or unreliable mobile interaction.

### Retest or Split

Retest or split the attempt when:

- One metric improves but another relevant gate regresses.
- Browser evidence is flaky or viewport-dependent.
- Multiple ideas landed together and the source of the improvement is unclear.
- The change is Yellow risk and lacks enough extra proof.
- The improvement is real but belongs in docs/tests first before behavior changes.

## Risk Classes

Classify every target before editing.

### Green: normally allowed

- Focused docs updates that align with current code and commands.
- Regression tests for existing intended behavior.
- Pure deterministic helper refactors with identical inputs and outputs.
- Content typo/dead-reference fixes that do not change rewards, access, or progression.
- UI copy/affordance clarity that does not alter routing, rewards, or controls.
- CSS/layout containment fixes with browser proof and no normal-mode debug leakage.
- Render/material/geometry reuse that preserves visual parity and interaction targets.
- Dev-only diagnostic improvements that do not affect normal play.

### Yellow: allowed with extra proof

Yellow is a normal working class for this loop, not an automatic skip class. Execute a Yellow target when the safety statement is credible, the change can stay narrow, and the extra proof can be run in the current session. Ask for user scope only when the target needs manual wall-clock playtesting, a major product decision, unavailable credentials/devices, or a protected semantic change.

- Input routing, pointer capture, hotbar, window manager, scroll, or modal behavior.
- Save/load, snapshot, transition, or reconciliation changes.
- Loop governor, RAF cadence, tooltip/minimap/HUD dirty-state, or browser scheduling.
- Combat, economy, crafting, treasure, housing, skill, profession, magic, AI, or living-world behavior.
- Visual density, new prop families, VFX, dynamic lights, raycast candidates, or scene budget changes.
- Content additions that affect first-hour route, rewards, sinks, clues, quests, work orders, or progression.
- Accessibility/localization changes that alter visible instructions or onboarding flow.

For Yellow changes, include a short safety statement:

```md
Safety Statement:
- Player-facing meaning preserved:
- State/save/load impact:
- Input/UI/viewport impact:
- Budget/performance impact:
- Extra targeted proof:
- Rollback plan:
```

### Red: proposal only unless explicitly requested

- Broad architecture rewrite or framework replacement.
- New dependency, package manager, TypeScript/Vite semantics, or build-pipeline replacement.
- Reward inflation, economy bypass, RNG redistribution, timer reset semantics, or skill/progression rebalance not requested by the user.
- Save schema migration or multiplayer/network authority contract changes.
- Removing Golden Path, Stability Gate, content validation, visual budget, or release-candidate requirements.
- Second region, multiplayer gameplay, pets/taming, or large new pillar work when the current request is an open-ended improvement loop.

Do not silently discard Red targets. Record them as proposals with the protected invariant, the reason they are outside autonomous scope, and the smallest explicit approval that would make one target actionable. Then continue searching for Green or feasible Yellow work.

## Improvement Surface Map

Use current evidence over this list, but rotate surfaces when an epoch plateaus.

- Stability and release health: `ReleaseCandidateGate`, `StabilityGateHarness`, input routing, window management, transition recovery, save/load, known issues.
- Performance and UI budget: `LoopGovernor`, `PerfMonitor`, `UIRenderGuards`, `UIManager`, `TooltipManager`, `Minimap`, `RenderBudgets`, `VoxelRenderer`, CSS containment, DOM/window counts.
- Golden Path and onboarding: First Hour Director, Guide, Journal, map objectives, first-hour skill visibility, fresh-save route, browser smoke.
- Gameplay depth: treasure chains, combat roles, utility magic, crafting, economy sinks, housing/workshop, professions, skills, living-world events, reputation/crime.
- Content and data integrity: `src/data/*`, `ContentRegistry`, `ContentValidation`, strings, quests, recipes, work orders, risk zones, treasure, visual prefabs.
- Visual and interaction quality: `VoxelKit`, `Materials`, area reference plans, HUD hierarchy, mobile layout, target frames, VFX, screenshot-parity docs.
- Audio and feedback: `AudioManager`, `WorldFeedback`, action feedback language, reduced-motion behavior, prompt clarity.
- Docs and planning: README, QA docs, budget docs, internal alpha notes, release decision, pillar matrix.

## Indefinite Mode

Indefinite means repeated bounded epochs with evidence and retargeting. It does not mean editing until exhaustion, making broad rewrites, or keeping speculative changes.

An epoch is up to five attempts on one surface or closely related target family.

After each confirmed improvement:

1. Keep the change.
2. Run the relevant full gate for the risk class.
3. Record the exact commands and evidence.
4. Update `.agents/uo-like-safe-improvement-loop.md` only for reusable project-specific lessons.
5. Retarget from current evidence, not from stale assumptions.

An epoch plateaus when five consecutive attempts are reverted, noisy, risky, mixed, or not objectively useful. Plateau means retarget, not stop.

If the known backlog is Yellow-only or Red-only, do not stop immediately. First promote any feasible Yellow target into an active attempt with a Safety Statement and extra proof. For Red targets, record approval-ready proposals instead of editing them. Then expand discovery across current gates, docs, QA checklists, known issues, TODO-like test gaps, browser-visible friction, and the current pillar plan. Stop only if fresh discovery still finds no Green or feasible Yellow candidate inside the current autonomous scope.

Final reporting is allowed only when:

- the user asks to stop;
- a user-provided time, attempt, token, or cost budget is reached;
- the environment prevents reliable validation after retry and retargeting;
- a fresh discovery pass plus the Exhaustion Protocol finds no remaining Green or feasible Yellow candidates inside the current autonomous scope;
- all remaining known candidates require explicit user scope, because they are Yellow without runnable proof in this session or Red protected-surface work.

## Exhaustion Protocol

Before saying there is nothing safe left to improve:

1. Run fresh discovery from current evidence: failing or skipped gates, changed docs, QA unchecked boxes, `KNOWN_ISSUES.md`, current budget docs, current pillar matrix, browser-visible friction, and nearby missing regression tests.
2. Show the target map grouped by surface.
3. List at least 10 candidates considered, or all candidates if fewer exist.
4. Mark each Green, Yellow, or Red.
5. For every Green candidate, give one objective reason it is unavailable now.
6. For every Yellow candidate, state whether it is feasible now. If feasible, start a Yellow attempt instead of finalizing. If not feasible, state the missing proof or user scope.
7. For every Red candidate, state the protected invariant it would touch.
8. If any Green or feasible Yellow candidate remains, start a new epoch.

## Learning Journal

Use `.agents/uo-like-safe-improvement-loop.md` for reusable lessons only. Do not log routine attempts.

Add an entry when discovering:

- a reproducible bottleneck or UI/UX failure pattern;
- a rejected change with a reusable safety lesson;
- a project-specific save/load, input, content-validation, visual-budget, or Golden Path hazard;
- a safe pattern for batching, caching, layout containment, content authoring, or browser smoke;
- a measurement instability pattern and how to avoid it.

Format:

```md
## YYYY-MM-DD - Title
**Learning:** Insight.
**Evidence:** Commands, report paths, screenshots, or test output.
**Action:** How to apply or avoid next time.
```

## Attempt Summary Format

After each attempt, report compactly:

```md
### Attempt N - target
- Surface: stability | performance | UX | gameplay | content | visual | docs | release
- Risk class: Green | Yellow | Red proposal
- Hypothesis: ...
- Changed files: ...
- Objective gates: ...
- Correctness check: command + result
- Browser proof: none | viewport(s) + result
- Decision: kept | reverted | split | retest needed | skipped
- Reason: ...
- Journal: none | updated entry title
- Next: ...
```

## Preferred Improvement Families

- Fix known release blockers before adding breadth.
- Add regression tests for intended behavior before refactoring.
- Make first-hour, Golden Path, save/load, and input reliability boringly dependable.
- Reduce UI work through dirty-state, caching, containment, and stable dimensions.
- Reuse materials, geometry, icon markup, and data-driven registries before adding one-off assets.
- Improve affordances, prompts, and feedback where browser smoke shows confusion or stale state.
- Deepen the current region and current pillar before starting unrelated major systems.
- Keep docs synchronized with commands, budget state, known warnings, and actual implementation.

## Avoid

- Vague "polish" commits without a scenario, gate, or before/after evidence.
- Wide rewrites that touch several systems without one clear objective.
- Chasing a metric by hiding content, reducing coverage, or weakening a budget.
- Introducing normal-mode debug controls, unreachable UI, unbounded DOM, or dense scene props without budget capture.
- Treating accepted warnings as fixed, or new warnings as accepted, without updating the relevant docs.
- Skipping Yellow targets merely because they are Yellow when a narrow change and extra proof are available.
- Ending an open-ended improvement loop on the first plateau when safe Green or feasible Yellow targets remain.
