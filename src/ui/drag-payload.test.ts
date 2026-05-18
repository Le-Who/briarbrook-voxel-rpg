import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { evaluateDrop, hotbarBindingFromPayload, payloadFromHotbarSource } from './DragPayload';

describe('drag payload helpers', () => {
  it('maps spells and inventory tools into hotbar bindings', () => {
    const spell = payloadFromHotbarSource('spell:magic_arrow');
    const axe = payloadFromHotbarSource('tool:axe');

    expect(spell?.displayName).toBe('Magic Arrow');
    expect(hotbarBindingFromPayload(spell!)).toEqual({ kind: 'spell', id: 'magic_arrow' });
    expect(hotbarBindingFromPayload(axe!)).toEqual({ kind: 'tool', id: 'axe' });
  });

  it('creates hotbar slot payloads for reordering without native dataTransfer', () => {
    const state = createInitialGameState();
    const payload = payloadFromHotbarSource('hotbarSlot:2', state);

    expect(payload?.kind).toBe('hotbarSlot');
    expect(payload?.sourceSlotId).toBe(2);
    expect(payload?.displayName).toBe('Magic Arrow');
    expect(hotbarBindingFromPayload(payload!)).toEqual({ kind: 'spell', id: 'magic_arrow' });
  });

  it('explains invalid drops instead of silently swallowing them', () => {
    const payload = payloadFromHotbarSource('spell:heal')!;

    expect(evaluateDrop(payload, { kind: 'containerSlot', container: 'inventory', slot: 3 }).ok).toBe(false);
    expect(evaluateDrop(payload, { kind: 'containerSlot', container: 'inventory', slot: 3 }).reason).toContain('Only inventory items');
    expect(evaluateDrop(payload, { kind: 'hotbarSlot', slot: 4 }).ok).toBe(true);
  });
});
