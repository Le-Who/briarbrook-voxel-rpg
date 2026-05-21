# Briarbrook Rebuild Notes

Prompt: 142 - Reference-Locked Rebuild Briarbrook Town And Town Hub From Scratch

References used:

- `artifacts/reference-lock-phase14/REF_142_TOWN_SQUARE_HERO.png`
- `artifacts/reference-lock-phase14/REF_142_TOWN_MARKET_STREET.png`
- `artifacts/reference-lock-phase14/REF_133_TOWN_HUD_BASELINE.png`
- `artifacts/reference-lock-phase14/REF_135_PLAYER_CHAT.png`

## Blockout

- Rebuilt the town renderer into explicit zones instead of one loose prop pass:
  - central plaza and fountain;
  - bank/smithy/service street;
  - market side with stalls and work boards;
  - waterfront/ferry edge;
  - exit marker lanes.
- Added a `briarbrookTownSquareReference` contract for the required REF_142 silhouettes, board anchors, composition zones, service entries, exit signs, shade trees, path guides, and density budgets.
- Converted Rumor Board and Market Board entities from generic chest visuals to notice-board visuals while preserving their existing container interaction semantics.

## Route And Collision Contract

- Main routes from the plaza to bank, smithy, market board, rumor board, forest road, old road, and ferry remain reachable under the Prompt 140 traversability contract.
- New paving, planters, benches, trees, stalls, route stones, and notice boards are renderer-only dressing unless the existing entity contract already blocks movement.
- Service entrances remain aligned to the authored portals:
  - Bank: `portal_bank` at `(-8, -2)`;
  - Smithy: `portal_smith` at `(6, -3)`;
  - Old River Road: `portal_road` at `(13, 4)`;
  - Forest Road: `portal_forest` at `(0, 14)`;
  - Housing Plot Ferry: `portal_plot` at `(-15, 13)`.

## Visual Changes

- Added denser town paving overlays, route cobbles, flower planters, shade trees, flower beds, banners, benches, lanterns, service plaques, docks, market stacks, carts, and market stalls.
- Market street proof uses a dedicated screenshot camera to frame the fountain, rumor board, market board, stalls, merchants, inventory, minimap, chat, and hotbar without foreground roof occlusion.
- The low-height legacy status panel was raised inside the existing `max-height: 820px` media rule so the 1366x768 reference proof has no hotbar overlap.

## Screenshot Proof

- Before baseline: `artifacts/playwright/142-before-town-square.png`
- Town square hero: `artifacts/playwright/142-town-square-hero.png`
- Market street: `artifacts/playwright/142-town-market-street.png`
- Proof sheet: `artifacts/playwright/142-reference-proof-sheet.png`
- Runner: `artifacts/playwright-runner/142-briarbrook-town-proof.mjs`

## Deviation Note

- The current runtime still uses the existing voxel kit and orthographic Three.js renderer, so exact bitmap-level parity with the target image's painterly roof, tree, lighting, and item-detail fidelity is not possible in this prompt without rewriting the renderer or importing a new authored asset pack.
- Layout parity is implemented at the composition level: central fountain, richer paving, service/market side, visible boards, sparse labels, clear HUD/chat/hotbar/minimap, and reachable service routes.
- Inventory item art, minimap illustration fidelity, and building roof materials remain below the REF_142 target images and should be treated as art-pipeline deviations rather than gameplay or UX blockers.
