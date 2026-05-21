# Bank Rebuild Notes

Prompt: `145-reference-locked-rebuild-service-interiors-and-player-plot`

Target reference: `REF_145_BANK.png`

Implemented:
- Rebuilt the bank interior around a wider teller counter, storage shelves, lockboxes, customer lane, ledger desks, chests, lamps, rug, and edge dressing.
- Kept bank service UI as real bank plus inventory windows with item grids, capacity/gold state, drag/drop targets, and storage actions.
- Moved the bank React window default lane clear of inventory, raised context menu layering, and wired React inventory right-clicks into the game context menu path.
- Browser proof confirms bank window dragging, inventory context menu topmost behavior, and market board tab/list clicks.

Proof:
- Screenshot: `artifacts/playwright/145-bank.png`
- Proof sheet: `artifacts/playwright/145-reference-proof-sheet.png`
- Runner: `node artifacts\playwright-runner\145-service-plot-proof.mjs`

Deviation note:
- The context menu is now interactable above React windows, but its legacy title still reads as the generic target label. It is functional; a future copy pass can make inventory-item labels richer without changing this prompt's service layout scope.
