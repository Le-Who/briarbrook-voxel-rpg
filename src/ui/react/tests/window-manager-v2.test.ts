import { describe, expect, it } from 'vitest';
import {
  REACT_WINDOW_LAYOUT_VERSION,
  createReactLayoutPreset,
  migrateReactWindowPersistence,
  reactWindowDefinitions,
  resolveReactWindowLayout,
  resolveWorkspacePolicy
} from '../windows/windowManagerV2';

const viewport = { width: 1366, height: 768 };

describe('React WindowManager v2 contracts', () => {
  it('defines workspace contracts for Profession Atlas and Adventure Map', () => {
    expect(reactWindowDefinitions.professionAtlas).toMatchObject({
      type: 'workspace',
      draggable: false,
      resizable: true,
      escBehavior: 'close',
      safeAreaPolicy: 'avoid-hotbar'
    });
    expect(reactWindowDefinitions.adventureMap.type).toBe('workspace');
    expect(reactWindowDefinitions.hotbar.type).toBe('docked');
  });

  it('keeps large workspaces out of the hotbar safe area', () => {
    const layout = resolveReactWindowLayout('professionAtlas', { x: 0, y: 0, width: 1280, height: 720 }, viewport);

    expect(layout.x).toBeGreaterThanOrEqual(8);
    expect(layout.y).toBeGreaterThanOrEqual(8);
    expect(layout.x + layout.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(layout.y + layout.height).toBeLessThanOrEqual(viewport.height - 96);
  });

  it('sizes the default chat frame for the reference message log without covering the hotbar', () => {
    const layout = resolveReactWindowLayout('chat', null, viewport);

    expect(layout.width).toBeGreaterThanOrEqual(420);
    expect(layout.height).toBeGreaterThanOrEqual(300);
    expect(layout.x).toBe(12);
    expect(layout.y + layout.height).toBeGreaterThanOrEqual(viewport.height - 120);
    expect(layout.y + layout.height).toBeLessThanOrEqual(viewport.height - 96);
  });

  it('collapses unrelated panels when a planning workspace is active', () => {
    const policy = resolveWorkspacePolicy('Planning', {
      openPanels: ['inventory', 'chat', 'professionAtlas', 'journal'],
      pinnedPanels: ['chat']
    });

    expect(policy.workspaceId).toBe('professionAtlas');
    expect(policy.visiblePanels).toContain('professionAtlas');
    expect(policy.visiblePanels).toContain('journal');
    expect(policy.visiblePanels).toContain('chat');
    expect(policy.collapsedPanels).toContain('inventory');
  });

  it('provides dedicated combat, build, planning and reset presets', () => {
    const combat = createReactLayoutPreset('Combat', viewport);
    const build = createReactLayoutPreset('Build', viewport);
    const planning = createReactLayoutPreset('Planning', viewport);
    const reset = createReactLayoutPreset('RestoreDefault', viewport);

    expect(combat.inventory.collapsed).toBe(true);
    expect(build.build.dock).toBe('left');
    expect(build.inventory.dock).toBe('right');
    expect(planning.professionAtlas.open).toBe(true);
    expect(planning.chat.collapsed).toBe(true);
    expect(reset.inventory.collapsed).toBe(false);
  });

  it('keeps bank storage clear of the legacy inventory default lane', () => {
    const bank = resolveReactWindowLayout('bank', null, viewport);
    const legacyInventory = { x: 1002, y: 220, width: 270, height: 410 };

    expect(bank.x + bank.width).toBeLessThanOrEqual(legacyInventory.x - 8);
  });

  it('migrates older persisted layouts into versioned v2 storage', () => {
    const migrated = migrateReactWindowPersistence({
      version: 1,
      windows: {
        inventory: { x: -400, y: 900, width: 260, height: 420 }
      }
    }, viewport);

    expect(migrated.version).toBe(REACT_WINDOW_LAYOUT_VERSION);
    const inventory = migrated.windows.inventory;
    expect(inventory).toBeDefined();
    if (!inventory) throw new Error('inventory layout missing');
    expect(inventory.rect.x).toBe(8);
    expect(inventory.rect.y + inventory.rect.height).toBeLessThanOrEqual(viewport.height - 96);
    expect(inventory.collapsed).toBe(false);
    expect(migrated.pinnedWindows).toEqual([]);
  });
});
