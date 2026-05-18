# Playtest Script

Use this script for fresh-player release-candidate passes. Audio, tooltips, and chat may help, but the player must still be able to explain the visible game state.

## Setup

- Fresh save, default layout, 1366x768 desktop first.
- Moderator gives the task and waits 90 seconds before one neutral hint.
- Record screen, task start/end time, wrong clicks, wrong panels, tooltip hovers, invalid actions, and player comments.
- Export dev telemetry after the run.

## Tasks

| ID | Task | Success Criteria | Telemetry Support |
| --- | --- | --- | --- |
| P1 | Fresh start and move | Player moves without debug travel. | `playtest.timeToFirstMovement` |
| P2 | Talk to guide NPC | Player talks to Mira or another route guide. | `playtest.timeToFirstSuccessfulInteraction` |
| P3 | Identify equipped item | Player says what weapon/gear is equipped and where they saw it. | `playtest.timeToIdentifyEquippedItem`, `windowsOpened.inventory`, `windowsOpened.character` |
| P4 | Assign spell to hotbar | Player assigns a known spell and identifies the slot. | `playtest.timeToAssignHotbar` |
| P5 | Use tool on tree | Player starts or correctly recovers from a tree/tool action. | resource yields, invalid action count |
| P6 | Cast spell | Player explains mana/reagent/range blockers or successful cast. | spell skill events, invalid action count |
| P7 | Fight enemy | Player targets, attacks, and reads danger feedback. | damage dealt/taken, deaths, combat alerts |
| P8 | Heal | Player uses bandage, potion, or heal spell and explains result. | bandages, potions, items consumed |
| P9 | Open journal | Player finds current objective or pinned clue. | `windowsOpened.journal`, objective completion |
| P10 | Complete work order | Player explains required item count and reward. | work orders, market transactions, gold |
| P11 | Place housing object | Player reaches plot/build mode or explains prerequisite. | `windowsOpened.build`, placed buildings |
| P12 | Recover from invalid action | Player resolves one blocked spell/tool/build action unaided. | invalid action count plus recovery note |

## Qualitative Questions

- What do you think is equipped?
- What do you think hotbar slot 3 does?
- Why could or could not you cast that spell?
- Where would you go next?
- What system felt most confusing?
- What felt satisfying?

## Triage

Classify each finding as:

- `blocker`: prevents progress or corrupts state.
- `high friction`: progress possible only after repeated failures or moderator hint.
- `confusing but survivable`: player recovers but cannot explain the system cleanly.
- `polish`: noticeable roughness with no task failure.
- `future idea`: useful feature request, not required for current slice usability.

Keep `future idea` separate from usability fixes. Prioritize blocker and high-friction issues before adding features.

## Findings Template

```text
Tester:
Build:
Viewport / input:

Task timings:
P1 ...

Observed evidence:
1. [severity] Task, player action, telemetry value, quote, proposed fix.

Usability fixes:
1.

Future ideas:
1.

Release recommendation:
pass / needs fixes / block release candidate
```
