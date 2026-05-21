# Greymont Forest Rebuild Notes

Prompt: `143-reference-locked-rebuild-road-and-forest-from-scratch.txt`

Target references:

- `REF_143_GREYMONT_FOREST.png`
- `REF_140_TRAVERSABLE_ROAD_FOREST.png`

Implementation scope:

- Rebuilt Greymont Forest around readable path branches instead of a random flat field.
- Added path-network markers, mine approach dressing, ore clusters, mine rail/cart props, town-road bridge cues, gathering clearing props, understory stumps, mushrooms, forage clues, log piles, and dense path-edge brush.
- Locked the forest reference plan to explicit zones: mine approach, gathering clearing, town-road bridge, and forest understory.
- Moved active gathering progress into the resource world label and removed the duplicated bottom HUD gathering progress bar.
- Preserved visible walkability through the bridge centerline, mine approach, gathering clearing, and herb loop.

Acceptance evidence:

- Screenshot proof: `artifacts/playwright/143-greymont-forest.png`
- Proof sheet: `artifacts/playwright/143-reference-proof-sheet.png`
- Runner: `artifacts/playwright-runner/143-road-forest-proof.mjs`
- Unit coverage: `src/render/adventure-reference.test.ts`, `src/world/traversability-contract.test.ts`, `src/game/world-feedback.test.ts`, `src/ui/action-progress.test.ts`

Deviation note:

- The forest now follows the REF_143 target composition within the existing voxel/procedural runtime: denser readable tree/understory framing, clear paths, mine landmark, resource affordances, and compact single-source progress feedback.
- Exact foliage art density, painterly ground texture, asset silhouettes, and lighting still do not match the reference bitmap. Those remain renderer/art asset fidelity deviations, not layout, traversal, or UX blockers for prompt 143.
