# Old River Road Rebuild Notes

Prompt: `143-reference-locked-rebuild-road-and-forest-from-scratch.txt`

Target references:

- `REF_143_OLD_RIVER_ROAD.png`
- `REF_140_TRAVERSABLE_ROAD_FOREST.png`

Implementation scope:

- Rebuilt the road as a readable outdoor combat lane instead of a sparse flat strip.
- Added a river edge, bridge, low fences, checkpoint edge, warning signage, lanterns, road ruts, stone breakup, supplies, bones, broken weapon, and combat pocket markers.
- Locked the road reference plan to explicit zones: river edge, fenced combat lane, combat pocket, and checkpoint edge.
- Updated the road screenshot parity preset so combat proof does not open inventory or status panels over the fight.
- Removed the legacy invisible cabin collision rectangle from the road lane and covered it with a traversability regression.

Acceptance evidence:

- Screenshot proof: `artifacts/playwright/143-old-river-road.png`
- Proof sheet: `artifacts/playwright/143-reference-proof-sheet.png`
- Runner: `artifacts/playwright-runner/143-road-forest-proof.mjs`
- Unit coverage: `src/render/adventure-reference.test.ts`, `src/world/traversability-contract.test.ts`

Deviation note:

- The composition now follows the REF_143 road target within the existing Three.js voxel kit: visible road spine, river/bridge edge, fenced blockers, combat staging, enemy target frame, and unobstructed combat UI.
- Exact bitmap fidelity, painterly texture richness, tree silhouettes, and target image lighting are still lower than the reference because prompt 143 keeps the current renderer and procedural kit. No Three.js renderer rewrite or new gameplay feature was introduced.
