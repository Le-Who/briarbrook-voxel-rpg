# Next Pillar Matrix

Prompt: 108 - next pillar decision matrix
Date: 2026-05-20
Decision owner: Release director pass after internal alpha

## Scoring Model

All scores are 1-5. 5 = favorable.

For positive-fit criteria, 5 means stronger fit. For implementation cost, bug risk, content burden, performance risk, and multiplayer dependency, 5 means lower cost, lower risk, lower burden, or lower dependency.

| Candidate | Strengthens current identity | Uses existing systems | Player value | Implementation cost | Bug risk | Content burden | Performance risk | Multiplayer dependency | First-hour relevance | Long-term retention | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Treasure Hunting expansion | 5 | 5 | 5 | 4 | 3 | 3 | 4 | 5 | 4 | 5 | 43 |
| Local economy depth | 4 | 5 | 4 | 3 | 3 | 3 | 5 | 5 | 4 | 5 | 41 |
| Living world events expansion | 5 | 4 | 4 | 3 | 3 | 4 | 4 | 5 | 4 | 5 | 41 |
| Housing Tier 2-3 | 4 | 5 | 4 | 3 | 3 | 3 | 4 | 5 | 3 | 5 | 39 |
| Advanced crafting/quality | 4 | 4 | 4 | 3 | 3 | 3 | 5 | 5 | 3 | 5 | 39 |
| Procedural contracts | 4 | 4 | 4 | 3 | 3 | 4 | 5 | 5 | 3 | 4 | 39 |
| Reputation/crime | 4 | 4 | 4 | 2 | 2 | 3 | 4 | 5 | 3 | 4 | 35 |
| Pets/taming | 4 | 2 | 4 | 2 | 2 | 3 | 3 | 5 | 2 | 5 | 32 |
| Second region | 4 | 3 | 5 | 1 | 2 | 1 | 2 | 5 | 2 | 5 | 30 |
| Guild/social systems | 3 | 2 | 3 | 2 | 2 | 4 | 4 | 3 | 1 | 4 | 28 |
| Multiplayer town room | 4 | 2 | 4 | 1 | 1 | 2 | 2 | 1 | 2 | 4 | 23 |
| Multiplayer dungeon instance | 4 | 2 | 4 | 1 | 1 | 2 | 1 | 1 | 2 | 5 | 23 |

## Chosen Pillar

Treasure Hunting expansion.

The next pillar should deepen treasure chains, dungeon secrets, clue reading, locked and trapped containers, and utility spell interactions inside the current region.

## Why Now

The current product identity is a dense one-region UO-like RPG: local exploration, secrets, utility magic, gathering, crafting, housing, and small-town economy. Treasure Hunting expansion strengthens that identity without requiring a second region or multiplayer reliability.

The foundation already exists: treasure maps, secrets, interactable containers, utility spells, loot, map and journal surfaces, balance telemetry, first-hour guardrails, content validation, accessibility checks, and internal alpha notes. This makes the pillar mostly a depth pass over existing systems instead of a new platform bet.

Treasure chains also connect the strongest near-term support pillars. A clue can start from a rumor, consume crafted tools or reagents, route through local economy sinks, unlock housing trophies or workshop recipes, and trigger living world follow-up events.

## Why Not The Rest

Local economy depth is a close second, but it is strongest as a support layer for treasure rewards, repairs, services, and item sinks. It should be expanded in the treasure MVP where it has a concrete player-facing loop.

Living world events expansion is also strong, but it needs memorable triggers. Treasure discoveries are better immediate triggers than a broad event system pass.

Housing Tier 2-3 has strong retention value, but it needs more reasons to decorate, upgrade, and display finds. Treasure trophies and rare materials should come first.

Advanced crafting/quality and procedural contracts are useful, but they are better follow-up systems once treasure rewards and sink pressure expose the real balance needs.

Reputation/crime is promising but higher risk. It touches guards, safe zones, theft, punishment, AI response, and player onboarding clarity. It should wait until the internal alpha loop has more playtest evidence.

Delay multiplayer until the solo loop is proven. Multiplayer town rooms and multiplayer dungeon instances score low now because they add netcode, persistence, authority, and QA burden before the single-player identity has enough evidence.

Delay second region until the current region is dense. A second region would multiply content burden and performance risk while Briarbrook, Old River Road, Greymont Forest, and Forgotten Crypt still have room for secrets, contracts, housing ties, and economy hooks.

Delay pets/taming until AI/pathing and companion foundations are strong. Pets would be valuable later, but current risk sits in movement, combat targeting, save/load behavior, and companion command clarity.

Guild/social systems need multiplayer, identity, and retention proof first. They should not lead the next milestone.

## MVP Scope

- Add 3-5 authored treasure chains in the current region.
- Support clue tiers: town rumor, map hint, landmark clue, hidden object, locked or trapped container.
- Use existing locations first: Briarbrook, Old River Road, Greymont Forest, Forgotten Crypt, player plot edges.
- Require at least two utility checks across the pillar: Detect Magic, Telekinesis, Unlock, Magic Lock or Magic Trap.
- Add lock, trap, and container variants with readable affordances and noncombat failure states.
- Tie treasure rewards to local economy sinks: repair, reagents, crafting inputs, housing trophies, and vendor buy caps.
- Add journal and map entries for accepted clues, discovered landmarks, failed checks, and completed chains.
- Add content validation for treasure chains: reachable clue targets, valid item ids, valid spell gates, valid reward budgets, and no dead references.
- Add telemetry for clue accepted, clue completed, time to first find, time to chain completion, damage taken, deaths, spell use, reagent use, repair cost, and reward value.
- Keep all work inside current performance guardrails for draw calls, object counts, DOM updates, tooltip stability, and frame time.

## Explicit Non-Goals

- No second region.
- No multiplayer gameplay.
- No pets or taming.
- No full procedural dungeon generator.
- No broad spell school expansion.
- No auction house or global economy.
- No new UI framework dependency for a single treasure screen.
- No reward inflation that bypasses work orders, repairs, reagents, or housing sinks.
- No debug buttons in normal mode.

## Kill Criteria

- Stop the pillar if more than 25% of internal alpha testers cannot understand the first clue without help after onboarding copy and affordance fixes.
- Stop or cut scope if any treasure feature causes repeated save/load regression, stuck recovery increase, tooltip remount instability, or Golden Path failure.
- Stop or cut scope if treasure rewards push gold, rare material, or repair economy outside the balance report targets.
- Stop or cut scope if the first 3 treasure chains require bespoke scripts that cannot pass content validation or are too expensive to maintain.
- Stop or cut scope if scene density changes break performance guardrails by more than 10% on target viewports.
- Switch to Local economy depth if treasure rewards reveal that sinks and services are the real blocker.
- Switch to Living world events expansion if testers value rumors and consequences more than clue solving.

## Success Metrics

- At least 70% of internal alpha testers complete the first treasure chain without external help.
- Median first treasure completion lands between 10 and 20 minutes after clue acceptance.
- At least 50% of completed treasure chains use two or more utility tools or spells.
- Treasure reward output stays within BalanceSystem gold, resource, durability, and reagent targets.
- No critical exploit, save/load, Golden Path, or stuck recovery regression.
- Tooltip stability and UI panel persistence remain at or above the internal alpha baseline.
- At least 60% of testers report that they would pursue another clue.
- At least one housing, economy, or living world follow-up hook is generated by a completed chain.

## Prompt 108 Execution Record

Done:

- Candidate pillars scored against all requested criteria.
- Treasure Hunting expansion selected as the next pillar.
- Multiplayer, second region, and pets/taming explicitly delayed.
- MVP scope, explicit non-goals, kill criteria, and success metrics defined.

Not done:

- No gameplay implementation was added in this prompt because prompt 108 is a decision gate.
- No playtest data was newly collected in this prompt.

Remaining risks:

- Scores are evidence-informed from current systems and QA gates, but still need real internal alpha playtest confirmation.
- Treasure scope must stay authored and data-validated; otherwise content burden can overtake the pillar.
- Economy and housing hooks must remain sinks and rewards, not separate uncontrolled feature branches.
