import { expect, test, type Page, type TestInfo } from '@playwright/test';

declare global {
  interface Window {
    briarbrookGame?: {
      getReactUIBridge(): {
        dispatchAction(action: unknown): unknown;
      };
    };
  }
}

const viewports = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1600x900', width: 1600, height: 900 }
] as const;

interface VisualState {
  id: string;
  prepare: (page: Page) => Promise<void>;
  escapeSelector?: string;
  focusSelector?: string;
  hoverSelector?: string;
}

const visualStates: VisualState[] = [
  { id: 'R1-town-hud', prepare: async () => undefined },
  { id: 'R2-road-combat', prepare: async (page) => dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'road' }) },
  { id: 'R3-crypt-combat', prepare: async (page) => dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'crypt' }) },
  { id: 'R4-forest-gathering', prepare: async (page) => dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'forest' }) },
  {
    id: 'R5-smithy-crafting',
    prepare: async (page) => {
      await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'blacksmith' });
      await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'crafting', open: true });
    },
    escapeSelector: '[data-react-panel="crafting"]'
  },
  {
    id: 'R6-bank-storage',
    prepare: async (page) => {
      await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'bank' });
      await dispatch(page, { type: 'OPEN_BANK' });
      await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'inventory', open: true });
    },
    escapeSelector: '[data-react-panel="bank"]'
  },
  {
    id: 'R7-housing-build-mode',
    prepare: async (page) => {
      await dispatch(page, { type: 'DEV_TELEPORT_AREA', areaId: 'housing' });
      await dispatch(page, { type: 'TOGGLE_BUILD_MODE', active: true });
    },
    escapeSelector: '[data-react-panel="build"]'
  },
  {
    id: 'R8-profession-atlas',
    prepare: async (page) => {
      await dispatch(page, { type: 'TOGGLE_PANEL', panel: 'skills', open: true });
      await dispatch(page, { type: 'SET_SKILL_VIEW', view: 'atlas' });
    },
    escapeSelector: '[data-react-panel="skills"]'
  },
  {
    id: 'R9-adventure-map',
    prepare: async (page) => dispatch(page, { type: 'SET_MINIMAP_MODE', mode: 'expanded' }),
    escapeSelector: '[data-react-panel="map"]'
  },
  {
    id: 'spellbook',
    prepare: async (page) => dispatch(page, { type: 'TOGGLE_PANEL', panel: 'spellbook', open: true }),
    escapeSelector: '[data-react-panel="spellbook"]'
  },
  {
    id: 'inventory-tooltip',
    prepare: async (page) => dispatch(page, { type: 'TOGGLE_PANEL', panel: 'inventory', open: true }),
    hoverSelector: '[data-react-panel="inventory"] [data-tooltip-id]'
  },
  {
    id: 'settings-help',
    prepare: async (page) => dispatch(page, { type: 'TOGGLE_PANEL', panel: 'help', open: true }),
    escapeSelector: '[data-react-panel="help"]',
    focusSelector: '[data-react-panel="help"] button'
  }
];

for (const viewport of viewports) {
  test(`UI screenshot gate ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(140_000);

    for (const state of visualStates) {
      await bootGame(page, viewport);
      await state.prepare(page);
      await page.waitForTimeout(120);

      if (state.hoverSelector) {
        await page.locator(state.hoverSelector).first().hover();
        await page.waitForTimeout(360);
      }

      await expect(page.locator('.react-ui-error-panel')).toHaveCount(0);
      await expect(page.locator('.vite-error-overlay, #vite-error-overlay')).toHaveCount(0);
      await assertVisualHealth(page, state.id);
      await captureStateScreenshot(page, testInfo, `${viewport.name}-${state.id}`);

      if (state.focusSelector) await assertTabFocus(page, state.focusSelector);
      if (state.escapeSelector) await assertEscapeCloses(page, state.escapeSelector);
    }
  });
}

async function bootGame(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Briarbrook Voxel RPG');
  await page.waitForFunction(() => Boolean(window.briarbrookGame && window.briarbrookReactUI));
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('[data-ui-hotbar]')).toBeVisible();
}

async function dispatch(page: Page, action: unknown): Promise<void> {
  await page.evaluate((payload) => {
    window.briarbrookGame?.getReactUIBridge().dispatchAction(payload);
  }, action);
}

async function captureStateScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false });
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

    const tooltipOutOfViewport = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-tooltip], .game-tooltip'))
      .filter(visible)
      .map((element) => ({ id: element.dataset.tooltipAnchor ?? element.dataset.tooltipActive ?? 'tooltip', rect: rectOf(element) }))
      .filter(({ rect }) => rect.x < -1 || rect.y < -1 || rect.right > viewport.width + 1 || rect.bottom > viewport.height + 1);

    const clippedFooters = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-footer]'))
      .filter(visible)
      .filter((footer) => footer.scrollWidth > footer.clientWidth + 2 || footer.scrollHeight > footer.clientHeight + 2)
      .map((footer) => footer.closest<HTMLElement>('[data-react-panel]')?.dataset.reactPanel ?? 'footer');

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
      })
      .filter((entry) => entry.rect.width > 2 && entry.rect.height > 2);
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
      tooltipOutOfViewport,
      clippedFooters,
      textOverlaps: textOverlaps.slice(0, 8)
    };
  });

  expect(report.horizontalBodyScroll, `${stateId}: horizontal body scroll`).toBe(false);
  expect(report.outsideViewport, `${stateId}: windows outside viewport`).toEqual([]);
  expect(report.hotbarBlockers, `${stateId}: hotbar blockers`).toEqual([]);
  expect(report.tooltipOutOfViewport, `${stateId}: tooltip outside viewport`).toEqual([]);
  expect(report.clippedFooters, `${stateId}: clipped action footer`).toEqual([]);
  expect(report.textOverlaps, `${stateId}: overlapping visible text`).toEqual([]);
}

async function assertEscapeCloses(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(selector)).toHaveCount(0);
}

async function assertTabFocus(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().focus();
  await page.keyboard.press('Tab');
  const focusStayedInPanel = await page.evaluate(() => Boolean(document.activeElement?.closest('[data-react-panel="help"]')));
  expect(focusStayedInPanel).toBe(true);
}
