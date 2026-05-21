# Smithy Rebuild Notes

Prompt: `145-reference-locked-rebuild-service-interiors-and-player-plot`

Target reference: `REF_145_SMITHY.png`

Implemented:
- Reframed Brom's Smithy around a readable forge hearth, anvil workspace, tool walls, material staging, quench tub, repair bench, and weapon stand.
- Kept the service UI as the real crafting flow: recipe list, selected recipe detail, requirements, crafting action, repair section, and inventory pairing.
- Adjusted the inventory default lane so the crafting window no longer covers the inventory title bar; browser proof confirms inventory dragging works.

Proof:
- Screenshot: `artifacts/playwright/145-smithy.png`
- Proof sheet: `artifacts/playwright/145-reference-proof-sheet.png`
- Runner: `node artifacts\playwright-runner\145-service-plot-proof.mjs`

Deviation note:
- The scene still uses the current voxel-kit renderer rather than the painterly reference art pipeline, so object silhouettes are blockier than the target. Layout, service intent, prop density, and interaction stack are aligned within the current renderer.
