import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    briarbrookGame?: {
      getReactUIBridge(): {
        dispatchAction(action: unknown): unknown;
        getSnapshot(): {
          hotbar: {
            slots: Array<{ slot: number; binding: { kind: string; id: string } | null }>;
          };
        };
      };
    };
  }
}

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 }
] as const;

const migratedPanels = ['inventory', 'spellbook', 'crafting', 'market', 'journal'] as const;

const legacyPanelSelectors: Record<(typeof migratedPanels)[number] | 'hotbar', string> = {
  inventory: '.inventory-panel',
  spellbook: '.spellbook-panel',
  crafting: '.crafting-panel',
  market: '.market-panel',
  journal: '.journal-panel',
  hotbar: 'section.hotbar'
};

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function bootGame(page: Page, viewport: { width: number; height: number }): Promise<string[]> {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Briarbrook Voxel RPG');
  await page.waitForFunction(() => Boolean(window.briarbrookGame && window.briarbrookReactUI));
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('#ui-root')).toBeVisible();
  await expect(page.locator('.react-ui-layer')).toHaveCount(1);
  await expect(page.locator('.react-ui-app')).toHaveAttribute('data-react-ui-status', 'coexistence');
  await expect(page.locator('.react-ui-error-panel')).toHaveCount(0);
  await expect(page.locator('.vite-error-overlay, #vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('.bb-overlay-layer[data-overlay-layer="react"]')).toHaveCount(1);
  await expect(page.locator('[data-overlay-root]')).toHaveCount(5);
  return runtimeErrors;
}

async function openPanel(page: Page, panel: (typeof migratedPanels)[number], key: string): Promise<void> {
  await page.keyboard.press(key);
  await expect(page.locator(`[data-react-panel="${panel}"]`)).toBeVisible();
  await expect(page.locator(legacyPanelSelectors[panel])).toHaveCount(0);
  await expect(page.locator('.react-ui-error-panel')).toHaveCount(0);
}

async function dragInventoryItemToHotbar(page: Page): Promise<void> {
  const source = page.locator('[data-react-panel="inventory"] [data-hotbar-source="item:mana_potion"]').first();
  const target = page.locator('[data-react-panel="hotbar"] [data-hotbar-drop="8"]');
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('drag source or target is missing a bounding box');
  const hitTest = await page.evaluate(
    ({ sourceX, sourceY, targetX, targetY }) => ({
      source: document.elementFromPoint(sourceX, sourceY)?.closest('[data-hotbar-source]')?.getAttribute('data-hotbar-source') ?? null,
      target: document.elementFromPoint(targetX, targetY)?.closest('[data-hotbar-drop]')?.getAttribute('data-hotbar-drop') ?? null
    }),
    {
      sourceX: sourceBox.x + sourceBox.width / 2,
      sourceY: sourceBox.y + sourceBox.height / 2,
      targetX: targetBox.x + targetBox.width / 2,
      targetY: targetBox.y + targetBox.height / 2
    }
  );
  expect(hitTest).toEqual({ source: 'item:mana_potion', target: '8' });

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();

  await page.waitForFunction(() => {
    const binding = window.briarbrookGame?.getReactUIBridge().getSnapshot().hotbar.slots[8]?.binding;
    return binding?.kind === 'item' && binding.id === 'mana_potion';
  });
}

async function expectReadableKnowledgeLayout(page: Page): Promise<void> {
  const spellbookColumns = await page.locator('[data-react-panel="spellbook"] .bb-split-pane').evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  const journalColumns = await page.locator('[data-react-panel="journal"] .bb-split-pane').evaluate((element) => getComputedStyle(element).gridTemplateColumns);

  expect(spellbookColumns.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
  expect(journalColumns.trim().split(/\s+/).length).toBeGreaterThanOrEqual(3);
}

async function openPlanningWorkspaces(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'TOGGLE_PANEL', panel: 'skills', open: true });
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'SET_SKILL_VIEW', view: 'atlas' });
  });
  await expect(page.locator('[data-planning-workspace="profession-atlas"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="skills"]')).toBeVisible();
  await expect(page.locator('[data-atlas-renderer="pathway-cards"]')).toHaveCount(1);
  await expect(page.locator('.skills-panel')).toHaveCount(0);

  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'SET_MINIMAP_MODE', mode: 'expanded' });
  });
  await expect(page.locator('[data-planning-workspace="adventure-map"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="map"]')).toBeVisible();
  await expect(page.locator('[data-map-label-mode="icons-and-clusters"]')).toHaveCount(1);
  await expect(page.locator('[data-map-cluster="services"]')).toHaveCount(1);
  await expect(page.locator('.map-panel')).toHaveCount(0);
  await expect(page.locator('[data-react-panel="inventory"]')).toHaveCount(0);
}

async function openCommonSurfaces(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'SET_CHAT_MODE', mode: 'collapsed' });
  });
  await expect(page.locator('[data-react-panel="chat"][data-chat-collapsed="true"]')).toBeVisible();
  await expect(page.locator('.chat-panel')).toHaveCount(0);
  await page.locator('[data-react-panel="chat"][data-chat-collapsed="true"]').click();
  await expect(page.locator('[data-react-panel="chat"] [data-chat-scroll="true"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="chat"] [data-chat-focus="isolated"]')).toBeVisible();

  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'TOGGLE_PANEL', panel: 'help', open: true });
  });
  await expect(page.locator('[data-react-panel="help"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="settings"]')).toBeVisible();
  await expect(page.locator('[data-settings-section="movement"]')).toBeVisible();
  await expect(page.locator('.help-panel')).toHaveCount(0);
  await expectPanelInsideViewport(page, '[data-react-panel="help"]');

  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'TOGGLE_PANEL', panel: 'help', open: false });
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'DEV_TELEPORT_AREA', areaId: 'housing' });
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'TOGGLE_BUILD_MODE', active: true });
  });
  await expect(page.locator('[data-react-panel="build"][data-build-layout="dedicated"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="catalog"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="placement"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="materials"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="build"] [data-build-warning]')).toHaveCount(1);
  await expect(page.locator('.build-panel')).toHaveCount(0);
  await expectPanelInsideViewport(page, '[data-react-panel="build"]');
  await expect(page.locator('[data-react-panel="hotbar"]')).toBeVisible();
  await page.evaluate(() => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction({ type: 'TOGGLE_BUILD_MODE', active: false });
  });
}

async function expectPanelInsideViewport(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} did not produce a bounding box`);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is unavailable');

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

for (const viewport of viewports) {
  test(`React UI smoke is stable at ${viewport.name}`, async ({ page }) => {
    const runtimeErrors = await bootGame(page, viewport);

    await expect(page.locator('[data-react-panel="hotbar"]')).toBeVisible();
    await expect(page.locator('[data-react-panel="hotbar"] [data-hotbar-drop]')).toHaveCount(10);
    await expect(page.locator(legacyPanelSelectors.hotbar)).toHaveCount(0);

    await openPanel(page, 'inventory', 'i');
    await dragInventoryItemToHotbar(page);
    await openPanel(page, 'spellbook', 'm');
    await openPanel(page, 'crafting', 'f');
    await openPanel(page, 'journal', 'j');
    await openPanel(page, 'market', 'o');

    await expectPanelInsideViewport(page, '[data-react-panel="inventory"]');
    await expectPanelInsideViewport(page, '[data-react-panel="spellbook"]');
    await expectReadableKnowledgeLayout(page);
    await openCommonSurfaces(page);
    await openPlanningWorkspaces(page);

    expect(runtimeErrors).toEqual([]);
  });
}
