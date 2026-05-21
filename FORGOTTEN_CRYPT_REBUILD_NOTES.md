# Forgotten Crypt Rebuild Notes

Prompt: `144-reference-locked-rebuild-forgotten-crypt-from-scratch.txt`

Target references:

- `REF_144_CRYPT_COMBAT.png`
- `REF_144_CRYPT_SECRET.png`
- `REF_143_OLD_RIVER_ROAD.png` for combat UI hierarchy only

Implementation scope:

- Rebuilt Forgotten Crypt into named composition zones: entrance threshold, central combat chamber, secret reliquary, and altar niche.
- Added readable dungeon dressing with columns, low walls, torch pools, sarcophagi, tombs, altar, cracked floors, rubble, bones, chains, hidden niche, false door, lever, reliquary pedestal, and subtle rune lighting.
- Updated R3 combat screenshot parity to use the REF_144-style combat UI hierarchy: target frame plus inventory and spellbook, without the status panel blocking the fight.
- Added a separate R3S crypt secret proof state for the exploration reference, with visible hidden-niche/reliquary/altar cues, player-facing prompt copy, and no extra panel clutter.
- Kept traversal routes to the forest exit, combat chamber, altar niche, secret wall, and warded reliquary covered by tests.

Acceptance evidence:

- Screenshot proof: `artifacts/playwright/144-crypt-combat.png`
- Screenshot proof: `artifacts/playwright/144-crypt-secret.png`
- Proof sheet: `artifacts/playwright/144-reference-proof-sheet.png`
- Runner: `artifacts/playwright-runner/144-forgotten-crypt-proof.mjs`
- Unit coverage: `src/render/adventure-reference.test.ts`, `src/world/traversability-contract.test.ts`, `src/tools/production-tools.test.ts`

Deviation note:

- The crypt now matches the REF_144 composition contract inside the existing voxel/procedural kit: readable dark combat, visible target frame and spell feedback, torch pools, floor breakup, pillars, altar, reliquary, secret cues, and no debug text in proof.
- Exact painterly stone texture density, character silhouettes, minimap art, and high-fidelity lighting from the reference bitmaps remain art-pipeline deviations. No Three.js renderer rewrite or new gameplay feature was introduced.
