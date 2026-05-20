import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    briarbrookGame?: {
      getReactUIBridge(): {
        dispatchAction(action: unknown): unknown;
        getState(): {
          dev: {
            renderStats: {
              domNodeCount: number;
              visibleWindowCount: number;
              budget: { domNodeCount: number; visibleWindowCount: number };
              perf: { windowRenderPerSecond: Record<string, number> };
            };
          };
        };
        getSnapshot(): {
          player: { currentArea: string };
          inventory: { capacity: number };
          settings: { movementMode: string; windowLayoutPreset: string };
          windows: { layouts: Array<{ id: string; layout: unknown }> };
          perfDebug: {
            domNodeCount: number;
            visibleWindowCount: number;
            budget: { domNodeCount: number; visibleWindowCount: number };
            perf: { windowRenderPerSecond: Record<string, number> };
          } | null;
        };
      };
    };
  }
}

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 }
] as const;

const legacySelectors = [
  '.inventory-panel',
  '.bank-panel',
  'section.hotbar',
  '.spellbook-panel',
  '.crafting-panel',
  '.market-panel',
  '.journal-panel',
  '.skills-panel',
  '.map-panel',
  '.build-panel',
  '.chat-panel',
  '.help-panel'
];

for (const viewport of viewports) {
  test(`React UI alpha acceptance route ${viewport.name}`, async ({ page }) => {
    test.setTimeout(140_000);
    const runtimeErrors = collectRuntimeErrors(page);

    await bootGame(page, viewport);
    await saveFreshGame(page);

    await assertTownHud(page);
    await assertInventoryEquipmentHotbar(page);
    await assertSpellbook(page);
    await assertBank(page);
    await assertCrafting(page);
    await assertBuildMode(page);
    await assertAreaRoute(page, 'forest');
    await assertAreaRoute(page, 'road');
    await assertAreaRoute(page, 'crypt');
    await assertPlanningWorkspaces(page);
    await assertChatHelpSettingsResetAndPersistence(page);
    await assertTooltipStable(page);
    await assertPerformanceBudget(page);
    await assertNoLegacyDuplicates(page);
    await assertVisualHealth(page, `alpha-${viewport.name}`);

    expect(runtimeErrors).toEqual([]);
  });
}

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function bootGame(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page).toHaveTitle('Briarbrook Voxel RPG');
  await page.waitForFunction(() => Boolean(window.briarbrookGame && window.briarbrookReactUI));
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('.react-ui-layer')).toHaveCount(1);
  await expect(page.locator('.react-ui-error-panel')).toHaveCount(0);
  await expect(page.locator('.vite-error-overlay, #vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('[data-ui-hotbar]')).toBeVisible();
}

async function dispatch(page: Page, action: unknown): Promise<void> {
  await page.evaluate((payload) => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction(payload);
  }, action);
}

async function saveFreshGame(page: Page): Promise<void> {
  await dispatch(page, { type: 'SAVE_GAME' });
  await page.waitForFunction(() => Boolean(window.localStorage.getItem('briarbrook.voxel-rpg.save.v1')));
}

async function assertTownHud(page: Page): Promise<void> {
  await expect(page.locator('[data-react-panel="hotbar"] [data-hotbar-drop]')).toHaveCount(10);
  const area = await page.evaluate(() => window.briarbrookGame?.getReactUIBridge().getSnapshot().player.currentArea);
  expect(area).toBe('town');
}

async function assertInventoryEquipmentHotbar(page: Page): Promise<void> {
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
  await expect(page.locator('[data-react-panel="inventory"]')).toBeVisible();
  const inventoryCapacity = await page.evaluate(() => window.briarbrookGame?.getReactUIBridge().getSnapshot().inventory.capacity ?? 0);
  await expect(page.locator('[data-react-panel="inventory"] [data-inv-slot]')).toHaveCount(inventoryCapacity);
  await expect(page.locator('[data-react-panel="hotbar"] [data-hotbar-drop]')).toHaveCount(10);
  await expect(page.locator('[data-react-panel="inventory"] [data-tooltip-id]').first()).toBeVisible();
}

async function assertSpellbook(page: Page): Promise<void> {
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'spellbook', open: true });
  await expect(page.locator('[data-react-panel="spellbook"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="spellbook"] [data-spell-card]').first()).toBeVisible();
  await expect(page.locator('[data-react-panel="spellbook"] [data-spell-detail]')).toBeVisible();
}

async function assertBank(page: Page): Promise<void> {
  await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'bank' });
  await dispatch(page, { type: 'OPEN_BANK' });
  await expect(page.locator('[data-react-panel="bank"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="inventory"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="bank"] [data-bank-slot]').first()).toBeVisible();
}

async function assertCrafting(page: Page): Promise<void> {
  await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'blacksmith' });
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'crafting', open: true });
  await expect(page.locator('[data-react-panel="crafting"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="crafting"] [data-crafting-footer]')).toBeVisible();
  const columns = await page.locator('[data-react-panel="crafting"] .bb-split-pane').evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(columns.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
}

async function assertBuildMode(page: Page): Promise<void> {
  await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'housing' });
  await dispatch(page, { type: 'TOGGLE_BUILD_MODE', active: true });
  await expect(page.locator('[data-react-panel="build"][data-build-layout="dedicated"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="catalog"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="placement"]')).toBeVisible();
  await expect(page.locator('[data-build-zone="materials"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="build"] [data-build-warning]')).toHaveCount(1);
  await dispatch(page, { type: 'TOGGLE_BUILD_MODE', active: false });
}

async function assertAreaRoute(page: Page, areaId: string): Promise<void> {
  await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId });
  await page.waitForFunction((expected) => window.briarbrookGame?.getReactUIBridge().getSnapshot().player.currentArea === expected, areaId);
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('[data-react-panel="hotbar"]')).toBeVisible();
}

async function assertPlanningWorkspaces(page: Page): Promise<void> {
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'inventory', open: false });
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'bank', open: false });
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'skills', open: true });
  await dispatch(page, { type: 'SET_SKILL_VIEW', view: 'atlas' });
  await expect(page.locator('[data-planning-workspace="profession-atlas"]')).toBeVisible();
  await expect(page.locator('[data-atlas-renderer="pathway-cards"]')).toHaveCount(1);
  await dispatch(page, { type: 'SET_MINIMAP_MODE', mode: 'expanded' });
  await expect(page.locator('[data-planning-workspace="adventure-map"]')).toBeVisible();
  await expect(page.locator('[data-map-label-mode="icons-and-clusters"]')).toHaveCount(1);
  await expect(page.locator('[data-map-cluster="services"]')).toHaveCount(1);
}

async function assertChatHelpSettingsResetAndPersistence(page: Page): Promise<void> {
  await dispatch(page, { type: 'SET_MINIMAP_MODE', mode: 'standard' });
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'skills', open: false });
  await expect(page.locator('[data-planning-workspace="profession-atlas"]')).toHaveCount(0);
  await expect(page.locator('[data-planning-workspace="adventure-map"]')).toHaveCount(0);
  await dispatch(page, { type: 'SET_CHAT_MODE', mode: 'collapsed' });
  await expect(page.locator('[data-react-panel="chat"][data-chat-collapsed="true"]')).toBeVisible();
  await page.locator('[data-react-panel="chat"][data-chat-collapsed="true"]').click();
  await expect(page.locator('[data-react-panel="chat"] [data-chat-scroll="true"]')).toBeVisible();

  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'help', open: true });
  await expect(page.locator('[data-react-panel="help"]')).toBeVisible();
  await expect(page.locator('[data-react-panel="settings"]')).toBeVisible();
  await dispatch(page, { type: 'SET_MOVEMENT_MODE', mode: 'mouse' });
  await dispatch(page, { type: 'APPLY_UI_LAYOUT_PRESET', preset: 'crafting' });
  await dispatch(page, { type: 'RESET_UI_LAYOUT' });
  await page.waitForFunction(() => window.briarbrookGame?.getReactUIBridge().getSnapshot().settings.windowLayoutPreset === 'default');

  await dispatch(page, { type: 'SAVE_GAME' });
  await page.waitForFunction(() => window.localStorage.getItem('briarbrook.voxel-rpg.save.v1')?.includes('"movementMode":"mouse"'));
  await page.reload();
  await page.waitForFunction(() => Boolean(window.briarbrookGame && window.briarbrookReactUI));
  await page.waitForFunction(() => window.briarbrookGame?.getReactUIBridge().getSnapshot().settings.movementMode === 'mouse');
}

async function assertTooltipStable(page: Page): Promise<void> {
  await dispatch(page, { type: 'SET_MINIMAP_MODE', mode: 'standard' });
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'skills', open: false });
  await expect(page.locator('[data-planning-workspace="profession-atlas"]')).toHaveCount(0);
  await expect(page.locator('[data-planning-workspace="adventure-map"]')).toHaveCount(0);
  await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
  await expect(page.locator('[data-react-panel="inventory"]')).toBeVisible();
  const anchor = page.locator('[data-react-panel="inventory"] [data-tooltip-id][data-tooltip]').first();
  await expect(anchor).toBeVisible();
  await anchor.hover();
  await page.waitForTimeout(420);
  const first = await tooltipSnapshot(page);
  await page.waitForTimeout(320);
  const second = await tooltipSnapshot(page);
  expect(first.anchorId).not.toBe('');
  expect(second.anchorId).toBe(first.anchorId);
  expect(second.mountCount).toBe(first.mountCount);
}

async function tooltipSnapshot(page: Page): Promise<{ anchorId: string; mountCount: string }> {
  return page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('.tooltip-layer');
    return {
      anchorId: layer?.dataset.tooltipAnchorId ?? '',
      mountCount: layer?.dataset.tooltipMountCount ?? ''
    };
  });
}

async function assertPerformanceBudget(page: Page): Promise<void> {
  await page.waitForTimeout(1100);
  const perf = await page.evaluate(() => window.briarbrookGame?.getReactUIBridge().getState().dev.renderStats);
  expect(perf).toBeTruthy();
  expect(perf!.domNodeCount).toBeLessThanOrEqual(perf!.budget.domNodeCount);
  expect(perf!.visibleWindowCount).toBeLessThanOrEqual(perf!.budget.visibleWindowCount);
  expect(Object.keys(perf!.perf.windowRenderPerSecond).some((id) => id.startsWith('react:'))).toBe(true);
}

async function assertNoLegacyDuplicates(page: Page): Promise<void> {
  for (const selector of legacySelectors) {
    await expect(page.locator(selector), `${selector} should not render alongside React`).toHaveCount(0);
  }
}

async function assertVisualHealth(page: Page, stateId: string): Promise<void> {
  const report = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const visible = (element: Element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
    };
    const rectOf = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const outsideViewport = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-window], [data-ui-hotbar]'))
      .filter(visible)
      .map((element) => ({ id: element.dataset.reactPanel ?? element.dataset.uiWindow ?? element.className, rect: rectOf(element) }))
      .filter(({ rect }) => rect.x < -1 || rect.y < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1);
    const horizontalBodyScroll = document.documentElement.scrollWidth > viewport.width + 1 || document.body.scrollWidth > viewport.width + 1;
    const hotbar = document.querySelector<HTMLElement>('[data-ui-hotbar]');
    const hotbarRect = hotbar ? rectOf(hotbar) : null;
    const hotbarBlockers = hotbarRect
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-ui-window]'))
          .filter((element) => visible(element) && element.dataset.reactPanel !== 'hotbar')
          .map((element) => ({ id: element.dataset.reactPanel ?? 'window', rect: rectOf(element) }))
          .filter(({ rect }) => rect.x < hotbarRect.right && rect.right > hotbarRect.x && rect.y < hotbarRect.bottom && rect.bottom > hotbarRect.y)
      : [];
    const textNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-text]'))
      .filter(visible)
      .map((element) => {
        const rect = rectOf(element);
        return {
          id: element.textContent?.trim().slice(0, 40) || element.tagName,
          owner: element.closest<HTMLElement>('[data-react-panel]')?.dataset.reactPanel ?? 'hud',
          rect,
          area: Math.max(1, rect.width * rect.height)
        };
      });
    const textOverlaps: string[] = [];
    for (let i = 0; i < textNodes.length; i += 1) {
      for (let j = i + 1; j < textNodes.length; j += 1) {
        const a = textNodes[i];
        const b = textNodes[j];
        if (!a || !b || a.owner !== b.owner) continue;
        const width = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.x, b.rect.x));
        const height = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.y, b.rect.y));
        const overlap = width * height;
        if (overlap > Math.min(a.area, b.area) * 0.45 && width > 4 && height > 4) {
          textOverlaps.push(`${a.owner}: ${a.id} / ${b.id}`);
        }
      }
    }
    return {
      outsideViewport,
      horizontalBodyScroll,
      hotbarBlockers,
      textOverlaps: textOverlaps.slice(0, 8)
    };
  });

  expect(report.horizontalBodyScroll, `${stateId}: horizontal body scroll`).toBe(false);
  expect(report.outsideViewport, `${stateId}: windows outside viewport`).toEqual([]);
  expect(report.hotbarBlockers, `${stateId}: hotbar blockers`).toEqual([]);
  expect(report.textOverlaps, `${stateId}: overlapping visible text`).toEqual([]);
}
